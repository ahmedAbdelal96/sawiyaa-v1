import { Injectable } from '@nestjs/common';
import { PaymentProvider } from '@prisma/client';
import { CalculateSessionFinancialBreakdownService } from '@modules/financial-rules/services/calculate-session-financial-breakdown.service';

/**
 * Payments keep collection concerns only. Financial breakdown resolution now
 * delegates to the dedicated financial rules layer so commissions and coupons
 * are not reimplemented here.
 */
@Injectable()
export class ResolveSessionPaymentPricingService {
  constructor(
    private readonly calculateSessionFinancialBreakdownService: CalculateSessionFinancialBreakdownService,
  ) {}

  resolve(input: {
    requestCountryIsoCode?: string | null;
    session: {
      id: string;
      flowType: 'SCHEDULED' | 'INSTANT';
      sessionMode: 'VIDEO' | 'AUDIO' | 'CHAT';
      durationMinutes: number;
      practitioner: {
        id: string;
        publicSlug: string;
        sessionPrice30: { toString(): string } | null;
        sessionPrice60: { toString(): string } | null;
        sessionPrice30Egp: { toString(): string } | null;
        sessionPrice30Usd: { toString(): string } | null;
        sessionPrice60Egp: { toString(): string } | null;
        sessionPrice60Usd: { toString(): string } | null;
        instantBookingPrice30Egp: { toString(): string } | null;
        instantBookingPrice30Usd: { toString(): string } | null;
        instantBookingPrice60Egp: { toString(): string } | null;
        instantBookingPrice60Usd: { toString(): string } | null;
        countryId: string | null;
        country: {
          isoCode?: string | null;
          currencyCode: string | null;
        } | null;
        specialties: Array<{
          specialtyId: string;
          isPrimary: boolean;
        }>;
      };
      patient: {
        id: string;
        countryId: string | null;
        country: {
          isoCode?: string | null;
          currencyCode?: string | null;
        } | null;
      };
      payments?: Array<{
        amountSubtotal: { toString(): string } | string;
        amountDiscount: { toString(): string } | string;
        amountTotal: { toString(): string } | string;
        currencyCode: string;
        provider: PaymentProvider;
      }>;
      instantBookingRequest?: {
        metadataJson?: unknown | null;
      } | null;
    };
    couponCode?: string | null;
  }) {
    return this.calculateSessionFinancialBreakdownService.calculate({
      session: input.session,
      requestCountryIsoCode: input.requestCountryIsoCode,
      couponCode: input.couponCode ?? null,
    });
  }
}
