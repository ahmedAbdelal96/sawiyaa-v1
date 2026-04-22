import { BadRequestException, Injectable } from '@nestjs/common';
import {
  RefundDestination,
  SessionCancellationRefundMode,
} from '@prisma/client';
import { UpdateSessionCancellationPolicyRuleDto } from '../dto/session-cancellation-policy.dto';

@Injectable()
export class ValidateSessionCancellationPolicyRulesService {
  assertPolicyUpdateInput(input: {
    defaultRefundDestination: RefundDestination;
    rules: UpdateSessionCancellationPolicyRuleDto[];
  }) {
    if (input.defaultRefundDestination !== RefundDestination.CUSTOMER_WALLET) {
      throw new BadRequestException({
        messageKey:
          'sessions.errors.cancellationOriginalMethodRefundNotSupported',
        error: 'SESSION_CANCELLATION_ORIGINAL_METHOD_REFUND_NOT_SUPPORTED',
      });
    }

    if (!input.rules.length) {
      throw new BadRequestException({
        messageKey: 'sessions.errors.cancellationPolicyMustHaveRules',
        error: 'SESSION_CANCELLATION_POLICY_RULES_REQUIRED',
      });
    }

    this.assertRuleCodesUnique(input.rules);
    this.assertRuleBoundariesValid(input.rules);
    this.assertRuleRefundSemantics(input.rules);
    this.assertNoActiveRangeOverlap(input.rules);
  }

  private assertRuleCodesUnique(
    rules: UpdateSessionCancellationPolicyRuleDto[],
  ) {
    const seen = new Set<string>();
    for (const rule of rules) {
      const normalizedCode = rule.code.trim().toUpperCase();
      if (seen.has(normalizedCode)) {
        throw new BadRequestException({
          messageKey: 'sessions.errors.cancellationPolicyDuplicateRuleCode',
          error: 'SESSION_CANCELLATION_POLICY_DUPLICATE_RULE_CODE',
          messageParams: { code: normalizedCode },
        });
      }
      seen.add(normalizedCode);
    }
  }

  private assertRuleBoundariesValid(
    rules: UpdateSessionCancellationPolicyRuleDto[],
  ) {
    for (const rule of rules) {
      const min = rule.minHoursBeforeStart;
      const max = rule.maxHoursBeforeStart;
      if (min != null && max != null && min > max) {
        throw new BadRequestException({
          messageKey: 'sessions.errors.cancellationPolicyInvalidRuleWindow',
          error: 'SESSION_CANCELLATION_POLICY_INVALID_RULE_WINDOW',
          messageParams: { code: rule.code },
        });
      }
    }
  }

  private assertRuleRefundSemantics(
    rules: UpdateSessionCancellationPolicyRuleDto[],
  ) {
    for (const rule of rules) {
      if (!rule.isCancellationAllowed) {
        if (rule.refundMode !== SessionCancellationRefundMode.NONE) {
          throw new BadRequestException({
            messageKey: 'sessions.errors.cancellationPolicyInvalidRefundMode',
            error: 'SESSION_CANCELLATION_POLICY_INVALID_REFUND_MODE',
            messageParams: { code: rule.code },
          });
        }
        if (rule.refundPercent != null && rule.refundPercent !== 0) {
          throw new BadRequestException({
            messageKey:
              'sessions.errors.cancellationPolicyInvalidRefundPercent',
            error: 'SESSION_CANCELLATION_POLICY_INVALID_REFUND_PERCENT',
            messageParams: { code: rule.code },
          });
        }
        continue;
      }

      if (rule.refundMode === SessionCancellationRefundMode.NONE) {
        if (rule.refundPercent != null && rule.refundPercent !== 0) {
          throw new BadRequestException({
            messageKey:
              'sessions.errors.cancellationPolicyInvalidRefundPercent',
            error: 'SESSION_CANCELLATION_POLICY_INVALID_REFUND_PERCENT',
            messageParams: { code: rule.code },
          });
        }
      }

      if (rule.refundMode === SessionCancellationRefundMode.PERCENTAGE) {
        if (rule.refundPercent == null) {
          throw new BadRequestException({
            messageKey:
              'sessions.errors.cancellationPolicyRefundPercentRequired',
            error: 'SESSION_CANCELLATION_POLICY_REFUND_PERCENT_REQUIRED',
            messageParams: { code: rule.code },
          });
        }
      }
    }
  }

  private assertNoActiveRangeOverlap(
    rules: UpdateSessionCancellationPolicyRuleDto[],
  ) {
    const active = rules.filter((rule) => rule.isActive);
    for (let i = 0; i < active.length; i += 1) {
      for (let j = i + 1; j < active.length; j += 1) {
        if (this.rangesOverlap(active[i], active[j])) {
          throw new BadRequestException({
            messageKey: 'sessions.errors.cancellationPolicyOverlappingRules',
            error: 'SESSION_CANCELLATION_POLICY_OVERLAPPING_RULES',
            messageParams: {
              firstRuleCode: active[i].code,
              secondRuleCode: active[j].code,
            },
          });
        }
      }
    }
  }

  private rangesOverlap(
    left: UpdateSessionCancellationPolicyRuleDto,
    right: UpdateSessionCancellationPolicyRuleDto,
  ) {
    const leftMin = left.minHoursBeforeStart ?? Number.NEGATIVE_INFINITY;
    const leftMax = left.maxHoursBeforeStart ?? Number.POSITIVE_INFINITY;
    const rightMin = right.minHoursBeforeStart ?? Number.NEGATIVE_INFINITY;
    const rightMax = right.maxHoursBeforeStart ?? Number.POSITIVE_INFINITY;

    return leftMin <= rightMax && rightMin <= leftMax;
  }
}
