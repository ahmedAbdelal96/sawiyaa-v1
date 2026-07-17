import { Injectable } from '@nestjs/common';
import { AcademyProgramEnrollmentStatus, AcademyProgramStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

type AcademyProgramCapacitySummary = {
  targetLearnerCount: number | null;
  activeLearnerCount: number;
  remainingTargetSlots: number | null;
  isOverTargetLearners: boolean;
};

@Injectable()
export class AcademyProgramRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createProgram(
    data: Prisma.AcademyProgramUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    const program = await (tx ?? this.prisma).academyProgram.create({
      data,
      include: this.adminProgramInclude(true),
    });

    return this.attachCapacitySummary(program, tx);
  }

  async updateProgram(
    programId: string,
    data: Prisma.AcademyProgramUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    const program = await (tx ?? this.prisma).academyProgram.update({
      where: { id: programId },
      data,
      include: this.adminProgramInclude(true),
    });

    return this.attachCapacitySummary(program, tx);
  }

  async findProgramById(programId: string) {
    const program = await this.prisma.academyProgram.findUnique({
      where: { id: programId },
      include: this.adminProgramInclude(true),
    });

    return this.attachCapacitySummary(program);
  }

  findProgramBySlug(slug: string) {
    return this.prisma.academyProgram.findUnique({
      where: { slug },
      include: this.adminProgramInclude(true),
    });
  }

  findCategoryById(categoryId: string) {
    return this.prisma.courseCategory.findUnique({
      where: { id: categoryId },
      include: {
        translations: {
          orderBy: [{ locale: 'asc' }],
        },
      },
    });
  }

  async findPublicProgramBySlug(slug: string) {
    const now = new Date();

    const program = await this.prisma.academyProgram.findFirst({
      where: {
        slug: slug.trim().toLowerCase(),
        status: AcademyProgramStatus.PUBLISHED,
        archivedAt: null,
        publishedAt: { lte: now },
      },
      include: this.publicProgramInclude(true),
    });

    return this.attachCapacitySummary(program);
  }

  async listPublicPrograms(input: { page: number; limit: number; q?: string }) {
    const skip = (input.page - 1) * input.limit;
    const now = new Date();
    const trimmed = input.q?.trim() ?? '';

    const where: Prisma.AcademyProgramWhereInput = {
      status: AcademyProgramStatus.PUBLISHED,
      archivedAt: null,
      publishedAt: { lte: now },
      ...(trimmed
        ? {
            OR: [
              { titleAr: { contains: trimmed, mode: 'insensitive' } },
              { titleEn: { contains: trimmed, mode: 'insensitive' } },
              { slug: { contains: trimmed, mode: 'insensitive' } },
              {
                descriptionAr: { contains: trimmed, mode: 'insensitive' },
              },
              {
                descriptionEn: { contains: trimmed, mode: 'insensitive' },
              },
              {
                category: {
                  slugRoot: { contains: trimmed, mode: 'insensitive' },
                },
              },
              {
                category: {
                  translations: {
                    some: {
                      title: { contains: trimmed, mode: 'insensitive' },
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [items, totalItems] = await Promise.all([
      this.prisma.academyProgram.findMany({
        where,
        skip,
        take: input.limit,
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
        include: this.publicProgramInclude(false),
      }),
      this.prisma.academyProgram.count({ where }),
    ]);

    return [
      await this.attachCapacitySummaryList(items, now),
      totalItems,
    ] as const;
  }

  async listAdminPrograms(input: {
    page: number;
    limit: number;
    status?: AcademyProgramStatus;
    q?: string;
  }) {
    const skip = (input.page - 1) * input.limit;
    const trimmed = input.q?.trim() ?? '';
    const where: Prisma.AcademyProgramWhereInput = {
      ...(input.status ? { status: input.status } : {}),
      ...(trimmed
        ? {
            OR: [
              { titleAr: { contains: trimmed, mode: 'insensitive' } },
              { titleEn: { contains: trimmed, mode: 'insensitive' } },
              { slug: { contains: trimmed, mode: 'insensitive' } },
              {
                descriptionAr: { contains: trimmed, mode: 'insensitive' },
              },
              {
                descriptionEn: { contains: trimmed, mode: 'insensitive' },
              },
              {
                category: {
                  slugRoot: { contains: trimmed, mode: 'insensitive' },
                },
              },
            ],
          }
        : {}),
    };

    const [items, totalItems] = await Promise.all([
      this.prisma.academyProgram.findMany({
        where,
        skip,
        take: input.limit,
        orderBy: [{ updatedAt: 'desc' }],
        include: this.adminProgramInclude(false),
      }),
      this.prisma.academyProgram.count({ where }),
    ]);

    return [
      await this.attachCapacitySummaryList(items, new Date()),
      totalItems,
    ] as const;
  }

  createSession(
    data: Prisma.AcademyProgramSessionUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return (tx ?? this.prisma).academyProgramSession.create({
      data,
      include: this.sessionInclude(),
    });
  }

  updateSession(
    sessionId: string,
    data: Prisma.AcademyProgramSessionUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return (tx ?? this.prisma).academyProgramSession.update({
      where: { id: sessionId },
      data,
      include: this.sessionInclude(),
    });
  }

  findSessionById(sessionId: string) {
    return this.prisma.academyProgramSession.findUnique({
      where: { id: sessionId },
      include: this.sessionInclude(),
    });
  }

  findSessionByProgramAndId(programId: string, sessionId: string) {
    return this.prisma.academyProgramSession.findFirst({
      where: {
        id: sessionId,
        academyProgramId: programId,
      },
      include: this.sessionInclude(),
    });
  }

  listSessionsByProgramId(programId: string, publicOnly = false) {
    return this.prisma.academyProgramSession.findMany({
      where: {
        academyProgramId: programId,
        ...(publicOnly ? { isPublished: true } : {}),
      },
      orderBy: [{ sortOrder: 'asc' }, { startsAt: 'asc' }, { createdAt: 'asc' }],
      include: this.sessionInclude(),
    });
  }

  countSessionsByProgramId(programId: string) {
    return this.prisma.academyProgramSession.count({
      where: { academyProgramId: programId },
    });
  }

  countActiveLearnersByProgramId(
    programId: string,
    now: Date,
    tx?: Prisma.TransactionClient,
  ) {
    return this.countActiveLearnersByProgramIds([programId], now, tx).then(
      (counts) => counts.get(programId) ?? 0,
    );
  }

  async countActiveLearnersByProgramIds(
    programIds: string[],
    now: Date,
    tx?: Prisma.TransactionClient,
  ) {
    if (programIds.length === 0) {
      return new Map<string, number>();
    }

    const rows = await (tx ?? this.prisma).academyProgramEnrollment.groupBy({
      by: ['academyProgramId'],
      where: {
        academyProgramId: { in: programIds },
        OR: [
          {
            status: AcademyProgramEnrollmentStatus.CONFIRMED,
          },
          {
            status: AcademyProgramEnrollmentStatus.PENDING_PAYMENT,
            seatReservationExpiresAt: {
              gt: now,
            },
          },
        ],
      },
      _count: {
        _all: true,
      },
    });

    return new Map(rows.map((row) => [row.academyProgramId, row._count._all]));
  }

  private async attachCapacitySummaryList<T extends { id: string; maxSeats: number | null }>(
    programs: T[],
    now: Date,
    tx?: Prisma.TransactionClient,
  ) {
    const activeCounts = await this.countActiveLearnersByProgramIds(
      programs.map((program) => program.id),
      now,
      tx,
    );

    return Promise.all(
      programs.map((program) =>
        this.attachCapacitySummary(
          program,
          tx,
          activeCounts.get(program.id) ?? 0,
        ),
      ),
    );
  }

  private async attachCapacitySummary<T extends { id: string; maxSeats: number | null }>(
    program: T,
    tx?: Prisma.TransactionClient,
    activeLearnerCount?: number,
  ): Promise<T & AcademyProgramCapacitySummary>;
  private async attachCapacitySummary<T extends { id: string; maxSeats: number | null }>(
    program: T | null,
    tx?: Prisma.TransactionClient,
    activeLearnerCount?: number,
  ): Promise<(T & AcademyProgramCapacitySummary) | null>;
  private async attachCapacitySummary<T extends { id: string; maxSeats: number | null }>(
    program: T | null,
    tx?: Prisma.TransactionClient,
    activeLearnerCount?: number,
  ) {
    if (!program) {
      return null;
    }

    const targetLearnerCount = program.maxSeats ?? null;
    const resolvedActiveLearnerCount =
      activeLearnerCount ??
      (await this.countActiveLearnersByProgramId(program.id, new Date(), tx));
    const remainingTargetSlots =
      targetLearnerCount === null
        ? null
        : Math.max(targetLearnerCount - resolvedActiveLearnerCount, 0);

    return {
      ...program,
      targetLearnerCount,
      activeLearnerCount: resolvedActiveLearnerCount,
      remainingTargetSlots,
      isOverTargetLearners:
        targetLearnerCount !== null &&
        resolvedActiveLearnerCount > targetLearnerCount,
    } satisfies T & AcademyProgramCapacitySummary;
  }

  private adminProgramInclude(includeSessions = false): Prisma.AcademyProgramInclude {
    return {
      category: {
        include: {
          translations: {
            orderBy: [{ locale: 'asc' }],
          },
        },
      },
      createdByUser: {
        select: {
          id: true,
          displayName: true,
        },
      },
      ...(includeSessions
        ? {
            sessions: {
              orderBy: [
                { sortOrder: 'asc' },
                { startsAt: 'asc' },
                { createdAt: 'asc' },
              ],
              include: this.sessionInclude(),
            },
          }
        : {}),
    };
  }

  private publicProgramInclude(includeSessions = false): Prisma.AcademyProgramInclude {
    return {
      category: {
        include: {
          translations: {
            orderBy: [{ locale: 'asc' }],
          },
        },
      },
      ...(includeSessions
        ? {
            sessions: {
              where: { isPublished: true },
              orderBy: [
                { sortOrder: 'asc' },
                { startsAt: 'asc' },
                { createdAt: 'asc' },
              ],
              include: this.sessionInclude(),
            },
          }
        : {}),
    };
  }

  private sessionInclude(): Prisma.AcademyProgramSessionInclude {
    return {
      createdByUser: {
        select: {
          id: true,
          displayName: true,
        },
      },
      academyProgram: {
        select: {
          id: true,
          slug: true,
          titleAr: true,
          titleEn: true,
        },
      },
    };
  }
}
