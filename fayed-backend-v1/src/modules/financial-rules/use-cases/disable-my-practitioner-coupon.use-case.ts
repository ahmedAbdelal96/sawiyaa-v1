import { Injectable, NotFoundException } from '@nestjs/common';
import { CouponStatus, SecurityAuditOutcome } from '@prisma/client';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import { FinancialRulesMapper } from '../mappers/financial-rules.mapper';
import { CouponRepository } from '../repositories/coupon.repository';

@Injectable()
export class DisableMyPractitionerCouponUseCase {
  constructor(
    private readonly couponRepository: CouponRepository,
    private readonly financialRulesMapper: FinancialRulesMapper,
    private readonly securityAuditService: SecurityAuditService,
  ) {}

  async execute(input: { userId: string; couponId: string }) {
    const practitioner = await this.couponRepository.findPractitionerByUserId(
      input.userId,
    );

    if (!practitioner) {
      throw new NotFoundException({
        messageKey: 'practitioners.errors.profileNotFound',
        error: 'PRACTITIONER_PROFILE_NOT_FOUND',
      });
    }

    const current = await this.couponRepository.findOwnedById(
      input.couponId,
      practitioner.id,
    );

    if (!current) {
      throw new NotFoundException({
        messageKey: 'financialRules.errors.couponNotFound',
        error: 'FINANCIAL_RULE_COUPON_NOT_FOUND',
      });
    }

    const updated = await this.couponRepository.updateById(input.couponId, {
      status: CouponStatus.DISABLED,
      isActive: false,
    });

    this.securityAuditService.logAsync({
      action: 'finance.coupons.practitioner.disable.success',
      outcome: SecurityAuditOutcome.SUCCESS,
      actorUserId: input.userId,
      resourceType: 'Coupon',
      resourceId: current.id,
      targetUserId: input.userId,
      metadata: {
        practitionerId: practitioner.id,
        couponId: current.id,
        couponCode: current.code,
      },
    });

    return {
      item: this.financialRulesMapper.toCoupon(updated),
    };
  }
}
