import { authSessionService } from "@/auth/application/auth-session.service";

let refreshPromise: Promise<string> | null = null;

export async function getFreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = authSessionService
      .refresh()
      .then((tokens) => tokens.accessToken)
      .catch(async (error) => {
        await authSessionService.clear();
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}
