import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PractitionerPackageStatus } from '@prisma/client';
import { PractitionerPackagePresenter } from '../presenters/practitioner-package.presenter';
import { PractitionerPackageRepository } from '../repositories/practitioner-package.repository';

@Injectable()
export class PausePractitionerPackageUseCase {
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

    if (packageTemplate.archivedAt) {
      throw new ConflictException({
        messageKey: 'packages.errors.packageArchived',
        error: 'PACKAGE_ARCHIVED',
      });
    }

    if (packageTemplate.status === PractitionerPackageStatus.DISABLED_BY_ADMIN) {
      throw new ConflictException({
        messageKey: 'packages.errors.packageDisabledByAdmin',
        error: 'PACKAGE_DISABLED_BY_ADMIN',
      });
    }

    if (packageTemplate.status !== PractitionerPackageStatus.ACTIVE) {
      throw new ConflictException({
        messageKey: 'packages.errors.packageMustBeActiveToPause',
        error: 'PACKAGE_MUST_BE_ACTIVE_TO_PAUSE',
      });
    }

    const updated = await this.practitionerPackageRepository.updateById(
      packageTemplate.id,
      {
        status: PractitionerPackageStatus.PAUSED_BY_PRACTITIONER,
        pausedAt: new Date(),
      },
    );

    return {
      item: this.practitionerPackagePresenter.toDetail(updated),
    };
  }
}
