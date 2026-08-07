/**
 * Strips raw UUIDs, hexadecimal hashes, and technical seed prefixes from person display names
 * so administrators see clean human-readable names.
 */
export function cleanPersonName(name: string | null | undefined): string {
  if (!name) return "";

  // 1. Remove raw UUIDs like "0ee8710e-113a-43c8-83cc-98f74a15ac55"
  let cleaned = name
    .replace(/[\s\-_]+[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}.*/gi, "")
    .replace(/\s+[0-9a-fA-F]{16,}$/gi, "")
    .trim();

  // 2. Remove technical slug prefixes like "prac-scen-g-" or "pat-scen-a-"
  cleaned = cleaned.replace(/^(prac|pat)-scen-[a-z0-9]+-?/gi, "").trim();

  // If the result is a non-empty human name (not just a raw UUID), return it
  if (cleaned.length > 0 && !/^[0-9a-fA-F-]{16,}$/.test(cleaned)) {
    return cleaned;
  }

  return "";
}

/**
 * Returns a human-readable display name with fallback to localized role label.
 */
export function formatPersonDisplayName(
  displayName: string | null | undefined,
  idFallback: string | null | undefined,
  defaultRoleLabel: string
): string {
  const cleanedDisplay = cleanPersonName(displayName);
  if (cleanedDisplay) {
    return cleanedDisplay;
  }

  const cleanedFallback = cleanPersonName(idFallback);
  if (cleanedFallback) {
    return cleanedFallback;
  }

  return defaultRoleLabel;
}

/**
 * Formats session date and time into a clear, administrator-friendly string.
 * Example (AR): "الأربعاء، 5 أغسطس 2026 • 4:00 م - 4:30 م"
 * Example (EN): "Wed, Aug 5, 2026 • 4:00 PM - 4:30 PM"
 */
export function toDateTimeLocalInputValue(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join("-")
    .concat("T")
    .concat([pad(date.getHours()), pad(date.getMinutes())].join(":"));
}

/**
 * Truncates long UUIDs or technical refs for clean table display (e.g. "prac-scen-a-6ec48927...8cdf")
 */
export function shortId(value: string | null | undefined, head = 16, tail = 4): string {
  if (!value) return "";
  if (value.length <= head + tail + 3) return value;
  return `${value.slice(0, head)}...${value.slice(-tail)}`;
}

export function formatSessionTimeRange(
  locale: string,
  startAt: string | null | undefined,
  endAt: string | null | undefined
): string {
  if (!startAt) return "-";
  const isAr = locale.startsWith("ar");
  const startDate = new Date(startAt);

  const dateStr = new Intl.DateTimeFormat(isAr ? "ar-EG" : "en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(startDate);

  const startTimeStr = new Intl.DateTimeFormat(isAr ? "ar-EG" : "en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: !isAr,
  }).format(startDate);

  if (!endAt) return `${dateStr} • ${startTimeStr}`;

  const endDate = new Date(endAt);
  const endTimeStr = new Intl.DateTimeFormat(isAr ? "ar-EG" : "en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: !isAr,
  }).format(endDate);

  return `${dateStr} • ${startTimeStr} - ${endTimeStr}`;
}
