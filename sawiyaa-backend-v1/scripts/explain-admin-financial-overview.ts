import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function explain(name: string, sql: string) {
  const rows = await prisma.$queryRawUnsafe<Array<{ 'QUERY PLAN': string }>>(`EXPLAIN (ANALYZE, BUFFERS, VERBOSE, COSTS, FORMAT TEXT) ${sql}`);
  console.log(`\n--- ${name} ---`);
  console.log(rows.map((row) => row['QUERY PLAN']).join('\n'));
}

async function main() {
  await prisma.$connect();
  for (const table of ['Payment', 'CustomerWalletEntry', 'SessionEarningReview', 'Session', 'LedgerEntry', 'PractitionerWallet', 'PractitionerSettlement', 'PractitionerSettlementPayout']) {
    await prisma.$executeRawUnsafe(`ANALYZE "${table}"`);
  }
  const indexes = await prisma.$queryRawUnsafe<Array<{ tablename: string; indexname: string; indexdef: string }>>(`
    SELECT tablename, indexname, indexdef
    FROM pg_indexes
    WHERE tablename IN ('Payment','SessionEarningReview','LedgerEntry','PractitionerWallet','PractitionerSettlement','PractitionerSettlementPayout')
    ORDER BY tablename, indexname
  `);
  console.log('--- indexes ---');
  console.log(JSON.stringify(indexes, null, 2));
  await explain('captured payments by currency', `
    SELECT "currencyCode", SUM("amountTotal"), COUNT(*)
    FROM "Payment"
    WHERE "status" = 'CAPTURED' AND "capturedAt" IS NOT NULL
    GROUP BY "currencyCode"
  `);
  await explain('pending reviews by source currency', `
    SELECT "paymentCurrencyCode", SUM("paymentAmount"), COUNT(*)
    FROM "SessionEarningReview"
    WHERE "reviewStatus" = 'PENDING_REVIEW'
    GROUP BY "paymentCurrencyCode"
  `);
  await explain('earning ledger credits by currency', `
    SELECT "currencyCode", SUM("amount"), COUNT(*)
    FROM "LedgerEntry"
    WHERE "entryType" = 'PRACTITIONER_EARNING'
      AND "direction" = 'CREDIT'
      AND "sessionEarningReviewId" IS NOT NULL
    GROUP BY "currencyCode"
  `);
  await explain('active wallet balances by currency', `
    SELECT "currencyCode", SUM("availableBalance"), SUM("pendingBalance"), SUM("reservedBalance"), COUNT(*)
    FROM "PractitionerWallet"
    WHERE "status" = 'ACTIVE'
    GROUP BY "currencyCode"
  `);
  await explain('completed payout records by actual payout currency', `
    SELECT COALESCE(p."payoutCurrencyCode", p."currencyCode"), SUM(p."amountPaid"), COUNT(*)
    FROM "PractitionerSettlementPayout" p
    INNER JOIN "PractitionerSettlement" s ON s."id" = p."settlementId"
    WHERE s."status" IN ('PAID_OUT', 'PAID')
    GROUP BY COALESCE(p."payoutCurrencyCode", p."currencyCode")
  `);
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exitCode = 1;
});
