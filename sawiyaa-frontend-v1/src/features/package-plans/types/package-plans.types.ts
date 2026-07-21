import type { SessionMode } from "@/features/sessions/types/sessions.types";

export type PackagePlanSessionQuote = {
  planCode: string;
  sessionCount: number;
  discountPercent: string;
  practitionerId: string;
  durationMinutes: number;
  sessionMode: SessionMode;
  selectedCurrencyCode: string;
  regionalPricingMode: "EGYPT_LOCAL" | "INTERNATIONAL";
  resolvedCountryIsoCode: string | null;
  provider: "PAYMOB" | "STRIPE" | "INTERNAL_WALLET" | null;
  selectedBaseSessionPrice: string;
  undiscountedTotal: string;
  discountAmount: string;
  patientPayableTotal: string;
};

export type PackagePlanSummary = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  sessionCount: number;
  discountPercent: string;
  isActive: boolean;
  sortOrder: number;
  archivedAt: string | null;
  metadataJson: unknown;
  createdAt: string;
  updatedAt: string;
  counts: {
    purchaseCount: number;
  };
};

export type PackagePlanQuotedItem = {
  item: PackagePlanSummary;
  quote: PackagePlanSessionQuote;
};

export type PublicPackagePlansResponseData = {
  items: PackagePlanQuotedItem[];
};

export type PackagePlansQuery = {
  durationMinutes?: 30 | 60;
  sessionMode?: SessionMode;
};

export type PatientPackagePlanQuoteRequest = {
  packagePlanCode: string;
  practitionerSlug: string;
  durationMinutes: 30 | 60;
  sessionMode: SessionMode;
};

export type PatientPackagePlanQuoteResponseData = {
  item: PackagePlanQuotedItem;
};
