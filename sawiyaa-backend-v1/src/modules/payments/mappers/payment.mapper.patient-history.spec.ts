import { PaymentMapper } from './payment.mapper';

describe('PaymentMapper patient history projection', () => {
  it('projects refund lifecycle without provider reconciliation fields', () => {
    const mapper = new PaymentMapper();
    const payment: any = {
      id: 'payment-1',
      sessionId: 'session-1',
      provider: 'PAYMOB',
      status: 'PARTIALLY_REFUNDED',
      amountSubtotal: { toString: () => '100.00' },
      amountDiscount: { toString: () => '0.00' },
      amountTotal: { toString: () => '100.00' },
      amountFromWallet: { toString: () => '0.00' },
      amountFromGateway: { toString: () => '100.00' },
      currencyCode: 'EGP',
      metadataJson: {},
      providerPaymentRef: 'provider-secret',
      providerOrderRef: 'order-secret',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      capturedAt: new Date('2026-01-01T00:01:00Z'),
      failedAt: null,
      expiredAt: null,
      session: { id: 'session-1', sessionCode: 'SES-1', status: 'CONFIRMED', expiresAt: null },
      refunds: [{
        id: 'refund-1', paymentId: 'payment-1', sessionId: 'session-1',
        refundType: 'PARTIAL', destination: 'CUSTOMER_WALLET', status: 'SUCCEEDED',
        amount: { toString: () => '40.00' }, currencyCode: 'EGP', refundReason: 'policy',
        requestedAt: new Date('2026-01-02T00:00:00Z'), processedAt: new Date('2026-01-02T00:02:00Z'),
        failedAt: null, customerWalletCreditedAt: new Date('2026-01-02T00:03:00Z'),
        createdAt: new Date('2026-01-02T00:00:00Z'), session: { sessionCode: 'SES-1' },
      }],
    };

    const result = mapper.toViewModel(payment);
    expect(result.refunds).toEqual([expect.objectContaining({
      id: 'refund-1', destination: 'CUSTOMER_WALLET', amount: '40.00',
      customerWalletCreditedAt: '2026-01-02T00:03:00.000Z',
    })]);
    expect(result.refunds[0]).not.toHaveProperty('providerRefundRef');
    expect(result.refunds[0]).not.toHaveProperty('providerReconciliationEvidence');
  });
});
