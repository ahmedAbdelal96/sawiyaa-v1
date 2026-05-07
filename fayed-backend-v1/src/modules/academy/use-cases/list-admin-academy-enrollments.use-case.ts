import { Injectable } from '@nestjs/common';
import { ListAdminAcademyEnrollmentsDto } from '../dto/list-admin-academy-enrollments.dto';
import { AcademyPresenter } from '../presenters/academy.presenter';
import { AcademyRepository } from '../repositories/academy.repository';

@Injectable()
export class ListAdminAcademyEnrollmentsUseCase {
  constructor(
    private readonly academyRepository: AcademyRepository,
    private readonly academyPresenter: AcademyPresenter,
  ) {}

  async execute(query: ListAdminAcademyEnrollmentsDto) {
    const [items, totalItems] = await this.academyRepository.listAdminEnrollments({
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      status: query.status,
      courseId: query.courseId?.trim() || undefined,
      q: query.q?.trim() || undefined,
    });

    return {
      items: items.map((item) => this.academyPresenter.presentEnrollmentItem(item)),
      pagination: this.academyPresenter.presentPagination({
        page: query.page,
        limit: query.limit,
        totalItems,
      }),
    };
  }
}
