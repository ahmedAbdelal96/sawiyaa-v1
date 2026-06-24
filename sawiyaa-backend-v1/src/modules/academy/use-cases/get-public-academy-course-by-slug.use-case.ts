import { Injectable, NotFoundException } from '@nestjs/common';
import { PatientProfileRepository } from '@modules/patients/repositories/patient-profile.repository';
import { AcademyPresenter } from '../presenters/academy.presenter';
import { AcademyRepository } from '../repositories/academy.repository';

@Injectable()
export class GetPublicAcademyCourseBySlugUseCase {
  constructor(
    private readonly academyRepository: AcademyRepository,
    private readonly academyPresenter: AcademyPresenter,
    private readonly patientProfileRepository: PatientProfileRepository,
  ) {}

  async execute(input: { slug: string; currentUserId?: string | null }) {
    const patientProfile = input.currentUserId
      ? await this.patientProfileRepository.findByUserId(input.currentUserId)
      : null;

    const course = await this.academyRepository.findPublicCourseBySlug(
      input.slug,
    );
    if (!course) {
      throw new NotFoundException({
        messageKey: 'academy.errors.notFound',
        error: 'ACADEMY_COURSE_NOT_FOUND',
      });
    }

    return {
      item: this.academyPresenter.presentPublicCourseDetails(course, null, {
        resolvedCountryCode: patientProfile?.country?.isoCode ?? null,
      }),
    };
  }
}
