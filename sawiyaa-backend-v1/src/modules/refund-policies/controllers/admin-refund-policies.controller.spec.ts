import { RefundPolicyType } from '@prisma/client';
import { AdminRefundPoliciesController } from './admin-refund-policies.controller';

describe('AdminRefundPoliciesController', () => {
  const refundPolicyService = {
    listPolicies: jest.fn().mockResolvedValue({ items: [] }),
    getPolicy: jest.fn().mockResolvedValue({ item: null }),
    updatePolicy: jest.fn().mockResolvedValue({ item: null }),
    createClause: jest.fn().mockResolvedValue({ item: null }),
    updateClause: jest.fn().mockResolvedValue({ item: null }),
    deleteClause: jest.fn().mockResolvedValue({ item: null }),
    reorderClauses: jest.fn().mockResolvedValue({ item: null }),
  } as never;

  const controller = new AdminRefundPoliciesController(refundPolicyService);

  it('routes list and edit actions through the service', async () => {
    await controller.listPolicies();
    await controller.getPolicy(RefundPolicyType.SESSION);
    await controller.updatePolicy(RefundPolicyType.SESSION, {
      titleAr: 'a',
      titleEn: 'b',
    });
    await controller.createClause(RefundPolicyType.SESSION, {
      bodyAr: 'a',
      bodyEn: 'b',
    });
    await controller.updateClause(RefundPolicyType.SESSION, 'clause_1', {
      bodyAr: 'a',
      bodyEn: 'b',
    });
    await controller.deleteClause(RefundPolicyType.SESSION, 'clause_1');
    await controller.reorderClauses(RefundPolicyType.SESSION, { items: [] });

    expect(refundPolicyService.listPolicies).toHaveBeenCalledTimes(1);
    expect(refundPolicyService.getPolicy).toHaveBeenCalledTimes(1);
    expect(refundPolicyService.updatePolicy).toHaveBeenCalledTimes(1);
    expect(refundPolicyService.createClause).toHaveBeenCalledTimes(1);
    expect(refundPolicyService.updateClause).toHaveBeenCalledTimes(1);
    expect(refundPolicyService.deleteClause).toHaveBeenCalledTimes(1);
    expect(refundPolicyService.reorderClauses).toHaveBeenCalledTimes(1);
  });
});
