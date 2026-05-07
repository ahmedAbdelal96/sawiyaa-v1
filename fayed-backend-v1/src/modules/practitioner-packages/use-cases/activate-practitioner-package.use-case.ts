import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PractitionerStatus, PractitionerPackageStatus } from '@prisma/client';
import { PractitionerPackagePresenter } from '../presenters/practitioner-package.presenter';
import { PractitionerPackageRepository } from '../repositories/practitioner-package.repository';
import { ValidatePractitionerPackageService } from '../services/validate-practitioner-package.service';

@Injectable()
export class ActivatePractitionerPackageUseCase {
  constructor(
    private readonly practitionerPackageRepository: PractitionerPackageRepository,
    private readonly validatePractitionerPackageService: ValidatePractitionerPackageService,
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

    if (profile.status !== PractitionerStatus.APPROVED) {
      throw new ConflictException({
        messageKey: 'packages.errors.practitionerNotApproved',
        error: 'PACKAGE_PRACTITIONER_NOT_APPROVED',
      });
    }

    if (profile.acceptsPackages !== true) {
      throw new ConflictException({
        messageKey: 'packages.errors.packagesNotAccepted',
        error: 'PRACTITIONER_PACKAGES_NOT_ACCEPTED',
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

    this.validatePractitionerPackageService.validateDraft({
      title: packageTemplate.title,
      sessionCount: packageTemplate.sessionCount,
      sessionDurationMinutes: packageTemplate.sessionDurationMinutes,
      sessionMode: packageTemplate.sessionMode,
      priceEgp: Number(packageTemplate.priceEgp),
      priceUsd: Number(packageTemplate.priceUsd),
      schedulePolicy: packageTemplate.schedulePolicy,
    });

    if (packageTemplate.status === PractitionerPackageStatus.ACTIVE) {
      return {
        item: this.practitionerPackagePresenter.toDetail(packageTemplate),
      };
    }

    const updated = await this.practitionerPackageRepository.updateById(
      packageTemplate.id,
      {
        status: PractitionerPackageStatus.ACTIVE,
        activatedAt: new Date(),
      },
    );

    return {
      item: this.practitionerPackagePresenter.toDetail(updated),
    };
  }
}
