import { BadRequestException } from '@nestjs/common';
import { STANDARD_PACKAGE_PLANS } from '../package-plan.catalog';
import { ValidatePackagePlanService } from './validate-package-plan.service';

describe('ValidatePackagePlanService', () => {
  const service = new ValidatePackagePlanService();

  it.each(STANDARD_PACKAGE_PLANS)(
    'accepts standard package plan %s',
    (plan) => {
      expect(() =>
        service.validateStandardPlan({
          code: plan.code,
          sessionCount: plan.sessionCount,
          discountPercent: plan.discountPercent,
        }),
      ).not.toThrow();
    },
  );

  it('rejects an unknown plan code', () => {
    expect(() =>
      service.validateStandardPlan({
        code: 'INVALID',
        sessionCount: 4,
        discountPercent: 10,
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects a mismatched session count', () => {
    expect(() =>
      service.validateStandardPlan({
        code: 'SESSIONS_4',
        sessionCount: 6,
        discountPercent: 10,
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects a mismatched discount percent', () => {
    expect(() =>
      service.validateStandardPlan({
        code: 'SESSIONS_4',
        sessionCount: 4,
        discountPercent: 15,
      }),
    ).toThrow(BadRequestException);
  });
});
