import { Module } from '@nestjs/common';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { AdminCommissionRulesController } from './controllers/admin-commission-rules.controller';
import { AdminRevenueShareRulesController } from './controllers/admin-revenue-share-rules.controller';
import { AdminCouponsController } from './controllers/admin-coupons.controller';
import { PatientSessionFinancialRulesController } from './controllers/patient-session-financial-rules.controller';
import { FinancialRulesMapper } from './mappers/financial-rules.mapper';
import { CommissionRuleRepository } from './repositories/commission-rule.repository';
import { CouponRedemptionRepository } from './repositories/coupon-redemption.repository';
import { CouponRepository } from './repositories/coupon.repository';
import { FinancialSessionRepository } from './repositories/financial-session.repository';
import { CalculateCouponDiscountService } from './services/calculate-coupon-discount.service';
import { CalculateSessionFinancialBreakdownService } from './services/calculate-session-financial-breakdown.service';
import { MoneyMathService } from './services/money-math.service';
import { RedeemCouponService } from './services/redeem-coupon.service';
import { ResolveCommissionRuleService } from './services/resolve-commission-rule.service';
import { ValidateCommissionRuleDefinitionService } from './services/validate-commission-rule-definition.service';
import { ValidateCouponEligibilityService } from './services/validate-coupon-eligibility.service';
import { ApplyCouponToSessionUseCase } from './use-cases/apply-coupon-to-session.use-case';
import { CalculateSessionFinancialBreakdownUseCase } from './use-cases/calculate-session-financial-breakdown.use-case';
import { CreateCommissionRuleUseCase } from './use-cases/create-commission-rule.use-case';
import { CreateCouponUseCase } from './use-cases/create-coupon.use-case';
import { ListCommissionRulesUseCase } from './use-cases/list-commission-rules.use-case';
import { GetRevenueShareRulesUseCase } from './use-cases/get-revenue-share-rules.use-case';
import { RedeemCouponUseCase } from './use-cases/redeem-coupon.use-case';
import { ResolveCommissionForSessionUseCase } from './use-cases/resolve-commission-for-session.use-case';
import { UpdateRevenueShareRulesUseCase } from './use-cases/update-revenue-share-rules.use-case';
import { ValidateCouponUseCase } from './use-cases/validate-coupon.use-case';

/**
 * Financial Rules Module owns business-level commission and coupon resolution.
 * It intentionally stops before ledger posting, settlement generation, or wallet accounting.
 */
@Module({
  controllers: [
    AdminCommissionRulesController,
    AdminRevenueShareRulesController,
    AdminCouponsController,
    PatientSessionFinancialRulesController,
  ],
  providers: [
    JwtAccessAuthGuard,
    RolesGuard,
    FinancialRulesMapper,
    FinancialSessionRepository,
    CommissionRuleRepository,
    CouponRepository,
    CouponRedemptionRepository,
    MoneyMathService,
    ValidateCommissionRuleDefinitionService,
    ResolveCommissionRuleService,
    ValidateCouponEligibilityService,
    CalculateCouponDiscountService,
    CalculateSessionFinancialBreakdownService,
    RedeemCouponService,
    CreateCommissionRuleUseCase,
    ListCommissionRulesUseCase,
    GetRevenueShareRulesUseCase,
    UpdateRevenueShareRulesUseCase,
    ResolveCommissionForSessionUseCase,
    CreateCouponUseCase,
    ValidateCouponUseCase,
    ApplyCouponToSessionUseCase,
    RedeemCouponUseCase,
    CalculateSessionFinancialBreakdownUseCase,
  ],
  exports: [
    CalculateSessionFinancialBreakdownService,
    RedeemCouponUseCase,
    ResolveCommissionRuleService,
    MoneyMathService,
  ],
})
export class FinancialRulesModule {}
