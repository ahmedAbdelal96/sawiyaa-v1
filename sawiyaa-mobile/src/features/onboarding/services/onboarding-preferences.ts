import AsyncStorage from "@react-native-async-storage/async-storage";
import type { OnboardingPreferenceResult } from "../../../app-startup/resolve-initial-destination";

const ONBOARDING_COMPLETED_KEY = "sawiyaa:onboarding:completed:v1";

/**
 * Checks if the onboarding flow has been completed.
 *
 * Safe semantics:
 * - If value is exactly "true", returns { status: "completed" }.
 * - If value is missing (null) or "false", returns { status: "not_completed" }.
 * - If read fails (e.g. storage error), returns { status: "read_failed", error }.
 */
export async function isOnboardingCompleted(): Promise<OnboardingPreferenceResult> {
  try {
    const value = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
    if (value === "true") {
      return { status: "completed" };
    }
    return { status: "not_completed" };
  } catch (error) {
    // Log error locally without showing technical logs to the user
    console.error("[OnboardingPreferences] Failed to read onboarding key:", error);
    return { status: "read_failed", error };
  }
}

/**
 * Persists the onboarding completion state.
 *
 * Safe semantics:
 * - Saves "true" or "false".
 * - Throws an error on write failure so the caller UI can handle it (displaying retry alerts
 *   and unlocking buttons) instead of failing silently.
 */
export async function setOnboardingCompleted(completed: boolean): Promise<void> {
  try {
    const value = completed ? "true" : "false";
    await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, value);
  } catch (error) {
    console.error("[OnboardingPreferences] Failed to write onboarding key:", error);
    throw error;
  }
}
