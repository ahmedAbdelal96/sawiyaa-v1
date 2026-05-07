import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PractitionerPackageStatus } from '@prisma/client';
import { PractitionerPackagePresenter } from '../presenters/practitioner-package.presenter';
import { PractitionerPackageRepository } from '../repositories/practitioner-package.repository';

@Injectable()
export class DisablePractitionerPackageUseCase {
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

    if (packageTemplate.archivedAt) {
      throw new ConflictException({
        messageKey: 'packages.errors.packageArchived',
        error: 'PACKAGE_ARCHIVED',
      });
    }

    if (packageTemplate.status === PractitionerPackageStatus.DISABLED_BY_ADMIN) {
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

    const updated = await this.practitionerPackageRepository.disableById(
      packageTemplate.id,
      {
        statusBeforeAdminDisable: packageTemplate.status,
        status: PractitionerPackageStatus.DISABLED_BY_ADMIN,
        disabledAt: new Date(),
      },
    );

    return {
      item: {
        ...this.practitionerPackagePresenter.toDetail(updated),
        practitioner: {
          id: updated.practitioner.id,
          publicSlug: updated.practitioner.publicSlug,
          displayName: updated.practitioner.user.displayName ?? null,
          status: updated.practitioner.status,
          acceptsPackages: updated.practitioner.acceptsPackages,
          userStatus: updated.practitioner.user.status,
        },
        statusBeforeAdminDisable: updated.statusBeforeAdminDisable ?? null,
      },
    };
  }
}
