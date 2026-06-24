/**
 * Public read-model types for practitioner listing/details responses.
 * These shapes intentionally exclude internal/admin/private fields.
 */
import type { PaymentRegionalPricingMode } from '@common/payments/payment-region.resolver';

export interface PublicPractitionerListItemViewModel {
  id: string;
  slug: string;
  displayName: string | null;
  professionalTitle: string | null;
  bioSnippet: string | null;
  specialties: Array<{
    specialtyId: string;
    slug: string;
    title: string | null;
    isPrimary: boolean;
  }>;
  languages: string[];
  countryCode: string | null;
  currencyCode: string;
  regionalPricingMode: PaymentRegionalPricingMode;
  resolvedCountryIsoCode: string | null;
  practitionerType: string;
  practitionerGender: string | null;
  pricing: {
    session30: { egp: number | null; usd: number | null };
    session60: { egp: number | null; usd: number | null };
  };
  sessionPrice30: number | null;
  sessionPrice60: number | null;
  sessionPrice30Egp: number | null;
  sessionPrice30Usd: number | null;
  sessionPrice60Egp: number | null;
  sessionPrice60Usd: number | null;
  displaySessionPrice30: number | null;
  displaySessionPrice60: number | null;
  isOnlineNow: boolean;
  acceptsCoupon: boolean;
  acceptsPackage: boolean;
  yearsExperience: number | null;
  ratingSummary: {
    averageRating: number | null;
    ratingsCount: number;
    publishedRatingsCount: number;
    writtenReviewsCount: number;
    totalReviews: number;
  };
  avatarUrl: string | null;
  isVerified: boolean;
}

export interface PublicPractitionerDetailsViewModel {
  id: string;
  slug: string;
  displayName: string | null;
  professionalTitle: string | null;
  fullBio: string | null;
  specialties: Array<{
    specialtyId: string;
    slug: string;
    title: string | null;
    isPrimary: boolean;
  }>;
  languages: string[];
  countryCode: string | null;
  currencyCode: string;
  regionalPricingMode: PaymentRegionalPricingMode;
  resolvedCountryIsoCode: string | null;
  yearsExperience: number | null;
  pricing: {
    session30: { egp: number | null; usd: number | null };
    session60: { egp: number | null; usd: number | null };
  };
  sessionPrice30: number | null;
  sessionPrice60: number | null;
  sessionPrice30Egp: number | null;
  sessionPrice30Usd: number | null;
  sessionPrice60Egp: number | null;
  sessionPrice60Usd: number | null;
  displaySessionPrice30: number | null;
  displaySessionPrice60: number | null;
  ratingSummary: {
    averageRating: number | null;
    ratingsCount: number;
    publishedRatingsCount: number;
    writtenReviewsCount: number;
    totalReviews: number;
  };
  credentialsSummary: {
    totalCredentials: number;
    approvedCredentials: number;
  };
  isVerified: boolean;
  avatarUrl: string | null;
}
