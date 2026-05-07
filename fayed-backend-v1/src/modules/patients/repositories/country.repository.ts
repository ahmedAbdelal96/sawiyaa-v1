import { Injectable } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';

/**
 * Country lookups are intentionally tiny and backend-owned.
 * The repository supports ISO resolution for profile writes and phone-prefix resolution for pricing/registration guards.
 */
@Injectable()
export class CountryRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByIsoCode(isoCode: string) {
    return this.prisma.country.findFirst({
      where: {
        isoCode: isoCode.toUpperCase(),
        isActive: true,
      },
      select: {
        id: true,
        isoCode: true,
      },
    });
  }

  async findByPhoneNumber(phoneNumber: string) {
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

  private normalizeDigits(value: string) {
    return value.replace(/\D/g, '');
  }
}
