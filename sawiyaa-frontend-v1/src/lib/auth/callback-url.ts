import { locales } from "@/i18n/routing";

const localeSet = new Set<string>(locales);

function isSafeRelativePath(value: string | null | undefined): value is string {
  return Boolean(value && value.startsWith("/") && !value.startsWith("//"));
}

function splitPathSuffix(path: string): { pathname: string; suffix: string } {
  const queryIndex = path.indexOf("?");
  const hashIndex = path.indexOf("#");

  if (queryIndex === -1 && hashIndex === -1) {
    return { pathname: path, suffix: "" };
  }

  if (queryIndex === -1) {
    return { pathname: path.slice(0, hashIndex), suffix: path.slice(hashIndex) };
  }

  if (hashIndex === -1) {
    return { pathname: path.slice(0, queryIndex), suffix: path.slice(queryIndex) };
  }

  const firstSuffixIndex = Math.min(queryIndex, hashIndex);
  return {
    pathname: path.slice(0, firstSuffixIndex),
    suffix: path.slice(firstSuffixIndex),
  };
}

function stripLeadingLocaleSegments(pathname: string): string {
  const parts = pathname.split("/");
  let cursor = 1;

  while (cursor < parts.length && localeSet.has(parts[cursor])) {
    cursor += 1;
  }

  const normalizedPath = `/${parts.slice(cursor).join("/")}`.replace(/\/{2,}/g, "/");
  return normalizedPath === "" ? "/" : normalizedPath;
}

export function normalizeCallbackPath(
  callbackUrl: string | null | undefined,
): string | null {
  if (!isSafeRelativePath(callbackUrl)) {
    return null;
  }

  const { pathname, suffix } = splitPathSuffix(callbackUrl);
  const normalizedPathname = stripLeadingLocaleSegments(pathname || "/");

  return `${normalizedPathname}${suffix}`;
}

