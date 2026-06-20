import {
  BadRequestException,
  ConflictException,
  Injectable,
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
import { isAuthUniqueConstraintError } from '../utils/is-auth-unique-constraint-error';

/**
 * Practitioner registration creates only the auth/account baseline.
 * It intentionally does not execute onboarding, specialties, or application submission flows.
 */
@Injectable()
export class RegisterPractitionerAccountUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userRepository: UserRepository,
    private readonly userEmailRepository: UserEmailRepository,
    private readonly authIdentityRepository: AuthIdentityRepository,
    private readonly twoFactorSettingRepository: TwoFactorSettingRepository,
    private readonly hashPasswordUseCase: HashPasswordUseCase,
  ) {}

  async execute(input: {
    email: string;
    otpEmail?: string;
    password: string;
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
    const normalizedOtpEmail = input.otpEmail?.trim().toLowerCase() || null;
    const existingEmail =
      await this.userEmailRepository.findByEmail(normalizedEmail);

    if (existingEmail) {
      throw new ConflictException({
        messageKey: 'auth.errors.emailAlreadyRegistered',
        error: 'EMAIL_ALREADY_REGISTERED',
      });
    }

    if (normalizedOtpEmail && normalizedOtpEmail !== normalizedEmail) {
      const existingOtpEmail =
        await this.userEmailRepository.findByEmail(normalizedOtpEmail);

      if (existingOtpEmail) {
        throw new ConflictException({
          messageKey: 'auth.errors.emailAlreadyRegistered',
          error: 'EMAIL_ALREADY_REGISTERED',
        });
      }
    }

    const passwordHash = await this.hashPasswordUseCase.execute(input.password);
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
            id: { in: input.specialtyIds },
            isActive: true,
            categoryId: input.primarySpecialtyCategoryId,
          },
          select: { id: true },
        });

        const validatedSpecialtyIds = specialties.map((item) => item.id);

        if (validatedSpecialtyIds.length !== input.specialtyIds.length) {
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
            professionalTitle: input.professionalTitle?.trim() || null,
            bio: input.bio?.trim() || null,
            yearsOfExperience: input.yearsOfExperience ?? null,
            countryId: countryId ?? null,
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

        await this.userEmailRepository.upsertPrimaryEmail(
          createdUser.id,
          normalizedEmail,
          true,
          tx,
        );
        if (normalizedOtpEmail && normalizedOtpEmail !== normalizedEmail) {
          await this.userEmailRepository.upsertSecondaryEmail(
            createdUser.id,
            normalizedOtpEmail,
            true,
            tx,
          );
        }
        await this.authIdentityRepository.createPasswordIdentity(
          createdUser.id,
          passwordHash,
          tx,
        );

        return createdUser;
      })
      .catch((error: unknown) => {
        if (isAuthUniqueConstraintError(error)) {
          throw new ConflictException({
            messageKey: 'auth.errors.emailAlreadyRegistered',
            error: 'EMAIL_ALREADY_REGISTERED',
          });
        }

        throw error;
      });

    await this.twoFactorSettingRepository.upsertPractitionerDefault(
      user.id,
      OtpChannel.EMAIL,
    );

    return {
      userId: user.id,
      requiresOtpOnLogin: true,
    };
  }
}
