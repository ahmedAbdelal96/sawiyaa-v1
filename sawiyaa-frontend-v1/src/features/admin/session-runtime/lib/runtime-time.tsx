"use client";

import { createContext, useContext } from "react";
import {
  formatEffectiveViewerDateTime,
  resolveEffectiveViewerTimeZone,
} from "@/lib/time-formatting";

const RuntimeViewerTimeZoneContext = createContext<string | null>(null);

export function RuntimeViewerTimeZoneProvider({
  timeZone,
  children,
}: {
  timeZone: string;
  children: React.ReactNode;
}) {
  return (
    <RuntimeViewerTimeZoneContext.Provider value={timeZone}>
      {children}
    </RuntimeViewerTimeZoneContext.Provider>
  );
}

export function useRuntimeViewerTimeZone(): string {
  return (
    useContext(RuntimeViewerTimeZoneContext) ??
    resolveEffectiveViewerTimeZone(null)
  );
}

export function formatRuntimeViewerDateTime(
  value: string | null | undefined,
  locale: string,
  timeZone: string,
): string {
  return formatEffectiveViewerDateTime(value, timeZone, {
    locale,
    dateStyle: "medium",
    timeStyle: "short",
  });
}
