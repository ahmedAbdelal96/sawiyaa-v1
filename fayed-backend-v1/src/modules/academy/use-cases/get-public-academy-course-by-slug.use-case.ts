import { Injectable, NotFoundException } from '@nestjs/common';
import { AcademyPresenter } from '../presenters/academy.presenter';
import { AcademyRepository } from '../repositories/academy.repository';

@Injectable()
export class GetPublicAcademyCourseBySlugUseCase {
  constructor(
    private readonly academyRepository: AcademyRepository,
    private readonly academyPresenter: AcademyPresenter,
  ) {}

  async execute(input: { slug: string }) {
    const course = await this.academyRepository.findPublicCourseBySlug(
      input.slug,
    );
    if (!course) {
      throw new NotFoundException({
        messageKey: 'academy.errors.notFound',
        error: 'ACADEMY_COURSE_NOT_FOUND',
      });
    }

    return {
      item: this.academyPresenter.presentPublicCourseDetails(course, null),
    };
  }
}
