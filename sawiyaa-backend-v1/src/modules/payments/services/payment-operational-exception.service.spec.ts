import { PaymentOperationalExceptionStatus, PaymentOperationalExceptionType, PaymentProvider, SecurityAuditOutcome } from '@prisma/client';
import { PaymentOperationalExceptionService } from './payment-operational-exception.service';

describe('PaymentOperationalExceptionService', () => {
  it('creates one system case for an automatic anomaly and preserves closed cases on replay', async () => {
    const created = {
      id: 'ex-auto',
      paymentId: 'p1',
      type: PaymentOperationalExceptionType.LATE_PROVIDER_SUCCESS,
      status: PaymentOperationalExceptionStatus.OPEN,
      provider: PaymentProvider.PAYMOB,
    };
    const tx = {
      payment: { findUnique: jest.fn().mockResolvedValue({ id: 'p1', provider: PaymentProvider.PAYMOB }) },
      paymentOperationalException: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(created),
      },
    };
    const prisma = { $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)), paymentOperationalException: { findUnique: jest.fn() } };
    const audit = { recordRequired: jest.fn().mockResolvedValue(undefined) };
    const service = new PaymentOperationalExceptionService(prisma as never, audit as never);

    const result = await service.createAutomatic({
      paymentId: 'p1',
      type: PaymentOperationalExceptionType.LATE_PROVIDER_SUCCESS,
      reason: 'Provider success arrived after expiry.',
      dedupeKey: 'late-success:p1:event-1',
      source: 'PAYMENT_WEBHOOK',
    });

    expect(result).toEqual({ exception: created, created: true });
    expect(tx.paymentOperationalException.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ dedupeKey: 'late-success:p1:event-1', createdByUserId: null }),
    }));
    expect(audit.recordRequired).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      actorType: 'SYSTEM',
      source: 'PAYMENT_WEBHOOK',
    }));
  });

  it('returns the existing case when a concurrent automatic insert loses the unique-key race', async () => {
    const existing = {
      id: 'ex-existing',
      paymentId: 'p1',
      type: PaymentOperationalExceptionType.RECONCILIATION_ISSUE,
      status: PaymentOperationalExceptionStatus.RESOLVED,
      provider: PaymentProvider.STRIPE,
    };
    const prisma = {
      $transaction: jest.fn().mockRejectedValue({ code: 'P2002' }),
      paymentOperationalException: { findUnique: jest.fn().mockResolvedValue(existing) },
    };
    const service = new PaymentOperationalExceptionService(prisma as never, {} as never);

    await expect(service.createAutomatic({
      paymentId: 'p1',
      type: PaymentOperationalExceptionType.RECONCILIATION_ISSUE,
      reason: 'Reconciliation issue remains unresolved.',
      dedupeKey: 'reconciliation:issue-1',
      source: 'SYSTEM',
    })).resolves.toEqual({ exception: existing, created: false });
  });

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
