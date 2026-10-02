/**
 * Evidence capture for the package journey on Expo web.
 * Requires the Expo web server (8081) and backend (7000) to be running.
 * This is intentionally read-only: it authenticates a fixture patient and
 * captures the existing package list/detail/booking surfaces.
 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const BACKEND_URL = "http://127.0.0.1:7000";
const MOBILE_URL = "http://localhost:8081";
const OUT_DIR = path.resolve(__dirname, "../../qa-artifacts/package-user-journey-closure/visual/mobile");
const VIEWPORT = { width: 390, height: 844 };

async function api(pathname, options = {}) {
  const response = await fetch(`${BACKEND_URL}${pathname}`, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${options.method ?? "GET"} ${pathname} -> ${response.status}`);
  return body.data ?? body;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const auth = await api("/api/v1/auth/patient/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "ahmed.patient@hesba.local", password: "Patient@12345" }),
  });
  const purchases = await api("/api/v1/patients/me/package-purchases?limit=12", {
    headers: { Authorization: `Bearer ${auth.tokens.accessToken}` },
  });
  const items = purchases.items ?? purchases;
  const active = items.find((item) => item.status === "ACTIVE") ?? items[0];
  if (!active) throw new Error("No package purchase fixture available for capture.");

  const browser = await chromium.launch({ headless: true });
  const results = [];
  for (const [name, route] of [
    ["package-list-ar", "/package-purchases"],
    ["package-detail-ar", `/package-purchases/${active.id}`],
    ["package-booking-ar", `/package-purchases/${active.id}/book`],
  ]) {
    const context = await browser.newContext({ viewport: VIEWPORT, locale: "ar-SA", timezoneId: "Africa/Cairo" });
    const page = await context.newPage();
    const consoleErrors = [];
    page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
    await context.addInitScript(({ auth }) => {
      localStorage.setItem("sawiyaa.app.language", "ar");
      localStorage.setItem("sawiyaa.mobile.auth.tokens.access.v1", auth.tokens.accessToken);
      localStorage.setItem("sawiyaa.mobile.auth.tokens.refresh.v1", auth.tokens.refreshToken);
      localStorage.setItem("sawiyaa.mobile.auth.tokens.access.expiresAt.v1", auth.tokens.accessTokenExpiresAt);
      localStorage.setItem("sawiyaa.mobile.auth.tokens.refresh.expiresAt.v1", auth.tokens.refreshTokenExpiresAt);
      localStorage.setItem("sawiyaa.mobile.auth.session.v2", JSON.stringify({ role: "patient", user: auth.user }));
    }, { auth });
    // The Expo web dev server intentionally serves the app shell at `/`; use
    // the same visible navigation a patient uses instead of relying on a
    // deep-link refresh (which is not configured in dev mode).
    await page.goto(MOBILE_URL, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(1800);
    if (route !== "/") {
      await page.getByText("المزيد", { exact: true }).last().click();
      await page.getByText("باقاتي العلاجية", { exact: true }).click();
      await page.waitForTimeout(1800);
      if (route.includes("/book")) {
        await page.getByText("عرض التفاصيل", { exact: true }).first().click();
        await page.waitForTimeout(1800);
        const bookingCtas = page.getByText("احجز جلسة من الباقة", { exact: true });
        let clickedBookingCta = false;
        for (let index = 0; index < await bookingCtas.count(); index += 1) {
          const candidate = bookingCtas.nth(index);
          if (await candidate.isVisible()) {
            await candidate.scrollIntoViewIfNeeded();
            await candidate.click();
            clickedBookingCta = true;
            break;
          }
        }
        if (!clickedBookingCta) throw new Error("Package booking CTA was not visible after opening package details.");
      } else if (route !== "/package-purchases") {
        await page.getByText("عرض التفاصيل", { exact: true }).first().click();
      }
    }
    await page.waitForTimeout(1800);
    await page.waitForTimeout(3500);
    const bodyText = (await page.locator("body").innerText()).slice(0, 5000);
    const screenshotPath = path.join(OUT_DIR, `${name}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });
    results.push({ name, route, finalUrl: page.url(), status: /تعذر تحميل|Could not load|خطأ غير متوقع/i.test(bodyText) ? "CONDITIONAL" : "PASS", screenshot: screenshotPath, consoleErrors, bodyPreview: bodyText.slice(0, 500) });
    await context.close();
  }
  await browser.close();
  const manifest = { capturedAt: new Date().toISOString(), purchaseId: active.id, results };
  fs.writeFileSync(path.join(OUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log(JSON.stringify(manifest, null, 2));
}

main().catch((error) => { console.error(error.stack || error); process.exitCode = 1; });
