import { ConflictException, Injectable } from '@nestjs/common';
import {
  RefundDestination,
  Session,
  SessionCancellationBookingType,
  SessionCancellationRefundMode,
  SessionFlowType,
} from '@prisma/client';
import { SessionCancellationPolicyRepository } from '../repositories/session-cancellation-policy.repository';

export type SessionCancellationEvaluation = {
  bookingType: SessionCancellationBookingType;
  policyId: string;
  policyVersion: number;
  policyDefaultRefundDestination: RefundDestination;
  ruleId: string;
  ruleCode: string;
  ruleDisplayName: string;
  cancellationAllowed: boolean;
  refundMode: SessionCancellationRefundMode;
  refundPercent: string | null;
  refundDestination: RefundDestination | null;
  hoursBeforeStart: number;
};

@Injectable()
export class EvaluateSessionCancellationPolicyService {
  constructor(
    private readonly sessionCancellationPolicyRepository: SessionCancellationPolicyRepository,
  ) {}

  async evaluate(input: {
    session: Pick<Session, 'flowType' | 'scheduledStartAt'>;
    at?: Date;
  }): Promise<SessionCancellationEvaluation> {
    const bookingType = this.resolveBookingType(input.session.flowType);
    const scheduledStartAt = input.session.scheduledStartAt;
    if (!scheduledStartAt) {
      throw new ConflictException({
        messageKey: 'sessions.errors.cancellationPolicyMissingSessionSchedule',
        error: 'SESSION_CANCELLATION_POLICY_MISSING_SCHEDULE',
      });
    }

    const policy =
      await this.sessionCancellationPolicyRepository.findPolicyByBookingType(
        bookingType,
      );
    if (!policy || !policy.isActive) {
      throw new ConflictException({
        messageKey: 'sessions.errors.cancellationPolicyMissing',
        error: 'SESSION_CANCELLATION_POLICY_MISSING',
        messageParams: { bookingType },
      });
    }

    const now = input.at ?? new Date();
    const hoursBeforeStart =
      (scheduledStartAt.getTime() - now.getTime()) / (1000 * 60 * 60);
    const matchingRule = policy.rules.find((rule) => {
      const min = rule.minHoursBeforeStart ?? Number.NEGATIVE_INFINITY;
      const max = rule.maxHoursBeforeStart ?? Number.POSITIVE_INFINITY;
      return hoursBeforeStart >= min && hoursBeforeStart <= max;
    });

    if (!matchingRule) {
      throw new ConflictException({
        messageKey: 'sessions.errors.cancellationPolicyNoMatchingRule',
        error: 'SESSION_CANCELLATION_POLICY_NO_MATCHING_RULE',
      });
    }

    return {
      bookingType,
      policyId: policy.id,
      policyVersion: policy.version,
      policyDefaultRefundDestination: policy.defaultRefundDestination,
      ruleId: matchingRule.id,
      ruleCode: matchingRule.code,
      ruleDisplayName: matchingRule.displayName,
      cancellationAllowed: matchingRule.isCancellationAllowed,
      refundMode: matchingRule.refundMode,
      refundPercent: matchingRule.refundPercent?.toFixed(2) ?? null,
      refundDestination: matchingRule.isCancellationAllowed
        ? policy.defaultRefundDestination
        : null,
      hoursBeforeStart,
    };
  }

  private resolveBookingType(
    flowType: SessionFlowType,
  ): SessionCancellationBookingType {
    if (flowType === SessionFlowType.INSTANT) {
      return SessionCancellationBookingType.INSTANT;
    }
    return SessionCancellationBookingType.STANDARD;
  }
}
