/** Recursively freezes governance metadata so callers cannot mutate shared policy. */
export function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    for (const key of Reflect.ownKeys(value)) {
      const child = (value as Record<PropertyKey, unknown>)[key];
      if (child !== null && typeof child === 'object') deepFreeze(child);
    }
    if (!Object.isFrozen(value)) Object.freeze(value);
  }
  return value;
}
