import { BadRequestException, Injectable } from '@nestjs/common';
import { findStandardPackagePlan } from '../package-plan.catalog';

@Injectable()
export class ValidatePackagePlanService {
  validateStandardPlan(input: {
    code: string;
    sessionCount: number;
    discountPercent: number;
  }): void {
    const plan = findStandardPackagePlan(input.code.trim().toUpperCase());

    if (!plan) {
      throw new BadRequestException({
        messageKey: 'packagePlans.errors.invalidCode',
        error: 'PACKAGE_PLAN_INVALID_CODE',
      });
    }

    if (input.sessionCount !== plan.sessionCount) {
      throw new BadRequestException({
        messageKey: 'packagePlans.errors.invalidSessionCount',
        error: 'PACKAGE_PLAN_INVALID_SESSION_COUNT',
      });
    }

    if (input.discountPercent !== plan.discountPercent) {
      throw new BadRequestException({
        messageKey: 'packagePlans.errors.invalidDiscountPercent',
        error: 'PACKAGE_PLAN_INVALID_DISCOUNT_PERCENT',
      });
    }
  }
}
