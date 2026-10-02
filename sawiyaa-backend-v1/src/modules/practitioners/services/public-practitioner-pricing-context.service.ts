import { Injectable } from '@nestjs/common';
import { resolvePaymentRegionalResolution } from '@common/payments/payment-region.resolver';

@Injectable()
export class PublicPractitionerPricingContextService {
  async resolve(input: {
    currentUserId?: string | null;
    guestCountryIsoCode?: string | null;
  }) {
    return resolvePaymentRegionalResolution({
      requestCountryIsoCode: input.guestCountryIsoCode ?? null,
    });
  }
}
