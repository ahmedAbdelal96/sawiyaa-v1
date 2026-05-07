import { BadRequestException, Injectable } from '@nestjs/common';
import { CourseStatus, CourseVisibility } from '@prisma/client';
import { CreateAcademyCourseDto } from '../dto/create-academy-course.dto';
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
import { slugifyAcademyTitle } from '../utils/academy-slug.util';

@Injectable()
export class CreateAcademyCourseUseCase {
  constructor(
    private readonly academyRepository: AcademyRepository,
    private readonly academyPresenter: AcademyPresenter,
  ) {}

  async execute(input: { payload: CreateAcademyCourseDto }) {
    const payload = input.payload;
    const slug = await this.resolveUniqueSlug(payload.title);
    const startsAt = this.parseDate(payload.startsAt);
    const plannedDurationDays = normalizeAcademyPlanValue(payload.plannedDurationDays);
    const plannedLectureCount = normalizeAcademyPlanValue(payload.plannedLectureCount);
    const requestedStatus = payload.status ?? CourseStatus.DRAFT;

    const plan = resolveAcademyCoursePlan({
      startsAt,
      plannedDurationDays,
      plannedLectureCount,
    });

    if (requestedStatus === CourseStatus.PUBLISHED) {
      throw new BadRequestException({
        messageKey: 'academy.errors.missingLectureSchedule',
        error: 'ACADEMY_MISSING_LECTURE_SCHEDULE',
        details: {
          expectedLectureCount: plannedLectureCount ?? 0,
          actualLectureCount: 0,
        },
      });
    }

    const pricing = resolveAcademyCoursePricingState(null, {
      priceAmountEgp: normalizeAcademyPriceValue(payload.priceAmountEgp),
      priceAmountUsd: normalizeAcademyPriceValue(payload.priceAmountUsd),
      priceAmount: normalizeAcademyPriceValue(payload.priceAmount),
      currencyCode: normalizeAcademyCurrencyCode(payload.currencyCode),
    });

    const created = await this.academyRepository.createCourse({
      slug,
      title: payload.title.trim(),
      shortDescription: payload.shortDescription?.trim() || null,
      fullDescription: payload.fullDescription?.trim() || null,
      visibility: payload.visibility ?? CourseVisibility.PUBLIC,
      status: payload.status ?? CourseStatus.DRAFT,
      coverImageUrl: payload.coverImageUrl?.trim() || null,
      thumbnailUrl: payload.thumbnailUrl?.trim() || null,
      priceAmountEgp: pricing.priceAmountEgp,
      priceAmountUsd: pricing.priceAmountUsd,
      priceAmount: pricing.priceAmount,
      currencyCode: pricing.currencyCode,
      startsAt,
      endsAt: plan.endsAt,
      plannedDurationDays,
      plannedLectureCount,
      meetingUrl: payload.meetingUrl?.trim() || null,
      whatsappGroupUrl: payload.whatsappGroupUrl?.trim() || null,
      publishedAt: null,
    });

    return {
      item: this.academyPresenter.presentAdminCourseItem(created, null),
    };
  }

  private async resolveUniqueSlug(title: string): Promise<string> {
    const base = slugifyAcademyTitle(title);
    let candidate = base;
    let suffix = 2;

    while (await this.academyRepository.findCourseBySlug(candidate)) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }

    return candidate;
  }

  private parseDate(value?: string): Date | null {
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
