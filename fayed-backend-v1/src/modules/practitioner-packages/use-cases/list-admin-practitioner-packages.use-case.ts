import { Injectable } from '@nestjs/common';
import { ListAdminPractitionerPackagesDto } from '../dto/list-admin-practitioner-packages.dto';
import { PractitionerPackagePresenter } from '../presenters/practitioner-package.presenter';
import { PractitionerPackageRepository } from '../repositories/practitioner-package.repository';

@Injectable()
export class ListAdminPractitionerPackagesUseCase {
  constructor(
    private readonly practitionerPackageRepository: PractitionerPackageRepository,
    private readonly practitionerPackagePresenter: PractitionerPackagePresenter,
  ) {}

  async execute(input: { query: ListAdminPractitionerPackagesDto }) {
    const page = input.query.page ?? 1;
    const limit = input.query.limit ?? 20;
    const [items, totalItems] =
      await this.practitionerPackageRepository.listAdminPackages({
        page,
        limit,
        q: input.query.q,
        status: input.query.status,
      });

    return {
      items: items.map((item) => ({
        ...this.practitionerPackagePresenter.toListItem(item),
        practitioner: {
          id: item.practitioner.id,
          publicSlug: item.practitioner.publicSlug,
          displayName: item.practitioner.user.displayName ?? null,
          status: item.practitioner.status,
          acceptsPackages: item.practitioner.acceptsPackages,
          userStatus: item.practitioner.user.status,
        },
        statusBeforeAdminDisable: item.statusBeforeAdminDisable ?? null,
      })),
      pagination: {
        page,
        limit,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / limit)),
      },
    };
  }
}
