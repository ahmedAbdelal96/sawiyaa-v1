import { Injectable, NotFoundException } from '@nestjs/common';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { AcademyProgramEnrollmentPresenter } from '../presenters/academy-program-enrollment.presenter';
import { AcademyProgramEnrollmentRepository } from '../repositories/academy-program-enrollment.repository';

@Injectable()
export class GetPublicAcademyProgramEnrollmentUseCase {
  constructor(
    private readonly academyProgramEnrollmentRepository: AcademyProgramEnrollmentRepository,
    private readonly academyProgramEnrollmentPresenter: AcademyProgramEnrollmentPresenter,
  ) {}

  async execute(input: {
    enrollmentId: string;
    token: string;
    locale: SupportedLocale;
  }) {
    const enrollment =
      await this.academyProgramEnrollmentRepository.findEnrollmentByIdForPublic(
        input.enrollmentId,
        input.token,
      );

    if (!enrollment) {
      throw new NotFoundException({
        messageKey: 'academyProgram.errors.enrollmentNotFound',
        error: 'ACADEMY_PROGRAM_ENROLLMENT_NOT_FOUND',
      });
    }

    return {
      item: this.academyProgramEnrollmentPresenter.presentEnrollmentItem(
        enrollment,
        input.locale,
      ),
    };
  }
}
