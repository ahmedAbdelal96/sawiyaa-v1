import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { AcademyPresenter } from '../presenters/academy.presenter';
import { AcademyRepository } from '../repositories/academy.repository';

@Injectable()
export class GetPublicAcademyEnrollmentUseCase {
  constructor(
    private readonly academyRepository: AcademyRepository,
    private readonly academyPresenter: AcademyPresenter,
  ) {}

  async execute(input: { enrollmentId: string; token: string }) {
    const enrollment = await this.academyRepository.findEnrollmentByIdForPublic(
      input.enrollmentId,
      input.token,
    );
    if (!enrollment) {
      throw new NotFoundException({
        messageKey: 'academy.errors.enrollmentNotFound',
        error: 'ACADEMY_ENROLLMENT_NOT_FOUND',
      });
    }

    return {
      item: this.academyPresenter.presentEnrollmentItem(enrollment),
    };
  }
}
