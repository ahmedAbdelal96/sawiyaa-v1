import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

function readProjectFile(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const proxySource = readProjectFile("src/proxy.ts");
const authServerSource = readProjectFile("src/lib/auth/server.ts");
const serverApiClientSource = readProjectFile("src/lib/server-api-client.ts");
const httpClientSource = readProjectFile("src/lib/api/http-client.ts");
const refreshRouteSource = readProjectFile("src/app/api/auth/refresh/route.ts");

assert(
  proxySource.includes("REFRESH_TOKEN_COOKIE") &&
    proxySource.includes("requestRefreshedTokens") &&
    proxySource.includes("TOKEN_REFRESH_LEEWAY_SECONDS"),
  "Expected proxy.ts to refresh protected routes before render when access token is stale."
);

assert(
  proxySource.includes("NextResponse.redirect(request.nextUrl)") &&
    proxySource.includes("setRefreshedAuthCookies"),
  "Expected proxy.ts to redirect once with refreshed cookies so Server Components see the new token."
);

assert(
  proxySource.includes("ROLE_AUTH_ENDPOINTS.ADMIN.refresh") &&
    proxySource.includes("ROLE_AUTH_ENDPOINTS.PATIENT.refresh") &&
    proxySource.includes("ROLE_AUTH_ENDPOINTS.PRACTITIONER.refresh"),
  "Expected proxy.ts to preserve role-specific refresh endpoints."
);

assert(
  authServerSource.includes("inFlightRefreshSessions") &&
    authServerSource.includes("requestRefreshedAuthSession"),
  "Expected /api/auth/refresh server helper to dedupe concurrent backend refresh calls."
);

assert(
  authServerSource.includes('role === "SUPPORT"') &&
    authServerSource.includes('role === "SUPPORT_AGENT"'),
  "Expected admin refresh/logout endpoint resolution to support both SUPPORT and SUPPORT_AGENT role values."
);

assert(
  !serverApiClientSource.includes("refreshAccessToken") &&
    !serverApiClientSource.includes("refreshSuccess"),
  "server-api-client.ts must not rotate refresh tokens from Server Component render paths."
);

assert(
  httpClientSource.includes("let refreshPromise") &&
    httpClientSource.includes("refreshAccessTokenSingleFlight") &&
    httpClientSource.includes('delete originalRequest.headers.Authorization'),
  "Expected browser http client to single-flight refresh and retry without stale Authorization."
);

assert(
  refreshRouteSource.includes("refreshAccessToken") &&
    !/console\.(log|error|warn)\([^)]*(accessToken|refreshToken|Authorization)/s.test(
      refreshRouteSource
    ),
  "Refresh route should call centralized refresh helper without logging raw auth material."
);

for (const [label, source] of [
  ["proxy.ts", proxySource],
  ["auth/server.ts", authServerSource],
  ["server-api-client.ts", serverApiClientSource],
  ["http-client.ts", httpClientSource],
]) {
  assert(
    !/console\.(log|error|warn)\([^)]*(accessToken|refreshToken|Authorization)/s.test(
      source
    ),
    `${label} must not log raw access or refresh tokens.`
  );
}

console.log("Auth refresh flow validation passed.");
