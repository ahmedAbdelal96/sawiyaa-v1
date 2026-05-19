import {
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
import { ADMIN_AUTH_ROLE_TYPES } from '../utils/auth-role.util';

/**
 * Admin auth is baseline-only: existing admin accounts can login, refresh, and logout.
 * There is no admin self-registration in this module.
 */
@Injectable()
export class LoginAdminUseCase {
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
      await this.userEmailRepository.findByEmailForAuth(normalizedEmail);

    if (!userEmail) {
      throw new UnauthorizedException({
        messageKey: 'auth.errors.invalidCredentials',
        error: 'INVALID_CREDENTIALS',
      });
    }

    const adminRole =
      userEmail.user.roles.find((role) =>
        ADMIN_AUTH_ROLE_TYPES.includes(role.role),
      )?.role ?? null;

    if (!adminRole) {
      throw new ForbiddenException({
        messageKey: 'auth.errors.adminRoleRequired',
        error: 'ADMIN_ROLE_REQUIRED',
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
      role: adminRole,
      deviceContext: input.deviceContext,
    });
  }
}
