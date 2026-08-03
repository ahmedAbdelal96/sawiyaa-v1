import { CONFIG_KEYS, ConfigKey } from './registry/config-key.constants';
import {
  CONFIG_DEFINITIONS,
  getConfigDefinition,
} from './registry/config.registry';
import { ConfigDefinition } from './registry/config-definition.types';

export type ConfigEntry = {
  readonly key: ConfigKey;
  readonly definition: ConfigDefinition;
};

type BoundConfig<T> = T extends string
  ? ConfigEntry & { readonly key: T }
  : T extends Record<string, unknown>
    ? { readonly [K in keyof T]: BoundConfig<T[K]> }
    : never;

function bindConfigNamespace<T>(value: T): BoundConfig<T> {
  if (typeof value === 'string') {
    const key = value as ConfigKey;
    return {
      key,
      definition: getConfigDefinition(key),
    } as BoundConfig<T>;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([name, child]) => [
      name,
      bindConfigNamespace(child),
    ]),
  ) as unknown as BoundConfig<T>;
}

/** The developer-facing registry entry point for database-managed settings. */
export const CONFIG = bindConfigNamespace(CONFIG_KEYS);

export { CONFIG_DEFINITIONS, CONFIG_KEYS };
