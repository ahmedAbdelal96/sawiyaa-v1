import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UserRoleType, UserStatus } from '@prisma/client';
import { IssueAuthTokensUseCase } from './issue-auth-tokens.use-case';
import { VerifyPasswordUseCase } from './verify-password.use-case';
import { AuthIdentityRepository } from '../repositories/auth-identity.repository';
import { UserEmailRepository } from '../repositories/user-email.repository';
import { AuthSessionDeviceContext } from '../types/auth-session.types';

/**
 * Patient email/password login validates the password identity and then uses the shared token/session foundation.
 */
@Injectable()
export class LoginPatientWithEmailPasswordUseCase {
  constructor(
    private readonly userEmailRepository: UserEmailRepository,
    private readonly authIdentityRepository: AuthIdentityRepository,
    private readonly verifyPasswordUseCase: VerifyPasswordUseCase,
    private readonly issueAuthTokensUseCase: IssueAuthTokensUseCase,
  ) {}

  async execute(input: {
    email: string;
    password: string;
    deviceContext: AuthSessionDeviceContext;
  }) {
    const normalizedEmail = input.email.trim().toLowerCase();
    const userEmail =
      await this.userEmailRepository.findByEmail(normalizedEmail);

    if (!userEmail) {
      throw new UnauthorizedException({
        messageKey: 'auth.errors.invalidCredentials',
        error: 'INVALID_CREDENTIALS',
      });
    }

    const hasPatientRole = userEmail.user.roles.some(
      (role) => role.role === UserRoleType.PATIENT,
    );

    if (!hasPatientRole) {
      throw new ConflictException({
        messageKey: 'auth.errors.patientRoleRequired',
        error: 'PATIENT_ROLE_REQUIRED',
      });
    }

    if (userEmail.user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException({
        messageKey: 'auth.errors.accountNotActive',
        error: 'ACCOUNT_NOT_ACTIVE',
      });
    }

    const passwordIdentity =
      await this.authIdentityRepository.findPasswordIdentityByUserId(
        userEmail.user.id,
      );

    if (!passwordIdentity?.passwordHash) {
      throw new UnauthorizedException({
        messageKey: 'auth.errors.invalidCredentials',
        error: 'INVALID_CREDENTIALS',
      });
    }

    const isValidPassword = await this.verifyPasswordUseCase.execute(
      input.password,
      passwordIdentity.passwordHash,
    );

    if (!isValidPassword) {
      throw new UnauthorizedException({
        messageKey: 'auth.errors.invalidCredentials',
        error: 'INVALID_CREDENTIALS',
      });
    }

    await this.authIdentityRepository.touchLastUsed(passwordIdentity.id);

    return this.issueAuthTokensUseCase.execute({
      userId: userEmail.user.id,
      role: UserRoleType.PATIENT,
      deviceContext: input.deviceContext,
    });
  }
}
