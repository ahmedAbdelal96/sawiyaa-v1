import { Injectable } from '@nestjs/common';
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
        countryId: string | null;
        country: {
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
      };
    };
    couponCode?: string | null;
  }) {
    return this.calculateSessionFinancialBreakdownService.calculate({
      session: input.session,
      couponCode: input.couponCode ?? null,
    });
  }
}
