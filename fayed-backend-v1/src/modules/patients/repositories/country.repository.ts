import { Injectable } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';

/**
 * Country lookups are kept tiny in this baseline.
 * Patients Module only needs country resolution by ISO code to store a valid country reference on the profile.
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
}
