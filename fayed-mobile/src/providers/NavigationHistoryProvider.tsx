import React, { createContext, useContext, useMemo, useRef } from "react";
import { useGlobalSearchParams, usePathname, useRouter } from "expo-router";
import { BackHandler, Platform } from "react-native";
import { useEffect } from "react";

type NavigationHistoryContextValue = {
  previousRoute: string | null;
  canGoBackInApp: boolean;
  goBackInApp: () => boolean;
  popPreviousRoute: () => string | null;
  debugSnapshot: () => { current: string | null; history: string[] };
};

const NavigationHistoryContext = createContext<NavigationHistoryContextValue | null>(null);

function normalizeParams(
  params: Record<string, string | string[] | undefined>,
): URLSearchParams {
  const query = new URLSearchParams();
  const entries = Object.entries(params).sort(([left], [right]) => left.localeCompare(right));

  for (const [key, value] of entries) {
    if (key === "params") continue;
    if (value == null) continue;

    if (Array.isArray(value)) {
      for (const item of value) {
        if (item == null || item === "") continue;
        query.append(key, item);
      }
      continue;
    }

    if (value === "" || value === "[object Object]") continue;
    query.set(key, value);
  }

  return query;
}

function buildRouteKey(
  pathname: string | null | undefined,
  params: Record<string, string | string[] | undefined>,
) {
  const safePathname = pathname || "/";
  const query = normalizeParams(params);
  const queryString = query.toString();
  return queryString ? `${safePathname}?${queryString}` : safePathname;
}

export function NavigationHistoryProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const globalParams = useGlobalSearchParams() as Record<
    string,
    string | string[] | undefined
  >;

  const historyRef = useRef<string[]>([]);
  const currentRouteRef = useRef<string | null>(null);
  const suppressNextPushRef = useRef(false);

  const currentRouteKey = buildRouteKey(pathname, globalParams);

  const isAuthLikePath = (route: string | null) => {
    if (!route) return false;
    return (
      route.startsWith("/signin") ||
      route.startsWith("/signup") ||
      route.startsWith("/forgot-password") ||
      route.startsWith("/practitioner-forgot-password") ||
      route.startsWith("/(auth)")
    );
  };

  if (currentRouteRef.current !== currentRouteKey) {
    const previousCurrent = currentRouteRef.current;
    if (suppressNextPushRef.current) {
      suppressNextPushRef.current = false;
    } else if (
      previousCurrent &&
      previousCurrent !== currentRouteKey &&
      !isAuthLikePath(previousCurrent) &&
      !isAuthLikePath(currentRouteKey)
    ) {
      const stack = historyRef.current;
      if (stack[stack.length - 1] !== previousCurrent) {
        stack.push(previousCurrent);
      }
    }
    currentRouteRef.current = currentRouteKey;
  }

  const goBackInApp = () => {
    const stack = historyRef.current;
    if (stack.length === 0) return false;
    suppressNextPushRef.current = true;
    const target = stack.pop();
    if (!target) return false;
    router.replace(target as any);
    return true;
  };

  useEffect(() => {
    if (Platform.OS !== "android") return;

    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      return goBackInApp();
    });

    return () => sub.remove();
  }, [currentRouteKey]);

  const value = useMemo<NavigationHistoryContextValue>(
    () => ({
      previousRoute: historyRef.current.length > 0 ? historyRef.current[historyRef.current.length - 1] : null,
      canGoBackInApp: historyRef.current.length > 0,
      goBackInApp,
      popPreviousRoute: () => {
        const stack = historyRef.current;
        if (stack.length === 0) return null;
        suppressNextPushRef.current = true;
        return stack.pop() ?? null;
      },
      debugSnapshot: () => ({
        current: currentRouteRef.current,
        history: [...historyRef.current],
      }),
    }),
    [currentRouteKey],
  );

  return (
    <NavigationHistoryContext.Provider value={value}>
      {children}
    </NavigationHistoryContext.Provider>
  );
}

export function useNavigationHistory() {
  const ctx = useContext(NavigationHistoryContext);
  if (!ctx) {
    throw new Error("useNavigationHistory must be used within NavigationHistoryProvider");
  }
  return ctx;
}
