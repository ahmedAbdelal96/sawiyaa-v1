import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CourseStatus } from '@prisma/client';
import { AcademyPresenter } from '../presenters/academy.presenter';
import { AcademyRepository } from '../repositories/academy.repository';
import { resolveAcademyCoursePlan } from '../utils/academy-plan.util';

@Injectable()
export class PublishAcademyCourseUseCase {
  constructor(
    private readonly academyRepository: AcademyRepository,
    private readonly academyPresenter: AcademyPresenter,
  ) {}

  async execute(input: { courseId: string }) {
    const course = await this.academyRepository.findCourseById(input.courseId);
    if (!course) {
      throw new NotFoundException({
        messageKey: 'academy.errors.notFound',
        error: 'ACADEMY_COURSE_NOT_FOUND',
      });
    }

    const plan = resolveAcademyCoursePlan({
      startsAt: course.startsAt,
      plannedDurationDays: course.plannedDurationDays,
      plannedLectureCount: course.plannedLectureCount,
    });

    const lectureCount = course.lectures?.length ?? 0;
    if (lectureCount !== course.plannedLectureCount) {
      throw new BadRequestException({
        messageKey: 'academy.errors.missingLectureSchedule',
        error: 'ACADEMY_MISSING_LECTURE_SCHEDULE',
        details: {
          expectedLectureCount: course.plannedLectureCount ?? 0,
          actualLectureCount: lectureCount,
        },
      });
    }

    const updated = await this.academyRepository.updateCourse(input.courseId, {
      status: CourseStatus.PUBLISHED,
      publishedAt: course.publishedAt ?? new Date(),
      archivedAt: null,
      endsAt: plan.endsAt,
    });

    return {
      item: this.academyPresenter.presentAdminCourseItem(updated, null),
    };
  }
}
