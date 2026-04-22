import { Injectable } from '@nestjs/common';
import { SessionCancellationPolicyRepository } from '../repositories/session-cancellation-policy.repository';

@Injectable()
export class GetSessionCancellationPoliciesUseCase {
  constructor(
    private readonly sessionCancellationPolicyRepository: SessionCancellationPolicyRepository,
  ) {}

  async execute() {
    const policies =
      await this.sessionCancellationPolicyRepository.listPolicies();

    return {
      items: policies.map((policy) => ({
        id: policy.id,
        bookingType: policy.bookingType,
        displayName: policy.displayName,
        isActive: policy.isActive,
        defaultRefundDestination: policy.defaultRefundDestination,
        version: policy.version,
        rules: policy.rules.map((rule) => ({
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
      })),
    };
  }
}
