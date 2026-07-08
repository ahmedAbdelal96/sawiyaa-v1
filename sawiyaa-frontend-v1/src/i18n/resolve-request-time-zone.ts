import "server-only";
import { cookies, headers } from "next/headers";
import { getUserData } from "@/lib/auth/server";
import { normalizeIanaTimeZone } from "@/lib/time-formatting/time-formatting";
import { VIEWER_TIME_ZONE_COOKIE } from "./time-zone-cookie";

const TIME_ZONE_HEADER_CANDIDATES = ["x-vercel-ip-timezone", "cf-timezone"] as const;
const COUNTRY_HEADER_CANDIDATES = ["x-vercel-ip-country", "cf-ipcountry"] as const;

const COUNTRY_TIME_ZONE_FALLBACKS: Record<string, string> = {
  EG: "Africa/Cairo",
  SA: "Asia/Riyadh",
  AE: "Asia/Dubai",
  KW: "Asia/Kuwait",
  QA: "Asia/Qatar",
  BH: "Asia/Bahrain",
  OM: "Asia/Muscat",
  JO: "Asia/Amman",
  LB: "Asia/Beirut",
  US: "America/New_York",
  GB: "Europe/London",
};

function normalizeCountryCode(countryCode: string | null | undefined): string | null {
  const value = countryCode?.trim().toUpperCase() ?? "";
  if (!/^[A-Z]{2}$/.test(value)) {
    return null;
  }
  return value;
}

function resolveCountryFallbackTimeZone(countryCode: string | null | undefined): string | null {
  const normalized = normalizeCountryCode(countryCode);
  if (!normalized) {
    return null;
  }

  return normalizeIanaTimeZone(COUNTRY_TIME_ZONE_FALLBACKS[normalized] ?? null);
}

function readCookieValue(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

async function resolveUserTimeZone(): Promise<string | null> {
  const userData = await getUserData();
  const userTimeZone = normalizeIanaTimeZone(
    (userData as { timezone?: string | null } | null)?.timezone ?? null,
  );
  return userTimeZone;
}

async function resolveCookieTimeZone(): Promise<string | null> {
  const cookieStore = await cookies();
  const cookieTimeZone = readCookieValue(cookieStore.get(VIEWER_TIME_ZONE_COOKIE)?.value);
  return normalizeIanaTimeZone(cookieTimeZone);
}

async function resolveHeaderTimeZone(): Promise<string | null> {
  const headerStore = await headers();

  for (const headerName of TIME_ZONE_HEADER_CANDIDATES) {
    const candidate = readCookieValue(headerStore.get(headerName));
    const normalized = normalizeIanaTimeZone(candidate);
    if (normalized) {
      return normalized;
    }
  }

  for (const headerName of COUNTRY_HEADER_CANDIDATES) {
    const countryCode = readCookieValue(headerStore.get(headerName));
    const fallbackTimeZone = resolveCountryFallbackTimeZone(countryCode);
    if (fallbackTimeZone) {
      return fallbackTimeZone;
    }
  }

  return null;
}

export async function resolveRequestTimeZone(): Promise<string> {
  const userTimeZone = await resolveUserTimeZone();
  if (userTimeZone) {
    return userTimeZone;
  }

  const cookieTimeZone = await resolveCookieTimeZone();
  if (cookieTimeZone) {
    return cookieTimeZone;
  }

  const headerTimeZone = await resolveHeaderTimeZone();
  if (headerTimeZone) {
    return headerTimeZone;
  }

  // Technical SSR fallback only. This keeps server-rendered formatting deterministic
  // until a real viewer timezone becomes available from the user/session/cookie/headers.
  return "UTC";
}
