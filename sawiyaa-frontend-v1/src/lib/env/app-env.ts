export type AppEnvironment = "development" | "production";

function normalizeAppEnv(value: string | undefined): AppEnvironment | null {
  if (!value) return null;

  const normalized = value.trim().toLowerCase();
  if (normalized === "development" || normalized === "production") {
    return normalized;
  }

  return null;
}

export function getAppEnvironment(): AppEnvironment {
  return (
    normalizeAppEnv(process.env.NEXT_PUBLIC_APP_ENV) ??
    (process.env.NODE_ENV === "production" ? "production" : "development")
  );
}

export function shouldShowDetailedErrors(): boolean {
  const explicit = process.env.NEXT_PUBLIC_SHOW_DETAILED_ERRORS;

  if (explicit === "true") return true;
  if (explicit === "false") return false;

  return getAppEnvironment() === "development";
}
