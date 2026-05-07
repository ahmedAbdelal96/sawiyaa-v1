import { ParseEnumPipe } from '@nestjs/common';
import { RefundPolicyType } from '@prisma/client';
import { PublicRefundPoliciesController } from './public-refund-policies.controller';

describe('PublicRefundPoliciesController', () => {
  const refundPolicyService = {
    getPublicCurrent: jest.fn().mockResolvedValue({ items: [] }),
    getPublicPolicy: jest.fn().mockResolvedValue({ item: null }),
  } as never;

  const controller = new PublicRefundPoliciesController(refundPolicyService);

  it('routes the current and typed policy endpoints through the service', async () => {
    await controller.listCurrent();
    await controller.getSessionPolicy();
    await controller.getPackagePolicy();
    await controller.getByType(RefundPolicyType.SESSION);

    expect(refundPolicyService.getPublicCurrent).toHaveBeenCalledTimes(1);
    expect(refundPolicyService.getPublicPolicy).toHaveBeenCalledTimes(3);
  });

  it('rejects invalid policy types safely through enum parsing', async () => {
    const pipe = new ParseEnumPipe(RefundPolicyType);

    await expect(
      pipe.transform('not-a-policy-type', {
        type: 'param',
        metatype: String,
        data: 'policyType',
      } as never),
    ).rejects.toBeDefined();
  });
});
