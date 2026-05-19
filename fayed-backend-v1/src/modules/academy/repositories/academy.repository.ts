import { Injectable } from '@nestjs/common';
import {
  AcademyEnrollmentStatus,
  CourseStatus,
  CourseVisibility,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import {
  ACADEMY_PUBLIC_DETAIL_VISIBILITIES,
  ACADEMY_PUBLIC_LIST_VISIBILITIES,
} from '../types/academy.types';

@Injectable()
export class AcademyRepository {
  constructor(private readonly prisma: PrismaService) {}

  createCourse(data: Prisma.AcademyCourseUncheckedCreateInput) {
    return this.prisma.academyCourse.create({ data });
  }

  createLecture(data: Prisma.AcademyCourseLectureUncheckedCreateInput) {
    return this.prisma.academyCourseLecture.create({
      data,
      include: {
        createdByUser: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    });
  }

  updateCourse(
    courseId: string,
    data: Prisma.AcademyCourseUncheckedUpdateInput,
  ) {
    return this.prisma.academyCourse.update({
      where: { id: courseId },
      data,
    });
  }

  findCourseById(courseId: string) {
    return this.prisma.academyCourse.findUnique({
      where: { id: courseId },
      include: this.courseInclude(true),
    });
  }

  findCourseBySlug(slug: string) {
    return this.prisma.academyCourse.findUnique({
      where: { slug },
      include: this.courseInclude(true),
    });
  }

  findPublicCourseBySlug(slug: string) {
    const now = new Date();

    return this.prisma.academyCourse.findFirst({
      where: {
        status: CourseStatus.PUBLISHED,
        visibility: { in: ACADEMY_PUBLIC_DETAIL_VISIBILITIES },
        publishedAt: { lte: now },
        slug: slug.trim().toLowerCase(),
      },
      include: this.courseInclude(true),
    });
  }

  listPublicCourses(input: { page: number; limit: number; q?: string }) {
    const skip = (input.page - 1) * input.limit;
    const now = new Date();
    const where: Prisma.AcademyCourseWhereInput = {
      status: CourseStatus.PUBLISHED,
      visibility: { in: ACADEMY_PUBLIC_LIST_VISIBILITIES },
      publishedAt: { lte: now },
      ...(input.q
        ? {
            OR: [
              { title: { contains: input.q, mode: 'insensitive' } },
              { shortDescription: { contains: input.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    return Promise.all([
      this.prisma.academyCourse.findMany({
        where,
        skip,
        take: input.limit,
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.academyCourse.count({ where }),
    ]);
  }

  listAdminCourses(input: {
    page: number;
    limit: number;
    status?: CourseStatus;
    q?: string;
  }) {
    const skip = (input.page - 1) * input.limit;
    const where: Prisma.AcademyCourseWhereInput = {
      ...(input.status ? { status: input.status } : {}),
      ...(input.q
        ? {
            OR: [
              { title: { contains: input.q, mode: 'insensitive' } },
              { shortDescription: { contains: input.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    return Promise.all([
      this.prisma.academyCourse.findMany({
        where,
        skip,
        take: input.limit,
        orderBy: [{ updatedAt: 'desc' }],
      }),
      this.prisma.academyCourse.count({ where }),
    ]);
  }

  findLearnerByPhoneNumber(phoneNumber: string) {
    return this.prisma.academyLearner.findUnique({
      where: { phoneNumber },
    });
  }

  async upsertLearner(input: {
    fullName: string;
    phoneNumber: string;
    whatsappNumber?: string | null;
    email?: string | null;
    countryCode?: string | null;
    countryCodeDeclared?: string | null;
    countryCodeSource?: string | null;
    countryCodeMismatch?: boolean;
    sourceLabel?: string | null;
  }) {
    return this.prisma.academyLearner.upsert({
      where: { phoneNumber: input.phoneNumber },
      update: {
        fullName: input.fullName,
        whatsappNumber: input.whatsappNumber ?? null,
        email: input.email ?? null,
        countryCode: input.countryCode ?? null,
        countryCodeDeclared: input.countryCodeDeclared ?? null,
        countryCodeSource: input.countryCodeSource ?? null,
        countryCodeMismatch: input.countryCodeMismatch ?? false,
        sourceLabel: input.sourceLabel ?? null,
      },
      create: {
        fullName: input.fullName,
        phoneNumber: input.phoneNumber,
        whatsappNumber: input.whatsappNumber ?? null,
        email: input.email ?? null,
        countryCode: input.countryCode ?? null,
        countryCodeDeclared: input.countryCodeDeclared ?? null,
        countryCodeSource: input.countryCodeSource ?? null,
        countryCodeMismatch: input.countryCodeMismatch ?? false,
        sourceLabel: input.sourceLabel ?? null,
      },
    });
  }

  findEnrollmentByCourseAndLearner(courseId: string, learnerId: string) {
    return this.prisma.academyEnrollment.findUnique({
      where: {
        academyCourseId_academyLearnerId: {
          academyCourseId: courseId,
          academyLearnerId: learnerId,
        },
      },
      include: this.enrollmentInclude(),
    });
  }

  findEnrollmentByIdForPublic(enrollmentId: string, token: string) {
    return this.prisma.academyEnrollment.findFirst({
      where: {
        id: enrollmentId,
        publicAccessToken: token,
      },
      include: this.enrollmentInclude(),
    });
  }

  findEnrollmentByIdForAdmin(enrollmentId: string) {
    return this.prisma.academyEnrollment.findUnique({
      where: { id: enrollmentId },
      include: this.enrollmentInclude(),
    });
  }

  listEnrollmentsByCourseId(courseId: string) {
    return this.prisma.academyEnrollment.findMany({
      where: { academyCourseId: courseId },
      include: this.enrollmentInclude(),
      orderBy: [{ registeredAt: 'desc' }],
    });
  }

  listAdminEnrollments(input: {
    skip: number;
    take: number;
    status?: AcademyEnrollmentStatus;
    courseId?: string;
    q?: string;
  }) {
    const where: Prisma.AcademyEnrollmentWhereInput = {
      ...(input.status ? { enrollmentStatus: input.status } : {}),
      ...(input.courseId ? { academyCourseId: input.courseId } : {}),
      ...(input.q
        ? {
            OR: [
              {
                academyLearner: {
                  fullName: { contains: input.q, mode: 'insensitive' },
                },
              },
              {
                academyLearner: {
                  phoneNumber: { contains: input.q, mode: 'insensitive' },
                },
              },
              {
                academyLearner: {
                  email: { contains: input.q, mode: 'insensitive' },
                },
              },
              {
                academyCourse: {
                  title: { contains: input.q, mode: 'insensitive' },
                },
              },
            ],
          }
        : {}),
    };

    return Promise.all([
      this.prisma.academyEnrollment.findMany({
        where,
        skip: input.skip,
        take: input.take,
        include: this.enrollmentInclude(),
        orderBy: [{ registeredAt: 'desc' }],
      }),
      this.prisma.academyEnrollment.count({ where }),
    ]);
  }

  countEnrollmentsByCourseIds(courseIds: string[]) {
    if (courseIds.length === 0) {
      return Promise.resolve<
        Record<
          string,
          {
            totalEnrollments: number;
            pendingPayments: number;
            paidEnrollments: number;
            failedPayments: number;
            confirmedEnrollments: number;
          }
        >
      >({});
    }

    return this.prisma.academyEnrollment
      .groupBy({
        by: ['academyCourseId', 'enrollmentStatus'],
        where: {
          academyCourseId: { in: courseIds },
        },
        _count: {
          _all: true,
        },
      })
      .then((rows) =>
        rows.reduce<
          Record<
            string,
            {
              totalEnrollments: number;
              pendingPayments: number;
              paidEnrollments: number;
              failedPayments: number;
              confirmedEnrollments: number;
            }
          >
        >((acc, row) => {
          const current = acc[row.academyCourseId] ?? {
            totalEnrollments: 0,
            pendingPayments: 0,
            paidEnrollments: 0,
            failedPayments: 0,
            confirmedEnrollments: 0,
          };

          current.totalEnrollments += row._count._all;
          if (
            row.enrollmentStatus === AcademyEnrollmentStatus.PENDING_PAYMENT
          ) {
            current.pendingPayments += row._count._all;
          } else if (row.enrollmentStatus === AcademyEnrollmentStatus.PAID) {
            current.paidEnrollments += row._count._all;
          } else if (
            row.enrollmentStatus === AcademyEnrollmentStatus.PAYMENT_FAILED
          ) {
            current.failedPayments += row._count._all;
          } else if (
            row.enrollmentStatus === AcademyEnrollmentStatus.CONFIRMED
          ) {
            current.confirmedEnrollments += row._count._all;
          }

          acc[row.academyCourseId] = current;
          return acc;
        }, {}),
      );
  }

  createEnrollment(data: Prisma.AcademyEnrollmentUncheckedCreateInput) {
    return this.prisma.academyEnrollment.create({
      data,
      include: this.enrollmentInclude(),
    });
  }

  updateEnrollment(
    enrollmentId: string,
    data: Prisma.AcademyEnrollmentUncheckedUpdateInput,
  ) {
    return this.prisma.academyEnrollment.update({
      where: { id: enrollmentId },
      data,
      include: this.enrollmentInclude(),
    });
  }

  createPaymentAttempt(data: Prisma.AcademyPaymentAttemptUncheckedCreateInput) {
    return this.prisma.academyPaymentAttempt.create({ data });
  }

  updatePaymentAttempt(
    paymentAttemptId: string,
    data: Prisma.AcademyPaymentAttemptUncheckedUpdateInput,
  ) {
    return this.prisma.academyPaymentAttempt.update({
      where: { id: paymentAttemptId },
      data,
    });
  }

  createActivityLog(
    data: Prisma.AcademyEnrollmentActivityLogUncheckedCreateInput,
  ) {
    return this.prisma.academyEnrollmentActivityLog.create({ data });
  }

  listLecturesByCourseId(courseId: string) {
    return this.prisma.academyCourseLecture.findMany({
      where: { academyCourseId: courseId },
      orderBy: [
        { lectureOrder: 'asc' },
        { startsAt: 'asc' },
        { createdAt: 'asc' },
      ],
      include: {
        createdByUser: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    });
  }

  countLecturesByCourseId(courseId: string) {
    return this.prisma.academyCourseLecture.count({
      where: { academyCourseId: courseId },
    });
  }

  private courseInclude(includeLectures = false): Prisma.AcademyCourseInclude {
    return {
      ...(includeLectures
        ? {
            lectures: {
              orderBy: [
                { lectureOrder: 'asc' },
                { startsAt: 'asc' },
                { createdAt: 'asc' },
              ],
              include: {
                createdByUser: {
                  select: {
                    id: true,
                    displayName: true,
                  },
                },
              },
            },
          }
        : {}),
    };
  }

  private enrollmentInclude(): Prisma.AcademyEnrollmentInclude {
    return {
      academyCourse: true,
      academyLearner: true,
      payment: {
        select: {
          id: true,
          provider: true,
          status: true,
          amountTotal: true,
          currencyCode: true,
          metadataJson: true,
        },
      },
      paymentAttempts: {
        orderBy: [{ createdAt: 'desc' }],
        take: 1,
      },
    };
  }
}
