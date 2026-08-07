import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const sql = (value: string) => value.replace(/\s+/g, ' ').trim();

async function run(label: string, statement: string) {
  const started = performance.now();
  for (const command of statement.split(';').map((value) => value.trim()).filter(Boolean)) await prisma.$executeRawUnsafe(command);
  console.log(`${label}: ${Math.round(performance.now() - started)}ms`);
}

async function main() {
  await prisma.$connect();
  await run('extensions', `CREATE EXTENSION IF NOT EXISTS pgcrypto`);
  await run('cleanup benchmark rows', sql(`
    DELETE FROM "LedgerEntry" WHERE "referenceType" = 'PERF_BENCHMARK';
    DELETE FROM "PractitionerSettlementPayout" WHERE "externalPayoutRef" LIKE 'PERF-20260805-%';
    DELETE FROM "PractitionerSettlement" WHERE "externalPayoutRef" LIKE 'PERF-20260805-%';
    DELETE FROM "SettlementBatch" WHERE slug = 'PERF-20260805-BATCH';
    DELETE FROM "SessionEarningReview" WHERE "idempotencyKey" LIKE 'PERF-20260805-%';
    DELETE FROM "Session" WHERE "sessionCode" LIKE 'PERF-20260805-%';
    DELETE FROM "Payment" WHERE "providerOrderRef" LIKE 'PERF-20260805-%';
    DELETE FROM "PractitionerWallet" WHERE "practitionerId" IN (SELECT id FROM "PractitionerProfile" WHERE "publicSlug" LIKE 'perf-20260805-%');
    DELETE FROM "PractitionerProfile" WHERE "publicSlug" LIKE 'perf-20260805-%';
    DELETE FROM "PatientProfile" WHERE "displayName" = 'PERF-20260805-PATIENT';
    DELETE FROM "User" WHERE "displayName" LIKE 'PERF-20260805-%';
  `));
  const practitionerId = `md5('perf-practitioner-' || gs)::uuid`;
  await run('benchmark users', sql(`
    INSERT INTO "User" (id, "displayName", "updatedAt")
    SELECT md5('perf-user-' || gs)::uuid, 'PERF-20260805-' || gs, now() FROM generate_series(1, 50000) gs;
    INSERT INTO "User" (id, "displayName", "updatedAt") VALUES (md5('perf-patient-user')::uuid, 'PERF-20260805-PATIENT', now());
  `));
  await run('benchmark profiles and wallets', sql(`
    INSERT INTO "PatientProfile" (id, "userId", "displayName", "updatedAt") VALUES (md5('perf-patient')::uuid, md5('perf-patient-user')::uuid, 'PERF-20260805-PATIENT', now());
    INSERT INTO "PractitionerProfile" (id, "userId", "publicSlug", "updatedAt")
    SELECT ${practitionerId}, md5('perf-user-' || gs)::uuid, 'perf-20260805-' || gs, now() FROM generate_series(1, 50000) gs;
    INSERT INTO "PractitionerWallet" (id, "practitionerId", "currencyCode", status, "availableBalance", "pendingBalance", "reservedBalance", "updatedAt")
    SELECT md5('perf-wallet-' || gs)::uuid, md5('perf-practitioner-' || gs)::uuid, CASE WHEN gs % 2 = 0 THEN 'USD' ELSE 'EGP' END, 'ACTIVE', 10, 2, 1, now() FROM generate_series(1, 50000) gs;
  `));
  await run('100000 sessions', sql(`
    INSERT INTO "Session" (id, "sessionCode", "patientId", "practitionerId", "flowType", "sessionMode", "durationMinutes", status, provider, "completedAt", "earningEntitlementId", "createdAt", "updatedAt")
    SELECT md5('perf-session-' || gs)::uuid, 'PERF-20260805-' || gs, md5('perf-patient')::uuid, md5('perf-practitioner-' || (gs % 50000 + 1))::uuid, 'SCHEDULED', 'VIDEO', 30, 'COMPLETED', 'NONE', now() - ((gs % 90) || ' days')::interval, md5('perf-entitlement-' || gs)::uuid, now() - ((gs % 90) || ' days')::interval, now() FROM generate_series(1, 100000) gs;
  `));
  await run('100000 payments', sql(`
    INSERT INTO "Payment" (id, "paymentPurpose", provider, status, "amountSubtotal", "amountTotal", "amountFromWallet", "amountFromGateway", "currencyCode", "providerOrderRef", "capturedAt", "createdAt", "updatedAt")
    SELECT md5('perf-payment-' || gs)::uuid, 'SESSION_BOOKING', (CASE WHEN gs % 2 = 0 THEN 'STRIPE' ELSE 'PAYMOB' END)::"PaymentProvider", (CASE WHEN gs % 10 < 8 THEN 'CAPTURED' ELSE CASE WHEN gs % 2 = 0 THEN 'PENDING' ELSE 'FAILED' END END)::"PaymentStatus", 100, 100, 0, 100, CASE WHEN gs % 2 = 0 THEN 'USD' ELSE 'EGP' END, 'PERF-20260805-' || gs, CASE WHEN gs % 10 < 8 THEN now() - ((gs % 90) || ' days')::interval ELSE NULL END, now() - ((gs % 90) || ' days')::interval, now() FROM generate_series(1, 100000) gs;
  `));
  await run('100000 earning reviews', sql(`
    INSERT INTO "SessionEarningReview" (id, "sessionId", "earningEntitlementId", "practitionerId", "patientId", "sourceType", "reviewStatus", "reviewDecision", "paymentAmount", "paymentCurrencyCode", "suggestedPractitionerAmount", "suggestedPlatformAmount", "suggestedCurrencyCode", "accountantApprovedSourceAmount", "reviewedAt", "idempotencyKey", "createdAt", "updatedAt")
    SELECT md5('perf-review-' || gs)::uuid, md5('perf-session-' || gs)::uuid, md5('perf-entitlement-' || gs)::uuid, md5('perf-practitioner-' || (gs % 50000 + 1))::uuid, md5('perf-patient')::uuid, 'DIRECT_SESSION', (CASE WHEN gs % 10 < 5 THEN 'PENDING_REVIEW' WHEN gs % 10 < 8 THEN 'DECISION_APPROVED' WHEN gs % 10 < 9 THEN 'APPROVED' ELSE 'EXCLUDED_FROM_PAYOUT' END)::"SessionEarningReviewStatus", 'AUTO_CREATED', 100, CASE WHEN gs % 2 = 0 THEN 'USD' ELSE 'EGP' END, 70, 30, CASE WHEN gs % 2 = 0 THEN 'USD' ELSE 'EGP' END, CASE WHEN gs % 10 IN (5,6,7,8) THEN 65 ELSE NULL END, CASE WHEN gs % 10 IN (5,6,7,8) THEN now() - ((gs % 90) || ' days')::interval ELSE NULL END, 'PERF-20260805-' || gs, now() - ((gs % 90) || ' days')::interval, now() FROM generate_series(1, 100000) gs;
  `));
  await run('50000 settlements', sql(`
    INSERT INTO "SettlementBatch" (id, "periodYear", "periodMonth", "currencyCode", status, slug, "updatedAt") VALUES (md5('perf-batch')::uuid, 2099, 12, 'EGP', 'FINALIZED', 'PERF-20260805-BATCH', now());
    INSERT INTO "PractitionerSettlement" (id, "batchId", "practitionerId", "amountGross", "amountNet", "currencyCode", "originalAmount", "originalCurrencyCode", "walletCurrencyCode", "convertedAmount", "finalWalletCredit", "amountPaidTotal", status, "externalPayoutRef", "updatedAt")
    SELECT md5('perf-settlement-' || gs)::uuid, md5('perf-batch')::uuid, md5('perf-practitioner-' || gs)::uuid, 65, 65, 'EGP', 65, 'EGP', CASE WHEN gs % 2 = 0 THEN 'USD' ELSE 'EGP' END, 65, 65, CASE WHEN gs <= 25000 THEN 65 ELSE 0 END, (CASE WHEN gs <= 25000 THEN 'PAID' ELSE 'CREDITED' END)::"PractitionerSettlementStatus", 'PERF-20260805-' || gs, now() FROM generate_series(1, 50000) gs;
  `));
  await run('500000 ledger entries', sql(`
    INSERT INTO "LedgerEntry" (id, "practitionerId", "sessionId", "sessionEarningReviewId", "settlementId", "actorUserId", "actorType", "entryType", direction, amount, "currencyCode", "balanceBucket", "referenceType", "referenceId", "effectiveAt", "updatedAt")
    SELECT md5('perf-earning-ledger-' || gs)::uuid, md5('perf-practitioner-' || (gs % 50000 + 1))::uuid, md5('perf-session-' || gs)::uuid, md5('perf-review-' || gs)::uuid, md5('perf-settlement-' || (gs % 50000 + 1))::uuid, md5('perf-patient-user')::uuid, 'SYSTEM'::"SecurityAuditActorType", 'PRACTITIONER_EARNING', 'CREDIT'::"LedgerDirection", 65, CASE WHEN gs % 2 = 0 THEN 'USD' ELSE 'EGP' END, 'AVAILABLE', 'PERF_BENCHMARK', 'PERF-20260805-' || gs, now() - ((gs % 90) || ' days')::interval, now() FROM generate_series(1, 100000) gs;
    INSERT INTO "LedgerEntry" (id, "practitionerId", "entryType", direction, amount, "currencyCode", "balanceBucket", "referenceType", "referenceId", "effectiveAt", "updatedAt")
    SELECT md5('perf-adjustment-ledger-' || gs)::uuid, md5('perf-practitioner-' || (gs % 50000 + 1))::uuid, 'MANUAL_ADJUSTMENT', (CASE WHEN gs % 2 = 0 THEN 'CREDIT' ELSE 'DEBIT' END)::"LedgerDirection", 1, CASE WHEN gs % 2 = 0 THEN 'USD' ELSE 'EGP' END, 'AVAILABLE', 'PERF_BENCHMARK', 'PERF-20260805-' || (100000 + gs), now() - ((gs % 90) || ' days')::interval, now() FROM generate_series(1, 400000) gs;
  `));
  await run('settlement batch and 50000 settlements', sql(`
    INSERT INTO "PractitionerSettlementPayout" (id, "batchId", "settlementId", "practitionerId", "amountPaid", "currencyCode", "payoutCurrencyCode", "payoutMethod", "payoutSource", "externalPayoutRef", "effectiveAt", "idempotencyKey", "actorUserId", "actorType", "updatedAt")
    SELECT md5('perf-payout-' || gs)::uuid, md5('perf-batch')::uuid, md5('perf-settlement-' || gs)::uuid, md5('perf-practitioner-' || gs)::uuid, 65, 'EGP', CASE WHEN gs % 2 = 0 THEN 'USD' ELSE 'EGP' END, 'MANUAL_BANK_TRANSFER', 'BATCH_CLOSEOUT', 'PERF-20260805-' || gs, now() - ((gs % 90) || ' days')::interval, 'PERF-20260805-' || gs, md5('perf-patient-user')::uuid, 'SYSTEM'::"SecurityAuditActorType", now() FROM generate_series(1, 25000) gs;
  `));
  console.log('benchmark dataset ready: 100000 payments, 100000 sessions/reviews, 50000 wallets/settlements, 500000 ledger entries, 25000 payouts');
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exitCode = 1;
});
