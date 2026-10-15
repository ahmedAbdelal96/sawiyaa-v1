import { Injectable } from '@nestjs/common';
import { AcademyProgramEnrollmentPresenter } from '../presenters/academy-program-enrollment.presenter';
import { AcademyProgramEnrollmentRepository } from '../repositories/academy-program-enrollment.repository';

@Injectable()
export class ListAdminAcademyRegistrationAttemptsUseCase {
  constructor(
    private readonly academyProgramEnrollmentRepository: AcademyProgramEnrollmentRepository,
    private readonly academyProgramEnrollmentPresenter: AcademyProgramEnrollmentPresenter,
  ) {}

  async execute(input: {
    academyProgramId: string;
    page: number;
    limit: number;
    q?: string;
    status?: 'REQUIRES_LOGIN' | 'SUBMITTED' | 'PAYMENT_ISSUE';
  }) {
    const [items, totalItems] =
      await this.academyProgramEnrollmentRepository.listAdminRegistrationAttempts(input);

    return {
      items: items.map((item) =>
        this.academyProgramEnrollmentPresenter.presentAdminRegistrationAttempt(item),
      ),
      pagination: {
        page: input.page,
        limit: input.limit,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / input.limit)),
      },
    };
  }
}
