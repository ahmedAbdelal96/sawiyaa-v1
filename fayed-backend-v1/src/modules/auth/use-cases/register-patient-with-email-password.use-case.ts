import { ConflictException, Injectable } from '@nestjs/common';
import { UserRoleType, UserStatus } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { HashPasswordUseCase } from './hash-password.use-case';
import { IssueAuthTokensUseCase } from './issue-auth-tokens.use-case';
import { AuthIdentityRepository } from '../repositories/auth-identity.repository';
import { UserEmailRepository } from '../repositories/user-email.repository';
import { UserRepository } from '../repositories/user.repository';
import { AuthSessionDeviceContext } from '../types/auth-session.types';

/**
 * Patient email/password registration creates the patient account baseline and issues a session immediately.
 * This flow refuses to merge into non-patient accounts to avoid silent cross-role identity coupling.
 */
@Injectable()
export class RegisterPatientWithEmailPasswordUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userRepository: UserRepository,
    private readonly userEmailRepository: UserEmailRepository,
    private readonly authIdentityRepository: AuthIdentityRepository,
    private readonly hashPasswordUseCase: HashPasswordUseCase,
    private readonly issueAuthTokensUseCase: IssueAuthTokensUseCase,
  ) {}

  async execute(input: {
    email: string;
    password: string;
    displayName?: string | null;
    deviceContext: AuthSessionDeviceContext;
  }) {
    const normalizedEmail = input.email.trim().toLowerCase();
    const existingEmail =
      await this.userEmailRepository.findByEmailForAuth(normalizedEmail);

    if (existingEmail) {
      throw new ConflictException({
        messageKey: 'auth.errors.emailAlreadyRegistered',
        error: 'EMAIL_ALREADY_REGISTERED',
      });
    }

    const passwordHash = await this.hashPasswordUseCase.execute(input.password);
    const createdUser = await this.prisma.$transaction(async (tx) => {
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
    });

    return this.issueAuthTokensUseCase.execute({
      userId: createdUser.id,
      role: UserRoleType.PATIENT,
      deviceContext: input.deviceContext,
    });
  }
}
