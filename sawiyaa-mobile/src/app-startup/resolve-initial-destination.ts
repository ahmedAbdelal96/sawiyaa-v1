import type { AuthenticatedUser, MobileSupportedRole } from "../features/auth/contracts";

export type OnboardingPreferenceResult =
  | { status: "completed" }
  | { status: "not_completed" }
  | { status: "read_failed"; error: unknown };

export type InitialDestinationInput = {
  authReady: boolean;
  user: AuthenticatedUser | null;
  role: MobileSupportedRole | null;
  onboardingState: OnboardingPreferenceResult | null;
};

export type InitialRouteResult =
  | { type: "loading" }
  | { type: "navigate"; route: string };

/**
 * Determines the initial route destination based on authentication readiness,
 * user session, user role, and onboarding completion state.
 *
 * Priority:
 * 1. Authenticated user goes straight to their role destination, bypassing onboarding.
 * 2. Unauthenticated user goes to /(onboarding) if first launch (not completed).
 * 3. Unauthenticated user goes to /(auth) if onboarding is completed or read failed.
 */
export function resolveInitialRoute(input: InitialDestinationInput): InitialRouteResult {
  const { authReady, user, role, onboardingState } = input;

  // 1. If auth is not ready or onboarding state has not been resolved yet, wait.
  if (!authReady || !onboardingState) {
    return { type: "loading" };
  }

  // 2. Authenticated user? Route directly to patient/practitioner destination, ignoring onboarding state.
  if (user !== null) {
    if (role === "patient") {
      return { type: "navigate", route: "/(patient)" };
    }
    if (role === "practitioner") {
      return { type: "navigate", route: "/(practitioner)" };
    }
    // Safe fallback for authenticated but unrecognized role
    return { type: "navigate", route: "/(auth)" };
  }

  // 3. Unauthenticated user destination based on onboarding state
  if (onboardingState.status === "not_completed") {
    return { type: "navigate", route: "/(onboarding)" };
  }

  // Safest fallback if completed or read failed is to go to /(public)
  return { type: "navigate", route: "/(public)" };
}
