import { Injectable } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';

/**
 * Language repository is read-only in this module and only used to validate language-code linkage.
 */
@Injectable()
export class LanguageRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActiveByCodes(codes: string[]) {
    return this.prisma.language.findMany({
      where: {
        code: {
          in: codes.map((code) => code.toLowerCase()),
        },
        isActive: true,
      },
      select: {
        id: true,
        code: true,
      },
    });
  }
}

