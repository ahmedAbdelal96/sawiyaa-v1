import { Injectable } from '@nestjs/common';
import {
  PackageSchedulePolicy,
  PractitionerPackageStatus,
  SessionMode,
} from '@prisma/client';
import {
  PractitionerPackageDetailViewModel,
  PractitionerPackageListResultViewModel,
  PractitionerPackageLimitUsageViewModel,
  PractitionerPackageViewModel,
} from '../types/practitioner-packages.types';

type PractitionerPackageRecord = {
  id: string;
  practitionerId: string;
  slug: string;
  title: string;
  description: string | null;
  sessionCount: number;
  sessionDurationMinutes: number;
  sessionMode: SessionMode;
  priceEgp: { toString(): string };
  priceUsd: { toString(): string };
  status: PractitionerPackageStatus;
  schedulePolicy: PackageSchedulePolicy;
  version: number;
  activatedAt: Date | null;
  pausedAt: Date | null;
  disabledAt: Date | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    purchases: number;
    sessions: number;
  };
};

@Injectable()
export class PractitionerPackagePresenter {
  toListItem(item: PractitionerPackageRecord): PractitionerPackageViewModel {
    return this.toViewModel(item);
  }

  toDetail(
    item: PractitionerPackageRecord,
  ): PractitionerPackageDetailViewModel {
    return this.toViewModel(item);
  }

  toListResult(input: {
    items: PractitionerPackageRecord[];
    page: number;
    limit: number;
    totalItems: number;
    currentNonArchivedPackages: number;
    maxNonArchivedPackages: number;
  }): PractitionerPackageListResultViewModel {
    return {
      items: input.items.map((item) => this.toListItem(item)),
      pagination: {
        page: input.page,
        limit: input.limit,
        totalItems: input.totalItems,
        totalPages: Math.max(1, Math.ceil(input.totalItems / input.limit)),
      },
      limitUsage: {
        currentNonArchivedPackages: input.currentNonArchivedPackages,
        maxNonArchivedPackages: input.maxNonArchivedPackages,
      } satisfies PractitionerPackageLimitUsageViewModel,
    };
  }

  private toViewModel(
    item: PractitionerPackageRecord,
  ): PractitionerPackageViewModel {
    return {
      id: item.id,
      practitionerId: item.practitionerId,
      slug: item.slug,
      title: item.title,
      description: item.description,
      sessionCount: item.sessionCount,
      sessionDurationMinutes: item.sessionDurationMinutes,
      sessionMode: item.sessionMode,
      priceEgp: item.priceEgp.toString(),
      priceUsd: item.priceUsd.toString(),
      status: item.status,
      schedulePolicy: item.schedulePolicy,
      version: item.version,
      activatedAt: item.activatedAt?.toISOString() ?? null,
      pausedAt: item.pausedAt?.toISOString() ?? null,
      disabledAt: item.disabledAt?.toISOString() ?? null,
      archivedAt: item.archivedAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      counts: {
        purchaseCount: item._count?.purchases ?? 0,
        linkedSessionCount: item._count?.sessions ?? 0,
      },
    };
  }
}
