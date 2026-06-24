import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SecurityAuditOutcome } from '@prisma/client';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import { AuthIdentityRepository } from '../repositories/auth-identity.repository';
import { VerifyPasswordUseCase } from './verify-password.use-case';
import { StepUpService } from '../services/step-up.service';

@Injectable()
export class VerifyAdminStepUpUseCase {
  constructor(
    private readonly configService: ConfigService,
    private readonly authIdentityRepository: AuthIdentityRepository,
    private readonly verifyPasswordUseCase: VerifyPasswordUseCase,
    private readonly stepUpService: StepUpService,
    private readonly securityAuditService: SecurityAuditService,
  ) {}

  async execute(input: {
    userId: string;
    sessionId: string;
    password: string;
    actorRoles: string[];
    ipAddress?: string | null;
    userAgent?: string | null;
    correlationId?: string | null;
  }): Promise<{ expiresAt: Date }> {
    const identity =
      await this.authIdentityRepository.findPasswordIdentityByUserId(
        input.userId,
      );

    if (!identity?.passwordHash) {
      this.securityAuditService.logAsync({
        action: 'security.step_up.verify.failure',
        outcome: SecurityAuditOutcome.FAILURE,
        actorUserId: input.userId,
        actorRoles: input.actorRoles,
        reason: 'PASSWORD_IDENTITY_MISSING',
        metadata: { method: 'password' },
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        correlationId: input.correlationId ?? null,
      });
      throw new UnauthorizedException({
        messageKey: 'auth.errors.invalidCredentials',
        error: 'INVALID_CREDENTIALS',
      });
    }

    const ok = await this.verifyPasswordUseCase.execute(
      input.password,
      identity.passwordHash,
    );

    if (!ok) {
      this.securityAuditService.logAsync({
        action: 'security.step_up.verify.failure',
        outcome: SecurityAuditOutcome.FAILURE,
        actorUserId: input.userId,
        actorRoles: input.actorRoles,
        reason: 'INVALID_CREDENTIALS',
        metadata: { method: 'password' },
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        correlationId: input.correlationId ?? null,
      });
      throw new UnauthorizedException({
        messageKey: 'auth.errors.invalidCredentials',
        error: 'INVALID_CREDENTIALS',
      });
    }

    const cfg = this.configService.get<{ ttlSeconds?: number }>('stepUp');
    const ttlSeconds = Math.max(60, Number(cfg?.ttlSeconds ?? 600));
    const verifiedAt = new Date();
    const expiresAt = new Date(verifiedAt.getTime() + ttlSeconds * 1000);

    await this.stepUpService.markSessionStepUpVerified({
      sessionId: input.sessionId,
      verifiedAt,
      expiresAt,
    });

    this.securityAuditService.logAsync({
      action: 'security.step_up.verify.success',
      outcome: SecurityAuditOutcome.SUCCESS,
      actorUserId: input.userId,
      actorRoles: input.actorRoles,
      metadata: {
        method: 'password',
        stepUpExpiresAt: expiresAt.toISOString(),
      },
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      correlationId: input.correlationId ?? null,
    });

    return { expiresAt };
  }
}
