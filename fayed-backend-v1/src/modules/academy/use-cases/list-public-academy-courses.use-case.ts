import { Injectable } from '@nestjs/common';
import { ListPublicAcademyCoursesDto } from '../dto/list-public-academy-courses.dto';
import { AcademyPresenter } from '../presenters/academy.presenter';
import { AcademyRepository } from '../repositories/academy.repository';
import { PatientProfileRepository } from '@modules/patients/repositories/patient-profile.repository';

@Injectable()
export class ListPublicAcademyCoursesUseCase {
  constructor(
    private readonly academyRepository: AcademyRepository,
    private readonly academyPresenter: AcademyPresenter,
    private readonly patientProfileRepository: PatientProfileRepository,
  ) {}

  async execute(input: ListPublicAcademyCoursesDto & { currentUserId?: string | null }) {
    const patientProfile = input.currentUserId
      ? await this.patientProfileRepository.findByUserId(input.currentUserId)
      : null;

    const [items, totalItems] = await this.academyRepository.listPublicCourses({
      page: input.page,
      limit: input.limit,
      q: input.q?.trim() || undefined,
    });

    const statsByCourseId = await this.academyRepository.countEnrollmentsByCourseIds(
      items.map((item) => item.id),
    );

    return {
      items: items.map((item) =>
        this.academyPresenter.presentPublicCourseItem(
          item,
          statsByCourseId[item.id] ?? null,
          {
            resolvedCountryCode: patientProfile?.country?.isoCode ?? null,
          },
        ),
      ),
      pagination: this.academyPresenter.presentPagination({
        page: input.page,
        limit: input.limit,
        totalItems,
      }),
    };
  }
}
