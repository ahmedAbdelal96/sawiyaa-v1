export function getInitials(name: string | null | undefined) {
  if (!name?.trim()) {
    return "P";
  }

  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

export function formatNotificationType(typeSlug: string) {
  return typeSlug
    .split("_")
    .filter(Boolean)
    .map((part) => part[0] + part.slice(1).toLowerCase())
    .join(" ");
}

export function normalizeCountryCode(value: string) {
  const next = value.trim().toUpperCase();
  if (!next) {
    return null;
  }

  return next;
}

export function isValidCountryCode(value: string | null) {
  if (!value) {
    return true;
  }

  return /^[A-Z]{2,3}$/.test(value);
}

export function normalizeDateOfBirth(value: string) {
  const next = value.trim();
  if (!next) {
    return null;
  }

  return next;
}

export function isValidDateOfBirth(value: string | null) {
  if (!value) {
    return true;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
}

export function formatProfileDate(
  value: string | null | undefined,
  locale: string,
) {
  if (!value) {
    return null;
  }

  try {
    return new Date(value).toLocaleDateString(
      locale.startsWith("ar") ? "ar-EG" : "en-GB",
    );
  } catch {
    return value;
  }
}
