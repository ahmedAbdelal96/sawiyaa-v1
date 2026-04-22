import { Injectable } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';

/**
 * Country lookups here are intentionally narrow: validate active country codes for profile updates.
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
