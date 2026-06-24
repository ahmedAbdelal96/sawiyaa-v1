/* eslint-disable no-console */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const FRONTEND_BASE = process.env.FRONTEND_BASE_URL || "http://localhost:3000";
const BACKEND_BASE = process.env.BACKEND_BASE_URL || "http://localhost:7000/api/v1";

const PRACTITIONER_EMAIL =
  process.env.PRACTITIONER_EMAIL || "dr.mahmoud@hesba.local";
const PRACTITIONER_PASSWORD =
  process.env.PRACTITIONER_PASSWORD || "Practitioner3@12345";

const OUT_DIR = path.resolve("artifacts/smoke-17e-c");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

async function main() {
  ensureDir(OUT_DIR);

  const browser = await chromium.launch();
  const context = await browser.newContext();

  const page = await context.newPage();
  const consoleLines = [];
  page.on("console", (msg) => {
    const text = msg.text();
    if (text.includes("[PractitionerWizard]")) {
      consoleLines.push(text);
    }
  });

  const captured = {
    readiness: null,
    application: null,
  };

  page.on("response", async (response) => {
    const url = response.url();
    if (!url.includes("/api/v1/")) return;
    try {
      if (url.includes("/api/v1/practitioners/me/readiness")) {
        captured.readiness = await response.json();
      }
      if (url.includes("/api/v1/practitioners/me/application")) {
        captured.application = await response.json();
      }
    } catch {
      // ignore non-json
    }
  });

  // Login through the real UI so the app sets cookies/session exactly as production does.
  const loginUrl = `${FRONTEND_BASE}/ar/signin/practitioner`;
  await page.goto(loginUrl, { waitUntil: "domcontentloaded" });
  await page.locator('input[type="email"]').fill(PRACTITIONER_EMAIL);
  await page.locator('input[type="password"]').fill(PRACTITIONER_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForLoadState("networkidle");

  // Now visit the target wizard route.
  const targetUrl = `${FRONTEND_BASE}/ar/practitioner/application`;
  await page.goto(targetUrl, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  await page.screenshot({ path: path.join(OUT_DIR, "01-page-loaded.png"), fullPage: true });

  // Try to click Save draft on the Basic step if it exists (may be disabled in read-only states).
  const saveBtn = page.getByRole("button", { name: /حفظ المسودة|Save draft/i });
  if (await saveBtn.count()) {
    try {
      await saveBtn.click({ timeout: 4000 });
      await page.waitForTimeout(1500);
    } catch {
      // If not clickable (readonly/disabled), still proceed; we mainly need to capture completion shape.
    }
  }

  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT_DIR, "02-after-save-attempt.png"), fullPage: true });

  fs.writeFileSync(
    path.join(OUT_DIR, "frontend-readiness-response.json"),
    JSON.stringify(captured.readiness, null, 2),
    "utf8"
  );
  fs.writeFileSync(
    path.join(OUT_DIR, "frontend-application-response.json"),
    JSON.stringify(captured.application, null, 2),
    "utf8"
  );
  fs.writeFileSync(
    path.join(OUT_DIR, "frontend-console-proof.txt"),
    consoleLines.join("\n"),
    "utf8"
  );

  const steps =
    captured.readiness?.data?.readiness?.completion?.steps ??
    captured.application?.data?.application?.completion?.steps ??
    null;
  const basic = Array.isArray(steps) ? steps.find((s) => s.key === "basicProfile") : null;

  fs.writeFileSync(
    path.join(OUT_DIR, "extracted-basicProfile.json"),
    JSON.stringify(
      {
        hasStepsArray: Array.isArray(steps),
        basicProfile: basic
          ? { key: basic.key, status: basic.status, percent: basic.percent }
          : null,
      },
      null,
      2
    ),
    "utf8"
  );

  await browser.close();
  console.log("Smoke artifacts written to", OUT_DIR);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
