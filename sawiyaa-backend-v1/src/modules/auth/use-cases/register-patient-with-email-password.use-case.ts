import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { UserRoleType, UserStatus } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { CountryRepository } from '../../patients/repositories/country.repository';
import { HashPasswordUseCase } from './hash-password.use-case';
import { IssueAuthTokensUseCase } from './issue-auth-tokens.use-case';
import { AuthIdentityRepository } from '../repositories/auth-identity.repository';
import { UserEmailRepository } from '../repositories/user-email.repository';
import { UserPhoneRepository } from '../repositories/user-phone.repository';
import { UserRepository } from '../repositories/user.repository';
import { AuthSessionDeviceContext } from '../types/auth-session.types';
import { isAuthUniqueConstraintError } from '../utils/is-auth-unique-constraint-error';
import { PhoneNumberValidationService } from '@common/validation/phone-number-validation.service';

/**
 * Patient email/password registration creates the patient account baseline and issues a session immediately.
 * This flow refuses to merge into non-patient accounts to avoid silent cross-role identity coupling.
 */
@Injectable()
export class RegisterPatientWithEmailPasswordUseCase {
  private readonly logger = new Logger(
    RegisterPatientWithEmailPasswordUseCase.name,
  );
  constructor(
    private readonly prisma: PrismaService,
    private readonly userRepository: UserRepository,
    private readonly userEmailRepository: UserEmailRepository,
    private readonly userPhoneRepository: UserPhoneRepository,
    private readonly authIdentityRepository: AuthIdentityRepository,
    private readonly countryRepository: CountryRepository,
    private readonly hashPasswordUseCase: HashPasswordUseCase,
    private readonly issueAuthTokensUseCase: IssueAuthTokensUseCase,
    private readonly phoneNumberValidationService: PhoneNumberValidationService,
  ) {}

  async execute(input: {
    email: string;
    password: string;
    displayName?: string | null;
    phone?: string | null;
    phoneCountryCode?: string | null;
    deviceContext: AuthSessionDeviceContext;
  }) {
    const normalizedEmail = input.email.trim().toLowerCase();
    const phoneValidation = input.phone?.trim()
      ? typeof this.phoneNumberValidationService.validate === 'function'
        ? this.phoneNumberValidationService.validate(
            input.phone,
            input.phoneCountryCode ?? input.deviceContext.countryCode,
          )
        : this.phoneNumberValidationService.assertValid(
            input.phone,
            input.phoneCountryCode ?? input.deviceContext.countryCode,
          )
      : null;
    const existingEmail =
      await this.userEmailRepository.findByEmailForAuth(normalizedEmail);

    if (existingEmail) {
      throw new ConflictException({
        messageKey: 'auth.errors.emailAlreadyRegistered',
        error: 'EMAIL_ALREADY_REGISTERED',
      });
    }

    const countryId = input.deviceContext.countryCode
      ? (
          await this.countryRepository.findByIsoCode(
            input.deviceContext.countryCode,
          )
        )?.id
      : null;

    const passwordHash = await this.hashPasswordUseCase.execute(input.password);
    const createdUser = await this.prisma
      .$transaction(async (tx) => {
        const user = await this.userRepository.createUser(
          {
            displayName: input.displayName ?? null,
            status: UserStatus.ACTIVE,
          },
          tx,
        );

        await this.userRepository.ensureRole(user.id, UserRoleType.PATIENT, tx);
        await this.userRepository.createPatientProfileIfMissing(
          user.id,
          input.displayName ?? null,
          countryId,
          tx,
        );
        await this.userEmailRepository.upsertPrimaryEmail(
          user.id,
          normalizedEmail,
          false,
          tx,
        );
        await this.authIdentityRepository.createPasswordIdentity(
          user.id,
          passwordHash,
          tx,
        );

        return user;
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

    let phoneStatus:
      | 'NOT_PROVIDED'
      | 'NOT_SAVED_INVALID'
      | 'SAVED'
      | 'NOT_SAVED' = input.phone?.trim()
      ? 'NOT_SAVED_INVALID'
      : 'NOT_PROVIDED';
    if (phoneValidation?.valid) {
      try {
        await this.userPhoneRepository.upsertPrimaryPhone(
          createdUser.id,
          phoneValidation.e164,
          false,
          undefined,
          phoneValidation.countryCode,
        );
        phoneStatus = 'SAVED';
      } catch {
        phoneStatus = 'NOT_SAVED';
        this.logger.warn('Optional patient phone was not saved');
      }
    }

    const auth = await this.issueAuthTokensUseCase.execute({
      userId: createdUser.id,
      role: UserRoleType.PATIENT,
      deviceContext: input.deviceContext,
    });
    return { ...auth, phone: { status: phoneStatus } };
  }
}
