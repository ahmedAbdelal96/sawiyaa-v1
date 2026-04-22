import { Injectable, NotFoundException } from '@nestjs/common';
import { FinancialRulesMapper } from '../mappers/financial-rules.mapper';
import { CouponRepository } from '../repositories/coupon.repository';
import { FinancialSessionRepository } from '../repositories/financial-session.repository';
import { ValidateCouponEligibilityService } from '../services/validate-coupon-eligibility.service';
import { normalizeCouponCode } from '../utils/normalize-financial-identifiers.util';

@Injectable()
export class ValidateCouponUseCase {
  constructor(
    private readonly couponRepository: CouponRepository,
    private readonly financialSessionRepository: FinancialSessionRepository,
    private readonly validateCouponEligibilityService: ValidateCouponEligibilityService,
    private readonly financialRulesMapper: FinancialRulesMapper,
  ) {}

  async execute(input: {
    userId: string;
    sessionId: string;
    couponCode: string;
  }) {
    const session =
      await this.financialSessionRepository.findPatientOwnedSession(
        input.sessionId,
        input.userId,
      );

    if (!session) {
      throw new NotFoundException({
        messageKey: 'financialRules.errors.sessionNotFound',
        error: 'FINANCIAL_RULE_SESSION_NOT_FOUND',
      });
    }

    const coupon = await this.couponRepository.findByCode(
      normalizeCouponCode(input.couponCode),
    );
    const validated =
      await this.validateCouponEligibilityService.validateForSession({
        coupon,
        session: {
          id: session.id,
          flowType: session.flowType,
          sessionMode: session.sessionMode,
          durationMinutes: session.durationMinutes,
          practitioner: session.practitioner,
          patient: session.patient,
        },
      });

    return {
      item: this.financialRulesMapper.toCoupon(validated),
    };
  }
}
