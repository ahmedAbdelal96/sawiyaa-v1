import { FinancialOperationsMapper } from './financial-operations.mapper';

describe('FinancialOperationsMapper practitioner privacy contract', () => {
  it('returns only practitioner-safe settlement fields', () => {
    const mapper = new FinancialOperationsMapper();
    const result = mapper.toPractitionerSafeSettlement({
      id: 'settlement-1',
      sourceReview: { sessionId: 'session-1' },
      finalWalletCredit: '650.00',
      walletCurrencyCode: 'EGP',
      status: 'CREDITED',
    } as any, {
      id: 'session-1',
      sessionCode: 'S-260728-0001',
      scheduledStartAt: new Date('2026-07-28T10:00:00.000Z'),
      completedAt: new Date('2026-07-28T11:00:00.000Z'),
      flowType: 'SCHEDULED',
    });

    expect(result).toEqual({
      sessionId: 'session-1',
      sessionCode: 'S-260728-0001',
      date: '2026-07-28T11:00:00.000Z',
      sessionType: 'SCHEDULED',
      amountAdded: '650.00',
      currency: 'EGP',
      status: 'CREDITED',
      payoutStatus: 'PENDING',
    });
    expect(result).not.toHaveProperty('amountAdjustments');
    expect(result).not.toHaveProperty('exchangeRate');
    expect(result).not.toHaveProperty('payoutMethodSnapshot');
  });
});
