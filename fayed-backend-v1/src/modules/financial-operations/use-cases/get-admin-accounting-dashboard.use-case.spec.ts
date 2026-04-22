import { JournalEntrySourceType, Prisma } from '@prisma/client';
import { GetAdminAccountingDashboardUseCase } from './get-admin-accounting-dashboard.use-case';
import { PLATFORM_LEDGER_ACCOUNT_CODES } from '../types/accounting.types';

describe('GetAdminAccountingDashboardUseCase', () => {
  it('builds kpis and trends from journal data', async () => {
    const repository = {
      listJournalEntriesInRange: jest.fn().mockResolvedValue([
        {
          id: 'j-payment',
          sourceType: JournalEntrySourceType.PAYMENT_CAPTURED,
          sourceId: 'payment-1',
          occurredAt: new Date('2026-04-20T09:00:00.000Z'),
          createdAt: new Date('2026-04-20T09:00:00.000Z'),
          currencyCode: 'EGP',
          metadataJson: {
            amountTotal: '100.00',
          },
          lines: [
            {
              direction: 'CREDIT',
              amount: new Prisma.Decimal('20.00'),
              ledgerAccount: { code: PLATFORM_LEDGER_ACCOUNT_CODES.platformRevenue },
            },
            {
              direction: 'CREDIT',
              amount: new Prisma.Decimal('10.00'),
              ledgerAccount: { code: PLATFORM_LEDGER_ACCOUNT_CODES.vatPayable },
            },
            {
              direction: 'DEBIT',
              amount: new Prisma.Decimal('2.00'),
              ledgerAccount: { code: PLATFORM_LEDGER_ACCOUNT_CODES.gatewayFeesExpense },
            },
            {
              direction: 'CREDIT',
              amount: new Prisma.Decimal('50.00'),
              ledgerAccount: {
                code: 'PRACTITIONER_PAYABLE',
                scope: 'PRACTITIONER',
                accountType: 'LIABILITY',
              },
            },
          ],
        },
        {
          id: 'j-refund',
          sourceType: JournalEntrySourceType.REFUND_SUCCEEDED,
          sourceId: 'refund-1',
          occurredAt: new Date('2026-04-21T09:00:00.000Z'),
          createdAt: new Date('2026-04-21T09:00:00.000Z'),
          currencyCode: 'EGP',
          metadataJson: {
            refundAmount: '15.00',
          },
          lines: [],
        },
      ]),
      listRecentJournalEntries: jest.fn().mockResolvedValue([]),
      listPractitionerLiabilityLinesUntil: jest.fn().mockResolvedValue([
        { direction: 'CREDIT', amount: new Prisma.Decimal('50.00') },
        { direction: 'DEBIT', amount: new Prisma.Decimal('10.00') },
      ]),
    };

    const useCase = new GetAdminAccountingDashboardUseCase(repository as never);
    const result = await useCase.execute({
      from: '2026-04-20T00:00:00.000Z',
      to: '2026-04-21T23:59:59.999Z',
      currencyCode: 'egp',
      recentLimit: 5,
    });

    expect(result.kpis.grossInflow).toBe('100.00');
    expect(result.kpis.platformRevenue).toBe('20.00');
    expect(result.kpis.refundsTotal).toBe('15.00');
    expect(result.kpis.vatTotal).toBe('10.00');
    expect(result.kpis.feesTotal).toBe('2.00');
    expect(result.kpis.practitionerPayableOutstanding).toBe('40.00');
    expect(result.trends).toHaveLength(2);
  });
});
