import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigChangeAction, ConfigScopeType, Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { findStandardPackagePlan } from '../package-plan.catalog';

@Injectable()
export class PackagePlanAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async updatePlan(input: {
    code: string;
    title?: string;
    description?: string | null;
    sortOrder?: number;
    isActive?: boolean;
    changedByUserId?: string | null;
  }) {
    const code = input.code.trim().toUpperCase();
    this.assertManageableCode(code);

    if (
      input.title === undefined &&
      input.description === undefined &&
      input.sortOrder === undefined &&
      input.isActive === undefined
    ) {
      throw new BadRequestException({
        messageKey: 'packagePlans.errors.emptyUpdate',
        error: 'PACKAGE_PLAN_EMPTY_UPDATE',
      });
    }

    const plan = await this.prisma.packagePlan.findUnique({
      where: { code },
    });

    if (!plan) {
      throw new NotFoundException({
        messageKey: 'packagePlans.errors.notFound',
        error: 'PACKAGE_PLAN_NOT_FOUND',
      });
    }

    return this.prisma.packagePlan.update({
      where: { code },
      data: {
        ...(input.title === undefined ? {} : { title: input.title }),
        ...(input.description === undefined
          ? {}
          : { description: input.description }),
        ...(input.sortOrder === undefined
          ? {}
          : { sortOrder: input.sortOrder }),
        ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
      },
      include: {
        _count: {
          select: {
            purchases: true,
          },
        },
      },
    });
  }

  async getSettings() {
    return this.readSettingsFromClient(this.prisma);
  }

  async updateSettings(input: {
    packagesEnabled?: boolean;
    packagesPurchaseEnabled?: boolean;
    changedByUserId?: string | null;
  }) {
    if (
      input.packagesEnabled === undefined &&
      input.packagesPurchaseEnabled === undefined
    ) {
      throw new BadRequestException({
        messageKey: 'packagePlans.errors.emptySettingsUpdate',
        error: 'PACKAGE_PLAN_SETTINGS_EMPTY_UPDATE',
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const tasks: Array<Promise<unknown>> = [];

      if (input.packagesEnabled !== undefined) {
        tasks.push(
          this.upsertGlobalBooleanConfigValue(tx, {
            key: 'packages.enabled',
            value: input.packagesEnabled,
            changedByUserId: input.changedByUserId ?? null,
            reason: 'Updated package plan feature toggle',
          }),
        );
      }

      if (input.packagesPurchaseEnabled !== undefined) {
        tasks.push(
          this.upsertGlobalBooleanConfigValue(tx, {
            key: 'packages.purchaseEnabled',
            value: input.packagesPurchaseEnabled,
            changedByUserId: input.changedByUserId ?? null,
            reason: 'Updated package purchase feature toggle',
          }),
        );
      }

      await Promise.all(tasks);

      return this.readSettingsFromClient(tx);
    });
  }

  private assertManageableCode(code: string): void {
    if (!findStandardPackagePlan(code)) {
      throw new BadRequestException({
        messageKey: 'packagePlans.errors.invalidCode',
        error: 'PACKAGE_PLAN_INVALID_CODE',
      });
    }
  }

  private async upsertGlobalBooleanConfigValue(
    tx: Prisma.TransactionClient,
    input: {
      key: string;
      value: boolean;
      changedByUserId: string | null;
      reason: string;
    },
  ) {
    const configKey = await tx.configKeyCatalog.findUnique({
      where: { key: input.key },
    });

    if (!configKey) {
      throw new InternalServerErrorException(
        `Config key "${input.key}" was not found`,
      );
    }

    const now = new Date();
    const existingActive = await tx.configValue.findFirst({
      where: {
        configKeyId: configKey.id,
        scopeType: ConfigScopeType.GLOBAL,
        scopeRefId: null,
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
        scopeType: ConfigScopeType.GLOBAL,
        scopeRefId: null,
        valueBoolean: input.value,
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
        changedByUserId: input.changedByUserId,
        changeAction: existingActive
          ? ConfigChangeAction.UPDATED
          : ConfigChangeAction.CREATED,
        oldValueSnapshot: existingActive
          ? ({
              scopeType: existingActive.scopeType,
              scopeRefId: existingActive.scopeRefId,
              valueBoolean: existingActive.valueBoolean,
              isActive: existingActive.isActive,
            } as Prisma.InputJsonValue)
          : undefined,
        newValueSnapshot: {
          scopeType: ConfigScopeType.GLOBAL,
          scopeRefId: null,
          valueBoolean: created.valueBoolean,
          isActive: created.isActive,
        } as Prisma.InputJsonValue,
        reason: input.reason,
      },
    });

    return created;
  }

  private async readSettingsFromClient(
    client: PrismaService | Prisma.TransactionClient,
  ): Promise<{
    packagesEnabled: boolean;
    packagesPurchaseEnabled: boolean;
  }> {
    const [packagesEnabled, packagesPurchaseEnabled] = await Promise.all([
      this.resolveBooleanSetting(client, 'packages.enabled'),
      this.resolveBooleanSetting(client, 'packages.purchaseEnabled'),
    ]);

    if (packagesEnabled === null || packagesPurchaseEnabled === null) {
      throw new InternalServerErrorException({
        messageKey: 'packagePlans.errors.settingsUnavailable',
        error: 'PACKAGE_PLAN_SETTINGS_UNAVAILABLE',
      });
    }

    return {
      packagesEnabled,
      packagesPurchaseEnabled,
    };
  }

  private async resolveBooleanSetting(
    client: PrismaService | Prisma.TransactionClient,
    key: string,
  ): Promise<boolean | null> {
    const configKey = await client.configKeyCatalog.findUnique({
      where: { key },
    });

    if (!configKey) {
      throw new InternalServerErrorException(
        `Config key "${key}" was not found`,
      );
    }

    const active = await client.configValue.findFirst({
      where: {
        configKeyId: configKey.id,
        scopeType: ConfigScopeType.GLOBAL,
        scopeRefId: null,
        isActive: true,
      },
      orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
      select: {
        valueBoolean: true,
      },
    });

    return active?.valueBoolean ?? null;
  }
}
