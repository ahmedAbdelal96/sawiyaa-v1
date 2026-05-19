import { Injectable } from '@nestjs/common';
import { MarketType, PaymentProvider } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

export type PaymentCountrySource = 'ACCOUNT' | 'PHONE' | 'DECLARED' | 'SYSTEM';

export type PaymentCountryResolution = {
  declaredCountryCode: string | null;
  resolvedCountryCode: string | null;
  countrySource: PaymentCountrySource;
  countryMismatch: boolean;
  phoneCountryCode: string | null;
};

export type PaymentCountrySnapshot = {
  declaredCountryCode: string | null;
  resolvedCountryCode: string | null;
  countrySource: PaymentCountrySource;
  countryMismatch: boolean;
  phoneCountryCode: string | null;
  operatingCountryCode: string | null;
  checkoutCountryCode: string | null;
  pricingCurrencyCode: string | null;
  pricingMarketType: MarketType | null;
  provider: PaymentProvider | null;
};

@Injectable()
export class PaymentGeoContextService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveCountryByPhoneNumber(phoneNumber: string) {
    const normalizedPhoneDigits = this.normalizeDigits(phoneNumber);
    if (!normalizedPhoneDigits) {
      return null;
    }

    const countries = await this.prisma.country.findMany({
      where: {
        isActive: true,
        phoneCode: {
          not: null,
        },
      },
      select: {
        id: true,
        isoCode: true,
        phoneCode: true,
      },
    });

    const match = countries
      .map((country) => ({
        id: country.id,
        isoCode: country.isoCode,
        phoneCodeDigits: this.normalizeDigits(country.phoneCode ?? ''),
      }))
      .filter(
        (country) =>
          country.phoneCodeDigits.length > 0 &&
          normalizedPhoneDigits.startsWith(country.phoneCodeDigits),
      )
      .sort(
        (left, right) =>
          right.phoneCodeDigits.length - left.phoneCodeDigits.length,
      )[0];

    if (!match) {
      return null;
    }

    return {
      id: match.id,
      isoCode: match.isoCode,
    };
  }

  async resolveCountryResolution(input: {
    phoneNumber: string;
    declaredCountryCode?: string | null;
    existingCountryCode?: string | null;
  }): Promise<PaymentCountryResolution> {
    const declaredCountryCode = this.normalizeIsoCode(
      input.declaredCountryCode,
    );
    const existingCountryCode = this.normalizeIsoCode(
      input.existingCountryCode,
    );

    const [phoneCountry, declaredCountry, existingCountry] = await Promise.all([
      this.resolveCountryByPhoneNumber(input.phoneNumber),
      declaredCountryCode
        ? this.prisma.country.findFirst({
            where: {
              isoCode: declaredCountryCode,
              isActive: true,
            },
            select: { id: true, isoCode: true },
          })
        : Promise.resolve(null),
      existingCountryCode
        ? this.prisma.country.findFirst({
            where: {
              isoCode: existingCountryCode,
              isActive: true,
            },
            select: { id: true, isoCode: true },
          })
        : Promise.resolve(null),
    ]);

    const resolvedCountryCode =
      existingCountry?.isoCode ??
      phoneCountry?.isoCode ??
      declaredCountry?.isoCode ??
      null;
    const countrySource: PaymentCountrySource = existingCountry
      ? 'ACCOUNT'
      : phoneCountry
        ? 'PHONE'
        : declaredCountry
          ? 'DECLARED'
          : 'SYSTEM';

    return {
      declaredCountryCode,
      resolvedCountryCode,
      countrySource,
      countryMismatch:
        declaredCountryCode !== null &&
        resolvedCountryCode !== null &&
        declaredCountryCode !== resolvedCountryCode,
      phoneCountryCode: phoneCountry?.isoCode ?? null,
    };
  }

  buildCountrySnapshot(input: PaymentCountrySnapshot) {
    return {
      declaredCountryCode: input.declaredCountryCode,
      resolvedCountryCode: input.resolvedCountryCode,
      countrySource: input.countrySource,
      countryMismatch: input.countryMismatch,
      phoneCountryCode: input.phoneCountryCode,
      operatingCountryCode: input.operatingCountryCode,
      checkoutCountryCode: input.checkoutCountryCode,
      pricingCurrencyCode: input.pricingCurrencyCode,
      pricingMarketType: input.pricingMarketType,
      provider: input.provider,
    };
  }

  private normalizeIsoCode(countryCode?: string | null) {
    const normalized = countryCode?.trim().toUpperCase() ?? null;
    return normalized && normalized.length > 0 ? normalized : null;
  }

  private normalizeDigits(value: string) {
    return value.replace(/\D/g, '');
  }
}
