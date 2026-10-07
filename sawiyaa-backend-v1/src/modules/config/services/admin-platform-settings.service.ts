import {
  BadRequestException,
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
import {
  ADMIN_SETTING_DOMAIN_DEFINITIONS,
  AdminPlatformSettingDomain,
  getAdminPlatformDomainDefinition,
  getAdminPlatformSettingMetadata,
} from '../registry/admin-platform-settings.metadata';
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
    query: {
      search?: string;
      category?: string;
      state?: string;
      domain?: AdminPlatformSettingDomain;
    },
    permissions: PermissionSet,
  ) {
    const definitions = CONFIG_DEFINITIONS.filter((definition) =>
      this.isVisible(definition),
    );
    const search = query.search?.trim().toLocaleLowerCase();
    const filtered = definitions.filter((definition) => {
      if (query.category && definition.category !== query.category)
        return false;
      if (
        query.domain &&
        getAdminPlatformSettingMetadata(definition).primaryDomain !==
          query.domain
      )
        return false;
      if (search) {
        const catalogAr =
          'displayNameAr' in definition.catalog
            ? `${definition.catalog.displayNameAr} ${'descriptionAr' in definition.catalog ? definition.catalog.descriptionAr : ''}`
            : '';
        const haystack =
          `${definition.key} ${definition.catalog.displayName} ${catalogAr} ${definition.description} ${definition.catalog.description}`.toLocaleLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });

    const allSettings = await Promise.all(
      definitions.map((definition) => this.toSetting(definition, permissions)),
    );
    const settings = (
      await Promise.all(
        filtered.map((definition) => this.toSetting(definition, permissions)),
      )
    ).filter((setting) => {
      if (query.state === 'editable') return setting.editable;
      if (query.state === 'readonly') return !setting.editable;
      if (query.state === 'changed') return setting.source === 'OVERRIDE';
      if (query.state === 'default') return setting.source !== 'OVERRIDE';
      return true;
    });
    const legacyDefinitions = CONFIG_DEFINITIONS.filter((definition) =>
      this.isLegacy(definition),
    );
    const legacySettings = await Promise.all(
      legacyDefinitions.map((definition) =>
        this.toSetting(definition, permissions),
      ),
    );
    const advancedDefinitions = CONFIG_DEFINITIONS.filter((definition) =>
      this.isAdvanced(definition),
    );
    const advancedSettings = permissions.includes(
      PermissionKey.CONFIGURATION_HISTORY_VIEW,
    )
      ? await Promise.all(
          advancedDefinitions.map((definition) =>
            this.toSetting(definition, permissions),
          ),
        )
      : [];
    return {
      categories: [...new Set(allSettings.map((setting) => setting.category))],
      settings,
      legacySettings,
      advancedSettings,
      domains: this.domainSummaries(allSettings),
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

  async changeSet(
    input: {
      changes: readonly {
        key: string;
        value?: unknown;
        reset?: boolean;
        expectedUpdatedAt?: string | null;
        scopeType?: ConfigScopeType;
        scopeRefId?: string | null;
      }[];
      reason: string;
      domain?: string;
    },
    actor: AuthenticatedUser,
    permissions: PermissionSet,
  ) {
    if (!input.reason.trim() || input.reason.length > 1000) {
      throw new BadRequestException({ error: 'CONFIG_REASON_INVALID' });
    }
    if (input.changes.length === 0) {
      throw new BadRequestException({ error: 'CONFIG_BATCH_EMPTY' });
    }

    const commands = input.changes.map((change) => {
      const definition = this.requireEditable(
        definitionFor(change.key),
        permissions,
      );
      const metadata = getAdminPlatformSettingMetadata(definition);
      if (input.domain && metadata.primaryDomain !== input.domain) {
        throw new BadRequestException({
          error: 'CONFIG_CHANGE_SET_DOMAIN_MISMATCH',
        });
      }
      const scopeType = change.scopeType ?? ConfigScopeType.GLOBAL;
      const scopeRefId =
        scopeType === ConfigScopeType.GLOBAL
          ? null
          : (change.scopeRefId ?? null);
      const common = {
        key: definition.key as never,
        scopeType,
        scopeRefId,
        actor: {
          type: 'USER' as const,
          id: actor.id,
          permissions: permissions as never,
        },
        actorType: 'USER' as const,
        reason: input.reason,
        expectedUpdatedAt: change.expectedUpdatedAt
          ? new Date(change.expectedUpdatedAt)
          : null,
      };
      if (change.reset) {
        return {
          kind: 'reset' as const,
          command: common,
        };
      }
      if (change.value === undefined) {
        throw new BadRequestException({
          error: 'CONFIG_CHANGE_SET_VALUE_REQUIRED',
        });
      }
      return {
        kind: 'update' as const,
        command: { ...common, value: change.value as never },
      };
    });

    const results = await this.management.changeSet(commands as never);
    const settings = await Promise.all(
      input.changes.map((change) =>
        this.toSetting(definitionFor(change.key)!, permissions),
      ),
    );
    return {
      domain: input.domain ?? null,
      results,
      settings,
      changedCount: results.filter((result) => result.changed).length,
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
    const labelAr =
      'displayNameAr' in definition.catalog
        ? definition.catalog.displayNameAr
        : definition.catalog.displayName;
    const descriptionAr =
      'descriptionAr' in definition.catalog
        ? definition.catalog.descriptionAr
        : definition.description;
    const metadata = getAdminPlatformSettingMetadata(definition);
    const isLegacySetting = definition.status === 'LEGACY';
    const environmentOwned =
      definition.owner === 'ENV_SECRET' ||
      definition.owner === 'ENV_INFRASTRUCTURE';
    const systemManaged = metadata.ownership === 'SYSTEM';
    const financial = definition.category === ConfigCategory.PAYMENT;
    const isEditable =
      definition.editable &&
      !financial &&
      !isLegacySetting &&
      !environmentOwned &&
      !systemManaged &&
      !metadata.managedByDedicatedControl &&
      permissions.includes(PermissionKey.CONFIGURATION_EDIT_OPERATIONAL);

    let readOnlyReason: string | undefined = undefined;
    if (environmentOwned) {
      readOnlyReason = 'ENVIRONMENT_MANAGED';
    } else if (isLegacySetting) {
      readOnlyReason = 'LEGACY_DEPRECATED';
    } else if (financial) {
      readOnlyReason = 'DEDICATED_PAYMENT_CONTROL';
    } else if (systemManaged) {
      readOnlyReason = 'SYSTEM_MANAGED';
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
      value: definition.sensitive || environmentOwned ? null : resolved.value,
      defaultValue:
        definition.sensitive || environmentOwned
          ? null
          : definition.defaultValue,
      source: resolved.source === 'database' ? 'OVERRIDE' : 'CATALOG_DEFAULT',
      effectiveSource: environmentOwned
        ? 'ENVIRONMENT'
        : isLegacySetting
          ? 'LEGACY'
          : metadata.managedByDedicatedControl
            ? 'DEDICATED_CONTROL'
            : systemManaged
              ? 'SYSTEM_MANAGED'
              : resolved.source === 'database'
                ? 'DATABASE_OVERRIDE'
                : resolved.source === 'catalog_default'
                  ? 'CATALOG_DEFAULT'
                  : 'MISSING',
      ownership: metadata.ownership,
      primaryDomain: metadata.primaryDomain,
      section: metadata.section,
      dedicatedRoute: metadata.dedicatedRoute ?? null,
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
      capabilities: {
        canView: permissions.includes(PermissionKey.CONFIGURATION_VIEW),
        canEdit: isEditable,
        canReset:
          isEditable &&
          resolved.source === 'database' &&
          !metadata.managedByDedicatedControl,
        canViewHistory: permissions.includes(
          PermissionKey.CONFIGURATION_HISTORY_VIEW,
        ),
        requiresConfirmation: definition.requiresConfirmation,
        requiresReason: definition.requiresReason,
        requiresStepUp: definition.requiresStepUp,
        managedByDedicatedControl: metadata.managedByDedicatedControl,
        advancedOnly: metadata.advancedOnly,
      },
    };
  }

  private domainSummaries(
    settings: readonly Awaited<
      ReturnType<AdminPlatformSettingsService['toSetting']>
    >[],
  ) {
    return ADMIN_SETTING_DOMAIN_DEFINITIONS.map((domain) => {
      const domainSettings = settings.filter(
        (setting) => setting.primaryDomain === domain.primaryDomain,
      );
      const ordinarySettings = domainSettings.filter(
        (setting) =>
          !setting.capabilities.advancedOnly &&
          !setting.capabilities.managedByDedicatedControl,
      );
      const attentionCount = domainSettings.filter(
        (setting) =>
          setting.effectiveSource === 'MISSING' || setting.status !== 'ACTIVE',
      ).length;
      const lastChange =
        domainSettings
          .map((setting) => setting.changedAt)
          .sort()
          .at(-1) ?? null;
      const dedicated =
        domain.primaryDomain === 'paymentsFinance' ||
        domain.primaryDomain === 'advanced';
      const canEdit = ordinarySettings.some(
        (setting) => setting.capabilities.canEdit,
      );

      return {
        ...domain,
        count: domainSettings.length,
        ordinaryCount: ordinarySettings.length,
        customizedCount: domainSettings.filter(
          (setting) => setting.effectiveSource === 'DATABASE_OVERRIDE',
        ).length,
        attentionCount,
        permissionState: dedicated
          ? 'MANAGED_ELSEWHERE'
          : canEdit
            ? 'EDITABLE'
            : 'VIEW_ONLY',
        lastChange,
        status:
          domain.primaryDomain === 'paymentsFinance'
            ? 'MANAGED_ELSEWHERE'
            : domain.primaryDomain === 'advanced'
              ? 'ADVANCED'
              : attentionCount > 0
                ? 'NEEDS_ATTENTION'
                : 'READY',
        dedicatedRoute:
          domain.dedicatedRoute ??
          getAdminPlatformDomainDefinition(domain.primaryDomain)
            .dedicatedRoute ??
          null,
      };
    });
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

  private isAdvanced(definition: ConfigDefinition) {
    const metadata = getAdminPlatformSettingMetadata(definition);
    return (
      metadata.advancedOnly ||
      definition.status === 'LEGACY' ||
      definition.owner === 'ENV_SECRET' ||
      definition.owner === 'ENV_INFRASTRUCTURE' ||
      definition.sensitive
    );
  }

  private requireVisible(
    definition: ConfigDefinition | undefined,
    permissions: PermissionSet,
  ) {
    if (
      !definition ||
      (!this.isVisible(definition) && !this.isLegacy(definition))
    )
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
    const metadata = getAdminPlatformSettingMetadata(value);
    if (metadata.ownership === 'SYSTEM') {
      throw new ForbiddenException({
        error: 'CONFIG_SYSTEM_MANAGED',
        message: 'This setting is managed by the system.',
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
