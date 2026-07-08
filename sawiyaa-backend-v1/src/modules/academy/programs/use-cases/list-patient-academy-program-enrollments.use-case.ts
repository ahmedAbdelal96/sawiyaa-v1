import { Injectable } from '@nestjs/common';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { AcademyProgramEnrollmentPresenter } from '../presenters/academy-program-enrollment.presenter';
import { AcademyProgramEnrollmentRepository } from '../repositories/academy-program-enrollment.repository';
import { ListPatientAcademyProgramEnrollmentsDto } from '../dto/list-patient-academy-program-enrollments.dto';

@Injectable()
export class ListPatientAcademyProgramEnrollmentsUseCase {
  constructor(
    private readonly academyProgramEnrollmentRepository: AcademyProgramEnrollmentRepository,
    private readonly academyProgramEnrollmentPresenter: AcademyProgramEnrollmentPresenter,
  ) {}

  async execute(input: {
    userId: string;
    locale: SupportedLocale;
    query: ListPatientAcademyProgramEnrollmentsDto;
  }) {
    const [items, totalItems] =
      await this.academyProgramEnrollmentRepository.listEnrollmentsByUserIdPaginated(
        {
          userId: input.userId,
          page: input.query.page ?? 1,
          limit: input.query.limit ?? 12,
        },
      );

    return {
      items: items.map((item) =>
        this.academyProgramEnrollmentPresenter.presentEnrollmentItem(
          item,
          input.locale,
        ),
      ),
      pagination: {
        page: input.query.page ?? 1,
        limit: input.query.limit ?? 12,
        totalItems,
        totalPages: Math.max(
          1,
          Math.ceil(totalItems / (input.query.limit ?? 12)),
        ),
      },
    };
  }
}
