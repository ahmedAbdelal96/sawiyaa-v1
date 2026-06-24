import { Injectable } from '@nestjs/common';
import {
  ContentLocale,
  CourseScheduleStatus,
  CourseStatus,
  CourseVisibility,
  EnrollmentStatus,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import {
  TRAINING_ENROLLMENT_OCCUPYING_STATUSES,
  TRAINING_PUBLIC_DETAIL_VISIBILITIES,
  TRAINING_PUBLIC_LIST_VISIBILITIES,
  TRAINING_PUBLIC_SCHEDULE_VISIBLE_STATUSES,
} from '../types/training.types';

@Injectable()
export class TrainingRepository {
  constructor(private readonly prisma: PrismaService) {}

  findPatientProfileByUserId(userId: string) {
    return this.prisma.patientProfile.findUnique({
      where: { userId },
      include: {
        country: {
          select: {
            isoCode: true,
          },
        },
        user: {
          select: {
            emails: {
              where: {
                isPrimary: true,
              },
              select: {
                email: true,
              },
              take: 1,
            },
          },
        },
      },
    });
  }

  createCourse(data: Prisma.CourseUncheckedCreateInput) {
    return this.prisma.course.create({
      data,
      include: this.courseInclude(),
    });
  }

  updateCourse(courseId: string, data: Prisma.CourseUncheckedUpdateInput) {
    return this.prisma.course.update({
      where: { id: courseId },
      data,
      include: this.courseInclude(true),
    });
  }

  findCourseById(courseId: string) {
    return this.prisma.course.findUnique({
      where: { id: courseId },
      include: this.courseInclude(true),
    });
  }

  findCourseBySlugRoot(slugRoot: string) {
    return this.prisma.course.findUnique({
      where: { slugRoot },
      select: { id: true },
    });
  }

  findPublicCourseBySlug(input: { slug: string; locale: ContentLocale }) {
    const now = new Date();
    const normalizedSlug = input.slug.trim().toLowerCase();
    return this.prisma.course.findFirst({
      where: {
        status: CourseStatus.PUBLISHED,
        visibility: {
          in: TRAINING_PUBLIC_DETAIL_VISIBILITIES,
        },
        publishedAt: {
          lte: now,
        },
        OR: [
          {
            translations: {
              some: {
                locale: input.locale,
                slug: normalizedSlug,
              },
            },
          },
          {
            slugRoot: normalizedSlug,
          },
        ],
      },
      include: this.courseInclude(true, input.locale),
    });
  }

  listPublicCourses(input: {
    page: number;
    limit: number;
    locale: ContentLocale;
    q?: string;
    category?: string;
  }) {
    const skip = (input.page - 1) * input.limit;
    const now = new Date();
    const where = this.buildPublicCatalogWhere({
      now,
      locale: input.locale,
      q: input.q,
      category: input.category,
    });

    return Promise.all([
      this.prisma.course.findMany({
        where,
        skip,
        take: input.limit,
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
        include: this.courseInclude(false, input.locale),
      }),
      this.prisma.course.count({ where }),
    ]);
  }

  listPublicCategories(input: { locale: ContentLocale }) {
    const now = new Date();
    const where = this.buildPublicCatalogWhere({
      now,
      locale: input.locale,
    });

    return Promise.all([
      this.prisma.courseCategory.findMany({
        where: {
          isActive: true,
          courses: {
            some: where,
          },
        },
        orderBy: [{ sortOrder: 'asc' }, { slugRoot: 'asc' }],
        include: {
          translations: {
            where: {
              locale: {
                in: [input.locale, ContentLocale.en],
              },
            },
          },
        },
      }),
      this.prisma.course.findMany({
        where,
        select: {
          primaryCategoryId: true,
        },
      }),
    ]).then(([categories, courses]) => {
      const countByCategoryId = courses.reduce<Record<string, number>>(
        (acc, current) => {
          if (current.primaryCategoryId) {
            acc[current.primaryCategoryId] =
              (acc[current.primaryCategoryId] ?? 0) + 1;
          }
          return acc;
        },
        {},
      );

      return categories.map((category) => ({
        ...category,
        courseCount: countByCategoryId[category.id] ?? 0,
      }));
    });
  }

  listAdminCourses(input: {
    page: number;
    limit: number;
    locale: ContentLocale;
    status?: CourseStatus;
    q?: string;
  }) {
    const skip = (input.page - 1) * input.limit;
    const where: Prisma.CourseWhereInput = {
      ...(input.status ? { status: input.status } : {}),
      ...(input.q
        ? {
            translations: {
              some: {
                OR: [
                  { title: { contains: input.q, mode: 'insensitive' } },
                  {
                    shortDescription: {
                      contains: input.q,
                      mode: 'insensitive',
                    },
                  },
                ],
              },
            },
          }
        : {}),
    };
    const now = new Date();
    const openEnrollmentWhere: Prisma.CourseWhereInput = {
      ...where,
      status: CourseStatus.PUBLISHED,
      schedules: {
        some: {
          status: CourseScheduleStatus.OPEN_FOR_ENROLLMENT,
          enrollmentOpenAt: { lte: now },
          enrollmentCloseAt: { gte: now },
          startsAt: { gt: now },
        },
      },
    };
    const closedEnrollmentWhere: Prisma.CourseWhereInput = {
      ...where,
      status: CourseStatus.PUBLISHED,
      NOT: {
        schedules: {
          some: {
            status: CourseScheduleStatus.OPEN_FOR_ENROLLMENT,
            enrollmentOpenAt: { lte: now },
            enrollmentCloseAt: { gte: now },
            startsAt: { gt: now },
          },
        },
      },
    };

    return Promise.all([
      this.prisma.course.findMany({
        where,
        skip,
        take: input.limit,
        orderBy: [{ updatedAt: 'desc' }],
        include: this.courseInclude(true, input.locale),
      }),
      this.prisma.course.count({ where }),
      this.prisma.course.count({
        where: {
          ...where,
          status: CourseStatus.DRAFT,
        },
      }),
      this.prisma.course.count({
        where: {
          ...where,
          status: CourseStatus.PUBLISHED,
        },
      }),
      this.prisma.course.count({
        where: {
          ...where,
          status: CourseStatus.ARCHIVED,
        },
      }),
      this.prisma.course.count({
        where: openEnrollmentWhere,
      }),
      this.prisma.course.count({
        where: closedEnrollmentWhere,
      }),
    ]);
  }

  findScheduleById(scheduleId: string) {
    return this.prisma.courseSchedule.findUnique({
      where: { id: scheduleId },
      include: {
        course: {
          include: this.courseInclude(false, ContentLocale.ar),
        },
      },
    });
  }

  createSchedule(
    courseId: string,
    data: Omit<Prisma.CourseScheduleUncheckedCreateInput, 'courseId'>,
  ) {
    return this.prisma.courseSchedule.create({
      data: {
        ...data,
        courseId,
      },
    });
  }

  createSessionForSchedule(
    scheduleId: string,
    data: Omit<Prisma.CourseSessionUncheckedCreateInput, 'courseScheduleId'>,
  ) {
    return this.prisma.courseSession.create({
      data: {
        ...data,
        courseScheduleId: scheduleId,
      },
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

  updateSchedule(
    scheduleId: string,
    data: Prisma.CourseScheduleUncheckedUpdateInput,
  ) {
    return this.prisma.courseSchedule.update({
      where: { id: scheduleId },
      data,
    });
  }

  listCourseSchedulesForAdmin(courseId: string) {
    return this.prisma.courseSchedule.findMany({
      where: { courseId },
      orderBy: [{ startsAt: 'asc' }, { createdAt: 'asc' }],
    });
  }

  listSessionsByScheduleForAdmin(scheduleId: string) {
    return this.prisma.courseSession.findMany({
      where: { courseScheduleId: scheduleId },
      orderBy: [{ sessionOrder: 'asc' }, { createdAt: 'asc' }],
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

  countSchedulesByCourseId(courseId: string) {
    return this.prisma.courseSchedule.count({
      where: { courseId },
    });
  }

  countSessionsByScheduleIds(scheduleIds: string[]) {
    if (scheduleIds.length === 0) {
      return Promise.resolve<Record<string, number>>({});
    }

    return this.prisma.courseSession
      .groupBy({
        by: ['courseScheduleId'],
        where: {
          courseScheduleId: {
            in: scheduleIds,
          },
        },
        _count: {
          _all: true,
        },
      })
      .then((items) =>
        items.reduce<Record<string, number>>((acc, current) => {
          acc[current.courseScheduleId] = current._count._all;
          return acc;
        }, {}),
      );
  }

  countAllEnrollmentsByScheduleIds(scheduleIds: string[]) {
    if (scheduleIds.length === 0) {
      return Promise.resolve<Record<string, number>>({});
    }

    return this.prisma.enrollment
      .groupBy({
        by: ['courseScheduleId'],
        where: {
          courseScheduleId: {
            in: scheduleIds,
          },
        },
        _count: {
          _all: true,
        },
      })
      .then((items) =>
        items.reduce<Record<string, number>>((acc, current) => {
          acc[current.courseScheduleId] = current._count._all;
          return acc;
        }, {}),
      );
  }

  countAttendanceByScheduleIds(scheduleIds: string[]) {
    if (scheduleIds.length === 0) {
      return Promise.resolve<Record<string, Record<string, number>>>({});
    }

    return this.prisma.enrollment
      .groupBy({
        by: ['courseScheduleId', 'attendanceStatus'],
        where: {
          courseScheduleId: {
            in: scheduleIds,
          },
        },
        _count: {
          _all: true,
        },
      })
      .then((items) =>
        items.reduce<Record<string, Record<string, number>>>((acc, current) => {
          if (!acc[current.courseScheduleId]) {
            acc[current.courseScheduleId] = {};
          }
          acc[current.courseScheduleId][current.attendanceStatus] =
            current._count._all;
          return acc;
        }, {}),
      );
  }

  listPaymentAttemptsByCourseIdForAnalytics(courseId: string) {
    return this.prisma.trainingEnrollmentPaymentAttempt.findMany({
      where: {
        enrollment: {
          courseId,
        },
      },
      select: {
        status: true,
        enrollment: {
          select: {
            courseScheduleId: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  listPublicCourseSchedules(courseId: string) {
    const now = new Date();
    return this.prisma.courseSchedule.findMany({
      where: {
        courseId,
        status: {
          in: TRAINING_PUBLIC_SCHEDULE_VISIBLE_STATUSES,
        },
        startsAt: {
          gte: now,
        },
      },
      orderBy: [{ startsAt: 'asc' }, { createdAt: 'asc' }],
    });
  }

  findEnrollmentByScheduleAndUser(scheduleId: string, userId: string) {
    return this.prisma.enrollment.findUnique({
      where: {
        courseScheduleId_userId: {
          courseScheduleId: scheduleId,
          userId,
        },
      },
      include: this.enrollmentInclude(),
    });
  }

  findEnrollmentByIdForUser(enrollmentId: string, userId: string) {
    return this.prisma.enrollment.findFirst({
      where: {
        id: enrollmentId,
        userId,
      },
      include: this.enrollmentInclude(),
    });
  }

  findEnrollmentByIdForAdmin(enrollmentId: string) {
    return this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: this.adminEnrollmentInclude(),
    });
  }

  listEnrollmentsByUser(input: {
    userId: string;
    status?: EnrollmentStatus;
    skip: number;
    take: number;
  }) {
    const where: Prisma.EnrollmentWhereInput = {
      userId: input.userId,
      ...(input.status ? { enrollmentStatus: input.status } : {}),
    };

    return Promise.all([
      this.prisma.enrollment.findMany({
        where,
        skip: input.skip,
        take: input.take,
        include: this.enrollmentInclude(),
        orderBy: [{ enrolledAt: 'desc' }],
      }),
      this.prisma.enrollment.count({ where }),
    ]);
  }

  listEnrollmentsByScheduleForAdmin(input: {
    courseId: string;
    scheduleId: string;
    status?: EnrollmentStatus;
    skip: number;
    take: number;
  }) {
    const where: Prisma.EnrollmentWhereInput = {
      courseId: input.courseId,
      courseScheduleId: input.scheduleId,
      ...(input.status ? { enrollmentStatus: input.status } : {}),
    };

    return Promise.all([
      this.prisma.enrollment.findMany({
        where,
        skip: input.skip,
        take: input.take,
        include: this.adminEnrollmentInclude(),
        orderBy: [{ enrolledAt: 'desc' }],
      }),
      this.prisma.enrollment.count({ where }),
    ]);
  }

  listPaymentAttemptsByCourseForAdmin(input: {
    courseId: string;
    status?: PaymentStatus;
    skip: number;
    take: number;
  }) {
    const where: Prisma.TrainingEnrollmentPaymentAttemptWhereInput = {
      enrollment: {
        courseId: input.courseId,
      },
      ...(input.status ? { status: input.status } : {}),
    };

    return Promise.all([
      this.prisma.trainingEnrollmentPaymentAttempt.findMany({
        where,
        skip: input.skip,
        take: input.take,
        include: {
          enrollment: {
            select: {
              id: true,
              userId: true,
              courseScheduleId: true,
              user: {
                select: {
                  displayName: true,
                },
              },
              courseSchedule: {
                select: {
                  id: true,
                  scheduleCode: true,
                },
              },
            },
          },
        },
        orderBy: [{ createdAt: 'desc' }],
      }),
      this.prisma.trainingEnrollmentPaymentAttempt.count({ where }),
    ]);
  }

  createEnrollment(data: Prisma.EnrollmentUncheckedCreateInput) {
    return this.prisma.enrollment.create({
      data,
      include: this.enrollmentInclude(),
    });
  }

  updateEnrollment(
    enrollmentId: string,
    data: Prisma.EnrollmentUncheckedUpdateInput,
  ) {
    return this.prisma.enrollment.update({
      where: { id: enrollmentId },
      data,
      include: this.enrollmentInclude(),
    });
  }

  countEnrollmentsByScheduleIds(
    scheduleIds: string[],
    statuses: EnrollmentStatus[] = TRAINING_ENROLLMENT_OCCUPYING_STATUSES,
  ) {
    if (scheduleIds.length === 0) {
      return Promise.resolve<Record<string, number>>({});
    }

    return this.prisma.enrollment
      .groupBy({
        by: ['courseScheduleId'],
        where: {
          courseScheduleId: {
            in: scheduleIds,
          },
          enrollmentStatus: {
            in: statuses,
          },
        },
        _count: {
          _all: true,
        },
      })
      .then((items) =>
        items.reduce<Record<string, number>>((acc, current) => {
          acc[current.courseScheduleId] = current._count._all;
          return acc;
        }, {}),
      );
  }

  upsertCourseTranslation(input: {
    courseId: string;
    locale: ContentLocale;
    title?: string;
    slug?: string;
    shortDescription?: string | null;
    fullDescription?: string | null;
    metaTitle?: string | null;
    metaDescription?: string | null;
  }) {
    return this.prisma.courseTranslation.upsert({
      where: {
        courseId_locale: {
          courseId: input.courseId,
          locale: input.locale,
        },
      },
      update: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.slug !== undefined ? { slug: input.slug } : {}),
        ...(input.shortDescription !== undefined
          ? { shortDescription: input.shortDescription }
          : {}),
        ...(input.fullDescription !== undefined
          ? { fullDescription: input.fullDescription }
          : {}),
        ...(input.metaTitle !== undefined
          ? { metaTitle: input.metaTitle }
          : {}),
        ...(input.metaDescription !== undefined
          ? { metaDescription: input.metaDescription }
          : {}),
      },
      create: {
        courseId: input.courseId,
        locale: input.locale,
        title: input.title ?? 'Untitled Training',
        slug: input.slug ?? `training-${Date.now()}`,
        shortDescription: input.shortDescription ?? null,
        fullDescription: input.fullDescription ?? null,
        metaTitle: input.metaTitle ?? null,
        metaDescription: input.metaDescription ?? null,
      },
    });
  }

  private courseInclude(
    includeSchedules = false,
    locale?: ContentLocale,
  ): Prisma.CourseInclude {
    const locales = locale ? [locale, ContentLocale.en] : undefined;

    return {
      primaryCategory: {
        include: {
          translations: locales
            ? {
                where: {
                  locale: {
                    in: locales,
                  },
                },
              }
            : true,
        },
      },
      translations: locales
        ? {
            where: {
              locale: {
                in: locales,
              },
            },
          }
        : true,
      ...(includeSchedules
        ? {
            schedules: {
              orderBy: [{ startsAt: 'asc' }, { createdAt: 'asc' }],
            },
          }
        : {}),
    };
  }

  private enrollmentInclude(): Prisma.EnrollmentInclude {
    return {
      course: {
        include: this.courseInclude(false, ContentLocale.ar),
      },
      courseSchedule: true,
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
    };
  }

  private buildPublicCatalogWhere(input: {
    now: Date;
    locale: ContentLocale;
    q?: string;
    category?: string;
  }): Prisma.CourseWhereInput {
    return {
      status: CourseStatus.PUBLISHED,
      visibility: {
        in: TRAINING_PUBLIC_LIST_VISIBILITIES,
      },
      publishedAt: {
        lte: input.now,
      },
      schedules: {
        some: {
          status: CourseScheduleStatus.OPEN_FOR_ENROLLMENT,
          enrollmentOpenAt: {
            lte: input.now,
          },
          enrollmentCloseAt: {
            gte: input.now,
          },
          startsAt: {
            gt: input.now,
          },
        },
      },
      ...(input.q
        ? {
            translations: {
              some: {
                locale: input.locale,
                OR: [
                  { title: { contains: input.q, mode: 'insensitive' } },
                  {
                    shortDescription: {
                      contains: input.q,
                      mode: 'insensitive',
                    },
                  },
                ],
              },
            },
          }
        : {}),
      ...(input.category
        ? {
            primaryCategory: {
              is: {
                slugRoot: input.category.trim().toLowerCase(),
              },
            },
          }
        : {}),
    };
  }

  private adminEnrollmentInclude(): Prisma.EnrollmentInclude {
    return {
      courseSchedule: true,
      user: {
        select: {
          id: true,
          displayName: true,
        },
      },
    };
  }
}
