import { PaymentOperationalExceptionStatus, PaymentOperationalExceptionType, PaymentProvider, SecurityAuditOutcome } from '@prisma/client';
import { PaymentOperationalExceptionService } from './payment-operational-exception.service';

describe('PaymentOperationalExceptionService', () => {
  it('opens a case idempotently and records a safe audit event', async () => {
    const tx = {
      payment: { findUnique: jest.fn().mockResolvedValue({ id: 'p1', provider: PaymentProvider.PAYMOB }) },
      paymentOperationalException: {
        upsert: jest.fn().mockResolvedValue({
          id: 'ex1', paymentId: 'p1', type: PaymentOperationalExceptionType.WEBHOOK_CONFLICT,
          status: PaymentOperationalExceptionStatus.OPEN, provider: PaymentProvider.PAYMOB,
        }),
      },
      securityAuditLog: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const prisma = { $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const audit = { recordRequired: jest.fn().mockResolvedValue(undefined) };
    const service = new PaymentOperationalExceptionService(prisma as never, audit as never);

    const result = await service.create({
      paymentId: 'p1', type: PaymentOperationalExceptionType.WEBHOOK_CONFLICT,
      reason: 'Provider status conflicted with captured payment', actorUserId: 'u1',
    });

    expect(result.id).toBe('ex1');
    expect(tx.paymentOperationalException.upsert).toHaveBeenCalled();
    expect(audit.recordRequired).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      action: 'finance.payment_exception.open', outcome: SecurityAuditOutcome.SUCCESS, resourceId: 'ex1',
    }));
  });

  it('returns the security audit trail for a case', async () => {
    const prisma = {
      paymentOperationalException: {
        findUnique: jest.fn().mockResolvedValue({ id: 'ex1', paymentId: 'p1' }),
      },
      securityAuditLog: {
        findMany: jest.fn().mockResolvedValue([{ id: 'audit-1', action: 'finance.payment_exception.open' }]),
      },
    };
    const service = new PaymentOperationalExceptionService(prisma as never, {} as never);
    const result = await service.get('ex1');
    expect(result.auditTrail).toHaveLength(1);
    expect(result.auditTrail[0].action).toBe('finance.payment_exception.open');
  });
});
