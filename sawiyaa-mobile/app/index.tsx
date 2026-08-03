import React, { useEffect, useState, useRef } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useAuth } from "../src/providers/AuthProvider";
import { getLanguageHydrationPromise } from "../src/i18n";
import { isOnboardingCompleted } from "../src/features/onboarding/services/onboarding-preferences";
import { resolveInitialRoute } from "../src/app-startup/resolve-initial-destination";
import type { OnboardingPreferenceResult } from "../src/app-startup/resolve-initial-destination";
import PublicHomeScreen from "./(public)/index";

/**
 * Root Application Index Coordinator
 *
 * Serves as the sole canonical handler for the root URL `/`.
 * Coordinates initial bootstrap, hides splash screen, and renders PublicHomeScreen directly
 * for unauthenticated guests, avoiding duplicate route collisions across Expo Router route groups.
 */
export default function AppEntry() {
  const router = useRouter();
  const { user, role, isLoading: isAuthLoading } = useAuth();
  const [onboardingState, setOnboardingState] = useState<OnboardingPreferenceResult | null>(null);
  const [isI18nReady, setIsI18nReady] = useState(false);
  const [showPublicHome, setShowPublicHome] = useState(false);
  const navigationTriggered = useRef(false);

  // 1. Wait for i18n language hydration
  useEffect(() => {
    let active = true;
    getLanguageHydrationPromise()
      .then(() => {
        if (active) setIsI18nReady(true);
      })
      .catch(() => {
        if (active) setIsI18nReady(true);
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

  // 3. Resolve route when boot tasks are ready
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

    if (navigationTriggered.current) {
      return;
    }
    navigationTriggered.current = true;

    const targetRoute = initialRouteResult.route;

    async function handleDestination() {
      try {
        if (targetRoute === "/(public)") {
          setShowPublicHome(true);
        } else {
          router.replace(targetRoute as any);
        }
      } finally {
        await SplashScreen.hideAsync().catch(() => {});
      }
    }

    void handleDestination();
  }, [initialRouteResult, router]);

  if (showPublicHome) {
    return <PublicHomeScreen />;
  }

  // Blank splash background view while resolving initial state
  return <View style={{ flex: 1, backgroundColor: "#F7F4EE" }} />;
}
