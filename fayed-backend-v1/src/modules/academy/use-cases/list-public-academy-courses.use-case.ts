import { Injectable } from '@nestjs/common';
import { ListPublicAcademyCoursesDto } from '../dto/list-public-academy-courses.dto';
import { AcademyPresenter } from '../presenters/academy.presenter';
import { AcademyRepository } from '../repositories/academy.repository';

@Injectable()
export class ListPublicAcademyCoursesUseCase {
  constructor(
    private readonly academyRepository: AcademyRepository,
    private readonly academyPresenter: AcademyPresenter,
  ) {}

  async execute(query: ListPublicAcademyCoursesDto) {
    const [items, totalItems] = await this.academyRepository.listPublicCourses({
      page: query.page,
      limit: query.limit,
      q: query.q?.trim() || undefined,
    });

    const statsByCourseId = await this.academyRepository.countEnrollmentsByCourseIds(
      items.map((item) => item.id),
    );

    return {
      items: items.map((item) =>
        this.academyPresenter.presentPublicCourseItem(
          item,
          statsByCourseId[item.id] ?? null,
        ),
      ),
      pagination: this.academyPresenter.presentPagination({
        page: query.page,
        limit: query.limit,
        totalItems,
      }),
    };
  }
}
