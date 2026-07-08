"use client";

import { useEffect } from "react";
import { normalizeIanaTimeZone } from "@/lib/time-formatting/time-formatting";
import { VIEWER_TIME_ZONE_COOKIE } from "./time-zone-cookie";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = document.cookie.match(new RegExp(`(?:^|; )${escapedName}=([^;]*)`));
  if (!match) {
    return null;
  }

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function writeCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=31536000; SameSite=Lax`;
}

export function ViewerTimeZoneCookieSync() {
  useEffect(() => {
    const browserTimeZone = normalizeIanaTimeZone(
      Intl.DateTimeFormat().resolvedOptions().timeZone ?? null,
    );

    if (!browserTimeZone) {
      return;
    }

    const currentCookieTimeZone = normalizeIanaTimeZone(readCookie(VIEWER_TIME_ZONE_COOKIE));
    if (currentCookieTimeZone === browserTimeZone) {
      return;
    }

    writeCookie(VIEWER_TIME_ZONE_COOKIE, browserTimeZone);
  }, []);

  return null;
}
