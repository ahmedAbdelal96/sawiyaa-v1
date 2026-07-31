import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  CredentialType,
  OtpChannel,
  PractitionerType,
  UserRoleType,
  UserStatus,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { HashPasswordUseCase } from './hash-password.use-case';
import { AuthIdentityRepository } from '../repositories/auth-identity.repository';
import { TwoFactorSettingRepository } from '../repositories/two-factor-setting.repository';
import { UserEmailRepository } from '../repositories/user-email.repository';
import { UserRepository } from '../repositories/user.repository';
import { UserPhoneRepository } from '../repositories/user-phone.repository';
import { isUserEmailUniqueConstraintError } from '../utils/is-user-email-unique-constraint-error';
import { isUserPhoneUniqueConstraintError } from '../utils/is-user-phone-unique-constraint-error';
import { PhoneNumberValidationService } from '@common/validation/phone-number-validation.service';
import { assertProfessionalTitle } from '@modules/practitioners/constants/professional-title.constants';
import { PractitionerSpecialtyIntegrityService } from '@modules/practitioners/services/practitioner-specialty-integrity.service';

/**
 * Practitioner registration creates only the auth/account baseline.
 * It intentionally does not execute onboarding, specialties, or application submission flows.
 */
@Injectable()
export class RegisterPractitionerAccountUseCase {
  private readonly logger = new Logger(RegisterPractitionerAccountUseCase.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly userRepository: UserRepository,
    private readonly userEmailRepository: UserEmailRepository,
    private readonly userPhoneRepository: UserPhoneRepository,
    private readonly authIdentityRepository: AuthIdentityRepository,
    private readonly twoFactorSettingRepository: TwoFactorSettingRepository,
    private readonly hashPasswordUseCase: HashPasswordUseCase,
    private readonly phoneNumberValidationService: PhoneNumberValidationService,
    private readonly practitionerSpecialtyIntegrityService: PractitionerSpecialtyIntegrityService,
  ) {}

  async execute(input: {
    email: string;
    phone?: string | null;
    phoneCountryCode?: string | null;
    password: string;
    passwordHash?: string;
    phoneStatusOverride?: 'NOT_PROVIDED' | 'NOT_SAVED_INVALID' | 'SAVED';
    displayName?: string | null;
    practitionerType?: PractitionerType;
    professionalTitle?: string;
    bio?: string;
    yearsOfExperience?: number;
    countryCode?: string;
    primarySpecialtyCategoryId: string;
    specialtyIds: string[];
    initialCredential?: {
      credentialType: CredentialType;
      fileUrl: string;
      expiresAt?: string;
    };
  }) {
    const normalizedEmail = input.email.trim().toLowerCase();
    const normalizedSpecialtyIds = Array.from(
      new Set(input.specialtyIds.map((id) => id.trim()).filter(Boolean)),
    );
    const validatedPhone = input.phone?.trim()
      ? typeof this.phoneNumberValidationService.validate === 'function'
        ? this.phoneNumberValidationService.validate(
            input.phone,
            input.phoneCountryCode,
          )
        : this.phoneNumberValidationService.assertValid(
            input.phone,
            input.phoneCountryCode,
          )
      : null;
    const existingEmail =
      await this.userEmailRepository.findByEmail(normalizedEmail);

    if (existingEmail) {
      throw new ConflictException({
        messageKey: 'auth.errors.emailAlreadyRegistered',
        error: 'EMAIL_ALREADY_REGISTERED',
      });
    }

    await this.practitionerSpecialtyIntegrityService.validateSelection({
      primarySpecialtyCategoryId: input.primarySpecialtyCategoryId,
      specialtyIds: normalizedSpecialtyIds,
    });

    const passwordHash =
      input.passwordHash ??
      (await this.hashPasswordUseCase.execute(input.password));
    const user = await this.prisma
      .$transaction(async (tx) => {
        let countryId: string | undefined;
        if (input.countryCode) {
          const normalizedCountryCode = input.countryCode.trim().toUpperCase();
          const country = await tx.country.findFirst({
            where: {
              isoCode: normalizedCountryCode,
              isActive: true,
            },
            select: { id: true },
          });

          if (!country) {
            throw new BadRequestException({
              messageKey: 'auth.errors.invalidRegistrationCountryCode',
              error: 'INVALID_REGISTRATION_COUNTRY_CODE',
            });
          }

          countryId = country.id;
        }

        const category = await tx.specialtyCategory.findFirst({
          where: {
            id: input.primarySpecialtyCategoryId,
            isActive: true,
          },
          select: { id: true },
        });

        if (!category) {
          throw new BadRequestException({
            messageKey: 'auth.errors.invalidRegistrationSpecialtyCategoryId',
            error: 'INVALID_REGISTRATION_SPECIALTY_CATEGORY_ID',
          });
        }

        const specialties = await tx.specialty.findMany({
          where: {
            id: { in: normalizedSpecialtyIds },
            isActive: true,
            categoryId: input.primarySpecialtyCategoryId,
          },
          select: { id: true },
        });

        const validatedSpecialtyIds = specialties.map((item) => item.id);

        if (validatedSpecialtyIds.length !== normalizedSpecialtyIds.length) {
          throw new BadRequestException({
            messageKey: 'auth.errors.invalidRegistrationSpecialtiesForCategory',
            error: 'INVALID_REGISTRATION_SPECIALTIES_FOR_CATEGORY',
          });
        }

        const createdUser = await this.userRepository.createUser(
          {
            displayName: input.displayName ?? null,
            status: UserStatus.ACTIVE,
          },
          tx,
        );

        await this.userRepository.ensureRole(
          createdUser.id,
          UserRoleType.PRACTITIONER,
          tx,
        );
        await this.userRepository.createPractitionerProfileIfMissing(
          createdUser.id,
          input.displayName ?? normalizedEmail,
          tx,
        );

        await tx.practitionerProfile.update({
          where: { userId: createdUser.id },
          data: {
            practitionerType: input.practitionerType ?? PractitionerType.OTHER,
            professionalTitle: assertProfessionalTitle(input.professionalTitle),
            bio: input.bio?.trim() || null,
            yearsOfExperience: input.yearsOfExperience ?? null,
            countryId: countryId ?? null,
            // Keep the selected category on the canonical practitioner profile.
            // The specialty links below are scoped to this category, and the
            // application/readiness/public flows use this scalar as their
            // primary-category source of truth.
            primarySpecialtyCategoryId: input.primarySpecialtyCategoryId,
          },
        });

        if (validatedSpecialtyIds.length > 0) {
          const profile = await tx.practitionerProfile.findUnique({
            where: { userId: createdUser.id },
            select: { id: true },
          });

          if (!profile) {
            throw new BadRequestException({
              messageKey: 'auth.errors.practitionerRoleRequired',
              error: 'PRACTITIONER_PROFILE_NOT_FOUND',
            });
          }

          await tx.practitionerSpecialty.createMany({
            data: validatedSpecialtyIds.map((specialtyId, index) => ({
              practitionerId: profile.id,
              specialtyId,
              isPrimary: index === 0,
            })),
            skipDuplicates: true,
          });
        }

        if (input.initialCredential?.fileUrl?.trim()) {
          const profile = await tx.practitionerProfile.findUnique({
            where: { userId: createdUser.id },
            select: { id: true },
          });

          if (!profile) {
            throw new BadRequestException({
              messageKey: 'auth.errors.practitionerRoleRequired',
              error: 'PRACTITIONER_PROFILE_NOT_FOUND',
            });
          }

          await tx.practitionerCredential.create({
            data: {
              practitionerId: profile.id,
              credentialType: input.initialCredential.credentialType,
              fileUrl: input.initialCredential.fileUrl.trim(),
              expiresAt: input.initialCredential.expiresAt
                ? new Date(input.initialCredential.expiresAt)
                : null,
            },
          });
        }

        await this.userEmailRepository.createPrimaryEmail(
          createdUser.id,
          normalizedEmail,
          true,
          tx,
        );
        await this.authIdentityRepository.createPasswordIdentity(
          createdUser.id,
          passwordHash,
          tx,
        );

        return createdUser;
      })
      .catch((error: unknown) => {
        if (isUserEmailUniqueConstraintError(error)) {
          throw new ConflictException({
            messageKey: 'auth.errors.emailAlreadyRegistered',
            error: 'EMAIL_ALREADY_REGISTERED',
          });
        }

        if (isUserPhoneUniqueConstraintError(error)) {
          throw new ConflictException({
            messageKey: 'auth.errors.phoneAlreadyRegistered',
            error: 'PHONE_ALREADY_REGISTERED',
          });
        }

        throw error;
      });

    let phoneStatus:
      | 'NOT_PROVIDED'
      | 'NOT_SAVED_INVALID'
      | 'SAVED'
      | 'NOT_SAVED' = input.phone?.trim()
      ? 'NOT_SAVED_INVALID'
      : 'NOT_PROVIDED';
    if (input.phoneStatusOverride) {
      phoneStatus = input.phoneStatusOverride;
    }
    if (validatedPhone?.valid) {
      try {
        await this.userPhoneRepository.upsertPrimaryPhone(
          user.id,
          validatedPhone.e164,
          false,
          undefined,
          validatedPhone.countryCode,
        );
        phoneStatus = 'SAVED';
      } catch {
        phoneStatus = 'NOT_SAVED';
        this.logger.warn('Optional practitioner phone was not saved');
      }
    }

    await this.twoFactorSettingRepository.upsertPractitionerDefault(
      user.id,
      OtpChannel.EMAIL,
    );

    return {
      userId: user.id,
      requiresOtpOnLogin: true,
      phone: { status: phoneStatus },
    };
  }
}
