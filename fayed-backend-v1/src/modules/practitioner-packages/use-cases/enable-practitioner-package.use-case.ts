import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PractitionerPackageStatus,
  PractitionerStatus,
  UserStatus,
} from '@prisma/client';
import { PractitionerPackagePresenter } from '../presenters/practitioner-package.presenter';
import { PractitionerPackageRepository } from '../repositories/practitioner-package.repository';

@Injectable()
export class EnablePractitionerPackageUseCase {
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

    if (
      packageTemplate.status !== PractitionerPackageStatus.DISABLED_BY_ADMIN
    ) {
      throw new ConflictException({
        messageKey: 'packages.errors.packageMustBeDisabledByAdmin',
        error: 'PACKAGE_MUST_BE_DISABLED_BY_ADMIN',
      });
    }

    const restoreStatus = packageTemplate.statusBeforeAdminDisable;

    if (
      !restoreStatus ||
      restoreStatus === PractitionerPackageStatus.ARCHIVED
    ) {
      throw new ConflictException({
        messageKey: 'packages.errors.packageRestoreStatusMissing',
        error: 'PACKAGE_RESTORE_STATUS_MISSING',
      });
    }

    if (
      restoreStatus === PractitionerPackageStatus.ACTIVE &&
      (packageTemplate.practitioner.acceptsPackages !== true ||
        packageTemplate.practitioner.status !== PractitionerStatus.APPROVED ||
        packageTemplate.practitioner.user.status !== UserStatus.ACTIVE)
    ) {
      throw new ConflictException({
        messageKey: 'packages.errors.practitionerNotEligibleForActivation',
        error: 'PACKAGE_PRACTITIONER_NOT_ELIGIBLE_FOR_ACTIVATION',
      });
    }

    const updated = await this.practitionerPackageRepository.enableById(
      packageTemplate.id,
      {
        status: restoreStatus,
        disabledAt: null,
        disabledReason: null,
        statusBeforeAdminDisable: null,
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
