import { CONFIG_DEFINITIONS } from './config.definitions';
import { deepFreeze } from './immutable';

export type ConfigKey = (typeof CONFIG_DEFINITIONS)[number]['key'];

type NestedKey<K extends string> = K extends infer Current extends string
  ? NestedKeyFor<Current, Current>
  : never;

type NestedKeyFor<
  K extends string,
  Full extends string,
> = K extends `${infer Head}.${infer Tail}`
  ? { readonly [P in Head]: NestedKeyFor<Tail, Full> }
  : { readonly [P in K]: Full };

type UnionToIntersection<T> = (
  T extends unknown ? (value: T) => void : never
) extends (value: infer I) => void
  ? I
  : never;

type Simplify<T> = { readonly [K in keyof T]: T[K] };
export type ConfigKeyNamespace = Simplify<
  UnionToIntersection<NestedKey<ConfigKey>>
>;

function deriveConfigKeys(
  definitions: readonly { readonly key: string }[],
): ConfigKeyNamespace {
  const root: Record<string, unknown> = {};
  for (const definition of definitions) {
    const segments = definition.key.split('.');
    let current = root;
    for (const [index, segment] of segments.entries()) {
      if (index === segments.length - 1) {
        current[segment] = definition.key;
        continue;
      }
      current[segment] ??= {};
      current = current[segment] as Record<string, unknown>;
    }
  }
  return deepFreeze(root) as ConfigKeyNamespace;
}

/** Compatibility namespace derived from the canonical domain definitions. */
export const CONFIG_KEYS = deriveConfigKeys(CONFIG_DEFINITIONS);

/** Compatibility flat list derived from the canonical domain definitions. */
export const CONFIG_KEY_LIST = Object.freeze(
  CONFIG_DEFINITIONS.map((definition) => definition.key),
);
