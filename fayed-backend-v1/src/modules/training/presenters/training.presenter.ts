import { Injectable } from '@nestjs/common';
import {
  EnrollmentAttendanceStatus,
  ContentLocale,
  CourseScheduleStatus,
  CourseStatus,
  CourseType,
  CourseVisibility,
  EnrollmentStatus,
  PaymentProvider,
  PaymentStatus,
} from '@prisma/client';
import {
  TrainingEnrollmentAvailabilityReason,
  TrainingJoinBlockedReason,
} from '../types/training.types';

@Injectable()
export class TrainingPresenter {
  presentPagination(input: { page: number; limit: number; totalItems: number }) {
    return {
      page: input.page,
      limit: input.limit,
      totalItems: input.totalItems,
      totalPages: Math.max(1, Math.ceil(input.totalItems / input.limit)),
    };
  }

  presentScheduleItem(input: {
    schedule: {
      id: string;
      scheduleCode: string;
      status: CourseScheduleStatus;
      enrollmentOpenAt: Date | null;
      enrollmentCloseAt: Date | null;
      startsAt: Date | null;
      endsAt: Date | null;
      timezone: string | null;
      maxEnrollmentsOverride: number | null;
    };
    defaultCapacity: number | null;
    enrolledSeats: number;
    availability: {
      isEnrollmentOpen: boolean;
      reason: TrainingEnrollmentAvailabilityReason;
    };
  }) {
    const maxEnrollments =
      input.schedule.maxEnrollmentsOverride ?? input.defaultCapacity ?? null;

    const availableSeats =
      maxEnrollments === null
        ? null
        : Math.max(0, maxEnrollments - input.enrolledSeats);

    return {
      id: input.schedule.id,
      scheduleCode: input.schedule.scheduleCode,
      status: input.schedule.status,
      enrollmentOpenAt: input.schedule.enrollmentOpenAt?.toISOString() ?? null,
      enrollmentCloseAt: input.schedule.enrollmentCloseAt?.toISOString() ?? null,
      startsAt: input.schedule.startsAt?.toISOString() ?? null,
      endsAt: input.schedule.endsAt?.toISOString() ?? null,
      timezone: input.schedule.timezone ?? null,
      maxEnrollments,
      availableSeats,
      isEnrollmentOpen: input.availability.isEnrollmentOpen,
      enrollmentAvailabilityReason: input.availability.reason,
    };
  }

  presentPublicTrainingItem(
    course: {
      id: string;
      courseType: CourseType;
      publishedAt: Date | null;
      coverImageUrl: string | null;
      thumbnailUrl: string | null;
      translations: Array<{
        locale: string;
        title: string;
        slug: string;
        shortDescription: string | null;
      }>;
    },
    locale: ContentLocale,
  ) {
    const translation = this.pickTranslation(course.translations, locale);
    if (!translation) {
      return null;
    }

    return {
      id: course.id,
      title: translation.title,
      slug: translation.slug,
      shortDescription: translation.shortDescription ?? null,
      coverImageUrl: course.coverImageUrl ?? null,
      thumbnailUrl: course.thumbnailUrl ?? null,
      publishedAt: course.publishedAt?.toISOString() ?? null,
      courseType: course.courseType,
    };
  }

  presentPublicTrainingDetails(
    course: {
      id: string;
      courseType: CourseType;
      publishedAt: Date | null;
      coverImageUrl: string | null;
      thumbnailUrl: string | null;
      translations: Array<{
        locale: string;
        title: string;
        slug: string;
        shortDescription: string | null;
        fullDescription: string | null;
        metaTitle: string | null;
        metaDescription: string | null;
      }>;
      schedules?: Array<{
        id: string;
        scheduleCode: string;
        status: CourseScheduleStatus;
        enrollmentOpenAt: Date | null;
        enrollmentCloseAt: Date | null;
        startsAt: Date | null;
        endsAt: Date | null;
        timezone: string | null;
        maxEnrollmentsOverride: number | null;
      }>;
      maxEnrollments: number | null;
    },
    locale: ContentLocale,
    scheduleItems: Array<{
      id: string;
      scheduleCode: string;
      status: CourseScheduleStatus;
      enrollmentOpenAt: string | null;
      enrollmentCloseAt: string | null;
      startsAt: string | null;
      endsAt: string | null;
      timezone: string | null;
      maxEnrollments: number | null;
      availableSeats: number | null;
      isEnrollmentOpen: boolean;
      enrollmentAvailabilityReason: TrainingEnrollmentAvailabilityReason;
    }> = [],
  ) {
    const translation = this.pickTranslation(course.translations, locale);
    if (!translation) {
      return null;
    }

    return {
      id: course.id,
      title: translation.title,
      slug: translation.slug,
      shortDescription: translation.shortDescription ?? null,
      fullDescription: translation.fullDescription ?? null,
      coverImageUrl: course.coverImageUrl ?? null,
      thumbnailUrl: course.thumbnailUrl ?? null,
      publishedAt: course.publishedAt?.toISOString() ?? null,
      courseType: course.courseType,
      seo: {
        metaTitle: translation.metaTitle ?? null,
        metaDescription: translation.metaDescription ?? null,
      },
      locale,
      schedules: scheduleItems,
    };
  }

  presentAdminTrainingItem(
    course: {
      id: string;
      courseType: CourseType;
      status: CourseStatus;
      visibility: CourseVisibility;
      archivedAt: Date | null;
      publishedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
      coverImageUrl: string | null;
      thumbnailUrl: string | null;
      translations: Array<{
        locale: string;
        title: string;
        slug: string;
        shortDescription: string | null;
        fullDescription: string | null;
        metaTitle: string | null;
        metaDescription: string | null;
      }>;
      schedules?: Array<{
        id: string;
        scheduleCode: string;
        status: CourseScheduleStatus;
        enrollmentOpenAt: Date | null;
        enrollmentCloseAt: Date | null;
        startsAt: Date | null;
        endsAt: Date | null;
        timezone: string | null;
        maxEnrollmentsOverride: number | null;
      }>;
      maxEnrollments: number | null;
    },
    locale: ContentLocale,
    scheduleItems: Array<{
      id: string;
      scheduleCode: string;
      status: CourseScheduleStatus;
      enrollmentOpenAt: string | null;
      enrollmentCloseAt: string | null;
      startsAt: string | null;
      endsAt: string | null;
      timezone: string | null;
      maxEnrollments: number | null;
      availableSeats: number | null;
      isEnrollmentOpen: boolean;
      enrollmentAvailabilityReason: TrainingEnrollmentAvailabilityReason;
    }> = [],
  ) {
    const publicDetails = this.presentPublicTrainingDetails(
      course,
      locale,
      scheduleItems,
    );
    if (!publicDetails) {
      return null;
    }

    return {
      ...publicDetails,
      status: course.status,
      visibility: course.visibility,
      archivedAt: course.archivedAt?.toISOString() ?? null,
      createdAt: course.createdAt.toISOString(),
      updatedAt: course.updatedAt.toISOString(),
    };
  }

  private pickTranslation<
    T extends {
      locale: string;
    },
  >(translations: T[], locale: ContentLocale): T | null {
    return (
      translations.find((item) => item.locale === locale) ??
      translations.find((item) => item.locale === ContentLocale.en) ??
      translations[0] ??
      null
    );
  }

  presentEnrollmentItem(
    enrollment: {
      id: string;
      courseId: string;
      courseScheduleId: string;
      enrollmentStatus: EnrollmentStatus;
      paymentStatus: string | null;
      enrolledAt: Date;
      cancelledAt: Date | null;
      refundedAt: Date | null;
      completedAt: Date | null;
      attendanceStatus: EnrollmentAttendanceStatus;
      course: {
        id: string;
        translations?: Array<{
          locale: string;
          title: string;
        }>;
      };
      courseSchedule: {
        scheduleCode: string;
        startsAt: Date | null;
        endsAt: Date | null;
      };
      payment: {
        id: string;
        provider: PaymentProvider;
        status: PaymentStatus;
        amountTotal: { toString(): string };
        currencyCode: string;
        metadataJson: unknown;
      } | null;
    },
    locale: ContentLocale,
  ) {
    const translation = this.pickTranslation(
      enrollment.course.translations ?? [],
      locale,
    );
    const paymentMetadata = (enrollment.payment?.metadataJson ??
      {}) as Record<string, unknown>;

    return {
      id: enrollment.id,
      courseId: enrollment.courseId,
      scheduleId: enrollment.courseScheduleId,
      enrollmentStatus: enrollment.enrollmentStatus,
      paymentStatus: enrollment.paymentStatus,
      enrolledAt: enrollment.enrolledAt.toISOString(),
      cancelledAt: enrollment.cancelledAt?.toISOString() ?? null,
      refundedAt: enrollment.refundedAt?.toISOString() ?? null,
      completedAt: enrollment.completedAt?.toISOString() ?? null,
      attendanceStatus: enrollment.attendanceStatus,
      courseTitle: translation?.title ?? 'Training',
      scheduleCode: enrollment.courseSchedule.scheduleCode,
      startsAt: enrollment.courseSchedule.startsAt?.toISOString() ?? null,
      endsAt: enrollment.courseSchedule.endsAt?.toISOString() ?? null,
      payment: enrollment.payment
        ? {
            id: enrollment.payment.id,
            provider: enrollment.payment.provider,
            status: enrollment.payment.status,
            amount: enrollment.payment.amountTotal.toString(),
            currency: enrollment.payment.currencyCode,
            checkoutUrl:
              typeof paymentMetadata.checkoutUrl === 'string'
                ? paymentMetadata.checkoutUrl
                : null,
            clientSecret:
              typeof paymentMetadata.clientSecret === 'string'
                ? paymentMetadata.clientSecret
                : null,
          }
        : null,
    };
  }

  presentAdminScheduleEnrollmentItem(input: {
    id: string;
    userId: string;
    enrollmentStatus: EnrollmentStatus;
    attendanceStatus: EnrollmentAttendanceStatus;
    paymentStatus: string | null;
    enrolledAt: Date;
    user: {
      displayName: string | null;
    };
    courseSchedule: {
      id: string;
      scheduleCode: string;
      startsAt: Date | null;
      endsAt: Date | null;
    };
  }) {
    return {
      id: input.id,
      userId: input.userId,
      patientDisplayName: input.user.displayName ?? null,
      scheduleId: input.courseSchedule.id,
      scheduleCode: input.courseSchedule.scheduleCode,
      enrollmentStatus: input.enrollmentStatus,
      attendanceStatus: input.attendanceStatus,
      paymentStatus: input.paymentStatus,
      enrolledAt: input.enrolledAt.toISOString(),
      startsAt: input.courseSchedule.startsAt?.toISOString() ?? null,
      endsAt: input.courseSchedule.endsAt?.toISOString() ?? null,
    };
  }

  presentJoinAccessItem(input: {
    enrollmentId: string;
    courseId: string;
    scheduleId: string;
    enrollmentStatus: EnrollmentStatus;
    scheduleStatus: CourseScheduleStatus;
    canJoin: boolean;
    blockedReason: TrainingJoinBlockedReason | null;
    provider: string | null;
    joinUrl: string | null;
    startsAt: Date | null;
    endsAt: Date | null;
  }) {
    return {
      enrollmentId: input.enrollmentId,
      courseId: input.courseId,
      scheduleId: input.scheduleId,
      enrollmentStatus: input.enrollmentStatus,
      scheduleStatus: input.scheduleStatus,
      canJoin: input.canJoin,
      blockedReason: input.blockedReason,
      provider: input.provider ?? null,
      joinUrl: input.canJoin ? input.joinUrl ?? null : null,
      startsAt: input.startsAt?.toISOString() ?? null,
      endsAt: input.endsAt?.toISOString() ?? null,
    };
  }
}
