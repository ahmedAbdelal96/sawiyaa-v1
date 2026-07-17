import { CustomerWalletAccountingService } from './customer-wallet-accounting.service';

describe('CustomerWalletAccountingService', () => {
  it('locks refund credit scope before creating a refund wallet credit', async () => {
    const tx = {
      $executeRaw: jest.fn().mockResolvedValue(undefined),
    } as any;
    const customerWalletRepository = {
      upsertWallet: jest.fn().mockResolvedValue({
        id: 'wallet_1',
      }),
      creditAvailableBalance: jest.fn().mockResolvedValue({}),
    };
    const customerWalletEntryRepository = {
      findRefundCreditEntry: jest.fn().mockResolvedValue(null),
      createEntry: jest.fn().mockResolvedValue({
        id: 'entry_1',
      }),
    };
    const customerWalletReservationRepository = {
      findByPaymentId: jest.fn(),
      createReservation: jest.fn(),
      markCaptured: jest.fn(),
      markReleased: jest.fn(),
    };
    const service = new CustomerWalletAccountingService(
      {
        $transaction: jest.fn(),
      } as never,
      customerWalletRepository as never,
      customerWalletEntryRepository as never,
      customerWalletReservationRepository as never,
    );

    await service.creditRefundToWallet({
      patientId: 'patient_1',
      paymentId: 'payment_1',
      refundId: 'refund_1',
      sessionId: 'session_1',
      currencyCode: 'USD',
      amount: '10.00',
      tx,
    });

    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
    expect(String(tx.$executeRaw.mock.calls[0][0][0])).toContain(
      'SELECT pg_advisory_xact_lock',
    );
    expect(customerWalletRepository.upsertWallet).toHaveBeenCalledWith(
      expect.objectContaining({
        patientId: 'patient_1',
        currencyCode: 'USD',
      }),
      tx,
    );
    expect(customerWalletEntryRepository.findRefundCreditEntry).toHaveBeenCalledWith(
      'refund_1',
      tx,
    );
    expect(customerWalletRepository.creditAvailableBalance).toHaveBeenCalledWith(
      'wallet_1',
      '10.00',
      tx,
    );
    expect(customerWalletEntryRepository.createEntry).toHaveBeenCalledTimes(1);
  });

  it('returns the existing refund credit entry without duplicating balance updates', async () => {
    const tx = {
      $executeRaw: jest.fn().mockResolvedValue(undefined),
    } as any;
    const existing = {
      id: 'entry_1',
    };
    const customerWalletRepository = {
      upsertWallet: jest.fn().mockResolvedValue({
        id: 'wallet_1',
      }),
      creditAvailableBalance: jest.fn().mockResolvedValue({}),
    };
    const customerWalletEntryRepository = {
      findRefundCreditEntry: jest.fn().mockResolvedValue(existing),
      createEntry: jest.fn().mockResolvedValue(existing),
    };
    const customerWalletReservationRepository = {
      findByPaymentId: jest.fn(),
      createReservation: jest.fn(),
      markCaptured: jest.fn(),
      markReleased: jest.fn(),
    };
    const service = new CustomerWalletAccountingService(
      {
        $transaction: jest.fn(),
      } as never,
      customerWalletRepository as never,
      customerWalletEntryRepository as never,
      customerWalletReservationRepository as never,
    );

    const result = await service.creditRefundToWallet({
      patientId: 'patient_1',
      paymentId: 'payment_1',
      refundId: 'refund_1',
      sessionId: 'session_1',
      currencyCode: 'USD',
      amount: '10.00',
      tx,
    });

    expect(result).toBe(existing);
    expect(customerWalletRepository.upsertWallet).not.toHaveBeenCalled();
    expect(customerWalletRepository.creditAvailableBalance).not.toHaveBeenCalled();
    expect(customerWalletEntryRepository.createEntry).not.toHaveBeenCalled();
  });
});
