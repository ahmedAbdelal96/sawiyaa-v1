import { Injectable, InternalServerErrorException } from '@nestjs/common';
import {
  ConfigCategory,
  ConfigChangeAction,
  ConfigDataType,
  ConfigKind,
  ConfigScopeType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { ConfigResolverService } from '@modules/config/services/config-resolver.service';

@Injectable()
export class PackagePolicyService {
  private readonly configKey = 'packages.practitioner.maxNonArchivedPackages';

  constructor(
    private readonly prisma: PrismaService,
    private readonly configResolverService: ConfigResolverService,
  ) {}

  async resolve(input?: { practitionerId?: string | null }) {
    const practitionerId = input?.practitionerId ?? null;
    const scopes = practitionerId
      ? [
          {
            scopeType: ConfigScopeType.PRACTITIONER,
            scopeRefId: practitionerId,
          },
          {
            scopeType: ConfigScopeType.GLOBAL,
          },
        ]
      : [
          {
            scopeType: ConfigScopeType.GLOBAL,
          },
        ];

    const [globalLimit, effectiveLimit] = await Promise.all([
      this.configResolverService.getNumber(this.configKey, {
        scopes: [
          {
            scopeType: ConfigScopeType.GLOBAL,
          },
        ],
      }),
      this.configResolverService.getNumber(this.configKey, {
        scopes,
      }),
    ]);

    if (globalLimit === null) {
      throw new InternalServerErrorException(
        'Package limit configuration is missing',
      );
    }

    return {
      globalMaxNonArchivedPackages: globalLimit,
      effectiveMaxNonArchivedPackages: effectiveLimit ?? globalLimit,
      practitionerId,
    };
  }

  async update(input: {
    maxNonArchivedPackages: number;
    practitionerId?: string | null;
    changedByUserId?: string | null;
  }) {
    const scopeType = input.practitionerId
      ? ConfigScopeType.PRACTITIONER
      : ConfigScopeType.GLOBAL;
    const scopeRefId = input.practitionerId ?? null;

    return this.prisma.$transaction(async (tx) => {
      const configKey = await tx.configKeyCatalog.findUnique({
        where: { key: this.configKey },
      });

      if (!configKey) {
        throw new Error(`Config key "${this.configKey}" was not found`);
      }

      const now = new Date();
      const existingActive = await tx.configValue.findFirst({
        where: {
          configKeyId: configKey.id,
          scopeType,
          scopeRefId,
          isActive: true,
        },
        orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
      });

      if (existingActive) {
        await tx.configValue.update({
          where: { id: existingActive.id },
          data: {
            isActive: false,
            effectiveTo: now,
          },
        });
      }

      const created = await tx.configValue.create({
        data: {
          configKeyId: configKey.id,
          scopeType,
          scopeRefId,
          valueNumber: new Prisma.Decimal(input.maxNonArchivedPackages),
          priority: existingActive ? existingActive.priority + 1 : 100,
          isActive: true,
          effectiveFrom: now,
          effectiveTo: null,
        },
      });

      await tx.configChangeLog.create({
        data: {
          configKeyId: configKey.id,
          configValueId: created.id,
          changedByUserId: input.changedByUserId ?? null,
          changeAction: existingActive
            ? ConfigChangeAction.UPDATED
            : ConfigChangeAction.CREATED,
          oldValueSnapshot: existingActive
            ? ({
                scopeType: existingActive.scopeType,
                scopeRefId: existingActive.scopeRefId,
                valueNumber: existingActive.valueNumber?.toString() ?? null,
                isActive: existingActive.isActive,
              } as Prisma.InputJsonValue)
            : undefined,
          newValueSnapshot: {
            scopeType,
            scopeRefId,
            valueNumber: created.valueNumber?.toString() ?? null,
            isActive: created.isActive,
          } as Prisma.InputJsonValue,
          reason: 'Updated practitioner package limit policy',
        },
      });

      return created;
    });
  }
}
