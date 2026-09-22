import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { PractitionerApplicationRepository } from '../repositories/practitioner-application.repository';
import { PractitionerProfileRepository } from '../repositories/practitioner-profile.repository';
import { PractitionerReviewCaseService } from '../services/practitioner-review-case.service';

/** Returns only actionable persisted requirements for the authenticated applicant/practitioner. */
@Injectable()
export class GetPractitionerRequirementsUseCase {
  constructor(
    private readonly profileRepository: PractitionerProfileRepository,
    private readonly applicationRepository: PractitionerApplicationRepository,
    private readonly reviewCaseService: PractitionerReviewCaseService,
  ) {}

  async execute(input: { userId: string; currentUser: AuthenticatedUser }) {
    const profile = await this.profileRepository.findByUserId(input.userId);
    if (profile) {
      const reviewCase = await this.reviewCaseService.findActiveChangeCase(profile.id);
      return {
        caseId: reviewCase?.id ?? null,
        caseStatus: reviewCase?.status ?? null,
        source: reviewCase ? 'PRACTITIONER_CHANGE' as const : null,
        requirements: reviewCase?.requirements ?? [],
      };
    }

    const application = await this.applicationRepository.findLatestByUserId(input.userId);
    if (!application) throw new NotFoundException({ error: 'PRACTITIONER_APPLICATION_NOT_FOUND' });
    const reviewCase = await this.reviewCaseService.findActiveApplicationCase(application.id);
    return {
      caseId: reviewCase?.id ?? null,
      caseStatus: reviewCase?.status ?? null,
      source: reviewCase ? 'ONBOARDING' as const : null,
      requirements: reviewCase?.requirements ?? [],
    };
  }
}
