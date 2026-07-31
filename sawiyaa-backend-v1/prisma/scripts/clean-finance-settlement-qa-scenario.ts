import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { assertQaFinanceSeedAllowed } from '../seed/shared/financial-fixture-gate';

const PREFIX = 'QA_FINANCE_';

async function main() {
  const dryRun = !process.argv.includes('--confirm');
  assertQaFinanceSeedAllowed('settlement-qa-clean', dryRun ? [...process.argv, '--confirm'] : process.argv);

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  try {
    const prisma = app.get(PrismaService);
    const sessions = await prisma.session.findMany({
      where: { sessionCode: { startsWith: PREFIX } },
      select: { id: true, sessionCode: true },
    });
    const sessionIds = sessions.map((item) => item.id);
    const payments = await prisma.payment.findMany({
      where: { sessionId: { in: sessionIds.length ? sessionIds : ['00000000-0000-0000-0000-000000000000'] } },
      select: { id: true },
    });
    const paymentIds = payments.map((item) => item.id);
    const reviews = await prisma.sessionEarningReview.findMany({
      where: { sessionId: { in: sessionIds.length ? sessionIds : ['00000000-0000-0000-0000-000000000000'] } },
      select: { id: true },
    });
    const reviewIds = reviews.map((item) => item.id);
    const settlements = await prisma.practitionerSettlement.findMany({
      where: { sourceReviewId: { in: reviewIds.length ? reviewIds : ['00000000-0000-0000-0000-000000000000'] } },
      select: { id: true },
    });
    const settlementIds = settlements.map((item) => item.id);
    const payouts = await prisma.practitionerSettlementPayout.findMany({
      where: { settlementId: { in: settlementIds.length ? settlementIds : ['00000000-0000-0000-0000-000000000000'] } },
      select: { id: true },
    });
    const payoutIds = payouts.map((item) => item.id);
    const qaPractitioners = await prisma.practitionerProfile.findMany({ where: { publicSlug: { startsWith: 'qa-finance-practitioner-' } }, select: { id: true, userId: true } });
    const qaPatients = await prisma.patientProfile.findMany({ where: { displayName: { startsWith: 'QA Patient ' } }, select: { id: true, userId: true } });
    const qaUserIds = [...new Set([...qaPractitioners, ...qaPatients].map((item) => item.userId))];
    const qaAdmins = await prisma.user.findMany({ where: { emails: { some: { email: { startsWith: 'qa.finance.' } } } }, select: { id: true } });
    qaUserIds.push(...qaAdmins.map((item) => item.id));
    const qaWallets = await prisma.practitionerWallet.findMany({ where: { practitionerId: { in: qaPractitioners.map((item) => item.id) } }, select: { id: true } });

    const counts = { sessions: sessions.length, payments: paymentIds.length, reviews: reviewIds.length, settlements: settlementIds.length, payouts: payoutIds.length, wallets: qaWallets.length, practitioners: qaPractitioners.length, patients: qaPatients.length, users: qaUserIds.length };
    console.log(JSON.stringify({ dryRun, prefix: PREFIX, counts, sessions: sessions.map((item) => item.sessionCode) }, null, 2));
    if (dryRun || !sessions.length) return;

    await prisma.$transaction(async (tx) => {
      if (payoutIds.length) {
        await tx.practitionerSettlementPayoutProof.deleteMany({ where: { payoutId: { in: payoutIds } } });
        await tx.practitionerSettlementPayout.deleteMany({ where: { id: { in: payoutIds } } });
      }
      if (settlementIds.length) {
        await tx.ledgerEntry.deleteMany({ where: { settlementId: { in: settlementIds } } });
        await tx.settlementAdjustment.deleteMany({ where: { settlementId: { in: settlementIds } } });
        await tx.practitionerRecoveryAction.deleteMany({ where: { recovery: { settlementId: { in: settlementIds } } } });
        await tx.practitionerRecovery.deleteMany({ where: { settlementId: { in: settlementIds } } });
        await tx.practitionerSettlement.deleteMany({ where: { id: { in: settlementIds } } });
      }
      if (reviewIds.length) await tx.sessionEarningReview.deleteMany({ where: { id: { in: reviewIds } } });
      if (paymentIds.length) {
        await tx.refundEvent.deleteMany({ where: { paymentId: { in: paymentIds } } });
        await tx.refund.deleteMany({ where: { paymentId: { in: paymentIds } } });
        await tx.paymentEvent.deleteMany({ where: { paymentId: { in: paymentIds } } });
        await tx.payment.deleteMany({ where: { id: { in: paymentIds } } });
      }
      await tx.sessionEvent.deleteMany({ where: { sessionId: { in: sessionIds } } });
      await tx.session.deleteMany({ where: { id: { in: sessionIds } } });
      if (qaWallets.length) await tx.practitionerWallet.deleteMany({ where: { id: { in: qaWallets.map((item) => item.id) } } });
      if (qaPractitioners.length) await tx.practitionerProfile.deleteMany({ where: { id: { in: qaPractitioners.map((item) => item.id) } } });
      if (qaPatients.length) await tx.patientProfile.deleteMany({ where: { id: { in: qaPatients.map((item) => item.id) } } });
      if (qaUserIds.length) {
        await tx.userEmail.deleteMany({ where: { userId: { in: qaUserIds } } });
        await tx.authIdentity.deleteMany({ where: { userId: { in: qaUserIds } } });
        await tx.userRole.deleteMany({ where: { userId: { in: qaUserIds } } });
        await tx.user.deleteMany({ where: { id: { in: qaUserIds } } });
      }
    });
    console.log(JSON.stringify({ deleted: counts }, null, 2));
  } finally {
    await app.close();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
