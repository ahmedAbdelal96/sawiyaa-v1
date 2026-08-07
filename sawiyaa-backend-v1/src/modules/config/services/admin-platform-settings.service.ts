import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigCategory, ConfigScopeType } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { PermissionKey } from '@common/enums/permission-key.enum';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { CONFIG_DEFINITIONS } from '../registry/config.definitions';
import { ConfigDefinition } from '../registry/config-definition.types';
import { ConfigRuntimeService } from './config-runtime.service';
import { ConfigurationManagementService } from './configuration-management.service';

type PermissionSet = readonly string[];

@Injectable()
export class AdminPlatformSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly runtime: ConfigRuntimeService,
    private readonly management: ConfigurationManagementService,
  ) {}

  async list(
    query: { search?: string; category?: string; state?: string },
    permissions: PermissionSet,
  ) {
    const definitions = CONFIG_DEFINITIONS.filter((definition) =>
      this.isVisible(definition),
    );
    const search = query.search?.trim().toLocaleLowerCase();
    const filtered = definitions.filter((definition) => {
      if (query.category && definition.category !== query.category)
        return false;
      if (search) {
        const catalogAr = 'displayNameAr' in definition.catalog
          ? `${definition.catalog.displayNameAr} ${'descriptionAr' in definition.catalog ? definition.catalog.descriptionAr : ''}`
          : '';
        const haystack =
          `${definition.key} ${definition.catalog.displayName} ${catalogAr} ${definition.description} ${definition.catalog.description}`.toLocaleLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });

    const settings = await Promise.all(
      filtered.map((definition) => this.toSetting(definition, permissions)),
    );
    const legacyDefinitions = CONFIG_DEFINITIONS.filter((definition) =>
      this.isLegacy(definition),
    );
    const legacySettings = await Promise.all(
      legacyDefinitions.map((definition) => this.toSetting(definition, permissions)),
    );
    return {
      categories: [...new Set(settings.map((setting) => setting.category))],
      settings: settings.filter((setting) => {
        if (query.state === 'editable') return setting.editable;
        if (query.state === 'readonly') return !setting.editable;
        if (query.state === 'changed') return setting.source === 'OVERRIDE';
        if (query.state === 'default') return setting.source !== 'OVERRIDE';
        return true;
      }),
      legacySettings,
    };
  }

  async update(
    key: string,
    input: {
      value: unknown;
      reason: string;
      expectedUpdatedAt?: string | null;
      scopeType?: ConfigScopeType;
      scopeRefId?: string | null;
    },
    actor: AuthenticatedUser,
    permissions: PermissionSet,
  ) {
    const definition = this.requireEditable(definitionFor(key), permissions);
    const scopeType = input.scopeType ?? ConfigScopeType.GLOBAL;
    const scopeRefId =
      scopeType === ConfigScopeType.GLOBAL ? null : (input.scopeRefId ?? null);
    const result = await this.management.update({
      key: definition.key as never,
      value: input.value as never,
      reason: input.reason,
      expectedUpdatedAt: input.expectedUpdatedAt
        ? new Date(input.expectedUpdatedAt)
        : null,
      scopeType,
      scopeRefId,
      actor: { type: 'USER', id: actor.id, permissions: permissions as never },
      actorType: 'USER',
    } as never);
    return {
      setting: await this.toSetting(definition, permissions),
      changeLogId: result.changeLogId,
    };
  }

  async reset(
    key: string,
    input: {
      reason: string;
      expectedUpdatedAt?: string | null;
      scopeType?: ConfigScopeType;
      scopeRefId?: string | null;
    },
    actor: AuthenticatedUser,
    permissions: PermissionSet,
  ) {
    const definition = this.requireEditable(definitionFor(key), permissions);
    if (definition.category === ConfigCategory.PAYMENT)
      throw this.financialFlowError();
    const scopeType = input.scopeType ?? ConfigScopeType.GLOBAL;
    const scopeRefId =
      scopeType === ConfigScopeType.GLOBAL ? null : (input.scopeRefId ?? null);
    const result = await this.management.reset({
      key: definition.key as never,
      reason: input.reason,
      expectedUpdatedAt: input.expectedUpdatedAt
        ? new Date(input.expectedUpdatedAt)
        : null,
      scopeType,
      scopeRefId,
      actor: { type: 'USER', id: actor.id, permissions: permissions as never },
      actorType: 'USER',
    });
    return {
      setting: await this.toSetting(definition, permissions),
      changeLogId: result.changeLogId,
    };
  }

  async history(
    key: string,
    page: number,
    limit: number,
    permissions: PermissionSet,
  ) {
    const definition = this.requireVisible(definitionFor(key), permissions);
    const where = { configKey: { key: definition.key } };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.configChangeLog.count({ where }),
      this.prisma.configChangeLog.findMany({
        where,
        orderBy: { changedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          changeAction: true,
          oldValueSnapshot: true,
          newValueSnapshot: true,
          reason: true,
          changedAt: true,
          configValueId: true,
          changedByUser: {
            select: {
              id: true,
              displayName: true,
              emails: {
                where: { isPrimary: true },
                select: { email: true },
                take: 1,
              },
            },
          },
        },
      }),
    ]);
    return {
      key: definition.key,
      items: rows,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  private async toSetting(
    definition: ConfigDefinition,
    permissions: PermissionSet,
  ) {
    const resolved = await this.runtime.resolveValue(definition.key as never, {
      scopes: [{ scopeType: ConfigScopeType.GLOBAL, scopeRefId: null }],
    });
    const catalog = await this.prisma.configKeyCatalog.findUnique({
      where: { key: definition.key },
      select: { id: true },
    });
    const current = catalog
      ? await this.prisma.configValue.findFirst({
          where: {
            configKeyId: catalog.id,
            scopeType: ConfigScopeType.GLOBAL,
            scopeRefId: null,
            isActive: true,
          },
          orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
          select: { id: true, updatedAt: true },
        })
      : null;
    const financial = definition.category === ConfigCategory.PAYMENT;
    const labelAr = 'displayNameAr' in definition.catalog
      ? definition.catalog.displayNameAr
      : definition.catalog.displayName;
    const descriptionAr = 'descriptionAr' in definition.catalog
      ? definition.catalog.descriptionAr
      : definition.description;
    const isLegacySetting = definition.status === 'LEGACY';
    const isEditable =
      definition.editable &&
      !financial &&
      !isLegacySetting &&
      permissions.includes(PermissionKey.CONFIGURATION_EDIT_OPERATIONAL);

    let readOnlyReason: string | undefined = undefined;
    if (isLegacySetting) {
      readOnlyReason = 'LEGACY_DEPRECATED';
    } else if (financial) {
      readOnlyReason = 'DEDICATED_PAYMENT_CONTROL';
    } else if (!definition.editable) {
      readOnlyReason = 'READ_ONLY_DEFINITION';
    }

    let effect = 'IMMEDIATE';
    if (financial) {
      effect = 'DEDICATED_CONTROL';
    } else if (
      definition.key === 'SESSION_REMINDER_OFFSETS_MINUTES' ||
      definition.key === 'SESSION_LATE_REMINDER_MINUTES_AFTER_START' ||
      definition.key === 'SESSION_JOIN_EARLY_MINUTES' ||
      definition.key === 'SESSION_JOIN_AFTER_END_GRACE_MINUTES'
    ) {
      effect = 'NEW_SESSIONS_ONLY';
    }

    return {
      key: definition.key,
      label: definition.catalog.displayName,
      labelAr,
      description: definition.description,
      descriptionAr,
      category: definition.category,
      domain: definition.domain,
      valueType: definition.valueType,
      value: definition.sensitive ? null : resolved.value,
      defaultValue: definition.sensitive ? null : definition.defaultValue,
      source: resolved.source === 'database' ? 'OVERRIDE' : 'CATALOG_DEFAULT',
      editable: isEditable,
      readOnlyReason,
      permission: financial
        ? PermissionKey.CONFIGURATION_EDIT_FINANCIAL
        : PermissionKey.CONFIGURATION_EDIT_OPERATIONAL,
      scope: definition.allowedScopes,
      minimum: definition.minimum,
      maximum: definition.maximum,
      enumOptions: definition.allowedValues ?? null,
      jsonSchemaId: definition.jsonSchemaId ?? null,
      valueId: current?.id ?? null,
      expectedUpdatedAt: current?.updatedAt.toISOString() ?? null,
      changedAt:
        current?.updatedAt.toISOString() ?? resolved.evaluatedAt.toISOString(),
      effect,
      status: definition.status,
      deprecatedReplacementKey: definition.deprecatedReplacementKey ?? null,
      deprecationReason: definition.deprecationReason ?? null,
      uiMetadata: definition.uiMetadata ?? null,
    };
  }

  private isVisible(definition: ConfigDefinition) {
    return (
      definition.adminVisible &&
      definition.owner === 'DATABASE_CONFIG' &&
      definition.status !== 'LEGACY' &&
      !definition.sensitive
    );
  }

  private isLegacy(definition: ConfigDefinition) {
    return (
      definition.adminVisible &&
      definition.owner === 'DATABASE_CONFIG' &&
      definition.status === 'LEGACY' &&
      !definition.sensitive
    );
  }

  private requireVisible(
    definition: ConfigDefinition | undefined,
    permissions: PermissionSet,
  ) {
    if (!definition || (!this.isVisible(definition) && !this.isLegacy(definition)))
      throw new NotFoundException({ error: 'CONFIG_SETTING_NOT_FOUND' });
    if (!permissions.includes(PermissionKey.CONFIGURATION_VIEW))
      throw new ForbiddenException({ error: 'CONFIGURATION_VIEW_REQUIRED' });
    return definition;
  }

  private requireEditable(
    definition: ConfigDefinition | undefined,
    permissions: PermissionSet,
  ) {
    const value = this.requireVisible(definition, permissions);
    if (value.category === ConfigCategory.PAYMENT)
      throw this.financialFlowError();
    if (value.status === 'LEGACY') {
      throw new ForbiddenException({
        error: 'CONFIG_LEGACY_DEPRECATED',
        message: 'Legacy settings are read-only.',
      });
    }
    if (!value.editable)
      throw new ForbiddenException({ error: 'CONFIG_NOT_EDITABLE' });
    if (!permissions.includes(PermissionKey.CONFIGURATION_EDIT_OPERATIONAL))
      throw new ForbiddenException({
        error: 'CONFIGURATION_EDIT_OPERATIONAL_REQUIRED',
      });
    return value;
  }

  private financialFlowError() {
    return new ForbiddenException({
      error: 'CONFIG_FINANCIAL_DEDICATED_FLOW_REQUIRED',
      message:
        'Use the dedicated Payment Gateway Control workflow for financial settings.',
    });
  }
}

function definitionFor(key: string) {
  return CONFIG_DEFINITIONS.find((definition) => definition.key === key);
}
