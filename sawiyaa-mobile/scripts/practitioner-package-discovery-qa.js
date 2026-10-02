/** Read-only visual proof for practitioner package discovery on Expo web. */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const BACKEND_URL = process.env.PACKAGE_QA_BACKEND_URL || "http://127.0.0.1:7000";
const MOBILE_URL = process.env.PACKAGE_QA_MOBILE_URL || "http://localhost:8081";
const OUT_DIR = path.resolve(
  process.env.PACKAGE_DISCOVERY_QA_OUTPUT_DIR ||
    "../qa-artifacts/practitioner-package-discovery/visual/mobile",
);
const positiveSlug = process.env.PACKAGE_DISCOVERY_POSITIVE_SLUG || "dev-b2f2-s3-partial-secondary";
const noPackageSlug = process.env.PACKAGE_DISCOVERY_NO_PACKAGE_SLUG || "dev-b2f2-s4-legacy-only";

async function api(pathname, options = {}) {
  const response = await fetch(`${BACKEND_URL}${pathname}`, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${options.method || "GET"} ${pathname} -> ${response.status}`);
  return body.data || body;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const auth = await api("/api/v1/auth/patient/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: process.env.PACKAGE_QA_PATIENT_EMAIL || "ahmed.patient@hesba.local",
      password: process.env.PACKAGE_QA_PATIENT_PASSWORD || "Patient@12345",
    }),
  });
  const browser = await chromium.launch({ headless: true });
  const results = [];
  for (const [name, slug, expected, forbidden] of [
    ["profile-ar", positiveSlug, ["باقات", "جلسات", "اشترِ الباقة"], []],
    ["profile-no-package-ar", noPackageSlug, [], ["باقات جلسات مخفضة"]],
  ]) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      locale: "ar-SA",
      timezoneId: "Africa/Cairo",
    });
    await context.addInitScript(({ session }) => {
      localStorage.setItem("sawiyaa:onboarding:completed:v1", "true");
      localStorage.setItem("sawiyaa.app.language", "ar");
      localStorage.setItem("sawiyaa.mobile.auth.tokens.access.v1", session.tokens.accessToken);
      localStorage.setItem("sawiyaa.mobile.auth.tokens.refresh.v1", session.tokens.refreshToken);
      localStorage.setItem("sawiyaa.mobile.auth.tokens.access.expiresAt.v1", session.tokens.accessTokenExpiresAt);
      localStorage.setItem("sawiyaa.mobile.auth.tokens.refresh.expiresAt.v1", session.tokens.refreshTokenExpiresAt);
      localStorage.setItem("sawiyaa.mobile.auth.session.v2", JSON.stringify({ role: "patient", user: session.user }));
    }, { session: auth });
    const page = await context.newPage();
    const consoleErrors = [];
    page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
    const url = `${MOBILE_URL}/discovery/${slug}`;
    // Expo web dev serves the app shell at `/`; use the same visible
    // discovery navigation a patient uses before opening the profile card.
    await page.goto(MOBILE_URL, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForTimeout(2_500);
    const specialists = page.getByText("المختصون", { exact: true });
    if (await specialists.count()) {
      await specialists.last().click();
      await page.waitForTimeout(4_000);
    }
    const target = page.getByText(
      slug === positiveSlug ? "Localization Scenario Three" : "Localization Scenario Four",
      { exact: true },
    );
    if (await target.count()) {
      await target.first().click();
      await page.waitForTimeout(4_000);
    }
    if (slug === positiveSlug) {
      const packageHeading = page.getByText("باقات جلسات مخفضة", { exact: true });
      if (await packageHeading.count()) await packageHeading.scrollIntoViewIfNeeded();
      await page.evaluate(() => {
        const scroller = Array.from(document.querySelectorAll("div")).find(
          (element) => element.scrollHeight > element.clientHeight + 100,
        );
        if (scroller) scroller.scrollTop = scroller.scrollHeight;
      });
      await page.waitForTimeout(500);
    }
    const bodyText = (await page.locator("body").innerText()).replace(/\s+/g, " ");
    const missingExpected = expected.filter((needle) => !bodyText.includes(needle));
    const forbiddenFound = forbidden.filter((needle) => bodyText.includes(needle));
    const screenshot = path.join(OUT_DIR, `${name}.png`);
    await page.screenshot({ path: screenshot, fullPage: false });
    let purchaseFlowUrl = null;
    let ctaStatus = "NOT_APPLICABLE";
    if (slug === positiveSlug) {
      const cta = page.getByText("اشترِ الباقة", { exact: true }).first();
      if (await cta.count()) {
        await cta.click();
        await page.waitForTimeout(2_000);
        purchaseFlowUrl = page.url();
        ctaStatus = /\/package-purchases\/create/.test(purchaseFlowUrl) &&
          purchaseFlowUrl.includes(`practitionerSlug=${positiveSlug}`) &&
          purchaseFlowUrl.includes("packagePlanCode=SESSIONS_4")
          ? "PASS"
          : "FAIL";
      } else {
        ctaStatus = "FAIL";
      }
    }
    results.push({
      name,
      slug,
      url,
      viewport: { width: 390, height: 844 },
      screenshot,
      status: missingExpected.length === 0 && forbiddenFound.length === 0 && consoleErrors.length === 0 && ctaStatus !== "FAIL" ? "PASS" : "CONDITIONAL",
      ctaStatus,
      purchaseFlowUrl,
      missingExpected,
      forbiddenFound,
      consoleErrors,
      bodyPreview: bodyText.slice(0, 800),
    });
    await context.close();
  }
  await browser.close();
  const manifest = { capturedAt: new Date().toISOString(), positiveSlug, noPackageSlug, results };
  fs.writeFileSync(path.join(OUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log(JSON.stringify(manifest, null, 2));
}

main().catch((error) => { console.error(error.stack || error); process.exitCode = 1; });
