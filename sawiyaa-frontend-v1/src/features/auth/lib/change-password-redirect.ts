export function getChangePasswordRedirectPath(
  role: "patient" | "practitioner",
): string {
  return role === "patient" ? "/signin/patient" : "/signin/practitioner";
}
