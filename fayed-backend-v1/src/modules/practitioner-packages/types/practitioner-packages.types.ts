import {
  PackageSchedulePolicy,
  PractitionerPackageStatus,
  Prisma,
  SessionMode,
} from '@prisma/client';

export const PRACTITIONER_PACKAGES_DEFAULT_PAGE = 1;
export const PRACTITIONER_PACKAGES_DEFAULT_LIMIT = 20;
export const PRACTITIONER_PACKAGES_MAX_LIMIT = 50;

export interface PractitionerPackageCountsViewModel {
  purchaseCount: number;
  linkedSessionCount: number;
}

export interface PractitionerPackageViewModel {
  id: string;
  practitionerId: string;
  slug: string;
  title: string;
  description: string | null;
  sessionCount: number;
  sessionDurationMinutes: number;
  sessionMode: SessionMode;
  priceEgp: string;
  priceUsd: string;
  status: PractitionerPackageStatus;
  schedulePolicy: PackageSchedulePolicy;
  version: number;
  activatedAt: string | null;
  pausedAt: string | null;
  disabledAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  counts: PractitionerPackageCountsViewModel;
}

export interface PractitionerPackageListItemViewModel extends PractitionerPackageViewModel {}

export interface PractitionerPackageDetailViewModel extends PractitionerPackageViewModel {}

export interface PractitionerPackageListPaginationViewModel {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface PractitionerPackageLimitUsageViewModel {
  maxNonArchivedPackages: number;
  currentNonArchivedPackages: number;
}

export interface PractitionerPackageListResultViewModel {
  items: PractitionerPackageListItemViewModel[];
  pagination: PractitionerPackageListPaginationViewModel;
  limitUsage: PractitionerPackageLimitUsageViewModel;
}

export interface PractitionerPackageListQuery {
  page?: number;
  limit?: number;
}

export interface PractitionerPackageDraftInput {
  practitionerId: string;
  slug: string;
  title: string;
  description: string | null;
  sessionCount: number;
  sessionDurationMinutes: number;
  sessionMode: SessionMode;
  priceEgp: Prisma.Decimal;
  priceUsd: Prisma.Decimal;
  schedulePolicy: PackageSchedulePolicy;
}

export interface PractitionerPackageUpdateInput {
  title?: string;
  description?: string | null;
  sessionCount?: number;
  sessionDurationMinutes?: number;
  sessionMode?: SessionMode;
  priceEgp?: Prisma.Decimal;
  priceUsd?: Prisma.Decimal;
  schedulePolicy?: PackageSchedulePolicy;
}
