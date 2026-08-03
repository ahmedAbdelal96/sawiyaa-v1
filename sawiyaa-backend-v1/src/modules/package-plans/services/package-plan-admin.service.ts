import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigScopeType } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { CONFIG_KEYS } from '@modules/config/registry/config-key.constants';
import { ConfigurationManagementService } from '@modules/config/services/configuration-management.service';
import { ConfigRuntimeService } from '@modules/config/services/config-runtime.service';
import { UpdateConfigurationCommand } from '@modules/config/types/configuration-write.types';
import { findStandardPackagePlan } from '../package-plan.catalog';

@Injectable()
export class PackagePlanAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configurationManagementService: ConfigurationManagementService,
    private readonly configRuntimeService: ConfigRuntimeService,
  ) {}

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
    const [packagesEnabled, packagesPurchaseEnabled] = await Promise.all([
      this.configRuntimeService.getBoolean(CONFIG_KEYS.packages.enabled),
      this.configRuntimeService.getBoolean(
        CONFIG_KEYS.packages.purchaseEnabled,
      ),
    ]);

    if (packagesEnabled === null || packagesPurchaseEnabled === null) {
      throw new InternalServerErrorException({
        messageKey: 'packagePlans.errors.settingsUnavailable',
        error: 'PACKAGE_PLAN_SETTINGS_UNAVAILABLE',
      });
    }

    return { packagesEnabled, packagesPurchaseEnabled };
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

    const actor = input.changedByUserId
      ? {
          type: 'USER' as const,
          id: input.changedByUserId,
          permissions: ['configuration.edit.operational'] as const,
        }
      : {
          type: 'SYSTEM' as const,
          permissions: ['configuration.system.write'] as const,
        };
    const commands: UpdateConfigurationCommand[] = [];

    if (input.packagesEnabled !== undefined) {
      commands.push(
        await this.buildBooleanCommand({
          key: CONFIG_KEYS.packages.enabled,
          value: input.packagesEnabled,
          actor,
          reason: 'Updated package plan feature toggle',
        }),
      );
    }

    if (input.packagesPurchaseEnabled !== undefined) {
      commands.push(
        await this.buildBooleanCommand({
          key: CONFIG_KEYS.packages.purchaseEnabled,
          value: input.packagesPurchaseEnabled,
          actor,
          reason: 'Updated package purchase feature toggle',
        }),
      );
    }

    await this.configurationManagementService.updateMany(commands);
    return this.getSettings();
  }

  private assertManageableCode(code: string): void {
    if (!findStandardPackagePlan(code)) {
      throw new BadRequestException({
        messageKey: 'packagePlans.errors.invalidCode',
        error: 'PACKAGE_PLAN_INVALID_CODE',
      });
    }
  }

  private async buildBooleanCommand(input: {
    key:
      | typeof CONFIG_KEYS.packages.enabled
      | typeof CONFIG_KEYS.packages.purchaseEnabled;
    value: boolean;
    actor: UpdateConfigurationCommand['actor'];
    reason: string;
  }): Promise<UpdateConfigurationCommand> {
    const current = await this.configurationManagementService.getCurrentVersion(
      input.key,
      ConfigScopeType.GLOBAL,
      null,
    );

    return {
      key: input.key,
      value: input.value,
      scopeType: ConfigScopeType.GLOBAL,
      scopeRefId: null,
      actor: input.actor,
      actorType: input.actor.type,
      reason: input.reason,
      expectedUpdatedAt: current?.updatedAt,
    } as UpdateConfigurationCommand;
  }
}
