import {
  MarketType,
  PaymentProvider,
  Prisma,
  SessionMode,
} from '@prisma/client';

export interface PackagePlanCountsViewModel {
  purchaseCount: number;
}

export interface PackagePlanViewModel {
  id: string;
  code: string;
  title: string;
  description: string | null;
  sessionCount: number;
  discountPercent: string;
  isActive: boolean;
  sortOrder: number;
  archivedAt: string | null;
  metadataJson: Prisma.JsonValue | null;
  createdAt: string;
  updatedAt: string;
  counts: PackagePlanCountsViewModel;
}

export interface PackagePlanListResultViewModel {
  items: PackagePlanViewModel[];
}

export interface PackagePlanQuoteViewModel {
  planCode: string;
  sessionCount: number;
  discountPercent: string;
  practitionerId: string;
  durationMinutes: number;
  sessionMode: SessionMode;
  selectedCurrencyCode: string;
  regionalPricingMode: 'EGYPT_LOCAL' | 'INTERNATIONAL';
  resolvedCountryIsoCode: string | null;
  provider: PaymentProvider | null;
  selectedBaseSessionPrice: string;
  undiscountedTotal: string;
  discountAmount: string;
  patientPayableTotal: string;
  baseSessionPriceEgp?: string | null;
  baseSessionPriceUsd?: string | null;
  platformDiscountShare?: string | null;
  practitionerDiscountShare?: string | null;
  commissionMode?: MarketType | null;
  platformOriginalShare?: string | null;
  practitionerOriginalShare?: string | null;
  platformFinalShare?: string | null;
  practitionerFinalShare?: string | null;
  roundingAdjustment?: string | null;
  internalBreakdownVisible?: boolean;
}

export interface PackagePlanQuotedItemViewModel {
  item: PackagePlanViewModel;
  quote: PackagePlanQuoteViewModel;
}

export interface PackagePlanQuotedListResultViewModel {
  items: PackagePlanQuotedItemViewModel[];
}

export interface PackagePlanQuotedResultViewModel {
  item: PackagePlanQuotedItemViewModel;
}
