import { Injectable, UnauthorizedException } from '@nestjs/common';
import { SecurityAuditOutcome, UserRoleType } from '@prisma/client';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import { AuthIdentityRepository } from '@modules/auth/repositories/auth-identity.repository';
import { VerifyPasswordUseCase } from '@modules/auth/use-cases/verify-password.use-case';

/**
 * Verifies a password for one gateway-control command.  It deliberately does
 * not mint a session elevation token: callers must invoke it for every write.
 */
@Injectable()
export class PaymentGatewayPasswordConfirmationService {
  constructor(
    private readonly authIdentityRepository: AuthIdentityRepository,
    private readonly verifyPasswordUseCase: VerifyPasswordUseCase,
    private readonly securityAuditService: SecurityAuditService,
  ) {}

  async verify(input: {
    actorUserId: string;
    actorRoles: string[];
    currentPassword: string;
    operation: string;
    targetId: string;
    requestId: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<void> {
    const identity =
      await this.authIdentityRepository.findPasswordIdentityByUserId(
        input.actorUserId,
      );
    const valid =
      Boolean(identity?.passwordHash) &&
      (await this.verifyPasswordUseCase.execute(
        input.currentPassword,
        identity!.passwordHash!,
      ));

    if (valid) return;

    this.securityAuditService.logAsync({
      action: 'finance.payment_gateway_control.password_verification.denied',
      outcome: SecurityAuditOutcome.FAILURE,
      actorUserId: input.actorUserId,
      actorRoles: input.actorRoles,
      resourceType: 'PAYMENT_GATEWAY_CONTROL',
      resourceId: input.targetId,
      requestId: input.requestId,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      reason: 'STEP_UP_VERIFICATION_FAILED',
      metadata: { operation: input.operation },
    });

    // Keep the response deliberately indistinguishable from an unavailable
    // password identity (including OAuth-only accounts).
    throw new UnauthorizedException({
      messageKey: 'auth.errors.invalidCredentials',
      error: 'INVALID_CREDENTIALS',
    });
  }
}
