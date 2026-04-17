import { Injectable } from '@nestjs/common';
import { RedeemCouponService } from '../services/redeem-coupon.service';

@Injectable()
export class RedeemCouponUseCase {
  constructor(private readonly redeemCouponService: RedeemCouponService) {}

  execute(input: Parameters<RedeemCouponService['redeemFromPayment']>[0]) {
    return this.redeemCouponService.redeemFromPayment(input);
  }
}
