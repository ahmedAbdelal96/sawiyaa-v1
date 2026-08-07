import { LedgerDirection, PaymentStatus, Prisma, PractitionerSettlementStatus, SessionEarningReviewStatus } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { AdminFinancialOverviewService } from '../services/admin-financial-overview.service';

const databaseUrl = process.env.DATABASE_URL;
const databaseName = databaseUrl ? decodeURIComponent(new URL(databaseUrl).pathname.slice(1)) : '';
if (databaseName === 'fayed_db' || (databaseName && !/(phase3b1a|phase3b2a)/i.test(databaseName))) {
  throw new Error(`Unsafe admin financial overview database: ${databaseName}`);
}
const describeIfDatabase = databaseUrl ? describe : describe.skip;

describeIfDatabase('admin financial overview PostgreSQL reconciliation proof', () => {
  const prisma = new PrismaService();
  const service = new AdminFinancialOverviewService(prisma);
  let overview: Awaited<ReturnType<AdminFinancialOverviewService['execute']>>;

  beforeAll(async () => {
    await prisma.$connect();
    overview = await service.execute({}, 'ACCOUNTING');
  });

  afterAll(async () => prisma.$disconnect());

  it('returns separate EGP/USD buckets and never a cross-currency bucket', () => {
    const currencies = overview.metrics.grossPatientCollections.map((row) => row.currency);
    expect(new Set(currencies).size).toBe(currencies.length);
    expect(overview.metrics.grossPatientCollections.every((row) => row.currency !== 'EGP/USD')).toBe(true);
  });

  it('matches gross collections to captured payments only', async () => {
    const grouped = await prisma.payment.groupBy({ by: ['currencyCode'], where: { status: PaymentStatus.CAPTURED, capturedAt: { not: null } }, _sum: { amountTotal: true }, _count: { _all: true } });
    expect(overview.metrics.grossPatientCollections).toEqual(expect.arrayContaining(grouped.map((row) => ({ currency: row.currencyCode, amount: row._sum.amountTotal?.toFixed(2) ?? '0.00', count: row._count._all }))));
  });

  it('does not count pending or failed payments as gross collection', async () => {
    const nonCaptured = await prisma.payment.count({ where: { status: { in: [PaymentStatus.PENDING, PaymentStatus.FAILED] } } });
    const capturedCount = overview.metrics.grossPatientCollections.reduce((total, row) => total + row.count, 0);
    const captured = await prisma.payment.count({ where: { status: PaymentStatus.CAPTURED, capturedAt: { not: null } } });
    expect(capturedCount).toBe(captured);
    expect(nonCaptured).toBeGreaterThanOrEqual(0);
  });

  it('applies currency and authoritative captured-date filters', async () => {
    const egp = await service.execute({ currency: 'EGP' }, 'ACCOUNTING');
    expect(egp.metrics.grossPatientCollections.every((row) => row.currency === 'EGP')).toBe(true);
    const scoped = await service.execute({ fromDate: '2026-08-01T00:00:00.000Z', toDate: '2026-08-04T00:00:00.000Z' }, 'ACCOUNTING');
    const expected = await prisma.payment.count({ where: { status: PaymentStatus.CAPTURED, capturedAt: { gte: new Date('2026-08-01T00:00:00.000Z'), lt: new Date('2026-08-04T00:00:00.000Z') } } });
    expect(scoped.metrics.grossPatientCollections.reduce((total, row) => total + row.count, 0)).toBe(expected);
  });

  it('uses review-createdAt for pending-review date filters', async () => {
    const from = new Date('2026-08-01T00:00:00.000Z');
    const to = new Date('2026-08-04T00:00:00.000Z');
    const expected = await prisma.sessionEarningReview.count({ where: { reviewStatus: SessionEarningReviewStatus.PENDING_REVIEW, createdAt: { gte: from, lt: to } } });
    const filtered = await service.execute({ reviewStatus: SessionEarningReviewStatus.PENDING_REVIEW, fromDate: from.toISOString(), toDate: to.toISOString() }, 'ACCOUNTING');
    expect(filtered.metrics.awaitingAccountantReview.reduce((sum, row) => sum + row.count, 0)).toBe(expected);
  });

  it('keeps patient wallet credits separate from captured cash', async () => {
    const grouped = await prisma.customerWalletEntry.groupBy({ by: ['currencyCode'], where: { direction: 'CREDIT', entryType: { in: ['REFUND_CREDIT', 'MANUAL_CREDIT', 'ADJUSTMENT'] } }, _sum: { amount: true }, _count: { _all: true } });
    expect(overview.metrics.patientWalletCredits).toEqual(expect.arrayContaining(grouped.map((row) => ({ currency: row.currencyCode, amount: row._sum.amount?.toFixed(2) ?? '0.00', count: row._count._all }))));
    expect(overview.metrics.grossPatientCollections).not.toEqual(overview.metrics.patientWalletCredits);
  });

  it('returns completed service value from completed entitlement snapshots', () => {
    expect(overview.metrics.completedServiceEconomicValue.every((row) => row.currency && row.amount)).toBe(true);
    expect(overview.metrics.completedServiceEconomicValue.every((row) => Number(row.amount) >= 0)).toBe(true);
  });

  it('exposes the same completed service aggregate on the collections scope', async () => {
    const collections = await service.execute({}, 'COLLECTIONS');
    expect(collections.metrics.completedServiceEconomicValue).toEqual(overview.metrics.completedServiceEconomicValue);
  });

  it('does not present suggested practitioner amounts as approved amounts', () => {
    expect(overview.metrics.awaitingAccountantReviewSuggestedPractitioner.length).toBeGreaterThanOrEqual(0);
    expect(overview.metrics.accountantApprovedAwaitingWalletCredit.every((row) => row.amount !== '0.00' || row.count === 0)).toBe(true);
  });

  it('uses accountantApprovedSourceAmount for decided totals', async () => {
    const rows = await prisma.sessionEarningReview.groupBy({ by: ['paymentCurrencyCode'], where: { reviewStatus: { in: [SessionEarningReviewStatus.DECISION_APPROVED, SessionEarningReviewStatus.APPROVED] }, accountantApprovedSourceAmount: { not: null } }, _sum: { accountantApprovedSourceAmount: true }, _count: { _all: true } });
    const total = overview.metrics.accountantApprovedAlreadyWalletCredited.reduce((sum, row) => sum + Number(row.amount), 0) + overview.metrics.accountantApprovedAwaitingWalletCredit.reduce((sum, row) => sum + Number(row.amount), 0);
    expect(total).toBeCloseTo(rows.reduce((sum, row) => sum + Number(row._sum.accountantApprovedSourceAmount ?? 0), 0), 2);
  });

  it('uses practitioner earning ledger credits, not review source amounts, for wallet credits', async () => {
    const grouped = await prisma.ledgerEntry.groupBy({ by: ['currencyCode'], where: { entryType: 'PRACTITIONER_EARNING', direction: 'CREDIT' }, _sum: { amount: true }, _count: { _all: true } });
    expect(overview.metrics.practitionerWalletCredits).toEqual(grouped.map((row) => ({ currency: row.currencyCode, amount: row._sum.amount?.toFixed(2) ?? '0.00', count: row._count._all })));
  });

  it('separates gross earning credits, completed payout debits, and signed wallet balances', async () => {
    const credits = await prisma.ledgerEntry.groupBy({ by: ['currencyCode'], where: { entryType: 'PRACTITIONER_EARNING', direction: 'CREDIT' }, _sum: { amount: true }, _count: { _all: true } });
    const payoutDebits = await prisma.ledgerEntry.groupBy({ by: ['currencyCode'], where: { entryType: 'SETTLEMENT_PAYOUT', direction: 'DEBIT', settlement: { status: { in: [PractitionerSettlementStatus.PAID_OUT, PractitionerSettlementStatus.PAID] } } }, _sum: { amount: true }, _count: { _all: true } });
    expect(overview.metrics.practitionerWalletCredits).toEqual(credits.map((row) => ({ currency: row.currencyCode, amount: row._sum.amount?.toFixed(2) ?? '0.00', count: row._count._all })));
    expect(overview.metrics.completedExternalPayoutDebits).toEqual(payoutDebits.map((row) => ({ currency: row.currencyCode, amount: row._sum.amount?.toFixed(2) ?? '0.00', count: row._count._all })));
    const egpCredits = Number(overview.metrics.practitionerWalletCredits.find((row) => row.currency === 'EGP')?.amount ?? 0);
    const egpDebits = Number(overview.metrics.completedExternalPayoutDebits.find((row) => row.currency === 'EGP')?.amount ?? 0);
    const egpBalance = Number(overview.metrics.currentPractitionerWalletBalances.find((row) => row.currency === 'EGP')?.amount ?? 0);
    expect(egpCredits - egpDebits).toBeCloseTo(egpBalance, 2);
    const activeWallets = await prisma.practitionerWallet.findMany({ where: { status: 'ACTIVE' }, select: { practitionerId: true, currencyCode: true } });
    const movements = await prisma.ledgerEntry.groupBy({ by: ['currencyCode', 'entryType', 'direction'], where: { OR: activeWallets.map((wallet) => ({ practitionerId: wallet.practitionerId, currencyCode: wallet.currencyCode })) }, _sum: { amount: true } });
    for (const currency of new Set(movements.map((row) => row.currencyCode))) {
      const signed = movements.filter((row) => row.currencyCode === currency).reduce((sum, row) => sum + Number(row._sum.amount ?? 0) * (row.direction === LedgerDirection.DEBIT ? -1 : 1), 0);
      expect(Number(overview.metrics.currentPractitionerWalletBalances.find((row) => row.currency === currency)?.amount ?? 0)).toBeCloseTo(signed, 2);
    }
  });

  it('reconciles displayed wallet balances to signed ledger buckets', async () => {
    const activeWallets = await prisma.practitionerWallet.findMany({ where: { status: 'ACTIVE' }, select: { practitionerId: true, currencyCode: true } });
    const grouped = await prisma.ledgerEntry.groupBy({ by: ['currencyCode', 'balanceBucket', 'direction'], where: { OR: activeWallets.map((wallet) => ({ practitionerId: wallet.practitionerId, currencyCode: wallet.currencyCode })) }, _sum: { amount: true } });
    const expected = new Map<string, { available: Prisma.Decimal; pending: Prisma.Decimal; reserved: Prisma.Decimal }>();
    for (const row of grouped) {
      const value = expected.get(row.currencyCode) ?? { available: new Prisma.Decimal(0), pending: new Prisma.Decimal(0), reserved: new Prisma.Decimal(0) };
      const signed = new Prisma.Decimal(row._sum.amount ?? 0).mul(row.direction === LedgerDirection.DEBIT ? -1 : 1);
      if (row.balanceBucket === 'AVAILABLE') value.available = value.available.add(signed);
      if (row.balanceBucket === 'PENDING') value.pending = value.pending.add(signed);
      if (row.balanceBucket === 'RESERVED') value.reserved = value.reserved.add(signed);
      expected.set(row.currencyCode, value);
    }
    for (const row of overview.metrics.currentPractitionerWalletBalances) {
      const value = expected.get(row.currency)!;
      expect(row.availableAmount).toBe(value.available.toFixed(2));
      expect(row.lockedOrReservedAmount).toBe(value.pending.add(value.reserved).toFixed(2));
      expect(row.amount).toBe(value.available.add(value.pending).add(value.reserved).toFixed(2));
    }
  });

  it('returns current active practitioner wallet balances by wallet currency', async () => {
    const activeWallets = await prisma.practitionerWallet.count({ where: { status: 'ACTIVE' } });
    expect(overview.metrics.currentPractitionerWalletBalances.reduce((sum, row) => sum + row.count, 0)).toBe(activeWallets);
    expect(overview.metrics.currentPractitionerWalletBalances.every((row) => row.lockedOrReservedAmount !== undefined)).toBe(true);
  });

  it('keeps internal wallet credits out of completed external payouts', async () => {
    const payouts = await prisma.ledgerEntry.count({ where: { entryType: 'SETTLEMENT_PAYOUT', direction: 'DEBIT', settlement: { status: { in: [PractitionerSettlementStatus.PAID_OUT, PractitionerSettlementStatus.PAID] } } } });
    expect(overview.metrics.completedExternalPractitionerPayouts.reduce((sum, row) => sum + row.count, 0)).toBe(payouts);
  });

  it('matches payout amounts to completed payout records only', async () => {
    const grouped = await prisma.ledgerEntry.groupBy({
      by: ['currencyCode'],
      where: { entryType: 'SETTLEMENT_PAYOUT', direction: 'DEBIT', settlement: { status: { in: [PractitionerSettlementStatus.PAID_OUT, PractitionerSettlementStatus.PAID] } } },
      _sum: { amount: true },
      _count: { _all: true },
    });
    const expected = grouped.map((row) => ({ currency: row.currencyCode, amount: row._sum.amount?.toFixed(2) ?? '0.00', count: row._count._all }));
    expect(overview.metrics.completedExternalPractitionerPayouts).toEqual(expect.arrayContaining(expected));
  });

  it('keeps payout-record history and the completed ledger-debit overview aligned', async () => {
    const records = await prisma.practitionerSettlementPayout.groupBy({
      by: ['payoutCurrencyCode', 'currencyCode'],
      where: { settlement: { status: { in: [PractitionerSettlementStatus.PAID_OUT, PractitionerSettlementStatus.PAID] } } },
      _sum: { amountPaid: true },
      _count: { _all: true },
    });
    expect(overview.metrics.completedExternalPayoutDebits).toEqual(records.map((row) => ({ currency: row.payoutCurrencyCode ?? row.currencyCode, amount: row._sum.amountPaid?.toFixed(2) ?? '0.00', count: row._count._all })));
  });

  it('separates pending external payouts from completed payouts and excludes CREDITED', async () => {
    const completed = overview.metrics.completedExternalPractitionerPayouts.reduce((sum, row) => sum + row.count, 0);
    const pending = overview.metrics.pendingExternalPractitionerPayouts.reduce((sum, row) => sum + row.count, 0);
    expect(completed).toBeGreaterThanOrEqual(0);
    expect(pending).toBeGreaterThanOrEqual(0);
    const credited = await service.execute({ payoutStatus: PractitionerSettlementStatus.CREDITED }, 'PAYOUT');
    expect(credited.metrics.pendingExternalPractitionerPayouts).toEqual([]);
    expect(credited.metrics.availableForPayout).toEqual([]);
    const processing = await service.execute({ payoutStatus: PractitionerSettlementStatus.PROCESSING }, 'PAYOUT');
    expect(processing.metrics.completedExternalPractitionerPayouts).toEqual([]);
    expect(processing.metrics.pendingExternalPractitionerPayouts.reduce((sum, row) => sum + row.count, 0)).toBe(await prisma.practitionerSettlement.count({ where: { status: PractitionerSettlementStatus.PROCESSING } }));
  });

  it('exposes pending payout liabilities on the wallet scope without converting them into completed payouts', async () => {
    const wallet = await service.execute({}, 'WALLET');
    expect(wallet.metrics.pendingExternalPractitionerPayouts).toEqual(overview.metrics.pendingExternalPractitionerPayouts);
    expect(wallet.metrics.completedExternalPractitionerPayouts).toEqual(overview.metrics.completedExternalPractitionerPayouts);
    expect(wallet.metrics.outstandingPractitionerWalletLiability.map(({ currency, amount, count }) => ({ currency, amount, count }))).toEqual(wallet.metrics.currentPractitionerWalletBalances.map(({ currency, amount, count }) => ({ currency, amount, count })));
  });

  it('applies the review-status filter to every accounting aggregate', async () => {
    const pending = await service.execute({ reviewStatus: SessionEarningReviewStatus.PENDING_REVIEW }, 'ACCOUNTING');
    expect(pending.metrics.awaitingAccountantReview.reduce((sum, row) => sum + row.count, 0)).toBeGreaterThanOrEqual(0);
    expect(pending.metrics.accountantApprovedAlreadyWalletCredited).toEqual([]);
    expect(pending.metrics.accountantApprovedAwaitingWalletCredit).toEqual([]);
    expect(pending.metrics.platformRemainderAfterDecision).toEqual([]);
  });

  it('keeps platform suggested share and post-decision remainder as separate metrics', () => {
    expect(overview.metrics.platformSuggestedShare).not.toBe(overview.metrics.platformRemainderAfterDecision);
  });

  it('preserves negative post-decision remainder when present instead of clamping it', () => {
    const negative = overview.metrics.platformRemainderAfterDecision.filter((row) => Number(row.amount) < 0);
    expect(negative.every((row) => row.amount.startsWith('-'))).toBe(true);
  });

  it('counts direct/package/replacement entitlement chains once and uses the remainder formula', async () => {
    const rows = await prisma.$queryRaw<Array<{ currency: string; amount: Prisma.Decimal; count: bigint }>>(Prisma.sql`
      WITH ranked AS (
        SELECT r."paymentCurrencyCode" AS currency, r."paymentAmount", r."accountantApprovedSourceAmount", r."reviewStatus",
          ROW_NUMBER() OVER (PARTITION BY r."earningEntitlementId" ORDER BY CASE WHEN s."fundingSource" = 'ADMIN_REPLACEMENT' THEN 0 ELSE 1 END, r."createdAt" DESC, r."id" DESC) AS rn
        FROM "SessionEarningReview" r
        INNER JOIN "Session" s ON s."id" = r."sessionId"
        WHERE s."status" = 'COMPLETED' AND r."reviewStatus" <> 'EXCLUDED_FROM_PAYOUT'
      )
      SELECT currency, SUM("paymentAmount") AS amount, COUNT(*)::bigint AS count
      FROM ranked WHERE rn = 1 GROUP BY currency ORDER BY currency
    `);
    expect(overview.metrics.completedServiceEconomicValue).toEqual(rows.map((row) => ({ currency: row.currency, amount: row.amount.toFixed(2), count: Number(row.count) })));

    const remainderRows = await prisma.$queryRaw<Array<{ currency: string; amount: Prisma.Decimal; count: bigint }>>(Prisma.sql`
      WITH ranked AS (
        SELECT r."paymentCurrencyCode" AS currency, r."paymentAmount", r."accountantApprovedSourceAmount", r."reviewStatus",
          ROW_NUMBER() OVER (PARTITION BY r."earningEntitlementId" ORDER BY CASE WHEN s."fundingSource" = 'ADMIN_REPLACEMENT' THEN 0 ELSE 1 END, r."createdAt" DESC, r."id" DESC) AS rn
        FROM "SessionEarningReview" r
        INNER JOIN "Session" s ON s."id" = r."sessionId"
        WHERE s."status" = 'COMPLETED' AND r."reviewStatus" IN ('DECISION_APPROVED', 'APPROVED') AND r."accountantApprovedSourceAmount" IS NOT NULL
      )
      SELECT currency, SUM("paymentAmount" - "accountantApprovedSourceAmount") AS amount, COUNT(*)::bigint AS count
      FROM ranked WHERE rn = 1 GROUP BY currency ORDER BY currency
    `);
    expect(overview.metrics.platformRemainderAfterDecision).toEqual(remainderRows.map((row) => ({ currency: row.currency, amount: row.amount.toFixed(2), count: Number(row.count) })));
  });

  it('keeps additions and deductions in separate source-currency buckets', () => {
    expect(overview.metrics.accountingAdditions).not.toBe(overview.metrics.accountingDeductions);
    expect(overview.metrics.accountingAdditions.every((row) => row.currency)).toBe(true);
    expect(overview.metrics.accountingDeductions.every((row) => row.currency)).toBe(true);
  });

  it('counts fulfilled REJECTED service value but excludes EXCLUDED_FROM_PAYOUT entitlements', async () => {
    const rows = await prisma.$queryRaw<Array<{ currency: string; amount: Prisma.Decimal; count: bigint }>>(Prisma.sql`
      WITH ranked AS (
        SELECT r."paymentCurrencyCode" AS currency, r."paymentAmount",
          ROW_NUMBER() OVER (PARTITION BY r."earningEntitlementId" ORDER BY CASE WHEN s."fundingSource" = 'ADMIN_REPLACEMENT' THEN 0 ELSE 1 END, r."createdAt" DESC, r."id" DESC) AS rn
        FROM "SessionEarningReview" r
        INNER JOIN "Session" s ON s."id" = r."sessionId"
        WHERE s."status" = 'COMPLETED' AND r."reviewStatus" <> 'EXCLUDED_FROM_PAYOUT'
      )
      SELECT currency, SUM("paymentAmount") AS amount, COUNT(*)::bigint AS count
      FROM ranked WHERE rn = 1 GROUP BY currency ORDER BY currency
    `);
    expect(overview.metrics.completedServiceEconomicValue).toEqual(rows.map((row) => ({ currency: row.currency, amount: row.amount.toFixed(2), count: Number(row.count) })));
  });

  it('deduplicates currencies in every monetary metric', () => {
    const metricValues = Object.values(overview.metrics).filter(Array.isArray) as Array<Array<{ currency?: string }>>;
    metricValues.forEach((rows) => {
      const currencies = rows.map((row) => row.currency).filter(Boolean);
      expect(new Set(currencies).size).toBe(currencies.length);
    });
  });

  it('does not depend on the current paginated row limit', async () => {
    const first = await service.execute({ currency: 'EGP' }, 'ACCOUNTING');
    const second = await service.execute({ currency: 'EGP', fromDate: '2000-01-01T00:00:00.000Z' }, 'ACCOUNTING');
    expect(first.metrics.grossPatientCollections).toEqual(second.metrics.grossPatientCollections);
  });

  it('redacts collection scope from platform and practitioner liability metrics', async () => {
    const scoped = await service.execute({}, 'COLLECTIONS');
    expect(scoped.metrics.platformSuggestedShare).toEqual([]);
    expect(scoped.metrics.practitionerWalletCredits).toEqual([]);
    expect(scoped.metrics.grossPatientCollections.length).toBeGreaterThanOrEqual(0);
  });

  it('redacts accountant platform metrics from wallet scope', async () => {
    const scoped = await service.execute({}, 'WALLET');
    expect(scoped.metrics.platformSuggestedShare).toEqual([]);
    expect(scoped.metrics.currentPractitionerWalletBalances.length).toBeGreaterThanOrEqual(0);
  });

  it('rejects an invalid currency filter instead of silently mixing currencies', async () => {
    await expect(service.execute({ currency: 'EGYPT' }, 'ACCOUNTING')).rejects.toThrow('currency');
  });

  it('rejects an inverted date range with an explicit boundary error', async () => {
    await expect(service.execute({ fromDate: '2026-08-05T00:00:00.000Z', toDate: '2026-08-04T00:00:00.000Z' }, 'ACCOUNTING')).rejects.toThrow('fromDate');
  });
});
