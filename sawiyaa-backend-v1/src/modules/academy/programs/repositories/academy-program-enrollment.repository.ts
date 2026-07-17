import { Injectable } from '@nestjs/common';
import {
  AcademyProgramEnrollmentStatus,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

type DbClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class AcademyProgramEnrollmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getDb(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  createEnrollment(
    data: Prisma.AcademyProgramEnrollmentUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).academyProgramEnrollment.create({
      data,
      include: this.enrollmentInclude(),
    });
  }

  updateEnrollment(
    enrollmentId: string,
    data: Prisma.AcademyProgramEnrollmentUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).academyProgramEnrollment.update({
      where: { id: enrollmentId },
      data,
      include: this.enrollmentInclude(),
    });
  }

  createPaymentAttempt(
    data: Prisma.AcademyProgramPaymentAttemptUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).academyProgramPaymentAttempt.create({ data });
  }

  updatePaymentAttempt(
    paymentAttemptId: string,
    data: Prisma.AcademyProgramPaymentAttemptUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).academyProgramPaymentAttempt.update({
      where: { id: paymentAttemptId },
      data,
    });
  }

  findEnrollmentByProgramAndLearner(
    academyProgramId: string,
    academyLearnerId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).academyProgramEnrollment.findUnique({
      where: {
        academyProgramId_academyLearnerId: {
          academyProgramId,
          academyLearnerId,
        },
      },
      include: this.enrollmentInclude(),
    });
  }

  findEnrollmentByIdForPublic(
    enrollmentId: string,
    token: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).academyProgramEnrollment.findFirst({
      where: {
        id: enrollmentId,
        publicAccessToken: token,
      },
      include: this.enrollmentInclude(),
    });
  }

  findEnrollmentByIdForUser(
    enrollmentId: string,
    userId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).academyProgramEnrollment.findFirst({
      where: {
        id: enrollmentId,
        userId,
      },
      include: this.enrollmentInclude(),
    });
  }

  findEnrollmentByIdForAdmin(
    enrollmentId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).academyProgramEnrollment.findUnique({
      where: { id: enrollmentId },
      include: this.enrollmentInclude(),
    });
  }

  findEnrollmentByPaymentId(paymentId: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).academyProgramEnrollment.findFirst({
      where: { paymentId },
      include: this.enrollmentInclude(),
    });
  }

  listEnrollmentsByProgramId(
    academyProgramId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).academyProgramEnrollment.findMany({
      where: { academyProgramId },
      include: this.enrollmentInclude(),
      orderBy: [{ registeredAt: 'desc' }],
    });
  }

  listConfirmedEnrollmentsByProgramId(
    academyProgramId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).academyProgramEnrollment.findMany({
      where: {
        academyProgramId,
        status: AcademyProgramEnrollmentStatus.CONFIRMED,
      },
      include: this.enrollmentInclude(),
      orderBy: [{ contactFullName: 'asc' }, { registeredAt: 'asc' }],
    });
  }

  listEnrollmentsByUserId(userId: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).academyProgramEnrollment.findMany({
      where: { userId },
      include: this.enrollmentInclude(),
      orderBy: [{ registeredAt: 'desc' }],
    });
  }

  listEnrollmentsByUserIdPaginated(input: {
    userId: string;
    page: number;
    limit: number;
    tx?: Prisma.TransactionClient;
  }) {
    const skip = (input.page - 1) * input.limit;

    return Promise.all([
      this.getDb(input.tx).academyProgramEnrollment.findMany({
        where: { userId: input.userId },
        include: this.enrollmentInclude(),
        orderBy: [{ registeredAt: 'desc' }],
        skip,
        take: input.limit,
      }),
      this.getDb(input.tx).academyProgramEnrollment.count({
        where: { userId: input.userId },
      }),
    ]);
  }

  listAdminEnrollments(input: {
    academyProgramId: string;
    page: number;
    limit: number;
    status?: AcademyProgramEnrollmentStatus;
    paymentStatus?: PaymentStatus;
    country?: string;
    sortBy?: 'registeredAt' | 'name';
    sortDir?: Prisma.SortOrder;
    q?: string;
    tx?: Prisma.TransactionClient;
  }) {
    const skip = (input.page - 1) * input.limit;
    const where = this.buildAdminWhere({
      academyProgramId: input.academyProgramId,
      status: input.status,
      paymentStatus: input.paymentStatus,
      country: input.country,
      q: input.q,
    });

    return Promise.all([
      this.getDb(input.tx).academyProgramEnrollment.findMany({
        where,
        skip,
        take: input.limit,
        include: this.enrollmentInclude(),
        orderBy: this.resolveAdminSortOrder(input.sortBy, input.sortDir),
      }),
      this.getDb(input.tx).academyProgramEnrollment.count({ where }),
    ]);
  }

  findAdminEnrollmentsForExport(input: {
    academyProgramId: string;
    status?: AcademyProgramEnrollmentStatus;
    paymentStatus?: PaymentStatus;
    country?: string;
    sortBy?: 'registeredAt' | 'name';
    sortDir?: Prisma.SortOrder;
    q?: string;
    tx?: Prisma.TransactionClient;
  }) {
    return this.getDb(input.tx).academyProgramEnrollment.findMany({
      where: this.buildAdminWhere({
        academyProgramId: input.academyProgramId,
        status: input.status,
        paymentStatus: input.paymentStatus,
        country: input.country,
        q: input.q,
      }),
      include: this.enrollmentInclude(),
      orderBy: this.resolveAdminSortOrder(input.sortBy, input.sortDir),
    });
  }

  findEnrollmentsByIdsForAdmin(input: {
    academyProgramId: string;
    enrollmentIds: string[];
    tx?: Prisma.TransactionClient;
  }) {
    return this.getDb(input.tx).academyProgramEnrollment.findMany({
      where: {
        academyProgramId: input.academyProgramId,
        id: { in: input.enrollmentIds },
      },
      include: this.enrollmentInclude(),
      orderBy: [{ registeredAt: 'desc' }],
    });
  }

  countActiveSeatsByProgramId(
    academyProgramId: string,
    now: Date,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).academyProgramEnrollment.count({
      where: {
        academyProgramId,
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
    });
  }

  countActiveLearnersByProgramId(
    academyProgramId: string,
    now: Date,
    tx?: Prisma.TransactionClient,
  ) {
    return this.countActiveSeatsByProgramId(academyProgramId, now, tx);
  }

  async countActiveLearnersByProgramIds(
    academyProgramIds: string[],
    now: Date,
    tx?: Prisma.TransactionClient,
  ) {
    if (academyProgramIds.length === 0) {
      return new Map<string, number>();
    }

    const rows = await this.getDb(tx).academyProgramEnrollment.groupBy({
      by: ['academyProgramId'],
      where: {
        academyProgramId: { in: academyProgramIds },
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

  findLatestActivePaymentAttemptByEnrollmentId(
    enrollmentId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).academyProgramPaymentAttempt.findFirst({
      where: {
        academyProgramEnrollmentId: enrollmentId,
        status: {
          in: [
            PaymentStatus.CREATED,
            PaymentStatus.PENDING,
            PaymentStatus.REQUIRES_ACTION,
            PaymentStatus.AUTHORIZED,
          ],
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  private enrollmentInclude(): Prisma.AcademyProgramEnrollmentInclude {
    return {
      academyProgram: {
        select: {
          id: true,
          slug: true,
          titleAr: true,
          titleEn: true,
          descriptionAr: true,
          descriptionEn: true,
          coverImageUrl: true,
          priceEgp: true,
          priceUsd: true,
          registrationOpen: true,
          maxSeats: true,
          startAt: true,
          endAt: true,
          status: true,
          publishedAt: true,
          archivedAt: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              sessions: true,
            },
          },
          category: {
            include: {
              translations: {
                orderBy: [{ locale: 'asc' }],
              },
            },
          },
        },
      },
      academyLearner: {
        select: {
          id: true,
          userId: true,
          fullName: true,
          phoneNumber: true,
          whatsappNumber: true,
          email: true,
          countryCode: true,
          countryCodeDeclared: true,
          countryCodeSource: true,
          countryCodeMismatch: true,
          sourceLabel: true,
          city: true,
          jobTitle: true,
          employer: true,
          education: true,
          notes: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      user: {
        select: {
          id: true,
          displayName: true,
          status: true,
          defaultLocale: true,
          timezone: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      payment: {
        select: {
          id: true,
          provider: true,
          status: true,
          amountSubtotal: true,
          amountDiscount: true,
          amountTotal: true,
          amountFromWallet: true,
          amountFromGateway: true,
          currencyCode: true,
          providerPaymentRef: true,
          providerOrderRef: true,
          providerCustomerRef: true,
          metadataJson: true,
          createdAt: true,
          initiatedAt: true,
          authorizedAt: true,
          capturedAt: true,
          failedAt: true,
          expiredAt: true,
        },
      },
      paymentAttempts: {
        orderBy: [{ createdAt: 'desc' }],
        take: 1,
      },
    };
  }

  private resolveAdminSortOrder(
    sortBy?: 'registeredAt' | 'name',
    sortDir: Prisma.SortOrder = 'desc',
  ): Prisma.AcademyProgramEnrollmentOrderByWithRelationInput[] {
    if (sortBy === 'name') {
      return [
        { contactFullName: sortDir },
        { registeredAt: 'desc' },
      ];
    }

    return [
      { registeredAt: sortDir },
      { contactFullName: 'asc' },
    ];
  }

  private buildAdminWhere(input: {
    academyProgramId: string;
    status?: AcademyProgramEnrollmentStatus;
    paymentStatus?: PaymentStatus;
    country?: string;
    q?: string;
  }): Prisma.AcademyProgramEnrollmentWhereInput {
    const conditions: Prisma.AcademyProgramEnrollmentWhereInput[] = [
      { academyProgramId: input.academyProgramId },
    ];

    if (input.status) {
      conditions.push({ status: input.status });
    }

    if (input.paymentStatus) {
      conditions.push({ paymentStatus: input.paymentStatus });
    }

    const trimmedCountry = input.country?.trim().toUpperCase();
    if (trimmedCountry) {
      conditions.push({
        OR: [
          {
            contactCountry: {
              equals: trimmedCountry,
              mode: 'insensitive',
            },
          },
          {
            lockedCountry: {
              equals: trimmedCountry,
              mode: 'insensitive',
            },
          },
          {
            academyLearner: {
              countryCode: {
                equals: trimmedCountry,
                mode: 'insensitive',
              },
            },
          },
          {
            academyLearner: {
              countryCodeDeclared: {
                equals: trimmedCountry,
                mode: 'insensitive',
              },
            },
          },
        ],
      });
    }

    const trimmed = input.q?.trim();
    if (trimmed) {
      conditions.push({
        OR: [
          {
            contactFullName: {
              contains: trimmed,
              mode: 'insensitive',
            },
          },
          {
            contactPhone: {
              contains: trimmed,
              mode: 'insensitive',
            },
          },
          {
            contactEmail: {
              contains: trimmed,
              mode: 'insensitive',
            },
          },
          {
            contactWhatsapp: {
              contains: trimmed,
              mode: 'insensitive',
            },
          },
          {
            academyLearner: {
              fullName: { contains: trimmed, mode: 'insensitive' },
            },
          },
          {
            academyLearner: {
              phoneNumber: { contains: trimmed, mode: 'insensitive' },
            },
          },
          {
            academyLearner: {
              whatsappNumber: { contains: trimmed, mode: 'insensitive' },
            },
          },
          {
            academyLearner: {
              email: { contains: trimmed, mode: 'insensitive' },
            },
          },
          {
            academyProgram: {
              OR: [
                {
                  titleAr: { contains: trimmed, mode: 'insensitive' },
                },
                {
                  titleEn: { contains: trimmed, mode: 'insensitive' },
                },
                {
                  slug: { contains: trimmed, mode: 'insensitive' },
                },
              ],
            },
          },
        ],
      });
    }

    return { AND: conditions };
  }
}
