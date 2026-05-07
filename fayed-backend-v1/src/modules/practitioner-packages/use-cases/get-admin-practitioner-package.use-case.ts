import { Injectable, NotFoundException } from '@nestjs/common';
import { PractitionerPackagePresenter } from '../presenters/practitioner-package.presenter';
import { PractitionerPackageRepository } from '../repositories/practitioner-package.repository';

@Injectable()
export class GetAdminPractitionerPackageUseCase {
  constructor(
    private readonly practitionerPackageRepository: PractitionerPackageRepository,
    private readonly practitionerPackagePresenter: PractitionerPackagePresenter,
  ) {}

  async execute(input: { packageId: string }) {
    const packageTemplate =
      await this.practitionerPackageRepository.findAdminById(input.packageId);

    if (!packageTemplate) {
      throw new NotFoundException({
        messageKey: 'packages.errors.packageNotFound',
        error: 'PACKAGE_NOT_FOUND',
      });
    }

    return {
      item: {
        ...this.practitionerPackagePresenter.toDetail(packageTemplate),
        practitioner: {
          id: packageTemplate.practitioner.id,
          publicSlug: packageTemplate.practitioner.publicSlug,
          displayName: packageTemplate.practitioner.user.displayName ?? null,
          status: packageTemplate.practitioner.status,
          acceptsPackages: packageTemplate.practitioner.acceptsPackages,
          userStatus: packageTemplate.practitioner.user.status,
        },
        statusBeforeAdminDisable:
          packageTemplate.statusBeforeAdminDisable ?? null,
      },
    };
  }
}
