import type { MobileSupportedRole } from "./contracts";

export function getSignInRouteForRole(
  role: MobileSupportedRole | null | undefined,
) {
  if (role === "patient") return "/(auth)/signin/patient" as const;
  if (role === "practitioner") return "/(auth)/signin/practitioner" as const;
  return "/(auth)" as const;
}
