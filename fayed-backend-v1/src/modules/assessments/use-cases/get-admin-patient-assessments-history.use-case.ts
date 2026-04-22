import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { ListPatientAssessmentsDto } from '../dto/list-patient-assessments.dto';
import { AssessmentPresenter } from '../presenters/assessment.presenter';
import { AssessmentSubmissionRepository } from '../repositories/assessment-submission.repository';

@Injectable()
export class GetAdminPatientAssessmentsHistoryUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assessmentSubmissionRepository: AssessmentSubmissionRepository,
    private readonly assessmentPresenter: AssessmentPresenter,
  ) {}

  async execute(input: {
    patientId: string;
    query: ListPatientAssessmentsDto;
  }) {
    const patientExists = await this.prisma.patientProfile.findUnique({
      where: { id: input.patientId },
      select: { id: true },
    });

    if (!patientExists) {
      throw new NotFoundException({
        messageKey: 'assessments.errors.patientProfileNotFound',
        error: 'ASSESSMENT_PATIENT_PROFILE_NOT_FOUND',
      });
    }

    const [items, totalItems] =
      await this.assessmentSubmissionRepository.listPatientSubmissions({
        patientProfileId: input.patientId,
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
