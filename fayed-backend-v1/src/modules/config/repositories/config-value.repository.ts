import { Injectable } from '@nestjs/common';
import { ConfigScopeType, Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { ConfigScopeMatch } from '../types/config-scope.types';

@Injectable()
export class ConfigValueRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActiveCandidates(
    configKeyId: string,
    scopes: ConfigScopeMatch[],
    at: Date,
  ) {
    const scopeFilters: Prisma.ConfigValueWhereInput[] = scopes.map((scope) =>
      scope.scopeType === ConfigScopeType.GLOBAL
        ? {
            scopeType: ConfigScopeType.GLOBAL,
            scopeRefId: null,
          }
        : {
            scopeType: scope.scopeType,
            scopeRefId: scope.scopeRefId,
          },
    );

    return this.prisma.configValue.findMany({
      where: {
        configKeyId,
        isActive: true,
        AND: [
          {
            OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: at } }],
          },
          {
            OR: [{ effectiveTo: null }, { effectiveTo: { gte: at } }],
          },
          {
            OR: scopeFilters,
          },
        ],
      },
      orderBy: [
        { priority: 'desc' },
        { updatedAt: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }
}
