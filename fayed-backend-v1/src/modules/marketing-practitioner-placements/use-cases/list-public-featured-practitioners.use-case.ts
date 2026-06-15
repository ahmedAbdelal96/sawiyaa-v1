import { Injectable } from '@nestjs/common';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import {
  FeaturedPractitionerHomeCard,
  PractitionerMarketingPlacementRepository,
} from '../repositories/practitioner-marketing-placement.repository';

/** Maximum featured practitioners returned per request. */
const PUBLIC_FEATURED_LIMIT = 5;

@Injectable()
export class ListPublicFeaturedPractitionersUseCase {
  constructor(
    private readonly placementRepository: PractitionerMarketingPlacementRepository,
  ) {}

  async execute(input: { locale: SupportedLocale }): Promise<FeaturedPractitionerHomeCard[]> {
    return this.placementRepository.listActiveHomeFeaturedPractitioners({
      locale: input.locale,
      now: new Date(),
      limit: PUBLIC_FEATURED_LIMIT,
    });
  }
}