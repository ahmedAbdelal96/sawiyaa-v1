import { CONFIG_KEY_LIST, ConfigKey } from './config-key.constants';
import { CONFIG_DEFINITIONS } from './config.definitions';
import { ConfigDefinition, ConfigRegistry } from './config-definition.types';
import { ConfigValueType } from './config-definition.types';
import { deepFreeze } from './immutable';

export const CONFIG_REGISTRY: ConfigRegistry = deepFreeze(
  Object.freeze(
    Object.fromEntries(
      CONFIG_DEFINITIONS.map((definition) => [definition.key, definition]),
    ),
  ) as unknown as ConfigRegistry,
);

export function getConfigDefinition(key: ConfigKey): ConfigDefinition {
  const definition = CONFIG_REGISTRY[key];
  if (!definition) {
    throw new Error(`Missing configuration definition for "${key}"`);
  }
  return definition;
}

export { CONFIG_KEY_LIST, CONFIG_DEFINITIONS };

export type ConfigKeyForValueType<T extends ConfigValueType> = Extract<
  (typeof CONFIG_DEFINITIONS)[number],
  { readonly valueType: T }
>['key'];

export type StringConfigKey = ConfigKeyForValueType<'STRING'>;
export type NumberConfigKey = ConfigKeyForValueType<'NUMBER' | 'INTEGER'>;
export type BooleanConfigKey = ConfigKeyForValueType<'BOOLEAN'>;
export type JsonConfigKey = ConfigKeyForValueType<'JSON' | 'STRING_ARRAY'>;
