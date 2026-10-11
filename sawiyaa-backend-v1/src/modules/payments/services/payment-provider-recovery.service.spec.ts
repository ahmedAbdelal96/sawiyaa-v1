import { PaymentProviderRecoveryService } from './payment-provider-recovery.service';
import {
  PaymentProvider,
  PaymentStatus,
  RefundDestination,
  RefundStatus,
} from '@prisma/client';

describe('PaymentProviderRecoveryService', () => {
  it('separates wallet-refund convergence from original-method provider recovery', async () => {
    const paymentFindMany = jest.fn().mockResolvedValue([{ id: 'payment_1' }]);
    const refundFindMany = jest
      .fn()
      .mockResolvedValueOnce([{ id: 'wallet_refund_1' }])
      .mockResolvedValueOnce([{ id: 'provider_refund_1' }]);
    const prisma = {
      payment: { findMany: paymentFindMany },
      refund: { findMany: refundFindMany },
    };
    const refunds = {
      reconcileWalletRefund: jest
        .fn()
        .mockResolvedValue({ id: 'wallet_refund_1' }),
      reconcileProviderRefund: jest
        .fn()
        .mockResolvedValue({ id: 'provider_refund_1' }),
    };
    const service = new PaymentProviderRecoveryService(
      prisma as never,
      undefined as never,
      { execute: jest.fn() } as never,
      { execute: jest.fn() } as never,
      refunds as never,
    );
    jest.spyOn(service, 'reconcilePayment').mockResolvedValue(null);
    service.setSchedulerActive(true);

    await expect(service.reconcileEligible(25)).resolves.toEqual({
      payments: 1,
      refunds: 2,
      walletRefunds: 1,
      providerRefunds: 1,
    });

    expect(paymentFindMany).toHaveBeenCalledWith({
      where: {
        provider: { in: [PaymentProvider.STRIPE, PaymentProvider.PAYMOB] },
        status: {
          in: [
            PaymentStatus.CREATED,
            PaymentStatus.PENDING,
            PaymentStatus.REQUIRES_ACTION,
            PaymentStatus.AUTHORIZED,
          ],
        },
      },
      orderBy: { updatedAt: 'asc' },
      take: 25,
      select: { id: true },
    });
    expect(refundFindMany).toHaveBeenNthCalledWith(1, {
      where: {
        destination: RefundDestination.CUSTOMER_WALLET,
        status: { in: [RefundStatus.REQUESTED, RefundStatus.PROCESSING] },
      },
      orderBy: { updatedAt: 'asc' },
      take: 25,
      select: { id: true },
    });
    expect(refundFindMany).toHaveBeenNthCalledWith(2, {
      where: {
        destination: RefundDestination.ORIGINAL_METHOD,
        status: RefundStatus.PROCESSING,
      },
      orderBy: { updatedAt: 'asc' },
      take: 25,
      select: { id: true },
    });
    expect(refunds.reconcileWalletRefund).toHaveBeenCalledWith(
      'wallet_refund_1',
    );
    expect(refunds.reconcileProviderRefund).toHaveBeenCalledWith(
      'provider_refund_1',
    );
    const status = service.getStatusSnapshot();
    expect(status.enabled).toBe(true);
    expect(status.running).toBe(false);
    expect(status.lastScannedCount).toBe(3);
    expect(status.lastRecoveredCount).toBe(3);
    expect(status.lastSuccessAt).not.toBeNull();
  });
});
