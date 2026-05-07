import { Injectable, NotFoundException } from '@nestjs/common';
import { ListMyPractitionerPackagesDto } from '../dto/list-my-practitioner-packages.dto';
import { PractitionerPackagePresenter } from '../presenters/practitioner-package.presenter';
import { PackageLimitPolicy } from '../policies/package-limit.policy';
import { PractitionerPackageRepository } from '../repositories/practitioner-package.repository';

@Injectable()
export class ListMyPractitionerPackagesUseCase {
  constructor(
    private readonly practitionerPackageRepository: PractitionerPackageRepository,
    private readonly packageLimitPolicy: PackageLimitPolicy,
    private readonly practitionerPackagePresenter: PractitionerPackagePresenter,
  ) {}

  async execute(input: {
    userId: string;
    query: ListMyPractitionerPackagesDto;
  }) {
    const profile = await this.practitionerPackageRepository.findPractitionerProfileByUserId(
      input.userId,
    );

    if (!profile) {
      throw new NotFoundException({
        messageKey: 'packages.errors.practitionerProfileNotFound',
        error: 'PACKAGE_PRACTITIONER_PROFILE_NOT_FOUND',
      });
    }

    const page = input.query.page ?? 1;
    const limit = input.query.limit ?? 20;

    const [listResult, maxNonArchivedPackages] =
      await Promise.all([
        this.practitionerPackageRepository.listByPractitionerId({
          practitionerId: profile.id,
          page,
          limit,
        }),
        this.packageLimitPolicy.resolveMaxNonArchivedPackages(profile.id),
      ]);

    const [items, totalItems, currentNonArchivedPackages] = listResult;

    return this.practitionerPackagePresenter.toListResult({
      items,
      page,
      limit,
      totalItems,
      currentNonArchivedPackages,
      maxNonArchivedPackages,
    });
  }
}
