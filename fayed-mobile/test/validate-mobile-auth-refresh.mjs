import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const apiSource = read("src/lib/api.ts");
const authProviderSource = read("src/providers/AuthProvider.tsx");
const authApiSource = read("src/features/auth/api.ts");
const authStorageSource = read("src/features/auth/storage.ts");
const secureTokenStorageSource = read("src/features/auth/secure-token-storage.ts");
const contractsSource = read("src/features/auth/contracts.ts");

assert(
  apiSource.includes("refreshAccessTokenSingleFlight") &&
    apiSource.includes("refreshAccessTokenPromise") &&
    apiSource.includes("if (refreshAccessTokenPromise === nextRefreshPromise)"),
  "API client must keep a single refresh promise and avoid stale finally cleanup."
);

assert(
  apiSource.includes("originalRequest._retry = true") &&
    apiSource.includes("shouldSkipAuthRefresh(originalRequest.url)") &&
    apiSource.includes("/auth/patient/refresh") &&
    apiSource.includes("/auth/practitioner/refresh"),
  "API client must retry once and skip login/logout/refresh endpoints to avoid loops."
);

assert(
  apiSource.includes("delete originalRequest.headers.Authorization") &&
    apiSource.includes("originalRequest.headers.Authorization = `Bearer ${nextAccessToken}`"),
  "Retried requests must replace stale Authorization headers with the refreshed access token."
);

assert(
  apiSource.includes("triggerAuthFailure") &&
    apiSource.includes("authFailurePromise"),
  "Auth failure handling must be deduped so logout/navigation happens once."
);

assert(
  apiSource.includes("Your session has expired. Please sign in again.") &&
    apiSource.includes("انتهت صلاحية الجلسة"),
  "Raw 401/token errors must be converted to friendly user-facing copy."
);

assert(
  authProviderSource.includes("configureApiAuthSessionHandlers") &&
    authProviderSource.includes("await consumeAuthSuccess(refreshed, currentSession.role)") &&
    authProviderSource.includes("return refreshed.tokens.accessToken"),
  "AuthProvider refresh handler must persist refreshed tokens before returning the new access token."
);

assert(
  authProviderSource.includes('currentSession.role === "patient"') &&
    authProviderSource.includes("patientRefresh") &&
    authProviderSource.includes("practitionerRefresh") &&
    !authProviderSource.includes("adminRefresh"),
  "Mobile refresh must route patient/practitioner sessions to their own endpoints and never use admin refresh."
);

assert(
  authApiSource.includes('apiClient.post("/auth/patient/refresh"') &&
    authApiSource.includes('apiClient.post("/auth/practitioner/refresh"') &&
    !authApiSource.includes("/auth/admin/refresh"),
  "Mobile auth API must expose patient/practitioner refresh only."
);

assert(
  secureTokenStorageSource.includes('Platform.OS === "web"') &&
    secureTokenStorageSource.includes("AsyncStorage.setItem") &&
    secureTokenStorageSource.includes("SecureStore.setItemAsync") &&
    secureTokenStorageSource.includes("REFRESH_TOKEN_KEY"),
  "Token storage must update Expo Web AsyncStorage and native SecureStore token sets."
);

assert(
  authStorageSource.includes("setSecureAuthTokens(session.tokens)") &&
    authStorageSource.includes("clearSecureAuthTokens()"),
  "Session persistence must write and clear the platform token store."
);

assert(
  contractsSource.includes('export type MobileSupportedRole = "patient" | "practitioner"') &&
    !contractsSource.includes('| "admin"'),
  "Mobile supported roles must remain patient/practitioner only."
);

for (const [label, source] of [
  ["src/lib/api.ts", apiSource],
  ["src/providers/AuthProvider.tsx", authProviderSource],
  ["src/features/auth/api.ts", authApiSource],
  ["src/features/auth/storage.ts", authStorageSource],
  ["src/features/auth/secure-token-storage.ts", secureTokenStorageSource],
]) {
  assert(
    !/console\.(log|warn|error)\([^)]*(accessToken|refreshToken|Authorization)/s.test(
      source,
    ),
    `${label} must not log raw tokens or Authorization headers.`
  );
}

console.log("Mobile auth refresh validation passed.");
