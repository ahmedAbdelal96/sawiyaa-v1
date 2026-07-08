import { Injectable } from '@nestjs/common';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { AcademyProgramEnrollmentPresenter } from '../presenters/academy-program-enrollment.presenter';
import { AcademyProgramEnrollmentRepository } from '../repositories/academy-program-enrollment.repository';
import { AcademyProgramPresenter } from '../presenters/academy-program.presenter';
import { ListAdminAcademyProgramEnrollmentsDto } from '../dto/list-admin-academy-program-enrollments.dto';

@Injectable()
export class ListAdminAcademyProgramEnrollmentsUseCase {
  constructor(
    private readonly academyProgramEnrollmentRepository: AcademyProgramEnrollmentRepository,
    private readonly academyProgramEnrollmentPresenter: AcademyProgramEnrollmentPresenter,
    private readonly academyProgramPresenter: AcademyProgramPresenter,
  ) {}

  async execute(input: ListAdminAcademyProgramEnrollmentsDto & {
    academyProgramId: string;
    locale: SupportedLocale;
  }) {
    const [items, totalItems] =
      await this.academyProgramEnrollmentRepository.listAdminEnrollments({
        academyProgramId: input.academyProgramId,
        page: input.page ?? 1,
        limit: input.limit ?? 12,
        status: input.status,
        paymentStatus: input.paymentStatus,
        country: input.country,
        sortBy: input.sortBy,
        sortDir: input.sortDir,
        q: input.q,
      });

    return {
      items: items.map((enrollment) =>
        this.academyProgramEnrollmentPresenter.presentEnrollmentItem(
          enrollment,
          input.locale,
        ),
      ),
      pagination: this.academyProgramPresenter.presentPagination({
        page: input.page ?? 1,
        limit: input.limit ?? 12,
        totalItems,
      }),
    };
  }
}
