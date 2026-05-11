import { Injectable } from '@nestjs/common';
import { PaymentRegionalPricingMode } from '@common/payments/payment-region.resolver';
import {
  PatientPackagePurchaseViewModel,
  PackagePurchaseSessionSummaryViewModel,
} from '../types/package-purchases.types';

type PurchaseRecord = {
  id: string;
  status: string;
  planCodeSnapshot: string | null;
  sessionCountSnapshot: number;
  discountPercentSnapshot: { toString(): string } | string | null;
  practitionerId: string;
  sessionDurationMinutesSnapshot: number;
  sessionModeSnapshot: PackagePurchaseSessionSummaryViewModel['sessionMode'];
  selectedCurrencyCode: string;
  patient?: {
    country?: {
      isoCode?: string | null;
    } | null;
  } | null;
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
    scheduledStartAt: Date | null;
    scheduledEndAt: Date | null;
    durationMinutes: number;
    sessionMode: PackagePurchaseSessionSummaryViewModel['sessionMode'];
    packageSessionIndex: number | null;
  }>;
};

@Injectable()
export class PackagePurchasePresenter {
  toViewModel(input: {
    purchase: PurchaseRecord;
    sessions?: PurchaseRecord['sessions'];
  }): PatientPackagePurchaseViewModel {
    const linkedSessionItems = (input.sessions ?? input.purchase.sessions).map((session) =>
      this.toSessionViewModel(session),
    );

    return {
      id: input.purchase.id,
      status: input.purchase.status,
      planCode: input.purchase.planCodeSnapshot ?? '',
      sessionCount: input.purchase.sessionCountSnapshot,
      discountPercent:
        input.purchase.discountPercentSnapshot === null ||
        input.purchase.discountPercentSnapshot === undefined
          ? '0.00'
          : input.purchase.discountPercentSnapshot.toString(),
      practitionerId: input.purchase.practitionerId,
      durationMinutes: input.purchase.sessionDurationMinutesSnapshot,
      sessionMode: input.purchase.sessionModeSnapshot,
      selectedCurrencyCode: input.purchase.selectedCurrencyCode,
      regionalPricingMode: this.resolveRegionalPricingMode(input.purchase.patient),
      resolvedCountryIsoCode: input.purchase.patient?.country?.isoCode ?? null,
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
    patient: PurchaseRecord['patient'],
  ): PaymentRegionalPricingMode {
    const countryIsoCode = patient?.country?.isoCode?.trim().toUpperCase() ?? null;
    return countryIsoCode === 'EG' || countryIsoCode === 'EGY'
      ? 'EGYPT_LOCAL'
      : 'INTERNATIONAL';
  }

  private toSessionViewModel(
    session: PurchaseRecord['sessions'][number],
  ): PackagePurchaseSessionSummaryViewModel {
    return {
      id: session.id,
      sessionCode: session.sessionCode,
      status: session.status,
      scheduledStartAt: session.scheduledStartAt?.toISOString() ?? null,
      scheduledEndAt: session.scheduledEndAt?.toISOString() ?? null,
      durationMinutes: session.durationMinutes,
      sessionMode: session.sessionMode,
      packageSessionIndex: session.packageSessionIndex ?? 0,
    };
  }
}
