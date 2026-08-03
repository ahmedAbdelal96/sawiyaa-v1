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
        const haystack =
          `${definition.key} ${definition.catalog.displayName} ${definition.description} ${definition.catalog.description}`.toLocaleLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });

    const settings = await Promise.all(
      filtered.map((definition) => this.toSetting(definition, permissions)),
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
    return {
      key: definition.key,
      label: definition.catalog.displayName,
      description: definition.description,
      category: definition.category,
      domain: definition.domain,
      valueType: definition.valueType,
      value: definition.sensitive ? null : resolved.value,
      defaultValue: definition.sensitive ? null : definition.defaultValue,
      source: resolved.source === 'database' ? 'OVERRIDE' : 'CATALOG_DEFAULT',
      editable:
        definition.editable &&
        !financial &&
        permissions.includes(PermissionKey.CONFIGURATION_EDIT_OPERATIONAL),
      readOnlyReason: financial
        ? 'DEDICATED_PAYMENT_CONTROL'
        : definition.editable
          ? undefined
          : 'READ_ONLY_DEFINITION',
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
      effect: financial ? 'DEDICATED_CONTROL' : 'IMMEDIATE',
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
  private requireVisible(
    definition: ConfigDefinition | undefined,
    permissions: PermissionSet,
  ) {
    if (!definition || !this.isVisible(definition))
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
