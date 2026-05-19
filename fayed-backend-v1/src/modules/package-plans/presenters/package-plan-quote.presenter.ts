import { Injectable } from '@nestjs/common';
import { PackagePlanViewModel } from '../types/package-plans.types';
import {
  PackagePlanQuotedItemViewModel,
  PackagePlanQuotedResultViewModel,
  PackagePlanQuoteViewModel,
} from '../types/package-plans.types';

@Injectable()
export class PackagePlanQuotePresenter {
  private toPublicQuote(
    quote: PackagePlanQuoteViewModel,
  ): PackagePlanQuoteViewModel {
    return {
      planCode: quote.planCode,
      sessionCount: quote.sessionCount,
      discountPercent: quote.discountPercent,
      practitionerId: quote.practitionerId,
      durationMinutes: quote.durationMinutes,
      sessionMode: quote.sessionMode,
      selectedCurrencyCode: quote.selectedCurrencyCode,
      regionalPricingMode: quote.regionalPricingMode,
      resolvedCountryIsoCode: quote.resolvedCountryIsoCode,
      provider: quote.provider,
      selectedBaseSessionPrice: quote.selectedBaseSessionPrice,
      undiscountedTotal: quote.undiscountedTotal,
      discountAmount: quote.discountAmount,
      patientPayableTotal: quote.patientPayableTotal,
    };
  }

  toItem(
    plan: PackagePlanViewModel,
    quote: PackagePlanQuoteViewModel,
    options?: { internalBreakdownVisible?: boolean },
  ): PackagePlanQuotedItemViewModel {
    const internalBreakdownVisible =
      options?.internalBreakdownVisible ?? quote.internalBreakdownVisible;

    return {
      item: plan,
      quote: internalBreakdownVisible ? quote : this.toPublicQuote(quote),
    };
  }

  toPublicQuotedItem(
    plan: PackagePlanViewModel,
    quote: PackagePlanQuoteViewModel,
  ): PackagePlanQuotedItemViewModel {
    return this.toItem(plan, quote, { internalBreakdownVisible: false });
  }

  toResult(
    plan: PackagePlanViewModel,
    quote: PackagePlanQuoteViewModel,
    options?: { internalBreakdownVisible?: boolean },
  ): PackagePlanQuotedResultViewModel {
    return {
      item: this.toItem(plan, quote, options),
    };
  }
}
