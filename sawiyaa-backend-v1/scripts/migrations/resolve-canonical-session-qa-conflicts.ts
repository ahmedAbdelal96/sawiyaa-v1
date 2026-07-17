import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const TARGET_SESSION_CODE = 'QA-B2A8BA0EB1';
const REPAIR_REASON = 'PRE_MIGRATION_QA_ORPHAN_REFUNDED_REPAIRED';

type Evidence = {
  id: string;
  sessionCode: string;
  status: string;
  cancelledAt: Date | null;
  completedAt: Date | null;
  updatedAt: Date;
  paymentCount: bigint;
  refundCount: bigint;
  eventCount: bigint;
  attendanceCount: bigint;
  walletEntryCount: bigint;
  earningReviewCount: bigint;
  entitlementDecisionCount: bigint;
  decisionCount: bigint;
};

async function main(): Promise<void> {
  if (process.env.CANONICAL_SESSION_QA_REPAIR !== 'true') {
    throw new Error(
      'Set CANONICAL_SESSION_QA_REPAIR=true to run the explicit QA-only repair.',
    );
  }

  const prisma = new PrismaClient();
  try {
    const rows = await prisma.$queryRawUnsafe<Evidence[]>(
      `
        SELECT
          s."id",
          s."sessionCode",
          s."status"::text AS "status",
          s."cancelledAt",
          s."completedAt",
          s."updatedAt",
          (SELECT count(*) FROM "Payment" p WHERE p."sessionId" = s."id") AS "paymentCount",
          (SELECT count(*) FROM "Refund" r WHERE r."sessionId" = s."id") AS "refundCount",
          (SELECT count(*) FROM "SessionEvent" e WHERE e."sessionId" = s."id") AS "eventCount",
          (SELECT count(*) FROM "SessionAttendanceEvent" a WHERE a."sessionId" = s."id") AS "attendanceCount",
          (SELECT count(*) FROM "CustomerWalletEntry" w WHERE w."sessionId" = s."id") AS "walletEntryCount",
          (SELECT count(*) FROM "SessionEarningReview" er WHERE er."sessionId" = s."id") AS "earningReviewCount",
          (SELECT count(*) FROM "SessionPackageEntitlementDecision" ped WHERE ped."sessionId" = s."id") AS "entitlementDecisionCount",
          (SELECT count(*) FROM "SessionAdminDecision" ad WHERE ad."sessionId" = s."id") AS "decisionCount"
        FROM "Session" s
        WHERE s."sessionCode" = $1
        FOR UPDATE
      `,
      TARGET_SESSION_CODE,
    );

    const evidence = rows[0];
    if (!evidence) throw new Error('Target QA session was not found.');

    const counts = [
      evidence.paymentCount,
      evidence.refundCount,
      evidence.eventCount,
      evidence.attendanceCount,
      evidence.walletEntryCount,
      evidence.earningReviewCount,
      evidence.entitlementDecisionCount,
      evidence.decisionCount,
    ];
    if (
      evidence.status !== 'REFUNDED' ||
      evidence.cancelledAt ||
      evidence.completedAt ||
      counts.some((value) => value !== 0n)
    ) {
      throw new Error(
        `QA repair refused: target is not an orphan REFUNDED fixture. Evidence=${JSON.stringify(
          { ...evidence, ...Object.fromEntries(counts.map((v, i) => [i, v.toString()])) },
          (_, value) => (typeof value === 'bigint' ? value.toString() : value),
        )}`,
      );
    }

    const repairedAt = new Date();
    await prisma.$executeRawUnsafe(
      `
        UPDATE "Session"
        SET "status" = 'CANCELLED',
            "cancelledAt" = $1,
            "cancellationReason" = $2,
            "notesInternal" = $3,
            "updatedAt" = $1
        WHERE "id" = $4::uuid
          AND "status"::text = 'REFUNDED'
      `,
      repairedAt,
      REPAIR_REASON,
      `Canonical lifecycle QA repair at ${repairedAt.toISOString()}: REFUNDED orphan mapped to CANCELLED after evidence review.`,
      evidence.id,
    );

    console.log(
      JSON.stringify({
        sessionId: evidence.id,
        sessionCode: evidence.sessionCode,
        previousStatus: evidence.status,
        correctedStatus: 'CANCELLED',
        reason: REPAIR_REASON,
        repairedAt: repairedAt.toISOString(),
        evidence: {
          paymentCount: evidence.paymentCount.toString(),
          refundCount: evidence.refundCount.toString(),
          eventCount: evidence.eventCount.toString(),
          attendanceCount: evidence.attendanceCount.toString(),
          walletEntryCount: evidence.walletEntryCount.toString(),
          earningReviewCount: evidence.earningReviewCount.toString(),
          entitlementDecisionCount: evidence.entitlementDecisionCount.toString(),
          decisionCount: evidence.decisionCount.toString(),
        },
      }),
    );
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
