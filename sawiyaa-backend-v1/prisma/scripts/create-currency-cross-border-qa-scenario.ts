import { NestFactory } from '@nestjs/core';
import { PaymentProvider, PaymentPurpose, PaymentStatus, Prisma, SessionFlowType, SessionMode, SessionStatus } from '@prisma/client';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { SessionEarningReviewService } from '../../src/modules/financial-operations/services/session-earning-review.service';
import { SessionLifecycleService } from '../../src/modules/sessions/services/session-lifecycle.service';
import { SessionRepository } from '../../src/modules/sessions/repositories/session.repository';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  try {
    const prisma = app.get(PrismaService);
    const lifecycle = app.get(SessionLifecycleService);
    const sessionRepository = app.get(SessionRepository);
    const reviewService = app.get(SessionEarningReviewService);
    const practitioner = await prisma.practitionerProfile.findFirstOrThrow({ where: { publicSlug: 'dr-hassan-tarek' }, select: { id: true, userId: true, country: { select: { isoCode: true } } } });
    const patient = await prisma.patientProfile.findFirstOrThrow({ orderBy: { createdAt: 'asc' }, select: { id: true } });
    if (!['EG', 'EGY'].includes(practitioner.country?.isoCode?.toUpperCase() ?? '')) throw new Error('QA practitioner must be Egyptian');
    const now = new Date();
    const suffix = `${Date.now()}-cross-egp`;
    const session = await sessionRepository.createSession({ patientId: patient.id, practitionerId: practitioner.id, flowType: SessionFlowType.SCHEDULED, sessionMode: SessionMode.VIDEO, durationMinutes: 60, status: SessionStatus.DRAFT, requestedStartAt: new Date(now.getTime() + 36 * 60 * 60 * 1000), scheduledStartAt: new Date(now.getTime() + 37 * 60 * 60 * 1000), scheduledEndAt: new Date(now.getTime() + 38 * 60 * 60 * 1000), joinOpenAt: new Date(now.getTime() + 36.5 * 60 * 60 * 1000), expiresAt: new Date(now.getTime() + 60 * 60 * 60 * 1000), timezoneSnapshot: 'Africa/Cairo', provider: 'NONE', paymentCoverageType: 'DIRECT_PAYMENT' }, undefined, 'qa_currency_cross_border');
    await prisma.payment.create({ data: { sessionId: session.id, patientId: patient.id, practitionerId: practitioner.id, paymentPurpose: PaymentPurpose.SESSION_BOOKING, provider: PaymentProvider.STRIPE, status: PaymentStatus.CAPTURED, amountSubtotal: 100, amountDiscount: 0, amountTotal: 100, amountFromWallet: 0, amountFromGateway: 100, currencyCode: 'USD', commissionPlatformRatePercent: 30, commissionPractitionerRatePercent: 70, providerPaymentRef: `qa-fx-${suffix}`, providerOrderRef: `qa-fx-${suffix}`, initiatedAt: now, authorizedAt: now, capturedAt: now, metadataJson: { qaFixture: 'currency-wallet-lifecycle', scenario: 'USD_TO_EGP' } } });
    const result = await prisma.$transaction(async (tx) => {
      let current: { id: string; status: SessionStatus } = { id: session.id, status: SessionStatus.DRAFT };
      for (const status of [SessionStatus.PENDING_PAYMENT, SessionStatus.UPCOMING, SessionStatus.IN_PROGRESS, SessionStatus.COMPLETED]) current = await lifecycle.transition({ session: current, to: status, tx, actorUserId: practitioner.userId, reason: 'QA_CURRENCY_WALLET_LIFECYCLE', metadata: { scenario: 'USD_TO_EGP' } });
      const review = await reviewService.syncForSessionCompletion({ sessionId: session.id, tx });
      return { sessionId: session.id, reviewId: review?.reviewId ?? null };
    });
    const settlement = result.reviewId ? await prisma.practitionerSettlement.findUniqueOrThrow({ where: { sourceReviewId: result.reviewId }, select: { id: true, status: true, originalAmount: true, originalCurrencyCode: true, walletCurrencyCode: true, exchangeRate: true, convertedAmount: true, amountGross: true, finalWalletCredit: true, practitionerId: true } }) : null;
    console.log(JSON.stringify({ ok: true, scenario: 'USD_TO_EGP', result, settlement }, null, 2));
  } finally { await app.close(); }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
