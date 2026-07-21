import { BadRequestException, Injectable } from '@nestjs/common';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { resolvePaymentRegionalResolution } from '@common/payments/payment-region.resolver';
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

  async execute(input: {
    locale: SupportedLocale;
    requestCountryIsoCode: string | null;
  }): Promise<FeaturedPractitionerHomeCard[]> {
    const pricing = resolvePaymentRegionalResolution({
      requestCountryIsoCode: input.requestCountryIsoCode,
    });
    return this.placementRepository.listActiveHomeFeaturedPractitioners({
      locale: input.locale,
      now: new Date(),
      limit: PUBLIC_FEATURED_LIMIT,
      currencyCode: pricing.currencyCode,
    });
  }
}
