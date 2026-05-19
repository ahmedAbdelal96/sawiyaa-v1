import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CourseStatus } from '@prisma/client';
import { CreateAcademyCourseLectureDto } from '../dto/create-academy-course-lecture.dto';
import { AcademyPresenter } from '../presenters/academy.presenter';
import { AcademyRepository } from '../repositories/academy.repository';
import { resolveAcademyCoursePlan } from '../utils/academy-plan.util';

@Injectable()
export class CreateAcademyCourseLectureUseCase {
  constructor(
    private readonly academyRepository: AcademyRepository,
    private readonly academyPresenter: AcademyPresenter,
  ) {}

  async execute(input: {
    courseId: string;
    createdByUserId?: string | null;
    payload: CreateAcademyCourseLectureDto;
  }) {
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
        error: 'ACADEMY_COURSE_ARCHIVED_READONLY',
      });
    }

    const plan = resolveAcademyCoursePlan({
      startsAt: course.startsAt,
      plannedDurationDays: course.plannedDurationDays,
      plannedLectureCount: course.plannedLectureCount,
    });

    const startsAt = new Date(input.payload.startsAt);
    const endsAt = new Date(input.payload.endsAt);
    if (!(startsAt < endsAt)) {
      throw new BadRequestException({
        messageKey: 'academy.errors.invalidLectureWindow',
        error: 'ACADEMY_INVALID_LECTURE_WINDOW',
      });
    }

    if (!course.startsAt || !course.endsAt) {
      throw new BadRequestException({
        messageKey: 'academy.errors.missingLecturePlan',
        error: 'ACADEMY_MISSING_LECTURE_PLAN',
      });
    }

    if (startsAt < course.startsAt || endsAt > plan.endsAt) {
      throw new BadRequestException({
        messageKey: 'academy.errors.invalidLectureWindow',
        error: 'ACADEMY_INVALID_LECTURE_WINDOW',
      });
    }

    const currentLectures = await this.academyRepository.listLecturesByCourseId(
      course.id,
    );
    if (
      typeof course.plannedLectureCount === 'number' &&
      currentLectures.length >= course.plannedLectureCount
    ) {
      throw new BadRequestException({
        messageKey: 'academy.errors.lectureLimitReached',
        error: 'ACADEMY_LECTURE_LIMIT_REACHED',
      });
    }

    const overlaps = currentLectures.some(
      (lecture) => startsAt < lecture.endsAt && endsAt > lecture.startsAt,
    );
    if (overlaps) {
      throw new BadRequestException({
        messageKey: 'academy.errors.lectureOverlap',
        error: 'ACADEMY_LECTURE_OVERLAP',
      });
    }

    const duplicateOrder = currentLectures.some(
      (lecture) => lecture.lectureOrder === input.payload.lectureOrder,
    );
    if (duplicateOrder) {
      throw new BadRequestException({
        messageKey: 'academy.errors.lectureOrderTaken',
        error: 'ACADEMY_LECTURE_ORDER_TAKEN',
      });
    }

    const created = await this.academyRepository.createLecture({
      academyCourseId: course.id,
      lectureOrder: input.payload.lectureOrder,
      lectureTitle: input.payload.lectureTitle?.trim() || null,
      startsAt,
      endsAt,
      createdByUserId: input.createdByUserId ?? null,
    });

    return {
      item: this.academyPresenter.presentLectureItem(created),
    };
  }
}
