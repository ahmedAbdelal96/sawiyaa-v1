import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  ConfigChangeAction,
  ConfigDataType,
  ConfigScopeType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { CONFIG_KEY_LIST, ConfigKey } from '../registry/config-key.constants';
import { ConfigDefinition } from '../registry/config-definition.types';
import { validateConfigJsonValue } from '../registry/config-json-schema.registry';
import { getConfigDefinition } from '../registry/config.registry';
import { ConfigurationAuthorizationService } from './configuration-authorization.service';
import {
  ConfigurationCurrentVersion,
  ConfigurationChangeSetCommand,
  ConfigurationChangeSetResult,
  ConfigurationResetResult,
  ConfigurationWriteResult,
  ConfigurationWriteValueView,
  ResetConfigurationCommand,
  UpdateConfigurationCommand,
} from '../types/configuration-write.types';

type ConfigValueRecord = {
  readonly id: string;
  readonly updatedAt: Date;
  readonly priority: number;
  readonly scopeType: ConfigScopeType;
  readonly scopeRefId: string | null;
  readonly valueString: string | null;
  readonly valueNumber: Prisma.Decimal | null;
  readonly valueBoolean: boolean | null;
  readonly valueJson: Prisma.JsonValue | null;
};

@Injectable()
export class ConfigurationManagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: ConfigurationAuthorizationService,
  ) {}

  async update(
    command: UpdateConfigurationCommand,
  ): Promise<ConfigurationWriteResult> {
    const [result] = await this.updateMany([command]);
    return result;
  }

  async updateMany(
    commands: readonly UpdateConfigurationCommand[],
  ): Promise<ConfigurationWriteResult[]> {
    return this.updateManyWithTransaction(commands, (_tx, results) => [
      ...results,
    ]);
  }

  async changeSet(
    commands: readonly ConfigurationChangeSetCommand[],
  ): Promise<ConfigurationChangeSetResult[]> {
    if (commands.length === 0) {
      throw new BadRequestException({
        error: 'CONFIG_BATCH_EMPTY',
        message: 'At least one configuration change is required.',
      });
    }

    const seen = new Set<string>();
    const prepared = commands.map((request) => {
      const command = request.command;
      const identity = `${command.key}:${command.scopeType}:${command.scopeRefId ?? ''}`;
      if (seen.has(identity)) {
        throw new BadRequestException({
          error: 'CONFIG_BATCH_DUPLICATE_KEY',
          message: `Configuration key "${command.key}" appears more than once in the batch.`,
        });
      }
      seen.add(identity);

      const definition = this.resolveDefinition(command.key);
      if (request.kind === 'update') {
        this.validateCommand(request.command, definition);
      } else {
        this.validateResetCommand(request.command, definition);
      }
      this.authorizationService.assertCanWrite(
        command.actor,
        command.actorType,
        definition,
      );
      return { request, definition };
    });

    this.validateChangedValues(
      prepared
        .filter(
          (
            item,
          ): item is {
            request: Extract<ConfigurationChangeSetCommand, { kind: 'update' }>;
            definition: ConfigDefinition;
          } => item.request.kind === 'update',
        )
        .map(({ request }) => [request.command.key, request.command.value]),
    );

    return this.prisma.$transaction(
      async (tx) => {
        type Entry = (typeof prepared)[number] & {
          configKey: {
            id: string;
            dataType: ConfigDataType;
            defaultValueJson: Prisma.JsonValue;
          };
          current: ConfigValueRecord | null;
        };
        const entries: Entry[] = [];

        for (const item of prepared) {
          const configKey = await tx.configKeyCatalog.findUnique({
            where: { key: item.request.command.key },
          });
          if (!configKey) {
            throw new NotFoundException({
              error: 'CONFIG_CATALOG_ENTRY_NOT_FOUND',
              message: `Configuration catalog entry "${item.request.command.key}" was not found.`,
            });
          }
          if (
            item.request.kind === 'update' &&
            configKey.dataType !==
              this.toConfigDataType(item.definition.valueType)
          ) {
            throw new InternalServerErrorException({
              error: 'CONFIG_CATALOG_TYPE_MISMATCH',
              message: `Configuration catalog entry "${item.request.command.key}" is incompatible with the registry.`,
            });
          }
          const current = await tx.configValue.findFirst({
            where: {
              configKeyId: configKey.id,
              scopeType: item.request.command.scopeType,
              scopeRefId: item.request.command.scopeRefId,
              isActive: true,
            },
            orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
          });
          this.assertExpectedVersion(
            current,
            item.request.command.expectedUpdatedAt,
          );
          entries.push({
            ...item,
            configKey: {
              id: configKey.id,
              dataType: configKey.dataType,
              defaultValueJson: configKey.defaultValueJson,
            },
            current,
          });
        }

        const projected = new Map<string, unknown>();
        for (const entry of entries) {
          const currentValue = entry.current
            ? this.extractValue(entry.current, entry.configKey.dataType)
            : entry.configKey.defaultValueJson;
          projected.set(entry.request.command.key, currentValue);
          if (entry.request.kind === 'update') {
            projected.set(
              entry.request.command.key,
              entry.request.command.value,
            );
          } else {
            projected.set(
              entry.request.command.key,
              entry.configKey.defaultValueJson,
            );
          }
        }
        const relatedFileLimitKeys = [
          'file.uploads.chat.maxCombinedBytes',
          'file.uploads.chat.maxImageBytes',
          'file.uploads.chat.maxDocumentBytes',
        ];
        if (relatedFileLimitKeys.some((key) => projected.has(key))) {
          const scope = entries[0].request.command;
          for (const key of relatedFileLimitKeys) {
            if (projected.has(key)) continue;
            const relatedCatalog = await tx.configKeyCatalog.findUnique({
              where: { key },
            });
            if (!relatedCatalog) continue;
            const relatedCurrent = await tx.configValue.findFirst({
              where: {
                configKeyId: relatedCatalog.id,
                scopeType: scope.scopeType,
                scopeRefId: scope.scopeRefId,
                isActive: true,
              },
              orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
            });
            projected.set(
              key,
              relatedCurrent
                ? this.extractValue(relatedCurrent, relatedCatalog.dataType)
                : relatedCatalog.defaultValueJson,
            );
          }
        }
        this.validateProjectedChangeSet(projected);

        const results: ConfigurationChangeSetResult[] = [];
        for (const entry of entries) {
          const command = entry.request.command;
          const currentValue = entry.current
            ? this.extractValue(entry.current, entry.configKey.dataType)
            : entry.configKey.defaultValueJson;
          const nextValue =
            entry.request.kind === 'update'
              ? entry.request.command.value
              : entry.configKey.defaultValueJson;

          if (this.valuesEqual(currentValue, nextValue)) {
            results.push({
              key: command.key,
              kind: entry.request.kind,
              changed: false,
              value: this.redactValue(entry.definition, currentValue),
              valueId: entry.current?.id ?? null,
              previousValueId: null,
              updatedAt: entry.current?.updatedAt ?? null,
              changeLogId: null,
            });
            continue;
          }

          if (entry.request.kind === 'reset') {
            if (!entry.current) {
              results.push({
                key: command.key,
                kind: 'reset',
                changed: false,
                value: this.redactValue(entry.definition, nextValue),
                valueId: null,
                previousValueId: null,
                updatedAt: null,
                changeLogId: null,
              });
              continue;
            }
            const now = new Date();
            await tx.configValue.update({
              where: { id: entry.current.id },
              data: { isActive: false, effectiveTo: now },
            });
            const changeLog = await tx.configChangeLog.create({
              data: {
                configKeyId: entry.configKey.id,
                configValueId: entry.current.id,
                changedByUserId: command.actor.id ?? null,
                changeAction: ConfigChangeAction.OVERRIDE_REMOVED,
                oldValueSnapshot: this.buildAuditSnapshot(
                  entry.definition,
                  currentValue,
                  command,
                  false,
                ),
                newValueSnapshot: this.buildAuditSnapshot(
                  entry.definition,
                  nextValue,
                  command,
                  true,
                ),
                reason: command.reason,
              },
            });
            results.push({
              key: command.key,
              kind: 'reset',
              changed: true,
              value: this.redactValue(entry.definition, nextValue),
              valueId: entry.current.id,
              previousValueId: entry.current.id,
              updatedAt: now,
              changeLogId: changeLog.id,
            });
            continue;
          }

          const now = new Date();
          if (entry.current) {
            await tx.configValue.update({
              where: { id: entry.current.id },
              data: { isActive: false, effectiveTo: now },
            });
          }
          const updateCommand = entry.request.command;
          const created = await tx.configValue.create({
            data: this.buildValueCreateData(
              entry.configKey.id,
              updateCommand.value,
              command.scopeType,
              command.scopeRefId,
              entry.current?.priority ?? 100,
              now,
              null,
            ),
          });
          const changeLog = await tx.configChangeLog.create({
            data: {
              configKeyId: entry.configKey.id,
              configValueId: created.id,
              changedByUserId: command.actor.id ?? null,
              changeAction: entry.current
                ? ConfigChangeAction.UPDATED
                : ConfigChangeAction.CREATED,
              oldValueSnapshot: this.buildAuditSnapshot(
                entry.definition,
                currentValue,
                command,
                false,
              ),
              newValueSnapshot: this.buildAuditSnapshot(
                entry.definition,
                updateCommand.value,
                command,
                true,
              ),
              reason: command.reason,
            },
          });
          results.push({
            key: command.key,
            kind: 'update',
            changed: true,
            value: this.redactValue(entry.definition, updateCommand.value),
            valueId: created.id,
            previousValueId: entry.current?.id ?? null,
            updatedAt: created.updatedAt,
            changeLogId: changeLog.id,
          });
        }
        return results;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async reset(
    command: ResetConfigurationCommand,
  ): Promise<ConfigurationResetResult> {
    const definition = this.resolveDefinition(command.key);
    if (definition.status === 'LEGACY' || definition.owner.startsWith('ENV_')) {
      throw new BadRequestException({ error: 'CONFIG_NOT_RESETTABLE' });
    }
    if (!definition.editable) {
      throw new BadRequestException({ error: 'CONFIG_NOT_EDITABLE' });
    }
    if (!definition.allowedScopes.includes(command.scopeType)) {
      throw new BadRequestException({ error: 'CONFIG_SCOPE_UNSUPPORTED' });
    }
    if (!command.reason.trim() || command.reason.length > 1000) {
      throw new BadRequestException({ error: 'CONFIG_REASON_INVALID' });
    }
    if (
      command.scopeType === ConfigScopeType.GLOBAL &&
      command.scopeRefId !== null
    ) {
      throw new BadRequestException({
        error: 'CONFIG_GLOBAL_SCOPE_REFERENCE_FORBIDDEN',
      });
    }
    this.authorizationService.assertCanWrite(
      command.actor,
      command.actorType,
      definition,
    );

    return this.prisma.$transaction(
      async (tx) => {
        const catalog = await tx.configKeyCatalog.findUnique({
          where: { key: command.key },
        });
        if (!catalog)
          throw new NotFoundException({
            error: 'CONFIG_CATALOG_ENTRY_NOT_FOUND',
          });
        const current = await tx.configValue.findFirst({
          where: {
            configKeyId: catalog.id,
            scopeType: command.scopeType,
            scopeRefId: command.scopeRefId,
            isActive: true,
          },
          orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
        });
        this.assertExpectedVersion(current, command.expectedUpdatedAt);
        if (!current)
          return {
            key: command.key,
            valueId: null,
            updatedAt: null,
            changeLogId: null,
          };
        const now = new Date();
        await tx.configValue.update({
          where: { id: current.id },
          data: { isActive: false, effectiveTo: now },
        });
        const changeLog = await tx.configChangeLog.create({
          data: {
            configKeyId: catalog.id,
            configValueId: current.id,
            changedByUserId:
              command.actorType === 'USER' ? (command.actor.id ?? null) : null,
            changeAction: ConfigChangeAction.OVERRIDE_REMOVED,
            oldValueSnapshot: this.buildAuditSnapshot(
              definition,
              this.extractValue(current, catalog.dataType),
              command as UpdateConfigurationCommand,
              false,
            ),
            newValueSnapshot: this.buildAuditSnapshot(
              definition,
              catalog.defaultValueJson as ConfigurationWriteValueView,
              command as UpdateConfigurationCommand,
              true,
            ),
            reason: command.reason,
          },
        });
        return {
          key: command.key,
          valueId: current.id,
          updatedAt: now,
          changeLogId: changeLog.id,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async updateManyWithTransaction<T>(
    commands: readonly UpdateConfigurationCommand[],
    operation: (
      tx: Prisma.TransactionClient,
      results: readonly ConfigurationWriteResult[],
    ) => T | Promise<T>,
    options: { requireAbsent?: boolean } = {},
  ): Promise<T> {
    if (commands.length === 0) {
      throw new BadRequestException({
        error: 'CONFIG_BATCH_EMPTY',
        message: 'At least one configuration change is required.',
      });
    }

    const seen = new Set<string>();
    const definitions = commands.map((command) => {
      const identity = `${command.key}:${command.scopeType}:${command.scopeRefId ?? ''}`;
      if (seen.has(identity)) {
        throw new BadRequestException({
          error: 'CONFIG_BATCH_DUPLICATE_KEY',
          message: `Configuration key "${command.key}" appears more than once in the batch.`,
        });
      }
      seen.add(identity);

      const definition = this.resolveDefinition(command.key);
      this.validateCommand(command, definition);
      this.authorizationService.assertCanWrite(
        command.actor,
        command.actorType,
        definition,
      );
      return definition;
    });

    return this.prisma.$transaction(
      async (tx) => {
        const results: ConfigurationWriteResult[] = [];

        for (const [index, command] of commands.entries()) {
          const definition = definitions[index];
          const configKey = await tx.configKeyCatalog.findUnique({
            where: { key: command.key },
          });

          if (!configKey) {
            throw new NotFoundException({
              error: 'CONFIG_CATALOG_ENTRY_NOT_FOUND',
              message: `Configuration catalog entry "${command.key}" was not found.`,
            });
          }

          if (
            configKey.dataType !== this.toConfigDataType(definition.valueType)
          ) {
            throw new InternalServerErrorException({
              error: 'CONFIG_CATALOG_TYPE_MISMATCH',
              message: `Configuration catalog entry "${command.key}" is incompatible with the registry.`,
            });
          }

          const current = await tx.configValue.findFirst({
            where: {
              configKeyId: configKey.id,
              scopeType: command.scopeType,
              scopeRefId: command.scopeRefId,
              isActive: true,
            },
            orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
          });

          if (options.requireAbsent && current) {
            throw this.staleConflict();
          }
          this.assertExpectedVersion(current, command.expectedUpdatedAt);

          const now = new Date();
          const effectiveFrom = command.effectiveFrom ?? now;
          if (current) {
            await tx.configValue.update({
              where: { id: current.id },
              data:
                effectiveFrom > now
                  ? { effectiveTo: effectiveFrom }
                  : { isActive: false, effectiveTo: now },
            });
          }

          const created = await tx.configValue.create({
            data: this.buildValueCreateData(
              configKey.id,
              command.value,
              command.scopeType,
              command.scopeRefId,
              current?.priority ?? 100,
              effectiveFrom,
              command.effectiveTo ?? null,
            ),
          });

          const changeLog = await tx.configChangeLog.create({
            data: {
              configKeyId: configKey.id,
              configValueId: created.id,
              changedByUserId:
                command.actorType === 'USER'
                  ? (command.actor.id ?? null)
                  : null,
              changeAction: current
                ? ConfigChangeAction.UPDATED
                : ConfigChangeAction.CREATED,
              oldValueSnapshot: this.buildAuditSnapshot(
                definition,
                current ? this.extractValue(current, configKey.dataType) : null,
                command,
                false,
              ),
              newValueSnapshot: this.buildAuditSnapshot(
                definition,
                command.value,
                command,
                true,
              ),
              reason: command.reason,
            },
          });

          results.push({
            key: command.key,
            scopeType: command.scopeType,
            scopeRefId: command.scopeRefId,
            value: this.redactValue(definition, command.value),
            valueId: created.id,
            previousValueId: current?.id ?? null,
            updatedAt: created.updatedAt,
            changeLogId: changeLog.id,
          });
        }

        return operation(tx, results);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async getCurrentVersion(
    key: ConfigKey,
    scopeType: ConfigScopeType,
    scopeRefId: string | null,
  ): Promise<ConfigurationCurrentVersion | null> {
    const definition = this.resolveDefinition(key);
    if (!definition.allowedScopes.includes(scopeType)) {
      throw new BadRequestException({
        error: 'CONFIG_SCOPE_UNSUPPORTED',
        message: `Scope ${scopeType} is not supported for "${key}".`,
      });
    }

    const configKey = await this.prisma.configKeyCatalog.findUnique({
      where: { key },
    });
    if (!configKey) {
      throw new NotFoundException({
        error: 'CONFIG_CATALOG_ENTRY_NOT_FOUND',
        message: `Configuration catalog entry "${key}" was not found.`,
      });
    }

    const current = await this.prisma.configValue.findFirst({
      where: {
        configKeyId: configKey.id,
        scopeType,
        scopeRefId,
        isActive: true,
      },
      orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
      select: { id: true, updatedAt: true },
    });

    return current
      ? { valueId: current.id, updatedAt: current.updatedAt }
      : null;
  }

  private resolveDefinition(key: ConfigKey): ConfigDefinition {
    if (!CONFIG_KEY_LIST.includes(key)) {
      throw new BadRequestException({
        error: 'CONFIG_KEY_UNKNOWN',
        message: `Unknown configuration key "${key}".`,
      });
    }

    return getConfigDefinition(key);
  }

  private validateCommand(
    command: UpdateConfigurationCommand,
    definition: ConfigDefinition,
  ): void {
    if (definition.status === 'LEGACY') {
      throw new BadRequestException({
        error: 'CONFIG_LEGACY_KEY',
        message: `Configuration key "${command.key}" is deprecated.`,
      });
    }

    if (definition.owner.startsWith('ENV_')) {
      throw new BadRequestException({
        error: 'CONFIG_ENV_OWNED',
        message: `Configuration key "${command.key}" is environment-owned.`,
      });
    }

    if (!definition.editable) {
      throw new BadRequestException({
        error: 'CONFIG_NOT_EDITABLE',
        message: `Configuration key "${command.key}" is not editable.`,
      });
    }

    if (
      definition.valueType === 'JSON' &&
      definition.validationStrategy !== 'JSON_SCHEMA'
    ) {
      throw new BadRequestException({
        error: 'CONFIG_JSON_SCHEMA_REQUIRED',
        message: `Configuration key "${command.key}" requires a registered JSON schema.`,
      });
    }

    if (command.actor.type !== command.actorType) {
      throw new BadRequestException({
        error: 'CONFIG_ACTOR_TYPE_MISMATCH',
        message: 'Configuration actor type does not match the command.',
      });
    }

    if (!command.reason.trim() || command.reason.length > 1000) {
      throw new BadRequestException({
        error: 'CONFIG_REASON_INVALID',
        message: 'A non-empty reason up to 1000 characters is required.',
      });
    }

    if (!definition.allowedScopes.includes(command.scopeType)) {
      throw new BadRequestException({
        error: 'CONFIG_SCOPE_UNSUPPORTED',
        message: `Scope ${command.scopeType} is not supported for "${command.key}".`,
      });
    }

    if (command.scopeType === ConfigScopeType.GLOBAL) {
      if (command.scopeRefId !== null) {
        throw new BadRequestException({
          error: 'CONFIG_GLOBAL_SCOPE_REFERENCE_FORBIDDEN',
          message: 'Global configuration cannot have a scope reference.',
        });
      }
    } else if (!this.isUuid(command.scopeRefId)) {
      throw new BadRequestException({
        error: 'CONFIG_SCOPE_REFERENCE_REQUIRED',
        message:
          'A UUID scope reference is required for non-global configuration.',
      });
    }

    if (
      command.expectedUpdatedAt !== undefined &&
      command.expectedUpdatedAt !== null &&
      Number.isNaN(command.expectedUpdatedAt.getTime())
    ) {
      throw new BadRequestException({
        error: 'CONFIG_EXPECTED_VERSION_INVALID',
        message: 'Expected configuration version must be a valid date.',
      });
    }

    if (
      command.effectiveFrom !== undefined &&
      command.effectiveFrom !== null &&
      Number.isNaN(command.effectiveFrom.getTime())
    ) {
      throw new BadRequestException({
        error: 'CONFIG_EFFECTIVE_FROM_INVALID',
        message: 'Effective-from must be a valid date.',
      });
    }
    if (
      command.effectiveTo !== undefined &&
      command.effectiveTo !== null &&
      Number.isNaN(command.effectiveTo.getTime())
    ) {
      throw new BadRequestException({
        error: 'CONFIG_EFFECTIVE_TO_INVALID',
        message: 'Effective-to must be a valid date.',
      });
    }
    if (
      command.effectiveFrom &&
      command.effectiveTo &&
      command.effectiveTo <= command.effectiveFrom
    ) {
      throw new BadRequestException({
        error: 'CONFIG_EFFECTIVE_RANGE_INVALID',
        message: 'Effective-to must be after effective-from.',
      });
    }

    this.validateValue(command.value, definition);
  }

  private validateResetCommand(
    command: ResetConfigurationCommand,
    definition: ConfigDefinition,
  ): void {
    if (definition.status === 'LEGACY' || definition.owner.startsWith('ENV_')) {
      throw new BadRequestException({
        error: 'CONFIG_NOT_RESETTABLE',
        message: `Configuration key "${command.key}" cannot be reset.`,
      });
    }
    if (!definition.editable) {
      throw new BadRequestException({ error: 'CONFIG_NOT_EDITABLE' });
    }
    if (!definition.allowedScopes.includes(command.scopeType)) {
      throw new BadRequestException({ error: 'CONFIG_SCOPE_UNSUPPORTED' });
    }
    if (!command.reason.trim() || command.reason.length > 1000) {
      throw new BadRequestException({ error: 'CONFIG_REASON_INVALID' });
    }
    if (
      command.scopeType === ConfigScopeType.GLOBAL &&
      command.scopeRefId !== null
    ) {
      throw new BadRequestException({
        error: 'CONFIG_GLOBAL_SCOPE_REFERENCE_FORBIDDEN',
      });
    }
    if (
      command.expectedUpdatedAt !== undefined &&
      command.expectedUpdatedAt !== null &&
      Number.isNaN(command.expectedUpdatedAt.getTime())
    ) {
      throw new BadRequestException({
        error: 'CONFIG_EXPECTED_VERSION_INVALID',
      });
    }
  }

  private validateChangedValues(
    values: readonly (readonly [string, unknown])[],
  ): void {
    this.validateProjectedChangeSet(new Map(values));
  }

  private validateProjectedChangeSet(
    values: ReadonlyMap<string, unknown>,
  ): void {
    const combined = values.get('file.uploads.chat.maxCombinedBytes');
    const image = values.get('file.uploads.chat.maxImageBytes');
    const document = values.get('file.uploads.chat.maxDocumentBytes');
    if (
      typeof combined === 'number' &&
      ((typeof image === 'number' && combined < image) ||
        (typeof document === 'number' && combined < document))
    ) {
      throw new BadRequestException({
        error: 'CONFIG_CROSS_FIELD_INVALID',
        message:
          'The combined chat attachment limit cannot be smaller than an individual attachment limit.',
      });
    }
  }

  private valuesEqual(left: unknown, right: unknown): boolean {
    if (Object.is(left, right)) return true;
    if (left === null || right === null || typeof left !== typeof right) {
      return false;
    }
    if (typeof left === 'object' && typeof right === 'object') {
      return JSON.stringify(left) === JSON.stringify(right);
    }
    return false;
  }

  private validateValue(
    value: UpdateConfigurationCommand['value'],
    definition: ConfigDefinition,
  ): void {
    switch (definition.valueType) {
      case 'BOOLEAN':
        if (typeof value !== 'boolean') {
          throw this.invalidType(definition, 'boolean');
        }
        return;
      case 'NUMBER':
      case 'INTEGER':
        if (typeof value !== 'number' || !Number.isFinite(value)) {
          throw this.invalidType(definition, 'finite number');
        }
        if (definition.valueType === 'INTEGER' && !Number.isInteger(value)) {
          throw this.invalidType(definition, 'integer');
        }
        if (definition.minimum !== undefined && value < definition.minimum) {
          throw this.invalidType(definition, `number >= ${definition.minimum}`);
        }
        if (definition.maximum !== undefined && value > definition.maximum) {
          throw this.invalidType(definition, `number <= ${definition.maximum}`);
        }
        return;
      case 'STRING':
        if (typeof value !== 'string') {
          throw this.invalidType(definition, 'string');
        }
        if (
          definition.allowedValues &&
          !definition.allowedValues.includes(value)
        ) {
          throw this.invalidType(definition, 'allowed string value');
        }
        return;
      case 'STRING_ARRAY':
        if (
          !Array.isArray(value) ||
          !value.every((item): item is string => typeof item === 'string')
        ) {
          throw this.invalidType(definition, 'string array');
        }
        if (
          definition.allowedValues &&
          value.some((item) => !definition.allowedValues!.includes(item))
        ) {
          throw this.invalidType(definition, 'allowed string array values');
        }
        return;
      case 'JSON':
        if (!definition.jsonSchemaId) {
          throw new InternalServerErrorException(
            `JSON configuration key "${definition.key}" is missing a schema id.`,
          );
        }
        {
          const result = validateConfigJsonValue(
            definition.jsonSchemaId,
            value,
          );
          if (!result.success) {
            throw new BadRequestException({
              error: 'CONFIG_VALUE_INVALID',
              message: `Configuration key "${definition.key}" failed schema validation.`,
              details: { issues: result.issues },
            });
          }
        }
        return;
    }
  }

  private toConfigDataType(
    valueType: ConfigDefinition['valueType'],
  ): ConfigDataType {
    switch (valueType) {
      case 'BOOLEAN':
        return ConfigDataType.BOOLEAN;
      case 'NUMBER':
      case 'INTEGER':
        return ConfigDataType.NUMBER;
      case 'STRING':
        return ConfigDataType.STRING;
      case 'STRING_ARRAY':
        return ConfigDataType.STRING_ARRAY;
      case 'JSON':
        return ConfigDataType.JSON;
    }
  }

  private buildValueCreateData(
    configKeyId: string,
    value: UpdateConfigurationCommand['value'],
    scopeType: ConfigScopeType,
    scopeRefId: string | null,
    priority: number,
    effectiveFrom: Date,
    effectiveTo: Date | null,
  ): Prisma.ConfigValueUncheckedCreateInput {
    if (typeof value === 'boolean') {
      return {
        configKeyId,
        scopeType,
        scopeRefId,
        valueBoolean: value,
        priority,
        isActive: true,
        effectiveFrom,
        effectiveTo,
      };
    }
    if (typeof value === 'number') {
      return {
        configKeyId,
        scopeType,
        scopeRefId,
        valueNumber: value,
        priority,
        isActive: true,
        effectiveFrom,
        effectiveTo,
      };
    }
    if (typeof value === 'string') {
      return {
        configKeyId,
        scopeType,
        scopeRefId,
        valueString: value,
        priority,
        isActive: true,
        effectiveFrom,
        effectiveTo,
      };
    }
    return {
      configKeyId,
      scopeType,
      scopeRefId,
      valueJson: value as Prisma.InputJsonValue,
      priority,
      isActive: true,
      effectiveFrom,
      effectiveTo,
    };
  }

  private assertExpectedVersion(
    current: ConfigValueRecord | null,
    expectedUpdatedAt: Date | null | undefined,
  ): void {
    if (!current) {
      if (expectedUpdatedAt !== undefined && expectedUpdatedAt !== null) {
        throw this.staleConflict();
      }
      return;
    }

    if (
      expectedUpdatedAt === undefined ||
      expectedUpdatedAt === null ||
      current.updatedAt.getTime() !== expectedUpdatedAt.getTime()
    ) {
      throw this.staleConflict();
    }
  }

  private extractValue(
    current: ConfigValueRecord,
    dataType: ConfigDataType,
  ): ConfigurationWriteValueView {
    switch (dataType) {
      case ConfigDataType.BOOLEAN:
        return current.valueBoolean;
      case ConfigDataType.NUMBER:
        return current.valueNumber?.toNumber() ?? null;
      case ConfigDataType.STRING:
        return current.valueString;
      case ConfigDataType.STRING_ARRAY:
      case ConfigDataType.JSON:
      case ConfigDataType.NUMBER_ARRAY:
        return current.valueJson;
    }
  }

  private buildAuditSnapshot(
    definition: ConfigDefinition,
    value: ConfigurationWriteValueView,
    command: UpdateConfigurationCommand | ResetConfigurationCommand,
    includeActor: boolean,
  ): Prisma.InputJsonValue {
    return {
      value: this.redactValue(definition, value),
      scopeType: command.scopeType,
      scopeRefId: command.scopeRefId,
      ...(includeActor
        ? {
            actorType: command.actorType,
            actorId: command.actor.id ?? null,
            reason: command.reason,
          }
        : {}),
    } as Prisma.InputJsonValue;
  }

  private redactValue(
    definition: ConfigDefinition,
    value: ConfigurationWriteValueView,
  ): ConfigurationWriteValueView {
    return redactConfigurationValue(definition, value);
  }

  private invalidType(
    definition: ConfigDefinition,
    expected: string,
  ): BadRequestException {
    return new BadRequestException({
      error: 'CONFIG_VALUE_INVALID',
      message: `Configuration key "${definition.key}" requires ${expected}.`,
    });
  }

  private staleConflict(): ConflictException {
    return new ConflictException({
      error: 'CONFIG_WRITE_CONFLICT',
      message: 'Configuration changed since it was read. Reload and try again.',
    });
  }

  private isUuid(value: string | null): boolean {
    return (
      typeof value === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
      )
    );
  }
}

export function redactConfigurationValue(
  definition: ConfigDefinition,
  value: ConfigurationWriteValueView,
): ConfigurationWriteValueView {
  return definition.sensitive ? '[REDACTED]' : value;
}
