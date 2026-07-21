import { Injectable } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';

export type PractitionerCountryRecord = {
  id: string;
  isoCode: string;
  name: string;
  nativeName: string | null;
};

/**
 * Country lookups here are intentionally narrow: validate active country codes for profile updates.
 */
@Injectable()
export class CountryRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAllActive(): Promise<PractitionerCountryRecord[]> {
    return this.prisma.country.findMany({
      where: { isActive: true },
      select: {
        id: true,
        isoCode: true,
        name: true,
        nativeName: true,
      },
      orderBy: { name: 'asc' },
    });
  }

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
}
