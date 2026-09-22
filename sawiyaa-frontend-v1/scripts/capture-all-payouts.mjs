import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const timestamp = "2026-08-21-154500";
const outputDir = path.resolve(`d:/Web/full-projects/sawiyaa/qa-evidence/practitioner-onboarding-web/${timestamp}`);
const baseUrl = "http://localhost:3000";

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "ar-EG",
    timezoneId: "Africa/Cairo",
  });

  const payload = Buffer.from(
    JSON.stringify({
      sub: "p1",
      email: "dr.ahmed@example.com",
      role: "PRACTITIONER",
      roles: ["PRACTITIONER"],
      exp: Math.floor(Date.now() / 1000) + 86400,
    })
  ).toString("base64url");
  const mockJwt = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${payload}.signature`;

  const userData = {
    id: "p1",
    email: "dr.ahmed@example.com",
    role: "PRACTITIONER",
    roles: ["PRACTITIONER"],
    firstName: "Ahmed",
    lastName: "Ali",
    isPractitionerApproved: false,
    isPractitionerOtpVerified: true,
    tenant: { id: "t1", name: "Sawiyaa", slug: "sawiyaa" },
  };

  await context.addCookies([
    { name: "sawiyaa_access_token", value: mockJwt, domain: "localhost", path: "/" },
    { name: "sawiyaa_user_role", value: "PRACTITIONER", domain: "localhost", path: "/" },
    { name: "sawiyaa_user_data", value: JSON.stringify(userData), domain: "localhost", path: "/" },
  ]);

  const page = await context.newPage();

  const methods = [
    { type: "WALLET", file: "payout-wallet-method.png" },
    { type: "INSTAPAY", file: "payout-instapay-method.png" },
    { type: "BANK_ACCOUNT", file: "payout-bank-method.png" },
    { type: "IBAN", file: "payout-iban-method.png" },
    { type: "PAYPAL", file: "payout-paypal-method.png" },
    { type: "OTHER", file: "payout-other-method.png" },
  ];

  for (const m of methods) {
    await page.route("**/api/v1/auth/me", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: userData }) })
    );
    await page.route("**/api/v1/practitioners/me/application", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { application: { id: "app-1", status: "APPROVED" } } }) })
    );
    await page.route("**/api/v1/practitioners/me/requirements", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { requirements: [] } }) })
    );
    await page.route("**/api/v1/practitioners/me/profile", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            profile: {
              countryCode: "EG",
              pricing: { session30: { egp: 300, usd: 10 }, session60: { egp: 550, usd: 18 } },
              payoutDestination: {
                methodType: m.type,
                accountHolderName: "د. أحمد علي",
                bankName: m.type === "BANK_ACCOUNT" ? "البنك الأهلي المصري" : null,
                bankAccountNumber: m.type === "BANK_ACCOUNT" ? "1234567890123" : null,
                iban: m.type === "IBAN" ? "EG000000000000000000000000000" : null,
                walletProvider: m.type === "WALLET" ? "VODAFONE_CASH" : null,
                walletIdentifier: m.type === "WALLET" ? "01012345678" : null,
                instapayIdentifier: m.type === "INSTAPAY" ? "ahmed@instapay" : null,
                paypalEmail: m.type === "PAYPAL" ? "dr.ahmed@example.com" : null,
                otherDetails: m.type === "OTHER" ? "تحويل شيك مصرفي أو استلام يدوي" : null,
              },
            },
          },
        }),
      })
    );
    await page.route("**/api/v1/practitioners/me/readiness", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            readiness: {
              canPublish: true,
              isApproved: true,
              isProfileComplete: true,
              hasRequiredSpecialty: true,
              hasRequiredNormalPricing: true,
              hasPayoutDestination: true,
              payoutCapabilities: [
                { methodType: "WALLET", semanticKey: "wallet" },
                { methodType: "INSTAPAY", semanticKey: "instapay" },
                { methodType: "BANK_ACCOUNT", semanticKey: "bank" },
                { methodType: "IBAN", semanticKey: "iban" },
                { methodType: "PAYPAL", semanticKey: "paypal" },
                { methodType: "OTHER", semanticKey: "other" },
              ],
            },
          },
        }),
      })
    );

    await page.goto(`${baseUrl}/ar/practitioner/application`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(outputDir, m.file), fullPage: true });
    console.log(`Captured ${m.file}`);
  }

  await context.close();
} finally {
  await browser.close();
}
