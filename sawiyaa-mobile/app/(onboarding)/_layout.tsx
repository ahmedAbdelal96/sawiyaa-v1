import React from "react";
import { Stack } from "expo-router";

/**
 * Onboarding Layout
 *
 * Configures the router stack options for the onboarding screens.
 * Hides headers and disables gestures/back swiping to prevent users
 * from escaping the onboarding flow.
 */
export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: false, // Prevents iOS gesture swipe back
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="index" />
    </Stack>
  );
}
