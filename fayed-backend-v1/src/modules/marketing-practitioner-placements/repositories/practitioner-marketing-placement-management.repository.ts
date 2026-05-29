import { Injectable } from '@nestjs/common';
import {
  PractitionerMarketingPlacementHistoryAction,
  PractitionerMarketingPlacementReason,
  PractitionerMarketingPlacementStatus,
  PractitionerMarketingPlacementSurface,
  PractitionerStatus,
  Prisma,
  UserStatus,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

export type PlacementSnapshot = {
  practitionerId: string;
  surface: PractitionerMarketingPlacementSurface;
  status: PractitionerMarketingPlacementStatus;
  startsAt: string;
  endsAt: string | null;
  priority: number;
  badgeLabelAr: string | null;
  badgeLabelEn: string | null;
  reason: PractitionerMarketingPlacementReason;
  campaignName: string | null;
  notesInternal: string | null;
  pausedAt: string | null;
  pausedByAdminId: string | null;
};

@Injectable()
export class PractitionerMarketingPlacementManagementRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(input: {
    status?: PractitionerMarketingPlacementStatus;
    surface?: PractitionerMarketingPlacementSurface;
    reason?: PractitionerMarketingPlacementReason;
    practitionerSearch?: string;
    startsFrom?: Date;
    endsTo?: Date;
    page: number;
    limit: number;
  }) {
    const where = this.buildWhere(input);
    const skip = (input.page - 1) * input.limit;

    const [items, total] = await Promise.all([
      this.prisma.practitionerMarketingPlacement.findMany({
        where,
        skip,
        take: input.limit,
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        include: {
          practitioner: {
            select: {
              id: true,
              publicSlug: true,
              professionalTitle: true,
              user: {
                select: {
                  id: true,
                  displayName: true,
                },
              },
            },
          },
          createdByAdmin: {
            select: {
              id: true,
              displayName: true,
            },
          },
          pausedByAdmin: {
            select: {
              id: true,
              displayName: true,
            },
          },
        },
      }),
      this.prisma.practitionerMarketingPlacement.count({ where }),
    ]);

    return { items, total };
  }

  findById(id: string) {
    return this.prisma.practitionerMarketingPlacement.findUnique({
      where: { id },
      include: {
        practitioner: {
          select: {
            id: true,
            publicSlug: true,
            professionalTitle: true,
            user: {
              select: {
                id: true,
                displayName: true,
              },
            },
          },
        },
        createdByAdmin: {
          select: {
            id: true,
            displayName: true,
          },
        },
        pausedByAdmin: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    });
  }

  async findEligiblePractitioner(input: { id?: string; slug?: string }) {
    return this.prisma.practitionerProfile.findFirst({
      where: {
        ...(input.id ? { id: input.id } : { publicSlug: input.slug }),
        status: PractitionerStatus.APPROVED,
        isPublicProfilePublished: true,
        user: {
          status: UserStatus.ACTIVE,
        },
      },
      select: {
        id: true,
        publicSlug: true,
        professionalTitle: true,
        user: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    });
  }

  create(data: Prisma.PractitionerMarketingPlacementUncheckedCreateInput) {
    return this.prisma.practitionerMarketingPlacement.create({
      data,
      include: {
        practitioner: {
          select: {
            id: true,
            publicSlug: true,
            professionalTitle: true,
            user: {
              select: {
                id: true,
                displayName: true,
              },
            },
          },
        },
        createdByAdmin: {
          select: {
            id: true,
            displayName: true,
          },
        },
        pausedByAdmin: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    });
  }

  update(
    id: string,
    data: Prisma.PractitionerMarketingPlacementUncheckedUpdateInput,
  ) {
    return this.prisma.practitionerMarketingPlacement.update({
      where: { id },
      data,
      include: {
        practitioner: {
          select: {
            id: true,
            publicSlug: true,
            professionalTitle: true,
            user: {
              select: {
                id: true,
                displayName: true,
              },
            },
          },
        },
        createdByAdmin: {
          select: {
            id: true,
            displayName: true,
          },
        },
        pausedByAdmin: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    });
  }

  createHistory(input: {
    placementId: string;
    action: PractitionerMarketingPlacementHistoryAction;
    actorUserId: string;
    beforeSnapshot?: PlacementSnapshot;
    afterSnapshot?: PlacementSnapshot;
    note?: string;
  }) {
    return this.prisma.practitionerMarketingPlacementHistory.create({
      data: {
        placementId: input.placementId,
        action: input.action,
        actorUserId: input.actorUserId,
        beforeSnapshot: input.beforeSnapshot as Prisma.InputJsonValue | undefined,
        afterSnapshot: input.afterSnapshot as Prisma.InputJsonValue | undefined,
        note: input.note ?? null,
      },
    });
  }

  listHistory(placementId: string) {
    return this.prisma.practitionerMarketingPlacementHistory.findMany({
      where: { placementId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: {
        actorUser: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    });
  }

  toSnapshot(placement: {
    practitionerId: string;
    surface: PractitionerMarketingPlacementSurface;
    status: PractitionerMarketingPlacementStatus;
    startsAt: Date;
    endsAt: Date | null;
    priority: number;
    badgeLabelAr: string | null;
    badgeLabelEn: string | null;
    reason: PractitionerMarketingPlacementReason;
    campaignName: string | null;
    notesInternal: string | null;
    pausedAt: Date | null;
    pausedByAdminId: string | null;
  }): PlacementSnapshot {
    return {
      practitionerId: placement.practitionerId,
      surface: placement.surface,
      status: placement.status,
      startsAt: placement.startsAt.toISOString(),
      endsAt: placement.endsAt?.toISOString() ?? null,
      priority: placement.priority,
      badgeLabelAr: placement.badgeLabelAr,
      badgeLabelEn: placement.badgeLabelEn,
      reason: placement.reason,
      campaignName: placement.campaignName,
      notesInternal: placement.notesInternal,
      pausedAt: placement.pausedAt?.toISOString() ?? null,
      pausedByAdminId: placement.pausedByAdminId,
    };
  }

  private buildWhere(input: {
    status?: PractitionerMarketingPlacementStatus;
    surface?: PractitionerMarketingPlacementSurface;
    reason?: PractitionerMarketingPlacementReason;
    practitionerSearch?: string;
    startsFrom?: Date;
    endsTo?: Date;
  }): Prisma.PractitionerMarketingPlacementWhereInput {
    const search = input.practitionerSearch?.trim();
    const startsFrom = input.startsFrom;
    const endsTo = input.endsTo;

    return {
      ...(input.status ? { status: input.status } : {}),
      ...(input.surface ? { surface: input.surface } : {}),
      ...(input.reason ? { reason: input.reason } : {}),
      ...(startsFrom ? { startsAt: { gte: startsFrom } } : {}),
      ...(endsTo ? { OR: [{ endsAt: null }, { endsAt: { lte: endsTo } }] } : {}),
      ...(search
        ? {
            practitioner: {
              OR: [
                { publicSlug: { contains: search, mode: 'insensitive' } },
                { professionalTitle: { contains: search, mode: 'insensitive' } },
                {
                  user: {
                    displayName: {
                      contains: search,
                      mode: 'insensitive',
                    },
                  },
                },
              ],
            },
          }
        : {}),
    };
  }
}

