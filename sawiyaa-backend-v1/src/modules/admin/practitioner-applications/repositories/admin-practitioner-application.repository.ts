import { Injectable } from '@nestjs/common';
import {
  PractitionerApplicationStatus,
  PractitionerStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import {
  AdminPractitionerApplicationKind,
  AdminPractitionerApplicationListView,
} from '../types/practitioner-applications-admin.types';

type DbClient = PrismaService | Prisma.TransactionClient;

const ACTIVE_APPLICATION_STATUSES: PractitionerApplicationStatus[] = [
  PractitionerApplicationStatus.SUBMITTED,
  PractitionerApplicationStatus.UNDER_REVIEW,
  PractitionerApplicationStatus.CHANGES_REQUESTED,
];

const HISTORY_APPLICATION_STATUSES: PractitionerApplicationStatus[] = [
  PractitionerApplicationStatus.APPROVED,
  PractitionerApplicationStatus.REJECTED,
  PractitionerApplicationStatus.ARCHIVED,
];

/**
 * Admin application repository encapsulates application listing and decision-state persistence.
 * It intentionally stays focused on admin review concerns only.
 */
@Injectable()
export class AdminPractitionerApplicationRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getDb(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  private getViewStatuses(view?: AdminPractitionerApplicationListView) {
    if (view === AdminPractitionerApplicationListView.ACTIVE) {
      return ACTIVE_APPLICATION_STATUSES;
    }

    if (view === AdminPractitionerApplicationListView.HISTORY) {
      return HISTORY_APPLICATION_STATUSES;
    }

    return undefined;
  }

  private buildPractitionerWhere(input: {
    kind?: AdminPractitionerApplicationKind;
    view?: AdminPractitionerApplicationListView;
    status?: PractitionerApplicationStatus;
    search?: string;
  }) {
    return {
      ...(input.kind === AdminPractitionerApplicationKind.EDIT_REQUEST
        ? { status: PractitionerStatus.APPROVED }
        : input.kind === AdminPractitionerApplicationKind.NEW_APPLICATION
          ? { status: { not: PractitionerStatus.APPROVED } }
          : {}),
      ...(input.search
        ? {
            user: {
              displayName: {
                contains: input.search.trim(),
                mode: 'insensitive' as const,
              },
            },
          }
        : {}),
    };
  }

  private buildApplicationStatusWhere(input: {
    view?: AdminPractitionerApplicationListView;
    status?: PractitionerApplicationStatus;
  }) {
    if (input.status) {
      return { status: input.status };
    }

    const viewStatuses = this.getViewStatuses(input.view);

    return viewStatuses ? { status: { in: viewStatuses } } : {};
  }

  async list(input: {
    kind?: AdminPractitionerApplicationKind;
    view?: AdminPractitionerApplicationListView;
    status?: PractitionerApplicationStatus;
    search?: string;
    skip: number;
    take: number;
  }) {
    const practitionerWhere = this.buildPractitionerWhere(input);
    const applicationStatusWhere = this.buildApplicationStatusWhere(input);

    return this.prisma.practitionerApplication.findMany({
      where: {
        ...applicationStatusWhere,
        practitioner:
          Object.keys(practitionerWhere).length > 0
            ? practitionerWhere
            : undefined,
      },
      orderBy: [{ submittedAt: 'desc' }, { createdAt: 'desc' }],
      skip: input.skip,
      take: input.take,
      include: {
        practitioner: {
          select: {
            status: true,
            practitionerType: true,
            user: {
              select: {
                id: true,
                displayName: true,
              },
            },
            country: {
              select: {
                isoCode: true,
              },
            },
            specialties: {
              where: { isPrimary: true },
              take: 1,
              select: {
                specialtyId: true,
                isPrimary: true,
                specialty: {
                  select: {
                    id: true,
                    slug: true,
                    categoryId: true,
                    translations: {
                      where: {
                        locale: {
                          in: ['en', 'ar'],
                        },
                      },
                      orderBy: { locale: 'asc' },
                      select: {
                        locale: true,
                        title: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  count(input: {
    kind?: AdminPractitionerApplicationKind;
    view?: AdminPractitionerApplicationListView;
    status?: PractitionerApplicationStatus;
    search?: string;
  }) {
    const practitionerWhere = this.buildPractitionerWhere(input);
    const applicationStatusWhere = this.buildApplicationStatusWhere(input);

    return this.prisma.practitionerApplication.count({
      where: {
        ...applicationStatusWhere,
        practitioner:
          Object.keys(practitionerWhere).length > 0
            ? practitionerWhere
            : undefined,
      },
    });
  }

  async summary() {
    const [
      total,
      newApplications,
      editRequests,
      activeApplications,
      submittedApplications,
      underReviewApplications,
      changesRequestedApplications,
      approvedApplications,
      rejectedApplications,
      archivedApplications,
    ] = await Promise.all([
      this.prisma.practitionerApplication.count(),
      this.prisma.practitionerApplication.count({
        where: {
          practitioner: {
            status: {
              not: PractitionerStatus.APPROVED,
            },
          },
        },
      }),
      this.prisma.practitionerApplication.count({
        where: {
          practitioner: {
            status: PractitionerStatus.APPROVED,
          },
        },
      }),
      this.prisma.practitionerApplication.count({
        where: {
          status: {
            in: ACTIVE_APPLICATION_STATUSES,
          },
        },
      }),
      this.prisma.practitionerApplication.count({
        where: {
          status: PractitionerApplicationStatus.SUBMITTED,
        },
      }),
      this.prisma.practitionerApplication.count({
        where: {
          status: PractitionerApplicationStatus.UNDER_REVIEW,
        },
      }),
      this.prisma.practitionerApplication.count({
        where: {
          status: PractitionerApplicationStatus.CHANGES_REQUESTED,
        },
      }),
      this.prisma.practitionerApplication.count({
        where: {
          status: PractitionerApplicationStatus.APPROVED,
        },
      }),
      this.prisma.practitionerApplication.count({
        where: {
          status: PractitionerApplicationStatus.REJECTED,
        },
      }),
      this.prisma.practitionerApplication.count({
        where: {
          status: PractitionerApplicationStatus.ARCHIVED,
        },
      }),
    ]);

    return {
      total,
      newApplications,
      editRequests,
      activeApplications,
      submittedApplications,
      underReviewApplications,
      changesRequestedApplications,
      approvedApplications,
      rejectedApplications,
      archivedApplications,
    };
  }

  findById(id: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).practitionerApplication.findUnique({
      where: { id },
      include: {
        practitioner: {
          select: {
            id: true,
            userId: true,
          },
        },
      },
    });
  }

  updateDecision(
    id: string,
    input: {
      status: PractitionerApplicationStatus;
      reviewedAt: Date;
      reviewedByUserId: string | null;
      reviewDecisionReason: string | null;
      reviewNotes: string | null;
      submissionSnapshot?: Prisma.InputJsonValue;
    },
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).practitionerApplication.update({
      where: { id },
      data: {
        status: input.status,
        reviewedAt: input.reviewedAt,
        reviewedByUserId: input.reviewedByUserId,
        reviewDecisionReason: input.reviewDecisionReason,
        reviewNotes: input.reviewNotes,
        submissionSnapshot: input.submissionSnapshot,
      },
      include: {
        practitioner: {
          select: {
            id: true,
            userId: true,
          },
        },
      },
    });
  }

  /**
   * Updates only the application submission snapshot.
   * Use this for admin amendments that should NOT stamp review audit fields.
   */
  updateSubmissionSnapshot(
    id: string,
    submissionSnapshot: Prisma.InputJsonValue,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).practitionerApplication.update({
      where: { id },
      data: {
        submissionSnapshot,
      },
      include: {
        practitioner: {
          select: {
            id: true,
            userId: true,
          },
        },
      },
    });
  }
}
