import { Injectable, Optional } from '@nestjs/common';
import { PresenceStatus, SecurityAuditOutcome } from '@prisma/client';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
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
    @Optional() private readonly securityAuditService?: SecurityAuditService,
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

      this.securityAuditService?.logAsync({
        action: 'auth.practitioner.logout.success',
        outcome: SecurityAuditOutcome.SUCCESS,
        actorUserId: session.userId,
        actorRoles: session.user.roles.map((role) => role.role),
        resourceType: 'Session',
        resourceId: sessionId,
        reason: 'SESSION_REVOKED',
      });
    });
  }
}
