import { Injectable } from '@nestjs/common';
import { SessionProvider } from '@prisma/client';
import { PaymentRegionalPricingMode } from '@common/payments/payment-region.resolver';
import {
  PatientPackagePurchaseViewModel,
  PackagePurchaseSessionSummaryViewModel,
} from '../types/package-purchases.types';
import { SessionOperationalInterpreterService } from '@modules/sessions/services/session-operational-interpreter.service';

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
  constructor(private readonly operationalInterpreter: SessionOperationalInterpreterService) {}

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
    const consumedSessions = rawSessions.filter((session) =>
      new Set(['COMPLETED', 'CANCELLED', 'EXPIRED', 'PATIENT_NO_SHOW', 'PRACTITIONER_NO_SHOW', 'BOTH_NO_SHOW']).has(session.status)
      && session.packageEntitlementDecision?.decisionType !== 'RESTORE_TO_PACKAGE',
    ).length;
    const completedSessions = Math.min(totalSessions, consumedSessions);
    const scheduledSessions = linkedSessionItems.filter((s) =>
      SCHEDULED_STATUSES.has(s.status),
    ).length;

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
        completedSessions,
        remainingSessions,
        scheduledSessions,
        progressPercent,
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
