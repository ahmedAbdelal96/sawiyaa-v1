import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const backendUrl = process.env.PACKAGE_QA_BACKEND_URL ?? "http://127.0.0.1:7000";
const webUrl = process.env.PACKAGE_QA_WEB_URL ?? "http://127.0.0.1:3000";
const email = process.env.PACKAGE_QA_PATIENT_EMAIL ?? "ahmed.patient@hesba.local";
const password = process.env.PACKAGE_QA_PATIENT_PASSWORD ?? "Patient@12345";
const outputDir = path.resolve(
  process.env.PACKAGE_QA_OUTPUT_DIR ??
    "../qa-artifacts/package-user-journey-closure/visual/web",
);

async function apiJson(url, options = {}) {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`${options.method ?? "GET"} ${url} failed (${response.status})`);
  }
  return body;
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });

  const login = await apiJson(`${backendUrl}/api/v1/auth/patient/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const auth = login.data;
  const token = auth.tokens.accessToken;
  const authHeader = { Authorization: `Bearer ${token}` };
  const purchasesResponse = await apiJson(
    `${backendUrl}/api/v1/patients/me/package-purchases?limit=20`,
    { headers: authHeader },
  );
  const purchases = purchasesResponse.data?.items ?? [];
  const activePurchase = purchases.find((item) => item.status === "ACTIVE") ?? purchases[0];
  if (!activePurchase) {
    throw new Error("No package purchase was available for the authenticated QA patient.");
  }
  const detail = await apiJson(
    `${backendUrl}/api/v1/patients/me/package-purchases/${activePurchase.id}`,
    { headers: authHeader },
  );
  const offersResponse = await apiJson(
    `${backendUrl}/api/v1/public/package-offers?limit=1`,
    { headers: authHeader },
  );
  const practitionerSlug =
    offersResponse.data?.items?.[0]?.practitioner?.publicSlug ??
    activePurchase.practitioner?.publicSlug;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    locale: "ar-SA",
    timezoneId: "Africa/Cairo",
  });
  await context.addCookies([
    {
      name: "sawiyaa_access_token",
      value: auth.tokens.accessToken,
      url: webUrl,
      httpOnly: false,
      sameSite: "Lax",
    },
    {
      name: "sawiyaa_refresh_token",
      value: auth.tokens.refreshToken,
      url: webUrl,
      httpOnly: true,
      sameSite: "Lax",
    },
    {
      name: "sawiyaa_user_role",
      value: "PATIENT",
      url: webUrl,
      httpOnly: false,
      sameSite: "Lax",
    },
    {
      name: "sawiyaa_user_data",
      value: encodeURIComponent(
        JSON.stringify({
          id: auth.user.id,
          displayName: auth.user.displayName,
          roles: auth.user.roles,
          role: "PATIENT",
          primaryEmail: auth.user.primaryEmail,
          practitionerProfileId: null,
          practitionerStatus: null,
        }),
      ),
      url: webUrl,
      httpOnly: false,
      sameSite: "Lax",
    },
  ]);

  const pages = [
    {
      name: "package-offer-ar",
      path: "/ar/packages",
      actor: "patient",
      expected: ["باقة", "شراء", "جلسات"],
    },
    {
      name: "my-packages-ar",
      path: "/ar/patient/package-purchases",
      actor: "patient",
      expected: ["باقاتي", "جلسات"],
    },
    {
      name: "package-detail-ar",
      path: `/ar/patient/package-purchases/${activePurchase.id}`,
      actor: "patient",
      expected: ["تفاصيل", "جلسات", "متبقي"],
    },
    ...(practitionerSlug
      ? [
          {
            name: "package-practitioner-offer-ar",
            path: `/ar/practitioners/${practitionerSlug}`,
            actor: "patient",
            expected: ["باقات", "جلسات"],
          },
        ]
      : []),
  ];

  const results = [];
  for (const item of pages) {
    const page = await context.newPage();
    const consoleErrors = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    const url = `${webUrl}${item.path}`;
    await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
    await page.waitForTimeout(1_500);
    const bodyText = (await page.locator("body").innerText()).replace(/\s+/g, " ");
    const missingExpected = item.expected.filter((needle) => !bodyText.includes(needle));
    const screenshotPath = path.join(outputDir, `${item.name}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    results.push({
      ...item,
      url,
      screenshot: screenshotPath,
      status: missingExpected.length === 0 ? "PASS" : "CONDITIONAL",
      missingExpected,
      consoleErrors,
      bodyPreview: bodyText.slice(0, 500),
    });
    await page.close();
  }

  await browser.close();
  await fs.writeFile(
    path.join(outputDir, "manifest.json"),
    JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        backendUrl,
        webUrl,
        patientId: auth.user.id,
        purchaseId: activePurchase.id,
        purchaseStatus: activePurchase.status,
        progress: detail.data?.item?.progress ?? activePurchase.progress ?? null,
        results,
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ purchaseId: activePurchase.id, results }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
