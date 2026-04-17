import { useRouter, useSegments } from "expo-router";
import type { PropsWithChildren } from "react";
import { useEffect } from "react";


import { useAuthSessionStore } from "@/auth/store/auth-session.store";
import { routes } from "@/core/constants/routes";

export function AppNavigationGate({ children }: PropsWithChildren) {
  const router = useRouter();
  const segments = useSegments();
  const status = useAuthSessionStore((state) => state.status);

  useEffect(() => {
    if (status === "checking") {
      return;
    }

    const inAppGroup = segments[0] === "(app)";
    const inPublicGroup = segments[0] === "(public)";

    if (status === "authenticated" && inPublicGroup) {
      router.replace(routes.app.home);
      return;
    }

    if (status === "unauthenticated" && inAppGroup) {
      router.replace(routes.public.welcome);
    }
  }, [router, segments, status]);

  return <>{children}</>;
}

