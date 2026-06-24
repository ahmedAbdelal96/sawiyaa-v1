import { Injectable } from '@nestjs/common';
import { ListAdminAcademyCoursesDto } from '../dto/list-admin-academy-courses.dto';
import { AcademyPresenter } from '../presenters/academy.presenter';
import { AcademyRepository } from '../repositories/academy.repository';

@Injectable()
export class ListAdminAcademyCoursesUseCase {
  constructor(
    private readonly academyRepository: AcademyRepository,
    private readonly academyPresenter: AcademyPresenter,
  ) {}

  async execute(query: ListAdminAcademyCoursesDto) {
    const [items, totalItems] = await this.academyRepository.listAdminCourses({
      page: query.page,
      limit: query.limit,
      status: query.status,
      q: query.q?.trim() || undefined,
    });

    const statsByCourseId =
      await this.academyRepository.countEnrollmentsByCourseIds(
        items.map((item) => item.id),
      );

    return {
      items: items.map((item) =>
        this.academyPresenter.presentAdminCourseItem(
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
