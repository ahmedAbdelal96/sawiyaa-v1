import { Injectable } from '@nestjs/common';
import {
  ContentLocale,
  CourseScheduleStatus,
  CourseStatus,
  CourseVisibility,
  EnrollmentStatus,
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

  findPublicCourseBySlug(input: { slug: string; locale: ContentLocale }) {
    const now = new Date();
    return this.prisma.course.findFirst({
      where: {
        status: CourseStatus.PUBLISHED,
        visibility: {
          in: TRAINING_PUBLIC_DETAIL_VISIBILITIES,
        },
        publishedAt: {
          lte: now,
        },
        translations: {
          some: {
            locale: input.locale,
            slug: input.slug.trim().toLowerCase(),
          },
        },
      },
      include: this.courseInclude(true, input.locale),
    });
  }

  listPublicCourses(input: {
    page: number;
    limit: number;
    locale: ContentLocale;
    q?: string;
  }) {
    const skip = (input.page - 1) * input.limit;
    const now = new Date();
    const where: Prisma.CourseWhereInput = {
      status: CourseStatus.PUBLISHED,
      visibility: {
        in: TRAINING_PUBLIC_LIST_VISIBILITIES,
      },
      publishedAt: {
        lte: now,
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
    };

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

    return Promise.all([
      this.prisma.course.findMany({
        where,
        skip,
        take: input.limit,
        orderBy: [{ updatedAt: 'desc' }],
        include: this.courseInclude(true, input.locale),
      }),
      this.prisma.course.count({ where }),
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
        ...(input.metaTitle !== undefined ? { metaTitle: input.metaTitle } : {}),
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
