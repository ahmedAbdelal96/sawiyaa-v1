import { ConflictException, Injectable, Logger } from '@nestjs/common';
import {
  Prisma,
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
  ) {}

  async execute(input: {
    email: string;
    phone?: string | null;
    phoneCountryCode?: string | null;
    password: string;
    passwordHash?: string;
    phoneStatusOverride?: 'NOT_PROVIDED' | 'NOT_SAVED_INVALID' | 'SAVED';
    displayName?: string | null;
  }) {
    const normalizedEmail = input.email.trim().toLowerCase();
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

    const passwordHash =
      input.passwordHash ??
      (await this.hashPasswordUseCase.execute(input.password));
    const user = await this.prisma
      .$transaction(async (tx) => {
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
        // Registration owns only the account and the draft application. A
        // live practitioner profile is created by the approval transaction.
        await tx.practitionerApplication.create({
          data: {
            userId: createdUser.id,
            status: 'DRAFT',
            submissionSnapshot: {
              applicant: {
                displayName: input.displayName ?? null,
                locale: null,
                timezone: null,
              },
              profile: {
                practitionerType: PractitionerType.OTHER,
                practitionerTypeExplicit: false,
                professionalTitle: null,
                bio: null,
                yearsOfExperience: null,
                countryCode: null,
                primaryContentLocale: null,
                professionalContent: null,
              },
              languageCodes: [],
              specialtySelection: null,
              credentials: [],
            } as Prisma.InputJsonValue,
          },
        });

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
