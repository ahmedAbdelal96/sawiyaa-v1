/**
 * Playwright screenshot script for Sawiyaa Articles screens.
 * Captures EN and AR screenshots of the articles feed and reader screens.
 * 
 * Usage: node scripts/screenshot-articles.js
 * Requires: Expo web dev server running on http://localhost:19006
 *           Backend API server running on http://localhost:7000
 */

const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const BASE_URL = "http://localhost:19006";
const BACKEND_URL = "http://localhost:7000";
const OUT_DIR = path.join(__dirname, "..", "artifacts", "articles-screenshots");

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

async function fetchArticleSlug(accessToken, locale) {
  console.log(`Fetching articles list from backend (${locale})...`);
  const response = await fetch(`${BACKEND_URL}/api/v1/articles?limit=5&locale=${locale}`, {
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "x-lang": locale,
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch articles with status ${response.status}`);
  }
  const json = await response.json();
  const items = json.data?.items || [];
  if (items.length === 0) {
    return null;
  }
  return items[0].slug;
}

async function captureScreen({ browser, name, url, locale, description, authData }) {
  const context = await browser.newContext({
    viewport: MOBILE_VIEWPORT,
    locale: locale === "ar" ? "ar-SA" : "en-US",
    timezoneId: "Africa/Cairo",
  });

  const page = await context.newPage();

  // Enable console logs from browser in terminal
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      console.log(`[Browser Error] ${msg.text()}`);
    }
  });

  console.log(`\n[${name}] Navigating to ${url}`);

  // First load the root to set locale and tokens in localStorage
  await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 45000 });

  // Set the complete locale & auth data
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

  // Now navigate to the target screen
  await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
  
  // Wait for the app shell to render and data to fetch
  await page.waitForSelector("#root > *", { timeout: 30000 });
  await page.waitForTimeout(4000); // Give extra time for React query and rendering

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

  // Fetch authentication credentials
  const authData = await loginPatient();
  console.log("Successfully retrieved auth tokens for patient.");

  // Fetch real article slugs
  const slugEn = await fetchArticleSlug(authData.tokens.accessToken, "en");
  const slugAr = await fetchArticleSlug(authData.tokens.accessToken, "ar");

  console.log(`Resolved English Slug: ${slugEn}`);
  console.log(`Resolved Arabic Slug: ${slugAr}`);

  if (!slugEn || !slugAr) {
    console.warn("WARNING: Could not retrieve real article slugs. Using fallback slug placeholder.");
  }

  const activeSlugEn = slugEn || "importance-of-work-life-balance";
  const activeSlugAr = slugAr || "importance-of-work-life-balance";

  const SCREENS = [
    {
      name: "articles_list_en",
      url: `${BASE_URL}/(patient)/articles`,
      locale: "en",
      description: "Articles Directory — English LTR",
    },
    {
      name: "articles_list_ar",
      url: `${BASE_URL}/(patient)/articles`,
      locale: "ar",
      description: "Articles Directory — Arabic RTL",
    },
    {
      name: "articles_detail_en",
      url: `${BASE_URL}/(patient)/articles/${activeSlugEn}?locale=en`,
      locale: "en",
      description: "Article Reader — English LTR",
    },
    {
      name: "articles_detail_ar",
      url: `${BASE_URL}/(patient)/articles/${activeSlugAr}?locale=ar`,
      locale: "ar",
      description: "Article Reader — Arabic RTL",
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
    path.join(OUT_DIR, "manifest.json"),
    JSON.stringify(manifest, null, 2)
  );
  console.log(`\nManifest written to ${path.join(OUT_DIR, "manifest.json")}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
