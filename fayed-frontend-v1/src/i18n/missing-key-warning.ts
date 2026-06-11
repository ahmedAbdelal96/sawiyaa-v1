const GLOBAL_SEEN_KEYS = "__fayedI18nMissingKeysWeb__";

type MissingKeyWarningInput = {
  locale: string;
  key: string;
  namespace?: string;
  fallbackLocale?: string;
};

function getSeenKeys(): Set<string> {
  const globalObject = globalThis as typeof globalThis & {
    [GLOBAL_SEEN_KEYS]?: Set<string>;
  };

  if (!globalObject[GLOBAL_SEEN_KEYS]) {
    globalObject[GLOBAL_SEEN_KEYS] = new Set<string>();
  }

  return globalObject[GLOBAL_SEEN_KEYS]!;
}

export function warnMissingTranslation({
  locale,
  key,
  namespace,
  fallbackLocale,
}: MissingKeyWarningInput) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  const dedupeKey = `${locale}|${namespace ?? ""}|${key}`;
  const seenKeys = getSeenKeys();

  if (seenKeys.has(dedupeKey)) {
    return;
  }

  seenKeys.add(dedupeKey);

  const namespacePart = namespace ? ` ns=${namespace}` : "";
  const fallbackPart = fallbackLocale ? ` fallback=${fallbackLocale}` : "";

  console.warn(
    `[Fayed i18n missing] lang=${locale}${namespacePart} key=${key}${fallbackPart}`,
  );
}
