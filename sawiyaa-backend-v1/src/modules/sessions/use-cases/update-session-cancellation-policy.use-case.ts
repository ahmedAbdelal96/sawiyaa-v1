import { Injectable, NotFoundException } from '@nestjs/common';
import {
  SessionCancellationBookingType,
  SessionCancellationRefundMode,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { UpdateSessionCancellationPolicyDto } from '../dto/session-cancellation-policy.dto';
import { SessionCancellationPolicyRepository } from '../repositories/session-cancellation-policy.repository';
import { ValidateSessionCancellationPolicyRulesService } from '../services/validate-session-cancellation-policy-rules.service';

@Injectable()
export class UpdateSessionCancellationPolicyUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionCancellationPolicyRepository: SessionCancellationPolicyRepository,
    private readonly validateSessionCancellationPolicyRulesService: ValidateSessionCancellationPolicyRulesService,
  ) {}

  async execute(input: {
    bookingType: SessionCancellationBookingType;
    body: UpdateSessionCancellationPolicyDto;
  }) {
    this.validateSessionCancellationPolicyRulesService.assertPolicyUpdateInput({
      defaultRefundDestination: input.body.defaultRefundDestination,
      rules: input.body.rules,
    });

    const existing =
      await this.sessionCancellationPolicyRepository.findPolicyByBookingType(
        input.bookingType,
      );

    if (!existing) {
      throw new NotFoundException({
        messageKey: 'sessions.errors.cancellationPolicyMissing',
        error: 'SESSION_CANCELLATION_POLICY_MISSING',
        messageParams: { bookingType: input.bookingType },
      });
    }

    const updated = await this.prisma.$transaction((tx) =>
      this.sessionCancellationPolicyRepository.updatePolicy({
        bookingType: input.bookingType,
        displayName: input.body.displayName.trim(),
        isActive: input.body.isActive,
        defaultRefundDestination: input.body.defaultRefundDestination,
        rules: input.body.rules.map((rule) => ({
          code: rule.code.trim().toUpperCase(),
          displayName: rule.displayName.trim(),
          priority: rule.priority,
          minHoursBeforeStart: rule.minHoursBeforeStart ?? null,
          maxHoursBeforeStart: rule.maxHoursBeforeStart ?? null,
          isCancellationAllowed: rule.isCancellationAllowed,
          refundMode: rule.refundMode,
          refundPercent:
            rule.refundMode === SessionCancellationRefundMode.PERCENTAGE
              ? (rule.refundPercent?.toFixed(2) ?? null)
              : null,
          isActive: rule.isActive,
        })),
        tx,
      }),
    );

    return {
      item: {
        id: updated.id,
        bookingType: updated.bookingType,
        displayName: updated.displayName,
        isActive: updated.isActive,
        defaultRefundDestination: updated.defaultRefundDestination,
        version: updated.version,
        rules: updated.rules.map((rule) => ({
          id: rule.id,
          code: rule.code,
          displayName: rule.displayName,
          priority: rule.priority,
          minHoursBeforeStart: rule.minHoursBeforeStart,
          maxHoursBeforeStart: rule.maxHoursBeforeStart,
          isCancellationAllowed: rule.isCancellationAllowed,
          refundMode: rule.refundMode,
          refundPercent: rule.refundPercent?.toFixed(2) ?? null,
          isActive: rule.isActive,
        })),
      },
    };
  }
}
