import { Injectable, NotFoundException } from '@nestjs/common';
import { AcademyPresenter } from '../presenters/academy.presenter';
import { AcademyRepository } from '../repositories/academy.repository';

@Injectable()
export class GetAdminAcademyCourseUseCase {
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

    const statsByCourseId =
      await this.academyRepository.countEnrollmentsByCourseIds([course.id]);
    const enrollments = await this.academyRepository.listEnrollmentsByCourseId(
      course.id,
    );

    return {
      item: this.academyPresenter.presentAdminCourseItem(
        course,
        statsByCourseId[course.id] ?? null,
      ),
      enrollments: enrollments.map((enrollment) =>
        this.academyPresenter.presentEnrollmentItem(enrollment),
      ),
    };
  }
}
