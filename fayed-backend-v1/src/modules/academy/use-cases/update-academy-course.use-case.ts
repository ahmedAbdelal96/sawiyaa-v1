import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CourseStatus } from '@prisma/client';
import { UpdateAcademyCourseDto } from '../dto/update-academy-course.dto';
import { AcademyPresenter } from '../presenters/academy.presenter';
import { AcademyRepository } from '../repositories/academy.repository';
import {
  normalizeAcademyCurrencyCode,
  normalizeAcademyPriceValue,
  resolveAcademyCoursePricingState,
} from '../utils/academy-pricing.util';
import {
  normalizeAcademyPlanValue,
  resolveAcademyCoursePlan,
} from '../utils/academy-plan.util';

@Injectable()
export class UpdateAcademyCourseUseCase {
  constructor(
    private readonly academyRepository: AcademyRepository,
    private readonly academyPresenter: AcademyPresenter,
  ) {}

  async execute(input: { courseId: string; payload: UpdateAcademyCourseDto }) {
    const course = await this.academyRepository.findCourseById(input.courseId);
    if (!course) {
      throw new NotFoundException({
        messageKey: 'academy.errors.notFound',
        error: 'ACADEMY_COURSE_NOT_FOUND',
      });
    }

    if (course.status === CourseStatus.ARCHIVED) {
      throw new BadRequestException({
        messageKey: 'academy.errors.archivedReadOnly',
        error: 'ACADEMY_COURSE_ARCHIVED_READ_ONLY',
      });
    }

    const pricingTouched =
      input.payload.priceAmountEgp !== undefined ||
      input.payload.priceAmountUsd !== undefined ||
      input.payload.priceAmount !== undefined ||
      input.payload.currencyCode !== undefined;

    const nextStartsAt =
      input.payload.startsAt !== undefined
        ? this.parseDate(input.payload.startsAt)
        : (course.startsAt ?? null);
    const nextPlannedDurationDays =
      input.payload.plannedDurationDays !== undefined
        ? normalizeAcademyPlanValue(input.payload.plannedDurationDays)
        : (course.plannedDurationDays ?? null);
    const nextPlannedLectureCount =
      input.payload.plannedLectureCount !== undefined
        ? normalizeAcademyPlanValue(input.payload.plannedLectureCount)
        : (course.plannedLectureCount ?? null);

    const nextPlan = resolveAcademyCoursePlan({
      startsAt: nextStartsAt,
      plannedDurationDays: nextPlannedDurationDays,
      plannedLectureCount: nextPlannedLectureCount,
    });
    const lectureCount = course.lectures?.length ?? 0;
    const requestedStatus = input.payload.status;

    if (requestedStatus === CourseStatus.PUBLISHED && lectureCount !== nextPlannedLectureCount) {
      throw new BadRequestException({
        messageKey: 'academy.errors.missingLectureSchedule',
        error: 'ACADEMY_MISSING_LECTURE_SCHEDULE',
        details: {
          expectedLectureCount: nextPlannedLectureCount ?? 0,
          actualLectureCount: lectureCount,
        },
      });
    }

    const nextPricing = pricingTouched
      ? resolveAcademyCoursePricingState(
          {
            priceAmountEgp: course.priceAmountEgp?.toString() ?? null,
            priceAmountUsd: course.priceAmountUsd?.toString() ?? null,
            priceAmount: course.priceAmount?.toString() ?? null,
            currencyCode: course.currencyCode ?? null,
          },
          {
            priceAmountEgp:
              input.payload.priceAmountEgp !== undefined
                ? normalizeAcademyPriceValue(input.payload.priceAmountEgp)
                : undefined,
            priceAmountUsd:
              input.payload.priceAmountUsd !== undefined
                ? normalizeAcademyPriceValue(input.payload.priceAmountUsd)
                : undefined,
            priceAmount:
              input.payload.priceAmount !== undefined
                ? normalizeAcademyPriceValue(input.payload.priceAmount)
                : undefined,
            currencyCode:
              input.payload.currencyCode !== undefined
                ? normalizeAcademyCurrencyCode(input.payload.currencyCode)
                : undefined,
          },
        )
      : null;

    const updated = await this.academyRepository.updateCourse(input.courseId, {
      ...(input.payload.title !== undefined
        ? { title: input.payload.title.trim() }
        : {}),
      ...(input.payload.shortDescription !== undefined
        ? { shortDescription: input.payload.shortDescription?.trim() || null }
        : {}),
      ...(input.payload.fullDescription !== undefined
        ? { fullDescription: input.payload.fullDescription?.trim() || null }
        : {}),
      ...(input.payload.visibility !== undefined
        ? { visibility: input.payload.visibility }
        : {}),
      ...(input.payload.coverImageUrl !== undefined
        ? { coverImageUrl: input.payload.coverImageUrl?.trim() || null }
        : {}),
      ...(input.payload.thumbnailUrl !== undefined
        ? { thumbnailUrl: input.payload.thumbnailUrl?.trim() || null }
        : {}),
      ...(input.payload.priceAmountEgp !== undefined
        ? { priceAmountEgp: normalizeAcademyPriceValue(input.payload.priceAmountEgp) }
        : {}),
      ...(input.payload.priceAmountUsd !== undefined
        ? { priceAmountUsd: normalizeAcademyPriceValue(input.payload.priceAmountUsd) }
        : {}),
      ...(input.payload.plannedDurationDays !== undefined
        ? { plannedDurationDays: normalizeAcademyPlanValue(input.payload.plannedDurationDays) }
        : {}),
      ...(input.payload.plannedLectureCount !== undefined
        ? { plannedLectureCount: normalizeAcademyPlanValue(input.payload.plannedLectureCount) }
        : {}),
      ...(pricingTouched && nextPricing
        ? {
            priceAmount: nextPricing.priceAmount,
            currencyCode: nextPricing.currencyCode,
          }
        : {}),
      ...(input.payload.startsAt !== undefined
        ? { startsAt: nextStartsAt }
        : {}),
      endsAt: nextPlan.endsAt,
      ...(input.payload.meetingUrl !== undefined
        ? { meetingUrl: input.payload.meetingUrl?.trim() || null }
        : {}),
      ...(input.payload.whatsappGroupUrl !== undefined
        ? { whatsappGroupUrl: input.payload.whatsappGroupUrl?.trim() || null }
        : {}),
      ...(input.payload.status !== undefined
        ? {
            status: input.payload.status,
            ...(input.payload.status === CourseStatus.PUBLISHED
              ? { publishedAt: course.publishedAt ?? new Date() }
              : {}),
          }
        : {}),
    });

    return {
      item: this.academyPresenter.presentAdminCourseItem(updated, null),
    };
  }

  private parseDate(value?: string) {
    if (!value) {
      return null;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException({
        messageKey: 'academy.errors.invalidPlanWindow',
        error: 'ACADEMY_INVALID_PLAN_WINDOW',
      });
    }

    return parsed;
  }
}
