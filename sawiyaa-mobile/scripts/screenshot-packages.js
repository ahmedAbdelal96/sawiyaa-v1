/**
 * Playwright screenshot script for Sawiyaa Packages screens.
 * Captures EN and AR screenshots of the packages list, detail, pay, and create screens.
 * 
 * Usage: node scripts/screenshot-packages.js
 * Requires: Expo web dev server running on http://localhost:19006
 *           Backend API server running on http://localhost:7000
 */

const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const BASE_URL = "http://localhost:19006";
const BACKEND_URL = "http://localhost:7000";
const OUT_DIR = "C:/Users/IT/.gemini/antigravity/brain/f7c96bbc-7aba-4a69-b02a-38c3c1e9f799";

const MOBILE_VIEWPORT = { width: 390, height: 844 };

async function loginPatient() {
  const email = "ahmed.patient@hesba.local";
  const password = "Patient@12345";
  console.log(`Logging in to backend API (${BACKEND_URL}) as patient: ${email}...`);
  const response = await fetch(`${BACKEND_URL}/api/v1/auth/patient/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    throw new Error(`Login failed with status ${response.status}`);
  }
  const json = await response.json();
  return json.data;
}

async function fetchPractitioner(accessToken) {
  console.log("Fetching first practitioner...");
  const response = await fetch(`${BACKEND_URL}/api/v1/public/practitioners?page=1&limit=1`, {
    headers: { "Authorization": `Bearer ${accessToken}` }
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch practitioners: ${response.status}`);
  }
  const json = await response.json();
  return json.data?.items?.[0] || null;
}

async function fetchPractitionerPackagePlans(accessToken, slug) {
  console.log(`Fetching package plans for practitioner ${slug}...`);
  const response = await fetch(`${BACKEND_URL}/api/v1/public/practitioners/${slug}/package-plans`, {
    headers: { "Authorization": `Bearer ${accessToken}` }
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch package plans: ${response.status}`);
  }
  const json = await response.json();
  return json.data?.items || [];
}

async function fetchMyPackagePurchases(accessToken) {
  console.log("Fetching my package purchases...");
  const response = await fetch(`${BACKEND_URL}/api/v1/patients/me/package-purchases?limit=10`, {
    headers: { "Authorization": `Bearer ${accessToken}` }
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch package purchases: ${response.status}`);
  }
  const json = await response.json();
  return json.data?.items || [];
}

async function fetchAvailabilityWindows(accessToken, slug) {
  const fromIso = new Date().toISOString();
  const toIso = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  console.log(`Fetching availability windows for ${slug}...`);
  const response = await fetch(`${BACKEND_URL}/api/v1/public/practitioners/${slug}/availability/windows?from=${fromIso}&to=${toIso}`, {
    headers: { "Authorization": `Bearer ${accessToken}` }
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch availability windows: ${response.status}`);
  }
  const json = await response.json();
  const windows = json.data?.windows || [];
  
  // Expand each availability window into bookable 30-minute starts.
  const slots = [];
  windows.forEach(w => {
    let start = new Date(w.startsAt);
    let end = new Date(w.endsAt);
    while (start < end) {
      slots.push(start.toISOString());
      start = new Date(start.getTime() + 30 * 60 * 1000); // 30 min increments
    }
  });
  return slots;
}

async function createPackagePurchase(accessToken, { planCode, practitionerSlug, slots }) {
  console.log(`Creating package purchase for ${planCode} with ${slots.length} slots...`);
  const response = await fetch(`${BACKEND_URL}/api/v1/patients/me/package-purchases`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      packagePlanCode: planCode,
      practitionerSlug,
      durationMinutes: 30,
      sessionMode: "VIDEO",
      selectedCurrencyCode: "EGP",
      selectedSessionSlots: slots.map(s => ({ scheduledStartAt: s }))
    })
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to create package: ${response.status} - ${text}`);
  }
  const json = await response.json();
  return json.data?.item || null;
}

async function captureScreen({ browser, name, url, locale, description, authData }) {
  const context = await browser.newContext({
    viewport: MOBILE_VIEWPORT,
    locale: locale === "ar" ? "ar-SA" : "en-US",
    timezoneId: "Africa/Cairo",
  });

  const page = await context.newPage();

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      console.log(`[Browser Error] ${msg.text()}`);
    }
  });

  console.log(`\n[${name}] Navigating to ${url}`);

  // Load root to set credentials
  await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 45000 });

  await page.evaluate(
    ({ lang, auth }) => {
      try {
        localStorage.setItem("fayed.app.language", lang);
        localStorage.setItem("i18nextLng", lang);
        localStorage.setItem("appLanguage", lang);

        const { tokens, user } = auth;
        localStorage.setItem("fayed.mobile.auth.tokens.access.v1", tokens.accessToken);
        localStorage.setItem("fayed.mobile.auth.tokens.refresh.v1", tokens.refreshToken);
        localStorage.setItem("fayed.mobile.auth.tokens.access.expiresAt.v1", tokens.accessTokenExpiresAt);
        localStorage.setItem("fayed.mobile.auth.tokens.refresh.expiresAt.v1", tokens.refreshTokenExpiresAt);
        localStorage.setItem(
          "fayed.mobile.auth.session.v2",
          JSON.stringify({ role: "patient", user })
        );
      } catch (e) {
        console.error("Local storage error:", e);
      }
    },
    { lang: locale, auth: authData }
  );

  // Load the target screen
  await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
  
  await page.waitForSelector("#root > *", { timeout: 30000 });
  await page.waitForTimeout(4000); // Give extra time for React query and layout

  // Scroll to top
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1000);

  const outPath = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: outPath, fullPage: false });

  console.log(`[${name}] Screenshot saved: ${outPath}`);

  await context.close();
  return outPath;
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  const authData = await loginPatient();
  console.log("Patient authenticated successfully.");

  const practitioner = await fetchPractitioner(authData.tokens.accessToken);
  if (!practitioner) {
    throw new Error("No practitioners available in system.");
  }
  console.log(`Using practitioner: ${practitioner.name} (${practitioner.slug})`);

  const plans = await fetchPractitionerPackagePlans(authData.tokens.accessToken, practitioner.slug);
  const plan = plans.find(p => p.item.code === "SESSIONS_4") || plans[0];
  if (!plan) {
    throw new Error("No package plans available for practitioner.");
  }
  const planCode = plan.item.code;
  console.log(`Using package plan: ${planCode}`);

  let purchases = await fetchMyPackagePurchases(authData.tokens.accessToken);
  let pendingPurchase = purchases.find(p => p.status === "PENDING_PAYMENT");
  let activePurchase = purchases.find(p => p.status === "ACTIVE" || p.status === "COMPLETED");

  if (!pendingPurchase) {
    console.log("No pending payment packages found. Seeding a new package purchase...");
    const slots = await fetchAvailabilityWindows(authData.tokens.accessToken, practitioner.slug);
    const requiredSlotsCount = plan.item.sessionCount || 4;
    if (slots.length < requiredSlotsCount) {
      throw new Error(`Practitioner has only ${slots.length} available slots, but plan requires ${requiredSlotsCount}.`);
    }
    const selectedSlots = slots.slice(0, requiredSlotsCount);
    pendingPurchase = await createPackagePurchase(authData.tokens.accessToken, {
      planCode,
      practitionerSlug: practitioner.slug,
      slots: selectedSlots
    });
    console.log(`Successfully seeded pending package purchase: ${pendingPurchase.id}`);
  }

  const detailId = activePurchase ? activePurchase.id : pendingPurchase.id;
  const payId = pendingPurchase.id;

  const SCREENS = [
    {
      name: "packages_list_en",
      url: `${BASE_URL}/(patient)/package-purchases`,
      locale: "en",
      description: "Package Purchases List — English LTR",
    },
    {
      name: "packages_list_ar",
      url: `${BASE_URL}/(patient)/package-purchases`,
      locale: "ar",
      description: "Package Purchases List — Arabic RTL",
    },
    {
      name: "package_detail_en",
      url: `${BASE_URL}/(patient)/package-purchases/${detailId}`,
      locale: "en",
      description: "Package Purchase Detail — English LTR",
    },
    {
      name: "package_detail_ar",
      url: `${BASE_URL}/(patient)/package-purchases/${detailId}`,
      locale: "ar",
      description: "Package Purchase Detail — Arabic RTL",
    },
    {
      name: "package_pay_en",
      url: `${BASE_URL}/(patient)/package-purchases/${payId}/pay`,
      locale: "en",
      description: "Package Purchase Pay — English LTR",
    },
    {
      name: "package_pay_ar",
      url: `${BASE_URL}/(patient)/package-purchases/${payId}/pay`,
      locale: "ar",
      description: "Package Purchase Pay — Arabic RTL",
    },
    {
      name: "package_create_en",
      url: `${BASE_URL}/(patient)/package-purchases/create?practitionerSlug=${practitioner.slug}&packagePlanCode=${planCode}&durationMinutes=30&sessionMode=VIDEO`,
      locale: "en",
      description: "Package Purchase Create — English LTR",
    },
    {
      name: "package_create_ar",
      url: `${BASE_URL}/(patient)/package-purchases/create?practitionerSlug=${practitioner.slug}&packagePlanCode=${planCode}&durationMinutes=30&sessionMode=VIDEO`,
      locale: "ar",
      description: "Package Purchase Create — Arabic RTL",
    },
  ];

  console.log("Launching Chromium browser with --disable-web-security...");
  const browser = await chromium.launch({
    headless: true,
    args: ["--disable-web-security"],
  });

  const results = [];

  for (const screen of SCREENS) {
    try {
      const outPath = await captureScreen({ browser, authData, ...screen });
      results.push({ ...screen, outPath, success: true });
    } catch (err) {
      console.error(`[${screen.name}] FAILED: ${err.message}`);
      results.push({ ...screen, success: false, error: err.message });
    }
  }

  await browser.close();

  console.log("\n=== Screenshot Results ===");
  for (const r of results) {
    if (r.success) {
      console.log(`✅ ${r.description}: ${r.outPath}`);
    } else {
      console.log(`❌ ${r.description}: ${r.error}`);
    }
  }

  // Write manifest
  const manifest = results.map((r) => ({
    name: r.name,
    description: r.description,
    path: r.outPath,
    success: r.success,
  }));
  fs.writeFileSync(
    path.join(OUT_DIR, "manifest_packages.json"),
    JSON.stringify(manifest, null, 2)
  );
  console.log(`\nManifest written to ${path.join(OUT_DIR, "manifest_packages.json")}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
