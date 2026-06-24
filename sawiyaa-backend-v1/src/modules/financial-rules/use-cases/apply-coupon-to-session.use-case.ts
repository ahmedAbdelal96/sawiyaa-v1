import { Injectable } from '@nestjs/common';
import { CalculateSessionFinancialBreakdownUseCase } from './calculate-session-financial-breakdown.use-case';

/**
 * Coupon application is preview-only in this phase. The system persists
 * redemption later when a related payment actually succeeds.
 */
@Injectable()
export class ApplyCouponToSessionUseCase {
  constructor(
    private readonly calculateSessionFinancialBreakdownUseCase: CalculateSessionFinancialBreakdownUseCase,
  ) {}

  execute(input: { userId: string; sessionId: string; couponCode: string }) {
    return this.calculateSessionFinancialBreakdownUseCase.execute({
      userId: input.userId,
      sessionId: input.sessionId,
      couponCode: input.couponCode,
    });
  }
}
