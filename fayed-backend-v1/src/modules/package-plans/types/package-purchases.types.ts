import {
  PackageSchedulePolicy,
  Prisma,
  SessionMode,
  SessionStatus,
} from '@prisma/client';

export interface PackagePurchaseSessionSummaryViewModel {
  id: string;
  sessionCode: string;
  status: SessionStatus;
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
  sessionCount: number;
  discountPercent: string;
  practitionerId: string;
  durationMinutes: number;
  sessionMode: SessionMode;
  selectedCurrencyCode: string;
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
