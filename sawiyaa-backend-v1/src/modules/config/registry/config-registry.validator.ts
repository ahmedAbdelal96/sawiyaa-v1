import { ConfigScopeType } from '@prisma/client';
import { CONFIG_KEY_LIST } from './config-key.constants';
import { ConfigDefinition } from './config-definition.types';

const SUPPORTED_SCOPES = new Set(Object.values(ConfigScopeType));
const VALID_OWNERS = new Set([
  'ENV_SECRET',
  'ENV_INFRASTRUCTURE',
  'DATABASE_CONFIG',
  'CODE_INVARIANT',
  'USER_PREFERENCE',
  'ENTITY_SNAPSHOT',
  'TEST_ONLY',
]);

function isInteger(value: number): boolean {
  return Number.isInteger(value);
}

function validateValue(definition: ConfigDefinition): string[] {
  const errors: string[] = [];
  if (!('defaultValue' in definition)) return errors;
  const value = definition.defaultValue;
  const validType =
    (definition.valueType === 'STRING' && typeof value === 'string') ||
    (definition.valueType === 'NUMBER' &&
      typeof value === 'number' &&
      Number.isFinite(value)) ||
    (definition.valueType === 'INTEGER' &&
      typeof value === 'number' &&
      Number.isInteger(value)) ||
    (definition.valueType === 'BOOLEAN' && typeof value === 'boolean') ||
    (definition.valueType === 'STRING_ARRAY' &&
      Array.isArray(value) &&
      value.every((item) => typeof item === 'string')) ||
    definition.valueType === 'JSON';
  if (!validType)
    errors.push(
      `${definition.key}: default value does not match ${definition.valueType}`,
    );
  if (
    definition.valueType === 'INTEGER' &&
    typeof value === 'number' &&
    !isInteger(value)
  ) {
    errors.push(`${definition.key}: integer default must be an integer`);
  }
  if (
    (definition.valueType === 'NUMBER' || definition.valueType === 'INTEGER') &&
    typeof value === 'number'
  ) {
    if (definition.minimum !== undefined && value < definition.minimum)
      errors.push(`${definition.key}: default is below minimum`);
    if (definition.maximum !== undefined && value > definition.maximum)
      errors.push(`${definition.key}: default is above maximum`);
  }
  if (
    definition.minimum !== undefined &&
    definition.maximum !== undefined &&
    definition.minimum > definition.maximum
  ) {
    errors.push(`${definition.key}: minimum cannot exceed maximum`);
  }
  if (definition.allowedValues) {
    if (definition.valueType === 'STRING_ARRAY') {
      if (
        !Array.isArray(value) ||
        !value.every((item) => definition.allowedValues!.includes(item))
      ) {
        errors.push(`${definition.key}: default value contains unallowed values`);
      }
    } else if (typeof value !== 'string' || !definition.allowedValues.includes(value)) {
      errors.push(`${definition.key}: default is not an allowed value`);
    }
  }
  return errors;
}

export function validateConfigRegistry(
  definitions: readonly ConfigDefinition[] = [],
  keys: readonly string[] = CONFIG_KEY_LIST,
): string[] {
  const errors: string[] = [];
  const keySet = new Set(keys);
  const seen = new Set<string>();
  for (const definition of definitions) {
    if (seen.has(definition.key))
      errors.push(`duplicate definition: ${definition.key}`);
    seen.add(definition.key);
    if (!keySet.has(definition.key))
      errors.push(`definition outside canonical keys: ${definition.key}`);
    if (!VALID_OWNERS.has(definition.owner))
      errors.push(`${definition.key}: owner is missing or invalid`);
    if (!definition.failureMode)
      errors.push(`${definition.key}: failure mode is required`);
    for (const scope of definition.allowedScopes) {
      if (!SUPPORTED_SCOPES.has(scope))
        errors.push(`${definition.key}: unsupported scope ${scope}`);
    }
    if (definition.sensitive && definition.editable)
      errors.push(`${definition.key}: sensitive values cannot be editable`);
    if (definition.owner === 'ENV_SECRET' && definition.editable) {
      errors.push(
        `${definition.key}: environment-owned values cannot be editable`,
      );
    }
    if (
      definition.valueType === 'JSON' &&
      definition.editable &&
      definition.validationStrategy !== 'JSON_SCHEMA'
    ) {
      errors.push(
        `${definition.key}: editable JSON requires JSON_SCHEMA validation`,
      );
    }
    if (
      definition.validationStrategy === 'STRING_ENUM' &&
      (definition.valueType !== 'STRING' || !definition.allowedValues?.length)
    ) {
      errors.push(
        `${definition.key}: STRING_ENUM requires a non-empty string allowedValues list`,
      );
    }
    if (
      definition.allowedValues &&
      definition.validationStrategy !== 'STRING_ENUM' &&
      definition.valueType !== 'STRING_ARRAY'
    ) {
      errors.push(
        `${definition.key}: allowedValues requires STRING_ENUM validation unless valueType is STRING_ARRAY`,
      );
    }
    if (
      definition.validationStrategy === 'JSON_SCHEMA' &&
      definition.valueType !== 'JSON'
    ) {
      errors.push(`${definition.key}: JSON_SCHEMA requires JSON value type`);
    }
    if (
      definition.validationStrategy === 'JSON_SCHEMA' &&
      !definition.jsonSchemaId
    ) {
      errors.push(`${definition.key}: JSON_SCHEMA requires a schema id`);
    }
    if (
      definition.jsonSchemaId &&
      definition.validationStrategy !== 'JSON_SCHEMA'
    ) {
      errors.push(
        `${definition.key}: schema id requires JSON_SCHEMA validation`,
      );
    }
    if (definition.allowedValues) {
      if (definition.allowedValues.length === 0)
        errors.push(`${definition.key}: allowed values cannot be empty`);
      if (
        new Set(definition.allowedValues).size !==
        definition.allowedValues.length
      )
        errors.push(`${definition.key}: allowed values must be unique`);
    }
    if (definition.unit !== undefined && definition.unit.trim().length === 0)
      errors.push(`${definition.key}: unit cannot be empty`);
    if (
      definition.status === 'LEGACY' &&
      !definition.deprecationReason &&
      !definition.deprecatedReplacementKey
    ) {
      errors.push(
        `${definition.key}: legacy definition needs migration metadata`,
      );
    }
    if (
      definition.deprecatedReplacementKey &&
      !keySet.has(definition.deprecatedReplacementKey)
    ) {
      errors.push(`${definition.key}: replacement key does not exist`);
    }
    if (
      definition.status === 'ACTIVE' &&
      definition.editable &&
      definition.adminVisible
    ) {
      if (!definition.uiMetadata || !definition.uiMetadata.control) {
        errors.push(
          `${definition.key}: active editable admin-visible settings must define uiMetadata.control`,
        );
      }
    }
    errors.push(...validateValue(definition));
  }
  for (const key of keys) {
    if (!seen.has(key)) errors.push(`canonical key without definition: ${key}`);
  }
  const definitionsByKey = new Map(
    definitions.map((definition) => [definition.key, definition]),
  );
  for (const definition of definitions) {
    const visited = new Set<string>();
    let current: ConfigDefinition | undefined = definition;
    while (current?.deprecatedReplacementKey) {
      if (visited.has(current.key)) {
        errors.push(`${definition.key}: cyclic replacement aliases`);
        break;
      }
      visited.add(current.key);
      current = definitionsByKey.get(current.deprecatedReplacementKey);
    }
  }
  return errors;
}

export function assertValidConfigRegistry(
  definitions: readonly ConfigDefinition[],
  keys: readonly string[] = CONFIG_KEY_LIST,
): void {
  const errors = validateConfigRegistry(definitions, keys);
  if (errors.length > 0)
    throw new Error(`Invalid configuration registry:\n${errors.join('\n')}`);
}
