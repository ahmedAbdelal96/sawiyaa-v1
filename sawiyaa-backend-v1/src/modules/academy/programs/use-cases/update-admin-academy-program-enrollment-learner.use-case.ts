import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AcademyProgramEnrollmentPresenter } from '../presenters/academy-program-enrollment.presenter';
import { AcademyProgramEnrollmentRepository } from '../repositories/academy-program-enrollment.repository';
import { AcademyRepository } from '../../repositories/academy.repository';
import { UpdateAcademyProgramEnrollmentLearnerDto } from '../dto/update-academy-program-enrollment-learner.dto';
import { SupportedLocale } from '@common/i18n/types/locale.types';

@Injectable()
export class UpdateAdminAcademyProgramEnrollmentLearnerUseCase {
  constructor(
    private readonly academyRepository: AcademyRepository,
    private readonly academyProgramEnrollmentRepository: AcademyProgramEnrollmentRepository,
    private readonly academyProgramEnrollmentPresenter: AcademyProgramEnrollmentPresenter,
  ) {}

  async execute(input: {
    enrollmentId: string;
    locale: SupportedLocale;
    payload: UpdateAcademyProgramEnrollmentLearnerDto;
  }) {
    const enrollment =
      await this.academyProgramEnrollmentRepository.findEnrollmentByIdForAdmin(
        input.enrollmentId,
      );

    if (!enrollment) {
      throw new NotFoundException({
        messageKey: 'academyProgram.errors.enrollmentNotFound',
        error: 'ACADEMY_PROGRAM_ENROLLMENT_NOT_FOUND',
      });
    }

    try {
      const learner = await this.academyRepository.updateLearner(enrollment.academyLearnerId, {
        fullName: input.payload.fullName?.trim() ?? enrollment.academyLearner.fullName,
        phoneNumber: input.payload.phoneNumber?.trim() ?? enrollment.academyLearner.phoneNumber,
        whatsappNumber:
          input.payload.whatsappNumber === undefined
            ? enrollment.academyLearner.whatsappNumber
            : input.payload.whatsappNumber?.trim() || null,
        email:
          input.payload.email === undefined
            ? enrollment.academyLearner.email
            : input.payload.email?.trim() || null,
        city:
          input.payload.city === undefined
            ? enrollment.academyLearner.city
            : input.payload.city?.trim() || null,
        jobTitle:
          input.payload.jobTitle === undefined
            ? enrollment.academyLearner.jobTitle
            : input.payload.jobTitle?.trim() || null,
        employer:
          input.payload.employer === undefined
            ? enrollment.academyLearner.employer
            : input.payload.employer?.trim() || null,
        education:
          input.payload.education === undefined
            ? enrollment.academyLearner.education
            : input.payload.education?.trim() || null,
        notes:
          input.payload.notes === undefined
            ? enrollment.academyLearner.notes
            : input.payload.notes?.trim() || null,
      });

      const refreshed =
        await this.academyProgramEnrollmentRepository.findEnrollmentByIdForAdmin(
          enrollment.id,
        );

      if (!refreshed) {
        throw new NotFoundException({
          messageKey: 'academyProgram.errors.enrollmentNotFound',
          error: 'ACADEMY_PROGRAM_ENROLLMENT_NOT_FOUND',
        });
      }

      return {
        item: this.academyProgramEnrollmentPresenter.presentEnrollmentItem(
          {
            ...refreshed,
            academyLearner: learner,
          } as never,
          input.locale,
        ),
      };
    } catch (error) {
      if ((error as { code?: string } | null | undefined)?.code === 'P2002') {
        throw new ConflictException({
          messageKey: 'academyProgram.errors.duplicateLearnerContact',
          error: 'ACADEMY_PROGRAM_LEARNER_CONTACT_ALREADY_EXISTS',
        });
      }

      throw error;
    }
  }
}
