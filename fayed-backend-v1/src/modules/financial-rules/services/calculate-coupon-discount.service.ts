import { Injectable } from '@nestjs/common';
import { Coupon, DiscountType } from '@prisma/client';
import { MoneyMathService } from './money-math.service';

@Injectable()
export class CalculateCouponDiscountService {
  constructor(private readonly moneyMathService: MoneyMathService) {}

  calculate(input: { grossAmount: string; coupon: Coupon }) {
    const grossAmount = this.moneyMathService.toDecimal(input.grossAmount);
    const rawDiscount =
      input.coupon.discountType === DiscountType.PERCENTAGE
        ? this.moneyMathService.percentOf(
            grossAmount,
            input.coupon.discountValue,
          )
        : this.moneyMathService.roundMoney(input.coupon.discountValue);

    const cappedDiscount = input.coupon.maxDiscountAmount
      ? this.moneyMathService.min(rawDiscount, input.coupon.maxDiscountAmount)
      : rawDiscount;
    const effectiveDiscount = this.moneyMathService.min(
      cappedDiscount,
      grossAmount,
    );

    return {
      discountAmount: effectiveDiscount.toFixed(2),
      platformDiscountShareAmount: this.moneyMathService
        .percentOf(effectiveDiscount, input.coupon.platformSharePercent)
        .toFixed(2),
      practitionerDiscountShareAmount: this.moneyMathService
        .percentOf(effectiveDiscount, input.coupon.practitionerSharePercent)
        .toFixed(2),
      platformSharePercent: this.moneyMathService
        .toDecimal(input.coupon.platformSharePercent)
        .toFixed(2),
      practitionerSharePercent: this.moneyMathService
        .toDecimal(input.coupon.practitionerSharePercent)
        .toFixed(2),
    };
  }
}
