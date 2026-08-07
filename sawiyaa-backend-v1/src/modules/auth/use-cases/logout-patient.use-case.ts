import { Injectable, Optional } from '@nestjs/common';
import { SecurityAuditOutcome } from '@prisma/client';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import { UserSessionRepository } from '../repositories/user-session.repository';
import { RevokeAuthSessionUseCase } from './revoke-auth-session.use-case';

/**
 * Patient logout revokes only the current session.
 */
@Injectable()
export class LogoutPatientUseCase {
  constructor(
    private readonly revokeAuthSessionUseCase: RevokeAuthSessionUseCase,
    @Optional() private readonly userSessionRepository?: UserSessionRepository,
    @Optional() private readonly securityAuditService?: SecurityAuditService,
  ) {}

  async execute(sessionId: string) {
    const session = await this.userSessionRepository?.findActiveById(sessionId);
    await this.revokeAuthSessionUseCase.execute(sessionId);
    if (session) {
      this.securityAuditService?.logAsync({
        action: 'auth.patient.logout.success',
        outcome: SecurityAuditOutcome.SUCCESS,
        actorUserId: session.userId,
        actorRoles: session.user.roles.map((role) => role.role),
        resourceType: 'Session',
        resourceId: sessionId,
        reason: 'SESSION_REVOKED',
      });
    }
  }
}
