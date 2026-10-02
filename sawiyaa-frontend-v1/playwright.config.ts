import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";
const parsed = new URL(baseURL);
if (!(["127.0.0.1", "localhost"].includes(parsed.hostname))) {
  throw new Error("E2E_BASE_URL must point to localhost or 127.0.0.1");
}

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "./test-artifacts/playwright",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { outputFolder: "test-artifacts/playwright-report", open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    locale: "ar-EG",
    timezoneId: "Africa/Cairo",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    { name: "admin-chromium-en", testMatch: /admin-session-resolution\.spec\.ts/, use: { ...devices["Desktop Chrome"], locale: "en-US" } },
    { name: "admin-chromium-ar", testMatch: /admin-session-resolution\.spec\.ts/, use: { ...devices["Desktop Chrome"], locale: "ar-EG" } },
    { name: "admin-golden-en", testMatch: /admin-session-resolution-golden\.spec\.ts/, use: { ...devices["Desktop Chrome"], locale: "en-US", storageState: "test-artifacts/auth/admin.json" } },
    { name: "admin-auth-setup", testMatch: /admin-auth\.setup\.ts/ },
    { name: "chromium-ar", use: { ...devices["Desktop Chrome"], locale: "ar-EG" }, dependencies: ["setup"] },
    { name: "chromium-en", use: { ...devices["Desktop Chrome"], locale: "en-US" }, dependencies: ["setup"] },
    { name: "mobile-ar", use: { ...devices["Pixel 7"], locale: "ar-EG" }, dependencies: ["setup"] },
  ],
  webServer: [
    {
      command: "node ../sawiyaa-frontend-v1/scripts/start-e2e-backend.mjs",
      cwd: path.resolve(__dirname, "..", "sawiyaa-backend-v1"),
      url: process.env.E2E_BACKEND_URL ?? "http://127.0.0.1:7000/api/v1/health",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: "npm run dev",
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
