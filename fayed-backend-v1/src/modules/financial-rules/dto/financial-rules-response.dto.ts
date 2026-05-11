import { ApiProperty } from '@nestjs/swagger';
import {
  CommissionRuleScope,
  CouponScope,
  CouponStatus,
  DiscountType,
  MarketType,
  PaymentPurpose,
  PaymentProvider,
  SessionFlowType,
  SessionMode,
} from '@prisma/client';
import type { PaymentRegionalPricingMode } from '@common/payments/payment-region.resolver';

export class CommissionRuleItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  ruleName!: string;

  @ApiProperty({ enum: CommissionRuleScope })
  ruleScope!: CommissionRuleScope;

  @ApiProperty({ enum: MarketType })
  marketType!: MarketType;

  @ApiProperty()
  platformRatePercent!: string;

  @ApiProperty()
  practitionerRatePercent!: string;

  @ApiProperty()
  priority!: number;

  @ApiProperty()
  isDefault!: boolean;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ nullable: true })
  practitionerCountryId!: string | null;

  @ApiProperty({ nullable: true })
  patientCountryId!: string | null;

  @ApiProperty({ enum: SessionFlowType, nullable: true })
  sessionFlowType!: SessionFlowType | null;

  @ApiProperty({ enum: SessionMode, nullable: true })
  sessionMode!: SessionMode | null;

  @ApiProperty({ nullable: true })
  specialtyId!: string | null;

  @ApiProperty({ nullable: true })
  startsAt!: string | null;

  @ApiProperty({ nullable: true })
  endsAt!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class CouponItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty({ enum: CouponScope })
  couponScope!: CouponScope;

  @ApiProperty({ enum: CouponStatus })
  status!: CouponStatus;

  @ApiProperty({ enum: DiscountType })
  discountType!: DiscountType;

  @ApiProperty()
  discountValue!: string;

  @ApiProperty({ nullable: true })
  maxDiscountAmount!: string | null;

  @ApiProperty()
  platformSharePercent!: string;

  @ApiProperty()
  practitionerSharePercent!: string;

  @ApiProperty({ nullable: true })
  usageLimitTotal!: number | null;

  @ApiProperty({ nullable: true })
  usageLimitPerPatient!: number | null;

  @ApiProperty()
  currentUsageCount!: number;

  @ApiProperty()
  requiresApproval!: boolean;

  @ApiProperty({ nullable: true })
  approvedAt!: string | null;

  @ApiProperty({ nullable: true })
  startsAt!: string | null;

  @ApiProperty({ nullable: true })
  endsAt!: string | null;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ nullable: true })
  ownerPractitionerId!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class FinancialBreakdownCommissionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  platformRatePercent!: string;

  @ApiProperty()
  practitionerRatePercent!: string;
}

export class FinancialBreakdownCouponDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  discountAmount!: string;

  @ApiProperty()
  platformDiscountShareAmount!: string;

  @ApiProperty()
  practitionerDiscountShareAmount!: string;

  @ApiProperty()
  platformSharePercent!: string;

  @ApiProperty()
  practitionerSharePercent!: string;
}

export class FinancialBreakdownItemDto {
  @ApiProperty()
  sessionId!: string;

  @ApiProperty({ enum: PaymentPurpose })
  paymentPurpose!: PaymentPurpose;

  @ApiProperty()
  currency!: string;

  @ApiProperty({ enum: ['EGYPT_LOCAL', 'INTERNATIONAL'] })
  regionalPricingMode!: PaymentRegionalPricingMode;

  @ApiProperty({ enum: PaymentProvider })
  paymentProvider!: PaymentProvider;

  @ApiProperty({ nullable: true })
  resolvedCountryIsoCode!: string | null;

  @ApiProperty()
  grossAmount!: string;

  @ApiProperty()
  discountAmount!: string;

  @ApiProperty()
  netPaidAmount!: string;

  @ApiProperty()
  platformCommissionAmount!: string;

  @ApiProperty()
  practitionerShareAmount!: string;

  @ApiProperty({ type: FinancialBreakdownCommissionDto })
  commissionRule!: FinancialBreakdownCommissionDto;

  @ApiProperty({ type: FinancialBreakdownCouponDto, nullable: true })
  coupon!: FinancialBreakdownCouponDto | null;
}

export class CommissionRuleItemDataResponseDto {
  @ApiProperty({ type: CommissionRuleItemDto })
  item!: CommissionRuleItemDto;
}

export class CommissionRulesListDataResponseDto {
  @ApiProperty({ type: CommissionRuleItemDto, isArray: true })
  items!: CommissionRuleItemDto[];
}

export class CouponItemDataResponseDto {
  @ApiProperty({ type: CouponItemDto })
  item!: CouponItemDto;
}

export class FinancialBreakdownItemDataResponseDto {
  @ApiProperty({ type: FinancialBreakdownItemDto })
  item!: FinancialBreakdownItemDto;
}

export class CommissionRuleItemSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: CommissionRuleItemDataResponseDto })
  data!: CommissionRuleItemDataResponseDto;
}

export class CommissionRulesListSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: CommissionRulesListDataResponseDto })
  data!: CommissionRulesListDataResponseDto;
}

export class CouponItemSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: CouponItemDataResponseDto })
  data!: CouponItemDataResponseDto;
}

export class FinancialBreakdownItemSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: FinancialBreakdownItemDataResponseDto })
  data!: FinancialBreakdownItemDataResponseDto;
}

export class RevenueShareRuleDto {
  @ApiProperty()
  ruleId!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  platformRatePercent!: string;

  @ApiProperty()
  practitionerRatePercent!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class RevenueShareRulesItemDto {
  @ApiProperty({ type: RevenueShareRuleDto })
  local!: RevenueShareRuleDto;

  @ApiProperty({ type: RevenueShareRuleDto })
  crossBorder!: RevenueShareRuleDto;
}

export class RevenueShareRulesItemDataResponseDto {
  @ApiProperty({ type: RevenueShareRulesItemDto })
  item!: RevenueShareRulesItemDto;
}

export class RevenueShareRulesItemSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: RevenueShareRulesItemDataResponseDto })
  data!: RevenueShareRulesItemDataResponseDto;
}
