import React, { useEffect, useState, useRef } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useAuth } from "../src/providers/AuthProvider";
import { getLanguageHydrationPromise } from "../src/i18n";
import { isOnboardingCompleted } from "../src/features/onboarding/services/onboarding-preferences";
import { resolveInitialRoute } from "../src/app-startup/resolve-initial-destination";
import type { OnboardingPreferenceResult } from "../src/app-startup/resolve-initial-destination";

/**
 * Bootstrap Coordinator
 *
 * This screen coordinates application launch and initial destination routing.
 * It is completely visual-less (renders a blank view matching the native splash background),
 * keeping the native OS splash screen visible until:
 * 1. Authentication state is hydrated.
 * 2. i18n localization state is hydrated.
 * 3. Onboarding completion state is read.
 *
 * Once ready, it determines the initial route, performs a single replacement transition,
 * and guarantees the native splash screen is hidden.
 */
export default function AppEntry() {
  const router = useRouter();
  const { user, role, isLoading: isAuthLoading } = useAuth();
  const [onboardingState, setOnboardingState] = useState<OnboardingPreferenceResult | null>(null);
  const [isI18nReady, setIsI18nReady] = useState(false);
  const navigationTriggered = useRef(false);

  // 1. Wait for i18n language hydration
  useEffect(() => {
    let active = true;
    getLanguageHydrationPromise()
      .then(() => {
        if (active) setIsI18nReady(true);
      })
      .catch(() => {
        if (active) setIsI18nReady(true); // Proceed anyway on hydration error
      });
    return () => {
      active = false;
    };
  }, []);

  // 2. Read onboarding completion state
  useEffect(() => {
    let active = true;
    isOnboardingCompleted().then((res) => {
      if (active) {
        setOnboardingState(res);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // 3. Resolve route when all boot tasks are ready
  const authReady = !isAuthLoading && isI18nReady;
  const initialRouteResult = resolveInitialRoute({
    authReady,
    user,
    role,
    onboardingState,
  });

  useEffect(() => {
    if (initialRouteResult.type === "loading") {
      return;
    }

    // Ensure we trigger navigation and splash hiding exactly once
    if (navigationTriggered.current) {
      return;
    }
    navigationTriggered.current = true;

    const targetRoute = initialRouteResult.route;

    async function navigateAndHideSplash() {
      try {
        router.replace(targetRoute as any);
      } finally {
        // Guarantee that the native splash screen is hidden, even if navigation fails
        await SplashScreen.hideAsync().catch(() => {});
      }
    }

    void navigateAndHideSplash();
  }, [initialRouteResult, router]);

  // Blank view matching the native splash background color to prevent flashes during routing
  return <View style={{ flex: 1, backgroundColor: "#F7F4EE" }} />;
}
