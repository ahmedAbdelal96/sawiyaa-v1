import { Injectable, NotFoundException } from '@nestjs/common';
import { ListPatientAssessmentsDto } from '../dto/list-patient-assessments.dto';
import { AssessmentPresenter } from '../presenters/assessment.presenter';
import { AssessmentPatientRepository } from '../repositories/assessment-patient.repository';
import { AssessmentSubmissionRepository } from '../repositories/assessment-submission.repository';

@Injectable()
export class GetMyAssessmentsHistoryUseCase {
  constructor(
    private readonly assessmentPatientRepository: AssessmentPatientRepository,
    private readonly assessmentSubmissionRepository: AssessmentSubmissionRepository,
    private readonly assessmentPresenter: AssessmentPresenter,
  ) {}

  async execute(input: { userId: string; query: ListPatientAssessmentsDto }) {
    const patientProfile = await this.assessmentPatientRepository.findByUserId(input.userId);
    if (!patientProfile) {
      throw new NotFoundException({
        messageKey: 'assessments.errors.patientProfileNotFound',
        error: 'ASSESSMENT_PATIENT_PROFILE_NOT_FOUND',
      });
    }

    const [items, totalItems] =
      await this.assessmentSubmissionRepository.listPatientSubmissions({
        patientProfileId: patientProfile.id,
        page: input.query.page,
        limit: input.query.limit,
        status: input.query.status,
      });

    const totalPages = Math.max(1, Math.ceil(totalItems / input.query.limit));

    return this.assessmentPresenter.presentPatientHistory({
      items,
      pagination: {
        page: input.query.page,
        limit: input.query.limit,
        totalItems,
        totalPages,
      },
    });
  }
}
