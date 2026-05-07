import { Injectable, NotFoundException } from '@nestjs/common';
import { CourseStatus } from '@prisma/client';
import { AcademyPresenter } from '../presenters/academy.presenter';
import { AcademyRepository } from '../repositories/academy.repository';

@Injectable()
export class ArchiveAcademyCourseUseCase {
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

    const updated = await this.academyRepository.updateCourse(input.courseId, {
      status: CourseStatus.ARCHIVED,
      archivedAt: new Date(),
    });

    return {
      item: this.academyPresenter.presentAdminCourseItem(updated, null),
    };
  }
}
