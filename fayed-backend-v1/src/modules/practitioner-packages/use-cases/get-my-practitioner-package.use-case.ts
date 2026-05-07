import { Injectable, NotFoundException } from '@nestjs/common';
import { PractitionerPackagePresenter } from '../presenters/practitioner-package.presenter';
import { PractitionerPackageRepository } from '../repositories/practitioner-package.repository';

@Injectable()
export class GetMyPractitionerPackageUseCase {
  constructor(
    private readonly practitionerPackageRepository: PractitionerPackageRepository,
    private readonly practitionerPackagePresenter: PractitionerPackagePresenter,
  ) {}

  async execute(input: { userId: string; packageId: string }) {
    const profile = await this.practitionerPackageRepository.findPractitionerProfileByUserId(
      input.userId,
    );

    if (!profile) {
      throw new NotFoundException({
        messageKey: 'packages.errors.practitionerProfileNotFound',
        error: 'PACKAGE_PRACTITIONER_PROFILE_NOT_FOUND',
      });
    }

    const packageTemplate =
      await this.practitionerPackageRepository.findByIdAndPractitionerId(
        input.packageId,
        profile.id,
      );

    if (!packageTemplate) {
      throw new NotFoundException({
        messageKey: 'packages.errors.packageNotFound',
        error: 'PACKAGE_NOT_FOUND',
      });
    }

    return {
      item: this.practitionerPackagePresenter.toDetail(packageTemplate),
    };
  }
}
