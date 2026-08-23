import { expect, Page, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "../../../sawiyaa-backend-v1/src/generated/prisma/index.js";
import bcrypt from "../../../sawiyaa-backend-v1/node_modules/bcryptjs/index.js";

const prisma = new PrismaClient();
const e2eAdminEmail = process.env.E2E_ADMIN_EMAIL ?? "phase-c-admin-e2e@hesba.local";
const e2eAdminPassword = process.env.E2E_ADMIN_PASSWORD ?? "PhaseCAdmin@12345";
let e2eAdminId = "";
const e2eAdminIds: string[] = [];
let e2eSessionId = "";
let e2ePatientId = "";
let e2ePractitionerId = "";
let e2ePatientUserId = "";
let e2ePractitionerUserId = "";
let e2ePaymentId = "";
let e2eWalletId = "";

test.beforeAll(async () => {
  const passwordHash = await bcrypt.hash(e2eAdminPassword, 12);
  for (let i = 0; i < 4; i++) { const id = randomUUID(); e2eAdminIds.push(id); await prisma.user.create({ data: { id, displayName: `Phase C E2E Admin ${i}`, status: "ACTIVE", emails: { create: { email: i === 0 ? e2eAdminEmail : `${e2eAdminEmail.replace("@", `+${i}@`)}`, isPrimary: true, isVerified: true } }, roles: { create: { role: "SUPER_ADMIN" } }, authIdentities: { create: { provider: "PASSWORD", passwordHash, isEnabled: true } } } }); }
  e2eAdminId = e2eAdminIds[0];
  e2ePatientUserId = randomUUID(); e2ePractitionerUserId = randomUUID(); e2ePatientId = randomUUID(); e2ePractitionerId = randomUUID(); e2eSessionId = randomUUID();
  await prisma.user.createMany({ data: [{ id: e2ePatientUserId, displayName: "Phase C E2E Patient" }, { id: e2ePractitionerUserId, displayName: "Phase C E2E Practitioner" }] });
  await prisma.patientProfile.create({ data: { id: e2ePatientId, userId: e2ePatientUserId } });
  await prisma.practitionerProfile.create({ data: { id: e2ePractitionerId, userId: e2ePractitionerUserId, publicSlug: `phase-c-e2e-${e2ePractitionerId}`, practitionerType: "OTHER", status: "DRAFT" } });
  await prisma.session.create({ data: { id: e2eSessionId, sessionCode: `PC-E2E-${e2eSessionId.slice(0, 8)}`, patientId: e2ePatientId, practitionerId: e2ePractitionerId, flowType: "SCHEDULED", sessionMode: "VIDEO", durationMinutes: 30, status: "AWAITING_ADMIN_RESOLUTION", paymentCoverageType: "DIRECT_PAYMENT", provider: "NONE", scheduledStartAt: new Date(Date.now() - 3600000), scheduledEndAt: new Date(Date.now() - 1800000) } });
  e2ePaymentId = randomUUID(); await prisma.payment.create({ data: { id: e2ePaymentId, sessionId: e2eSessionId, patientId: e2ePatientId, practitionerId: e2ePractitionerId, paymentPurpose: "SESSION_BOOKING", provider: "STRIPE", status: "CAPTURED", amountSubtotal: 275, amountDiscount: 0, amountTotal: 275, amountFromWallet: 0, amountFromGateway: 275, currencyCode: "EGP", commissionPlatformRatePercent: 20, capturedAt: new Date() } });
  e2eWalletId = randomUUID(); await prisma.practitionerWallet.create({ data: { id: e2eWalletId, practitionerId: e2ePractitionerId, currencyCode: "EGP" } });
  await prisma.sessionResolutionCase.create({ data: { sessionId: e2eSessionId, status: "OPEN", suggestedOutcome: "AWAITING_ADMIN_RESOLUTION", suggestedPatientRemedy: "KEEP_ORIGINAL", suggestedPractitionerRemedy: "NO_EARNING", evidenceSnapshotJson: { patientAttendance: 0, practitionerAttendance: 0, overlapMinutes: 0 } } });
});
test.afterAll(async () => {
  if (e2eSessionId) { await prisma.sessionResolution.deleteMany({ where: { sessionId: e2eSessionId } }); await prisma.sessionResolutionCase.deleteMany({ where: { sessionId: e2eSessionId } }); const refunds = await prisma.refund.findMany({ where: { sessionId: e2eSessionId }, select: { id: true } }); await prisma.refundEvent.deleteMany({ where: { refundId: { in: refunds.map((r) => r.id) } } }); await prisma.refund.deleteMany({ where: { sessionId: e2eSessionId } }); await prisma.customerWalletEntry.deleteMany({ where: { sessionId: e2eSessionId } }); const reviews = await prisma.sessionEarningReview.findMany({ where: { sessionId: e2eSessionId }, select: { id: true } }); await prisma.financialOperationIdempotency.deleteMany({ where: { reviewId: { in: reviews.map((r) => r.id) } } }); await prisma.practitionerEarningAdjustment.deleteMany({ where: { sessionEarningReviewId: { in: reviews.map((r) => r.id) } } }); await prisma.sessionEarningReview.deleteMany({ where: { id: { in: reviews.map((r) => r.id) } } }); await prisma.payment.delete({ where: { id: e2ePaymentId } }); await prisma.session.delete({ where: { id: e2eSessionId } }); }
  if (e2eWalletId) await prisma.practitionerWallet.delete({ where: { id: e2eWalletId } });
  if (e2ePatientId) await prisma.patientProfile.delete({ where: { id: e2ePatientId } });
  if (e2ePractitionerId) await prisma.practitionerProfile.delete({ where: { id: e2ePractitionerId } });
  await prisma.user.deleteMany({ where: { id: { in: [e2ePatientUserId, e2ePractitionerUserId] } } });
  await prisma.user.deleteMany({ where: { id: { in: e2eAdminIds } } }); await prisma.$disconnect();
});

async function signInAdmin(page: Page, locale = "en", accountIndex = 0) {
  page.on("console", (msg) => console.log(`[browser:${msg.type()}] ${msg.text()}`));
  page.on("response", async (response) => {
    if (response.url().includes("/auth/admin/login")) console.log(`[admin-login-response] ${response.status()} ${response.url()} ${await response.text().catch(() => "")}`);
    if (response.status() === 403) console.log(`[forbidden] ${response.url()}`);
  });
  await page.goto(`/${locale}/signin/admin`);
  const email = accountIndex === 0 ? e2eAdminEmail : `${e2eAdminEmail.replace("@", `+${accountIndex}@`)}`;
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(e2eAdminPassword);
  await page.locator("button").filter({ hasText: /sign in|login|تسجيل الدخول/i }).last().click();
  await expect(page).not.toHaveURL(/signin\/admin/, { timeout: 15_000 });
}

test("seeded Admin can authenticate and reach the sessions workspace", async ({ page }) => {
  await signInAdmin(page, "en", 0);
  await page.goto("/en/admin/sessions");
  await expect(page).not.toHaveURL(/signin\/admin/);
  await expect(page.locator("body")).not.toContainText("missing-key-warning");
});

test("Arabic Admin workspace is RTL and does not expose raw enum keys", async ({ page }) => {
  await signInAdmin(page, "ar", 1);
  await page.goto("/ar/admin/sessions");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("body")).not.toContainText(/PATIENT_NO_SHOW|CREDIT_WALLET|CREATE_EARNING_REVIEW/);
});

test("Admin can open the real insufficient-evidence review workspace", async ({ page }) => {
  await signInAdmin(page, "en", 2);
  await page.goto(`/en/admin/sessions/${e2eSessionId}/review`);
  await expect(page).toHaveURL(new RegExp(`/en/admin/sessions/${e2eSessionId}/review`));
  await expect(page.locator("body")).not.toContainText(/PATIENT_NO_SHOW|CREDIT_WALLET|CREATE_EARNING_REVIEW/);
  await expect(page.locator("body")).toContainText(/insufficient|resolution|decision/i);
});

test("Arabic review workspace is RTL and localized", async ({ page }) => {
  await signInAdmin(page, "ar", 3);
  await page.goto(`/ar/admin/sessions/${e2eSessionId}/review`);
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("body")).not.toContainText(/PATIENT_NO_SHOW|CREDIT_WALLET|CREATE_EARNING_REVIEW/);
});

test("Admin previews the real direct-payment wallet refund", async ({ page }) => {
  await signInAdmin(page, "en", 0);
  await page.goto(`/en/admin/sessions/${e2eSessionId}/review`);
  const selects = page.locator("select");
  await selects.nth(0).selectOption("TECHNICAL_ISSUE");
  await selects.nth(2).selectOption("CREDIT_WALLET");
  await selects.nth(3).selectOption("CREATE_EARNING_REVIEW");
  await page.locator("textarea").first().fill("Direct wallet refund E2E");
  await page.getByRole("button", { name: /Preview decision impact/i }).click();
  await expect(page.locator("body")).toContainText(/275(?:\.00)?/);
  await expect(page.locator("body")).not.toContainText(/CREDIT_WALLET|CREATE_EARNING_REVIEW/);
  await page.getByRole("button", { name: /Confirm & Execute Resolution/i }).click();
  await expect(page).toHaveURL(/\/en\/admin\/sessions$/);
});
