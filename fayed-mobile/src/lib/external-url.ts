const BASE_ALLOWED_EXTERNAL_PROTOCOLS = new Set(["https:", "fayed:"]);

export function isAllowedExternalUrl(input: string) {
  const value = input.trim();
  if (!value) {
    return false;
  }

  try {
    const parsed = new URL(value);
    if (BASE_ALLOWED_EXTERNAL_PROTOCOLS.has(parsed.protocol)) {
      return true;
    }

    return typeof __DEV__ !== "undefined" && __DEV__ && parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export function normalizeAllowedExternalUrl(input: string) {
  const value = input.trim();
  return isAllowedExternalUrl(value) ? value : null;
}
