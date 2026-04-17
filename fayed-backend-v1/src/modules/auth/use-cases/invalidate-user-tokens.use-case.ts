import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { UserRepository } from '../repositories/user.repository';
import { UserSessionRepository } from '../repositories/user-session.repository';

/**
 * This use case performs coarse-grained auth invalidation for a user.
 * It increments tokenVersion and revokes all active sessions together, so any
 * older JWT becomes invalid even before every client attempts a refresh.
 *
 * Use this for security-sensitive events such as password reset, password change,
 * logout-all-sessions, and admin force logout all. Do not use it for single-session
 * logout, because that flow should revoke only the current session row.
 */
@Injectable()
export class InvalidateUserTokensUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userRepository: UserRepository,
    private readonly userSessionRepository: UserSessionRepository,
  ) {}

  async execute(userId: string, tx?: Prisma.TransactionClient) {
    if (tx) {
      await this.userRepository.incrementTokenVersion(userId, tx);
      await this.userSessionRepository.revokeAllActiveForUser(userId, tx);
      return;
    }

    await this.prisma.$transaction(async (transaction) => {
      await this.userRepository.incrementTokenVersion(userId, transaction);
      await this.userSessionRepository.revokeAllActiveForUser(
        userId,
        transaction,
      );
    });
  }
}
