const GLOBAL_SEEN_KEYS = "__fayedI18nMissingKeys__";

type MissingKeyWarningInput = {
  lang: string;
  key: string;
  namespace?: string;
  fallbackLanguages?: readonly string[];
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
  lang,
  key,
  namespace,
  fallbackLanguages,
}: MissingKeyWarningInput) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  const normalizedLang = lang || "unknown";
  const dedupeKey = `${normalizedLang}|${namespace ?? ""}|${key}`;
  const seenKeys = getSeenKeys();

  if (seenKeys.has(dedupeKey)) {
    return;
  }

  seenKeys.add(dedupeKey);

  const fallback = fallbackLanguages?.filter(Boolean).join(",");
  const namespacePart = namespace ? ` ns=${namespace}` : "";
  const fallbackPart = fallback ? ` fallback=${fallback}` : "";

  console.warn(
    `[Fayed i18n missing] lang=${normalizedLang}${namespacePart} key=${key}${fallbackPart}`,
  );
}
