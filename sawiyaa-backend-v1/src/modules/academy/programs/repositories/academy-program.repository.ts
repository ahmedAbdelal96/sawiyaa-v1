import { Injectable } from '@nestjs/common';
import { AcademyProgramStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

@Injectable()
export class AcademyProgramRepository {
  constructor(private readonly prisma: PrismaService) {}

  createProgram(
    data: Prisma.AcademyProgramUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return (tx ?? this.prisma).academyProgram.create({
      data,
      include: this.adminProgramInclude(true),
    });
  }

  updateProgram(
    programId: string,
    data: Prisma.AcademyProgramUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return (tx ?? this.prisma).academyProgram.update({
      where: { id: programId },
      data,
      include: this.adminProgramInclude(true),
    });
  }

  findProgramById(programId: string) {
    return this.prisma.academyProgram.findUnique({
      where: { id: programId },
      include: this.adminProgramInclude(true),
    });
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

  findPublicProgramBySlug(slug: string) {
    const now = new Date();

    return this.prisma.academyProgram.findFirst({
      where: {
        slug: slug.trim().toLowerCase(),
        status: AcademyProgramStatus.PUBLISHED,
        archivedAt: null,
        publishedAt: { lte: now },
      },
      include: this.publicProgramInclude(true),
    });
  }

  listPublicPrograms(input: { page: number; limit: number; q?: string }) {
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

    return Promise.all([
      this.prisma.academyProgram.findMany({
        where,
        skip,
        take: input.limit,
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
        include: this.publicProgramInclude(false),
      }),
      this.prisma.academyProgram.count({ where }),
    ]);
  }

  listAdminPrograms(input: {
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

    return Promise.all([
      this.prisma.academyProgram.findMany({
        where,
        skip,
        take: input.limit,
        orderBy: [{ updatedAt: 'desc' }],
        include: this.adminProgramInclude(false),
      }),
      this.prisma.academyProgram.count({ where }),
    ]);
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
