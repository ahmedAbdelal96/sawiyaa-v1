import { Injectable, Optional } from '@nestjs/common';
import { SessionProvider } from '@prisma/client';
import { PaymentRegionalPricingMode } from '@common/payments/payment-region.resolver';
import {
  PatientPackagePurchaseViewModel,
  PackagePurchaseSessionSummaryViewModel,
} from '../types/package-purchases.types';
import { SessionOperationalInterpreterService } from '@modules/sessions/services/session-operational-interpreter.service';
import { PackageEntitlementService } from '../services/package-entitlement.service';

type PurchaseRecord = {
  id: string;
  status: string;
  titleSnapshot?: string | null;
  descriptionSnapshot?: string | null;
  planCodeSnapshot: string | null;
  sessionCountSnapshot: number;
  discountPercentSnapshot: { toString(): string } | string | null;
  practitionerId: string;
  practitioner?: {
    id: string;
    publicSlug?: string | null;
    avatarUrl?: string | null;
    professionalTitle?: string | null;
    user?: {
      displayName?: string | null;
    } | null;
  } | null;
  packagePlan?: {
    title?: string | null;
    description?: string | null;
  } | null;
  sessionDurationMinutesSnapshot: number;
  sessionModeSnapshot: PackagePurchaseSessionSummaryViewModel['sessionMode'];
  selectedCurrencyCode: string;
  selectedBaseSessionPriceSnapshot: { toString(): string } | string | null;
  undiscountedTotalSnapshot: { toString(): string } | string | null;
  discountAmountSnapshot: { toString(): string } | string | null;
  patientPayableTotalSnapshot: { toString(): string } | string | null;
  paymentExpiresAt: Date | null;
  payment?: {
    id: string;
    status: string;
    amountTotal: { toString(): string } | string;
    amountFromWallet: { toString(): string } | string;
    amountFromGateway: { toString(): string } | string;
    currencyCode: string;
    initiatedAt: Date;
    capturedAt: Date | null;
    failedAt: Date | null;
    expiredAt: Date | null;
    refunds?: Array<{
      id: string;
      amount: { toString(): string } | string;
      currencyCode: string;
      status: string;
      destination: string;
      refundReason: string | null;
      requestedAt: Date;
      processedAt: Date | null;
      failedAt: Date | null;
      customerWalletCreditedAt: Date | null;
      sessionId: string | null;
    }>;
  } | null;
  packageEntitlementDecisions?: Array<{
    id: string;
    sessionId: string;
    decisionType: string;
    reasonCode: string;
    sessionStatusSnapshot: string;
    decidedAt: Date;
    session?: { sessionCode: string; scheduledStartAt: Date | null } | null;
  }>;
  createdAt: Date;
  updatedAt: Date;
  sessions: Array<{
    id: string;
    sessionCode: string;
    status: PackagePurchaseSessionSummaryViewModel['status'];
    flowType: import('@prisma/client').SessionFlowType;
    provider: SessionProvider;
    providerRoomId: string | null;
    providerSessionRef: string | null;
    scheduledStartAt: Date | null;
    scheduledEndAt: Date | null;
    joinOpenAt: Date | null;
    joinCloseAt: Date | null;
    expiresAt: Date | null;
    videoRoomClosedAt: Date | null;
    originalSessionId: string | null;
    durationMinutes: number;
    sessionMode: PackagePurchaseSessionSummaryViewModel['sessionMode'];
    packageSessionIndex: number | null;
    packageEntitlementDecision?: { decisionType: string } | null;
  }>;
};

const SCHEDULED_STATUSES = new Set([
  'UPCOMING',
  'READY_TO_JOIN',
  'IN_PROGRESS',
]);

@Injectable()
export class PackagePurchasePresenter {
  constructor(
    private readonly operationalInterpreter: SessionOperationalInterpreterService,
    @Optional()
    private readonly packageEntitlementService?: PackageEntitlementService,
  ) {}

  async toViewModel(input: {
    purchase: PurchaseRecord;
    sessions?: PurchaseRecord['sessions'];
    now?: Date;
    resolvedProfessionalTitle?: string | null;
  }): Promise<PatientPackagePurchaseViewModel> {
    const now = input.now ?? new Date();
    const rawSessions = input.sessions ?? input.purchase.sessions ?? [];

    const linkedSessionItems = await Promise.all(
      rawSessions.map((session) => this.toSessionViewModel(session, now)),
    );

    const totalSessions = input.purchase.sessionCountSnapshot;
    const entitlement = (
      this.packageEntitlementService ?? new PackageEntitlementService()
    ).summarize(totalSessions, rawSessions);
    const {
      consumedSessions,
      completedSessions,
      reservedSessions,
      availableSessions,
    } = entitlement;
    const scheduledSessions = linkedSessionItems.filter((s) =>
      SCHEDULED_STATUSES.has(s.status),
    ).length;
    const nextSessionStartAt =
      rawSessions
        .filter(
          (session) =>
            SCHEDULED_STATUSES.has(session.status) &&
            session.scheduledStartAt &&
            session.scheduledStartAt.getTime() >= now.getTime(),
        )
        .sort(
          (left, right) =>
            left.scheduledStartAt!.getTime() -
            right.scheduledStartAt!.getTime(),
        )[0]
        ?.scheduledStartAt?.toISOString() ?? null;

    // Remaining sessions can never be negative (final defensive boundary)
    const remainingSessions = Math.max(0, totalSessions - completedSessions);
    // Progress percentage capped between 0 and 100
    const progressPercent = Math.min(
      100,
      Math.max(
        0,
        Math.round((completedSessions / Math.max(1, totalSessions)) * 100),
      ),
    );

    const title =
      input.purchase.titleSnapshot?.trim() ||
      input.purchase.packagePlan?.title?.trim() ||
      '';

    const description =
      input.purchase.descriptionSnapshot?.trim() ||
      input.purchase.packagePlan?.description?.trim() ||
      null;

    const practitioner = input.purchase.practitioner
      ? {
          id: input.purchase.practitioner.id,
          publicSlug:
            input.purchase.practitioner.publicSlug ||
            input.purchase.practitioner.id,
          displayName:
            input.purchase.practitioner.user?.displayName?.trim() ||
            'Practitioner',
          avatarUrl: input.purchase.practitioner.avatarUrl ?? null,
          professionalTitle:
            input.resolvedProfessionalTitle !== undefined
              ? input.resolvedProfessionalTitle
              : (input.purchase.practitioner.professionalTitle ?? null),
        }
      : undefined;

    return {
      id: input.purchase.id,
      status: input.purchase.status,
      planCode: input.purchase.planCodeSnapshot ?? '',
      title,
      description,
      sessionCount: totalSessions,
      discountPercent:
        input.purchase.discountPercentSnapshot === null ||
        input.purchase.discountPercentSnapshot === undefined
          ? '0.00'
          : input.purchase.discountPercentSnapshot.toString(),
      practitionerId: input.purchase.practitionerId,
      practitioner,
      progress: {
        totalSessions,
        consumedSessions,
        completedSessions,
        reservedSessions,
        availableSessions,
        remainingSessions,
        scheduledSessions,
        progressPercent,
        nextSessionStartAt,
      },
      durationMinutes: input.purchase.sessionDurationMinutesSnapshot,
      sessionMode: input.purchase.sessionModeSnapshot,
      selectedCurrencyCode: input.purchase.selectedCurrencyCode,
      regionalPricingMode: this.resolveRegionalPricingMode(
        input.purchase.selectedCurrencyCode,
      ),
      resolvedCountryIsoCode: null,
      selectedBaseSessionPrice:
        input.purchase.selectedBaseSessionPriceSnapshot === null ||
        input.purchase.selectedBaseSessionPriceSnapshot === undefined
          ? '0.00'
          : input.purchase.selectedBaseSessionPriceSnapshot.toString(),
      undiscountedTotal:
        input.purchase.undiscountedTotalSnapshot === null ||
        input.purchase.undiscountedTotalSnapshot === undefined
          ? '0.00'
          : input.purchase.undiscountedTotalSnapshot.toString(),
      discountAmount:
        input.purchase.discountAmountSnapshot === null ||
        input.purchase.discountAmountSnapshot === undefined
          ? '0.00'
          : input.purchase.discountAmountSnapshot.toString(),
      patientPayableTotal:
        input.purchase.patientPayableTotalSnapshot === null ||
        input.purchase.patientPayableTotalSnapshot === undefined
          ? '0.00'
          : input.purchase.patientPayableTotalSnapshot.toString(),
      paymentExpiresAt: input.purchase.paymentExpiresAt?.toISOString() ?? null,
      linkedSessions: {
        totalItems: linkedSessionItems.length,
        items: linkedSessionItems,
      },
      linkedSessionsCount: linkedSessionItems.length,
      createdAt: input.purchase.createdAt.toISOString(),
      updatedAt: input.purchase.updatedAt.toISOString(),
      payment: input.purchase.payment
        ? {
            id: input.purchase.payment.id,
            status: input.purchase.payment.status,
            amountTotal: String(input.purchase.payment.amountTotal),
            amountFromWallet: String(input.purchase.payment.amountFromWallet),
            amountFromGateway: String(input.purchase.payment.amountFromGateway),
            currency: input.purchase.payment.currencyCode,
            initiatedAt: input.purchase.payment.initiatedAt.toISOString(),
            capturedAt: input.purchase.payment.capturedAt?.toISOString() ?? null,
            failedAt: input.purchase.payment.failedAt?.toISOString() ?? null,
            expiredAt: input.purchase.payment.expiredAt?.toISOString() ?? null,
            refundedAt:
              input.purchase.payment.refunds?.find((refund) => refund.processedAt)?.processedAt?.toISOString() ?? null,
            refunds: (input.purchase.payment.refunds ?? []).map((refund) => ({
              id: refund.id,
              status: refund.status,
              destination: refund.destination,
              amount: String(refund.amount),
              currency: refund.currencyCode,
              reason: refund.refundReason,
              requestedAt: refund.requestedAt.toISOString(),
              processedAt: refund.processedAt?.toISOString() ?? null,
              failedAt: refund.failedAt?.toISOString() ?? null,
              customerWalletCreditedAt: refund.customerWalletCreditedAt?.toISOString() ?? null,
              sessionId: refund.sessionId,
            })),
          }
        : null,
      entitlementHistory: (input.purchase.packageEntitlementDecisions ?? []).map((decision) => ({
        id: decision.id,
        sessionId: decision.sessionId,
        sessionCode: decision.session?.sessionCode ?? null,
        decisionType: decision.decisionType,
        reasonCode: decision.reasonCode,
        sessionStatus: decision.sessionStatusSnapshot,
        decidedAt: decision.decidedAt.toISOString(),
        scheduledStartAt: decision.session?.scheduledStartAt?.toISOString() ?? null,
      })),
    };
  }

  private resolveRegionalPricingMode(
    selectedCurrencyCode: string,
  ): PaymentRegionalPricingMode {
    return selectedCurrencyCode.trim().toUpperCase() === 'EGP'
      ? 'EGYPT_LOCAL'
      : 'INTERNATIONAL';
  }

  private async toSessionViewModel(
    session: PurchaseRecord['sessions'][number],
    now: Date,
  ): Promise<PackagePurchaseSessionSummaryViewModel> {
    const operational = await this.operationalInterpreter.interpret({
      session,
      // Package rows have no participant-action batch available.  ADMIN gives
      // the actor-neutral lifecycle/join/room projection without triggering
      // per-row patient-action reads; package entitlement remains package-owned.
      actor: 'ADMIN',
      now,
    });

    return {
      id: session.id,
      sessionCode: session.sessionCode,
      status: session.status,
      operational,
      scheduledStartAt: session.scheduledStartAt?.toISOString() ?? null,
      scheduledEndAt: session.scheduledEndAt?.toISOString() ?? null,
      durationMinutes: session.durationMinutes,
      sessionMode: session.sessionMode,
      packageSessionIndex: session.packageSessionIndex ?? 0,
    };
  }
}
