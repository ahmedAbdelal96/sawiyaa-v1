import { Injectable } from '@nestjs/common';
import { PractitionerApplicationStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

type DbClient = PrismaService | Prisma.TransactionClient;

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

  async list(input: {
    status?: PractitionerApplicationStatus;
    search?: string;
    skip: number;
    take: number;
  }) {
    return this.prisma.practitionerApplication.findMany({
      where: {
        status: input.status,
        practitioner: input.search
          ? {
              user: {
                displayName: {
                  contains: input.search.trim(),
                  mode: 'insensitive',
                },
              },
            }
          : undefined,
      },
      orderBy: [{ submittedAt: 'desc' }, { createdAt: 'desc' }],
      skip: input.skip,
      take: input.take,
      include: {
        practitioner: {
          include: {
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
              include: {
                specialty: {
                  include: {
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

  count(input: { status?: PractitionerApplicationStatus; search?: string }) {
    return this.prisma.practitionerApplication.count({
      where: {
        status: input.status,
        practitioner: input.search
          ? {
              user: {
                displayName: {
                  contains: input.search.trim(),
                  mode: 'insensitive',
                },
              },
            }
          : undefined,
      },
    });
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
}
