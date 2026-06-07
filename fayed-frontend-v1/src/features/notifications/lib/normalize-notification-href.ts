const LOCALE_PREFIX_RE = /^\/(ar|en)(?=\/|$)/i;

function collapseSlashes(path: string) {
  return path.replace(/\/{2,}/g, "/");
}

export function normalizeNotificationHref(href: string | null | undefined) {
  if (!href) return null;

  const trimmed = href.trim();
  if (!trimmed.startsWith("/")) {
    return null;
  }

  let normalized = trimmed;
  while (LOCALE_PREFIX_RE.test(normalized)) {
    normalized = normalized.replace(LOCALE_PREFIX_RE, "") || "/";
  }

  normalized = collapseSlashes(normalized);

  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}
