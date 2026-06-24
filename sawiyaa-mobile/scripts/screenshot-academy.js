/**
 * Playwright screenshot script for Sawiyaa Academy screens.
 * Captures EN and AR screenshots of the Academy Browse, Detail, Enroll, Enrollment Detail, and Payment Return screens.
 * 
 * Usage: node scripts/screenshot-academy.js
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

async function fetchCourses(accessToken) {
  console.log("Fetching academy courses...");
  const response = await fetch(`${BACKEND_URL}/api/v1/academy/courses?page=1&limit=5`, {
    headers: { "Authorization": `Bearer ${accessToken}` }
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch courses: ${response.status}`);
  }
  const json = await response.json();
  return json.data?.items || [];
}

async function createEnrollment(accessToken, slug) {
  console.log(`Creating academy enrollment for course: ${slug}...`);
  const rand = Math.floor(10000000 + Math.random() * 90000000);
  const email = `ahmed.patient.${rand}@hesba.local`;
  const phone = `+2010${rand}`;
  const response = await fetch(`${BACKEND_URL}/api/v1/academy/courses/${slug}/enrollments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      fullName: "Ahmed Patient",
      phoneNumber: phone,
      whatsappNumber: phone,
      email: email,
      sourceLabel: "mobile-academy"
    })
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to create enrollment: ${response.status} - ${text}`);
  }
  const json = await response.json();
  return json.data?.item || json.data || null;
}

async function captureScreen({ browser, name, url, locale, description, authData }) {
  const context = await browser.newContext({
    viewport: MOBILE_VIEWPORT,
    locale: locale === "ar" ? "ar-SA" : "en-US",
    timezoneId: "Africa/Cairo",
  });

  const page = await context.newPage();

  page.on("console", (msg) => {
    console.log(`[Browser Console - ${msg.type()}] ${msg.text()}`);
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

  const courses = await fetchCourses(authData.tokens.accessToken);
  if (courses.length === 0) {
    throw new Error("No academy courses available in backend.");
  }
  const course = courses[0];
  console.log(`Using course: ${course.title} (${course.slug})`);

  const enrollment = await createEnrollment(authData.tokens.accessToken, course.slug);
  if (!enrollment) {
    throw new Error("Failed to create/fetch enrollment.");
  }
  const enrollmentId = enrollment.id;
  const token = enrollment.publicAccessToken;
  console.log(`Using enrollment ID: ${enrollmentId}, Token: ${token}`);

  const SCREENS = [
    {
      name: "academy_browse_en",
      url: `${BASE_URL}/(patient)/academy`,
      locale: "en",
      description: "Academy Browse — English LTR",
    },
    {
      name: "academy_browse_ar",
      url: `${BASE_URL}/(patient)/academy`,
      locale: "ar",
      description: "Academy Browse — Arabic RTL",
    },
    {
      name: "academy_detail_en",
      url: `${BASE_URL}/(patient)/academy/${course.slug}`,
      locale: "en",
      description: "Academy Detail — English LTR",
    },
    {
      name: "academy_detail_ar",
      url: `${BASE_URL}/(patient)/academy/${course.slug}`,
      locale: "ar",
      description: "Academy Detail — Arabic RTL",
    },
    {
      name: "academy_enroll_en",
      url: `${BASE_URL}/(patient)/academy/enroll/${course.slug}`,
      locale: "en",
      description: "Academy Enroll — English LTR",
    },
    {
      name: "academy_enroll_ar",
      url: `${BASE_URL}/(patient)/academy/enroll/${course.slug}`,
      locale: "ar",
      description: "Academy Enroll — Arabic RTL",
    },
    {
      name: "academy_enrollment_detail_en",
      url: `${BASE_URL}/(patient)/academy/enrollments/${enrollmentId}?token=${token}`,
      locale: "en",
      description: "Enrollment Detail — English LTR",
    },
    {
      name: "academy_enrollment_detail_ar",
      url: `${BASE_URL}/(patient)/academy/enrollments/${enrollmentId}?token=${token}`,
      locale: "ar",
      description: "Enrollment Detail — Arabic RTL",
    },
    {
      name: "academy_payment_return_en",
      url: `${BASE_URL}/(patient)/academy/enrollments/${enrollmentId}/payment-return?token=${token}&redirect_status=succeeded`,
      locale: "en",
      description: "Payment Return — English LTR",
    },
    {
      name: "academy_payment_return_ar",
      url: `${BASE_URL}/(patient)/academy/enrollments/${enrollmentId}/payment-return?token=${token}&redirect_status=succeeded`,
      locale: "ar",
      description: "Payment Return — Arabic RTL",
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
    path.join(OUT_DIR, "manifest_academy.json"),
    JSON.stringify(manifest, null, 2)
  );
  console.log(`\nManifest written to ${path.join(OUT_DIR, "manifest_academy.json")}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
