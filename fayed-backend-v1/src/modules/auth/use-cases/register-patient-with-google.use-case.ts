import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { UserRoleType, UserStatus } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { CountryRepository } from '../../patients/repositories/country.repository';
import { IssueAuthTokensUseCase } from './issue-auth-tokens.use-case';
import { AuthIdentityRepository } from '../repositories/auth-identity.repository';
import { UserEmailRepository } from '../repositories/user-email.repository';
import { UserRepository } from '../repositories/user.repository';
import { GoogleIdentityService } from '../services/google-identity.service';
import { AuthSessionDeviceContext } from '../types/auth-session.types';

/**
 * Google patient auth behaves as register-or-login.
 * Existing patient accounts are linked to Google when the email matches; non-patient accounts are not merged silently.
 */
@Injectable()
export class RegisterPatientWithGoogleUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly googleIdentityService: GoogleIdentityService,
    private readonly userRepository: UserRepository,
    private readonly userEmailRepository: UserEmailRepository,
    private readonly authIdentityRepository: AuthIdentityRepository,
    private readonly countryRepository: CountryRepository,
    private readonly issueAuthTokensUseCase: IssueAuthTokensUseCase,
  ) {}

  async execute(input: {
    idToken: string;
    deviceContext: AuthSessionDeviceContext;
  }) {
    const googleIdentity = await this.googleIdentityService.verifyIdToken(
      input.idToken,
    );
    const existingGoogleIdentity =
      await this.authIdentityRepository.findByProviderSubject(
        'GOOGLE',
        googleIdentity.providerSubject,
      );

    if (existingGoogleIdentity) {
      const hasPatientRole = existingGoogleIdentity.user.roles.some(
        (role) => role.role === UserRoleType.PATIENT,
      );

      if (!hasPatientRole) {
        throw new ConflictException({
          messageKey: 'auth.errors.googleNonPatientLinked',
          error: 'PATIENT_ROLE_REQUIRED',
        });
      }

      if (existingGoogleIdentity.user.status !== UserStatus.ACTIVE) {
        throw new ForbiddenException({
          messageKey: 'auth.errors.accountNotActive',
          error: 'ACCOUNT_NOT_ACTIVE',
        });
      }

      return this.issueAuthTokensUseCase.execute({
        userId: existingGoogleIdentity.user.id,
        role: UserRoleType.PATIENT,
        deviceContext: input.deviceContext,
      });
    }

    const existingEmail = await this.userEmailRepository.findByEmailForAuth(
      googleIdentity.email,
    );

    if (
      existingEmail &&
      !existingEmail.user.roles.some(
        (role) => role.role === UserRoleType.PATIENT,
      )
    ) {
      throw new ConflictException({
        messageKey: 'auth.errors.emailLinkedToAnotherFlow',
        error: 'EMAIL_ALREADY_LINKED_TO_ANOTHER_FLOW',
      });
    }

    const user = await this.prisma.$transaction(async (tx) => {
      const countryId = input.deviceContext.countryCode
        ? (await this.countryRepository.findByIsoCode(input.deviceContext.countryCode))?.id
        : null;

      if (existingEmail) {
        if (existingEmail.user.status !== UserStatus.ACTIVE) {
          throw new ForbiddenException({
            messageKey: 'auth.errors.accountNotActive',
            error: 'ACCOUNT_NOT_ACTIVE',
          });
        }

        await this.authIdentityRepository.upsertGoogleIdentity(
          existingEmail.user.id,
          googleIdentity.providerSubject,
          tx,
        );
        await this.userEmailRepository.upsertPrimaryEmail(
          existingEmail.user.id,
          googleIdentity.email,
          googleIdentity.emailVerified,
          tx,
        );
        await this.userRepository.createPatientProfileIfMissing(
          existingEmail.user.id,
          googleIdentity.displayName,
          countryId,
          tx,
        );
        return existingEmail.user;
      }

      const createdUser = await this.userRepository.createUser(
        {
          displayName: googleIdentity.displayName,
          status: UserStatus.ACTIVE,
        },
        tx,
      );

      await this.userRepository.ensureRole(
        createdUser.id,
        UserRoleType.PATIENT,
        tx,
      );
      await this.userRepository.createPatientProfileIfMissing(
        createdUser.id,
        googleIdentity.displayName,
        countryId,
        tx,
      );
      await this.userEmailRepository.upsertPrimaryEmail(
        createdUser.id,
        googleIdentity.email,
        googleIdentity.emailVerified,
        tx,
      );
      await this.authIdentityRepository.upsertGoogleIdentity(
        createdUser.id,
        googleIdentity.providerSubject,
        tx,
      );

      return createdUser;
    });

    return this.issueAuthTokensUseCase.execute({
      userId: user.id,
      role: UserRoleType.PATIENT,
      deviceContext: input.deviceContext,
    });
  }
}
