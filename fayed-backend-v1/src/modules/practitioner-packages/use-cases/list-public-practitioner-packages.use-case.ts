import { Injectable, NotFoundException } from '@nestjs/common';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PublicPractitionerReadRepository } from '@modules/practitioners/repositories/public-practitioner-read.repository';
import { PublicPractitionerVisibilityPolicy } from '@modules/practitioners/policies/public-practitioner-visibility.policy';
import { ListPublicPractitionerPackagesDto } from '../dto/list-public-practitioner-packages.dto';
import { PractitionerPackageRepository } from '../repositories/practitioner-package.repository';
import { PractitionerPackagePresenter } from '../presenters/practitioner-package.presenter';

@Injectable()
export class ListPublicPractitionerPackagesUseCase {
  constructor(
    private readonly publicPractitionerReadRepository: PublicPractitionerReadRepository,
    private readonly publicPractitionerVisibilityPolicy: PublicPractitionerVisibilityPolicy,
    private readonly practitionerPackageRepository: PractitionerPackageRepository,
    private readonly practitionerPackagePresenter: PractitionerPackagePresenter,
  ) {}

  async execute(input: {
    slug: string;
    locale: SupportedLocale;
    query?: ListPublicPractitionerPackagesDto;
  }) {
    const practitioner =
      await this.publicPractitionerReadRepository.findByPublicSlug(
        input.slug,
        input.locale,
      );

    if (!practitioner) {
      throw new NotFoundException({
        messageKey: 'practitioners.errors.publicProfileNotFound',
        error: 'PUBLIC_PRACTITIONER_NOT_FOUND',
      });
    }

    const visibility = this.publicPractitionerVisibilityPolicy.evaluate({
      practitionerStatus: practitioner.status,
      userStatus: practitioner.user.status,
      isPublicProfilePublished: practitioner.isPublicProfilePublished,
      hasPublicSlug: Boolean(practitioner.publicSlug?.trim()),
      hasDisplayName: Boolean(practitioner.user.displayName?.trim()),
      hasProfessionalTitle: Boolean(practitioner.professionalTitle?.trim()),
      hasBio: Boolean(practitioner.bio?.trim()),
      hasAtLeastOneActiveSpecialty: practitioner.specialties.length > 0,
    });

    if (!visibility.isVisible || practitioner.acceptsPackages !== true) {
      throw new NotFoundException({
        messageKey: 'practitioners.errors.publicProfileNotFound',
        error: 'PUBLIC_PRACTITIONER_NOT_VISIBLE',
      });
    }

    const page = input.query?.page ?? 1;
    const limit = input.query?.limit ?? 20;
    const [packages, totalItems] =
      await this.practitionerPackageRepository.listPublicActiveByPractitionerId(
        {
          practitionerId: practitioner.id,
          page,
          limit,
        },
      );

    return {
      item: {
        practitioner: {
          id: practitioner.id,
          publicSlug: practitioner.publicSlug,
          displayName: practitioner.user.displayName ?? null,
          status: practitioner.status,
          acceptsPackages: practitioner.acceptsPackages,
          userStatus: practitioner.user.status,
        },
        items: packages.map((item) =>
          this.practitionerPackagePresenter.toListItem(item),
        ),
        pagination: {
          page,
          limit,
          totalItems,
          totalPages: Math.max(1, Math.ceil(totalItems / limit)),
        },
      },
    };
  }
}
