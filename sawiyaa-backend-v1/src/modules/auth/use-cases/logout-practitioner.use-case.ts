import { Injectable } from '@nestjs/common';
import { PresenceStatus } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { PractitionerPresenceRepository } from '@modules/presence/repositories/practitioner-presence.repository';
import { UserSessionRepository } from '../repositories/user-session.repository';
import { RevokeAuthSessionUseCase } from './revoke-auth-session.use-case';

/**
 * Practitioner logout revokes the current session and clears live presence when it was the last active session.
 */
@Injectable()
export class LogoutPractitionerUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userSessionRepository: UserSessionRepository,
    private readonly practitionerPresenceRepository: PractitionerPresenceRepository,
    private readonly revokeAuthSessionUseCase: RevokeAuthSessionUseCase,
  ) {}

  async execute(sessionId: string) {
    await this.prisma.$transaction(async (tx) => {
      const session = await this.userSessionRepository.findActiveById(
        sessionId,
        tx,
      );

      if (!session) {
        return;
      }

      await this.revokeAuthSessionUseCase.execute(sessionId, tx);

      const remainingActiveSessions =
        await this.userSessionRepository.countActiveByUserId(
          session.userId,
          tx,
        );

      if (
        remainingActiveSessions === 0 &&
        session.user.practitionerProfile?.id
      ) {
        await this.practitionerPresenceRepository.updateStatus(
          session.user.practitionerProfile.id,
          PresenceStatus.OFFLINE,
          tx,
        );
      }
    });
  }
}
