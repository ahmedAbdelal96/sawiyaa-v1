import {
  PackageSchedulePolicy,
  Prisma,
  SessionMode,
  SessionStatus,
} from '@prisma/client';
import { SessionOperationalInterpretation } from '@modules/sessions/types/session-operational-interpretation.types';

export interface PackagePurchaseSessionSummaryViewModel {
  id: string;
  sessionCode: string;
  status: SessionStatus;
  operational: SessionOperationalInterpretation;
  scheduledStartAt: string | null;
  scheduledEndAt: string | null;
  durationMinutes: number;
  sessionMode: SessionMode;
  packageSessionIndex: number;
}

export interface PatientPackagePurchaseViewModel {
  id: string;
  status: string;
  planCode: string;
  title: string;
  description: string | null;
  sessionCount: number;
  discountPercent: string;
  practitionerId: string;
  practitioner?: {
    id: string;
    publicSlug: string;
    displayName: string;
    avatarUrl: string | null;
    professionalTitle: string | null;
  };
  progress: {
    totalSessions: number;
    consumedSessions: number;
    completedSessions: number;
    /** Sessions already attached to an appointment or awaiting an outcome. */
    reservedSessions: number;
    /** Entitlements that are not consumed and not currently reserved. */
    availableSessions: number;
    remainingSessions: number;
    scheduledSessions: number;
    progressPercent: number;
    nextSessionStartAt: string | null;
  };
  durationMinutes: number;
  sessionMode: SessionMode;
  selectedCurrencyCode: string;
  regionalPricingMode: 'EGYPT_LOCAL' | 'INTERNATIONAL';
  resolvedCountryIsoCode: string | null;
  selectedBaseSessionPrice: string;
  undiscountedTotal: string;
  discountAmount: string;
  patientPayableTotal: string;
  paymentExpiresAt: string | null;
  linkedSessionsCount: number;
  createdAt: string;
  updatedAt: string;
  linkedSessions: {
    totalItems: number;
    items: PackagePurchaseSessionSummaryViewModel[];
  };
  payment: {
    id: string;
    status: string;
    amountTotal: string;
    amountFromWallet: string;
    amountFromGateway: string;
    currency: string;
    initiatedAt: string;
    capturedAt: string | null;
    failedAt: string | null;
    expiredAt: string | null;
    refundedAt: string | null;
    refunds: Array<{
      id: string;
      status: string;
      destination: string;
      amount: string;
      currency: string;
      reason: string | null;
      requestedAt: string;
      processedAt: string | null;
      failedAt: string | null;
      customerWalletCreditedAt: string | null;
      sessionId: string | null;
    }>;
  } | null;
  entitlementHistory: Array<{
    id: string;
    sessionId: string;
    sessionCode: string | null;
    decisionType: string;
    reasonCode: string;
    sessionStatus: string;
    decidedAt: string;
    scheduledStartAt: string | null;
  }>;
}

export interface PatientPackagePurchasesPaginationViewModel {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface PatientPackagePurchasesListResultViewModel {
  items: PatientPackagePurchaseViewModel[];
  pagination: PatientPackagePurchasesPaginationViewModel;
}

export interface PatientPackagePurchaseResultViewModel {
  item: PatientPackagePurchaseViewModel;
}

export interface PackagePurchaseSnapshotInput {
  packagePlanId: string;
  planIdSnapshot: string;
  planCodeSnapshot: string;
  sessionCountSnapshot: number;
  discountPercentSnapshot: string;
  baseSessionPriceEgpSnapshot: string | null;
  baseSessionPriceUsdSnapshot: string | null;
  currencyCodeSnapshot: string;
  selectedBaseSessionPriceSnapshot: string;
  undiscountedTotalSnapshot: string;
  discountAmountSnapshot: string;
  patientPayableTotalSnapshot: string;
  platformDiscountShareSnapshot: string;
  practitionerDiscountShareSnapshot: string;
  commissionModeSnapshot: string | null;
  platformOriginalShareSnapshot: string | null;
  practitionerOriginalShareSnapshot: string | null;
  platformFinalShareSnapshot: string | null;
  practitionerFinalShareSnapshot: string | null;
  sessionDurationMinutesSnapshot: number;
  sessionModeSnapshot: SessionMode;
  titleSnapshot: string;
  descriptionSnapshot: string | null;
  slugSnapshot: string;
  packageVersionSnapshot: number;
  priceEgpSnapshot: string | null;
  priceUsdSnapshot: string | null;
  selectedAmountSnapshot: string;
  schedulePolicySnapshot: PackageSchedulePolicy;
  metadataJson: Prisma.InputJsonValue | Prisma.JsonNullValueInput | null;
}
