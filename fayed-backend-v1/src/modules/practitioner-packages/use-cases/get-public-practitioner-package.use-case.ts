import { Injectable, NotFoundException } from '@nestjs/common';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PublicPractitionerReadRepository } from '@modules/practitioners/repositories/public-practitioner-read.repository';
import { PublicPractitionerVisibilityPolicy } from '@modules/practitioners/policies/public-practitioner-visibility.policy';
import { PractitionerPackageRepository } from '../repositories/practitioner-package.repository';
import { PractitionerPackagePresenter } from '../presenters/practitioner-package.presenter';

@Injectable()
export class GetPublicPractitionerPackageUseCase {
  constructor(
    private readonly publicPractitionerReadRepository: PublicPractitionerReadRepository,
    private readonly publicPractitionerVisibilityPolicy: PublicPractitionerVisibilityPolicy,
    private readonly practitionerPackageRepository: PractitionerPackageRepository,
    private readonly practitionerPackagePresenter: PractitionerPackagePresenter,
  ) {}

  async execute(input: {
    practitionerSlug: string;
    packageSlug: string;
    locale: SupportedLocale;
  }) {
    const practitioner = await this.publicPractitionerReadRepository.findByPublicSlug(
      input.practitionerSlug,
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

    const packageTemplate =
      await this.practitionerPackageRepository.findPublicByPractitionerSlugAndPackageSlug(
        {
          practitionerSlug: input.practitionerSlug,
          packageSlug: input.packageSlug,
        },
      );

    if (!packageTemplate) {
      throw new NotFoundException({
        messageKey: 'packages.errors.packageNotFound',
        error: 'PACKAGE_NOT_FOUND',
      });
    }

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
        item: this.practitionerPackagePresenter.toDetail(packageTemplate),
      },
    };
  }
}
