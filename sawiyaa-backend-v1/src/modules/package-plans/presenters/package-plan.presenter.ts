import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PackagePlanViewModel } from '../types/package-plans.types';

type PackagePlanRecord = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  sessionCount: number;
  discountPercent: { toString(): string };
  isActive: boolean;
  sortOrder: number;
  archivedAt: Date | null;
  metadataJson: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    purchases: number;
  };
};

@Injectable()
export class PackagePlanPresenter {
  toViewModel(item: PackagePlanRecord): PackagePlanViewModel {
    return {
      id: item.id,
      code: item.code,
      title: item.title,
      description: item.description,
      sessionCount: item.sessionCount,
      discountPercent: item.discountPercent.toString(),
      isActive: item.isActive,
      sortOrder: item.sortOrder,
      archivedAt: item.archivedAt?.toISOString() ?? null,
      metadataJson: item.metadataJson,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      counts: {
        purchaseCount: item._count?.purchases ?? 0,
      },
    };
  }
}
