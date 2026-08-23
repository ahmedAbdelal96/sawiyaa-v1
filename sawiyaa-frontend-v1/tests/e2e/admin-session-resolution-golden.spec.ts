import { expect, Page, test } from "@playwright/test";
import { createHash, randomUUID } from "node:crypto";
import { PrismaClient } from "../../../sawiyaa-backend-v1/src/generated/prisma/index.js";
import bcrypt from "../../../sawiyaa-backend-v1/node_modules/bcryptjs/index.js";

test.describe.configure({ mode: "default" });

const prisma = new PrismaClient();
const adminEmail = process.env.E2E_ADMIN_EMAIL ?? "phase-c-cert-20260810@hesba.local";
const adminPassword = process.env.E2E_ADMIN_PASSWORD ?? "PhaseCAdmin@12345";
const namespace = `phase-c-golden-${process.env.GOLDEN_RUN_ID ?? Date.now()}`;
const id = (key: string) => `${createHash("md5").update(`${namespace}:${key}`).digest("hex").slice(0, 8)}-${createHash("md5").update(`${namespace}:${key}`).digest("hex").slice(8, 12)}-4${createHash("md5").update(`${namespace}:${key}`).digest("hex").slice(13, 16)}-a${createHash("md5").update(`${namespace}:${key}`).digest("hex").slice(17, 20)}-${createHash("md5").update(`${namespace}:${key}`).digest("hex").slice(20, 32)}`;
const fixtureIds: string[] = [];
let adminId = "";
let patientId = "";
let practitionerId = "";
let patientUserId = "";
let practitionerUserId = "";
const goldenAdminId = "a0c0f3e1-8d6f-4f43-9e58-4a7f4b9a1d01";
let availabilityWeekId = "";
let directReplacementStart = "";
let packageReplacementStart = "";

async function makeFixture(key: string, options: { package?: boolean; amount?: number; original?: string } = {}) {
  const sessionId = id(`session:${key}`);
  const paymentId = id(`payment:${key}`);
  const purchaseId = options.package ? id(`purchase:${key}`) : null;
  fixtureIds.push(sessionId);
  const start = new Date(Date.now() - 90 * 60_000);
  await prisma.session.create({ data: { id: sessionId, sessionCode: `G${createHash("md5").update(`${namespace}:${key}`).digest("hex").slice(0, 14)}`, patientId, practitionerId, flowType: "SCHEDULED", sessionMode: "VIDEO", durationMinutes: 30, status: "AWAITING_ADMIN_RESOLUTION", paymentCoverageType: options.package ? "PACKAGE" : "DIRECT_PAYMENT", packagePurchaseId: null, packageSessionIndex: options.package ? 2 : null, packageSessionCount: options.package ? 3 : null, originalSessionId: options.original ?? null, earningEntitlementId: id(`entitlement:${key}`), patientCountrySnapshot: "EG", practitionerCountrySnapshot: "EG", countryRelationshipSnapshot: "SAME_COUNTRY", suggestedPractitionerPercentageSnapshot: 80, pricingPolicySnapshotJson: { source: "golden-fixture", commission: 20 }, provider: "NONE", scheduledStartAt: start, scheduledEndAt: new Date(start.getTime() + 30 * 60_000) } });
  if (options.package) {
    await prisma.payment.create({ data: { id: paymentId, sessionId: null, patientId, practitionerId, paymentPurpose: "SESSION_PACKAGE_PURCHASE", provider: "STRIPE", status: "CAPTURED", amountSubtotal: 1200, amountDiscount: 0, amountTotal: 1200, amountFromWallet: 0, amountFromGateway: 1200, currencyCode: "EGP", commissionPlatformRatePercent: 20, commissionPractitionerRatePercent: 80, metadataJson: { financialBreakdown: { practitionerShareAmount: "960.00", platformCommissionAmount: "240.00" } }, capturedAt: new Date() } });
    await prisma.patientPackagePurchase.create({ data: { id: purchaseId!, practitionerId, patientId, paymentId, status: "ACTIVE", paidAt: new Date(), activatedAt: new Date(), titleSnapshot: "Golden Package", descriptionSnapshot: "Golden E2E package", slugSnapshot: `golden-${key}`, packageVersionSnapshot: 1, sessionCountSnapshot: 3, discountPercentSnapshot: 25, baseSessionPriceEgpSnapshot: 500, undiscountedTotalSnapshot: 1500, discountAmountSnapshot: 300, patientPayableTotalSnapshot: 1200, platformDiscountShareSnapshot: 160, practitionerDiscountShareSnapshot: 140, platformOriginalShareSnapshot: 750, practitionerOriginalShareSnapshot: 750, platformFinalShareSnapshot: 590, practitionerFinalShareSnapshot: 610, sessionDurationMinutesSnapshot: 30, sessionModeSnapshot: "VIDEO", schedulePolicySnapshot: "ALLOW_SCHEDULE_LATER", selectedCurrencyCode: "EGP", selectedAmountSnapshot: 1200 } });
    await prisma.session.update({ where: { id: sessionId }, data: { packagePurchaseId: purchaseId } });
  } else {
    const amount = options.amount ?? 650;
    await prisma.payment.create({ data: { id: paymentId, sessionId, patientId, practitionerId, paymentPurpose: "SESSION_BOOKING", provider: "STRIPE", status: "CAPTURED", amountSubtotal: 800, amountDiscount: 150, amountTotal: amount, amountFromWallet: 0, amountFromGateway: amount, currencyCode: "EGP", commissionPlatformRatePercent: 20, commissionPractitionerRatePercent: 80, metadataJson: { financialBreakdown: { practitionerShareAmount: "520.00", platformCommissionAmount: "130.00" } }, capturedAt: new Date() } });
  }
  await prisma.sessionResolutionCase.create({ data: { sessionId, status: "OPEN", suggestedOutcome: "AWAITING_ADMIN_RESOLUTION", suggestedPatientRemedy: "KEEP_ORIGINAL", suggestedPractitionerRemedy: "NO_EARNING", evidenceSnapshotJson: { patientAttendance: 0, practitionerAttendance: 0, overlapMinutes: 0 } } });
  return { sessionId, paymentId, purchaseId };
}

async function signIn(page: Page) {
  await expect(page).not.toHaveURL(/signin\/admin/);
}

async function choose(page: Page, sessionId: string, remedy: string, practitionerRemedy = "NO_EARNING", finding = "TECHNICAL_ISSUE", reason = "TECHNICAL_VIDEO_PROBLEM") {
  await page.goto(`/en/admin/sessions/${sessionId}/review`);
  await expect(page.getByRole("button", { name: /Preview decision impact/i })).toBeVisible();
  const selects = page.locator("select");
  await selects.nth(0).selectOption(finding);
  await selects.nth(1).selectOption("PATIENT_NO_SHOW");
  await selects.nth(2).selectOption(remedy);
  await selects.nth(3).selectOption(practitionerRemedy);
  await selects.nth(4).selectOption(reason);
  await page.locator("textarea").first().fill(`Golden ${finding} ${remedy}`);
}

test.beforeAll(async () => {
  const passwordHash = await bcrypt.hash(adminPassword, 12);
  adminId = goldenAdminId; patientUserId = id("patient-user"); practitionerUserId = id("practitioner-user"); patientId = id("patient"); practitionerId = id("practitioner");
  await prisma.user.createMany({ data: [{ id: patientUserId, displayName: "Golden Patient" }, { id: practitionerUserId, displayName: "Golden Practitioner", timezone: "UTC" }] });
  await prisma.patientProfile.create({ data: { id: patientId, userId: patientUserId } });
  await prisma.practitionerProfile.create({ data: { id: practitionerId, userId: practitionerUserId, publicSlug: `${namespace}-practitioner`, practitionerType: "OTHER", status: "DRAFT" } });
  await prisma.practitionerWallet.create({ data: { id: id("practitioner-wallet"), practitionerId, currencyCode: "EGP" } });
  // The browser submits datetime-local values in its Cairo timezone (+03:00);
  // choose displayed 13:00/14:00 so the authoritative UTC slots are 10:00/11:00.
  const base = new Date(); base.setUTCDate(base.getUTCDate() + 8); base.setUTCHours(13, 0, 0, 0);
  const weekStart = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate() - base.getUTCDay()));
  const weekEnd = new Date(weekStart); weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
  directReplacementStart = base.toISOString();
  const packageStart = new Date(base); packageStart.setUTCHours(14, 0, 0, 0); packageReplacementStart = packageStart.toISOString();
  availabilityWeekId = id("availability-current-next");
  await prisma.practitionerAvailabilityWeek.create({ data: { id: availabilityWeekId, practitionerId, weekStartDate: weekStart, weekEndDate: weekEnd, timezone: "UTC", status: "PUBLISHED", publishedAt: new Date() } });
  await prisma.practitionerAvailabilityWeekSlot.create({ data: { id: id("availability-slot-current-next"), weekId: availabilityWeekId, weekday: ["SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"][base.getUTCDay()] as any, startMinuteOfDay: 9 * 60, endMinuteOfDay: 12 * 60, durationMinutes: 30, timezone: "UTC" } });
  await makeFixture("accounting", { amount: 650 });
  await makeFixture("package-wallet", { package: true });
  await makeFixture("package-restore", { package: true });
  await makeFixture("direct-replacement");
  await makeFixture("package-replacement", { package: true });
  await makeFixture("other");
  await makeFixture("stale", { amount: 650 });
});

test.afterAll(async () => {
  const refunds = await prisma.refund.findMany({ where: { OR: [{ sessionId: { in: fixtureIds } }, { payment: { patientId } }] }, select: { id: true } });
  await prisma.refundEvent.deleteMany({ where: { refundId: { in: refunds.map((r) => r.id) } } });
  await prisma.customerWalletEntry.deleteMany({ where: { sessionId: { in: fixtureIds } } });
  await prisma.refund.deleteMany({ where: { sessionId: { in: fixtureIds } } });
  await prisma.sessionResolution.deleteMany({ where: { sessionId: { in: fixtureIds } } });
  await prisma.sessionResolutionCase.deleteMany({ where: { sessionId: { in: fixtureIds } } });
  await prisma.sessionPackageEntitlementDecision.deleteMany({ where: { sessionId: { in: fixtureIds } } });
  await prisma.sessionEarningReview.deleteMany({ where: { sessionId: { in: fixtureIds } } });
  await prisma.session.deleteMany({ where: { id: { in: fixtureIds } } });
  const remainingPatientSessions = await prisma.session.findMany({ where: { patientId }, select: { id: true } });
  if (remainingPatientSessions.length) {
    const remainingIds = remainingPatientSessions.map((session) => session.id);
    await prisma.sessionEvent.deleteMany({ where: { sessionId: { in: remainingIds } } });
    await prisma.sessionEarningReview.deleteMany({ where: { sessionId: { in: remainingIds } } });
    await prisma.session.deleteMany({ where: { id: { in: remainingIds } } });
  }
  await prisma.patientPackagePurchase.deleteMany({ where: { patientId } });
  await prisma.refundEvent.deleteMany({ where: { refund: { payment: { patientId } } } });
  await prisma.payment.deleteMany({ where: { patientId } });
  await prisma.patientProfile.deleteMany({ where: { id: patientId } });
  await prisma.practitionerWallet.deleteMany({ where: { practitionerId } });
  if (availabilityWeekId) await prisma.practitionerAvailabilityWeek.deleteMany({ where: { id: availabilityWeekId } });
  await prisma.practitionerProfile.deleteMany({ where: { id: practitionerId } });
  await prisma.user.deleteMany({ where: { id: { in: [patientUserId, practitionerUserId] } } });
  await prisma.$disconnect();
});

test("ADMIN-RESOLUTION-03 direct wallet plus practitioner accounting", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", (e) => errors.push(e.message)); page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await signIn(page); await choose(page, id("session:accounting"), "CREDIT_WALLET", "CREATE_EARNING_REVIEW", "PATIENT_NO_SHOW", "GOODWILL_EXCEPTION");
  const preview = page.waitForResponse((r) => r.url().includes("/resolution/preview") && r.request().method() === "POST");
  await page.getByRole("button", { name: /Preview decision impact/i }).click();
  const previewResponse = await preview; expect(previewResponse.status()).toBe(201); await expect(page.locator("body")).toContainText("650");
  const execute = page.waitForResponse((r) => r.url().match(/\/resolution$/) && r.request().method() === "POST");
  await page.getByRole("button", { name: /Confirm & Execute Resolution/i }).click(); const executeResponse = await execute; if (executeResponse.status() !== 201) throw new Error(`golden execute failed ${executeResponse.status()}: ${await executeResponse.text()}`); expect(errors).toEqual([]);
  expect(await prisma.customerWalletEntry.count({ where: { sessionId: id("session:accounting"), entryType: "REFUND_CREDIT" } })).toBe(1);
  expect(await prisma.sessionEarningReview.count({ where: { sessionId: id("session:accounting"), reviewStatus: "PENDING_REVIEW" } })).toBe(1);
});

test("ADMIN-RESOLUTION-04 package wallet uses allocation", async ({ page }) => {
  await signIn(page); await choose(page, id("session:package-wallet"), "CREDIT_WALLET");
  const response = page.waitForResponse((r) => r.url().includes("/resolution/preview") && r.request().method() === "POST"); await page.getByRole("button", { name: /Preview decision impact/i }).click(); expect((await response).status()).toBe(201); await expect(page.locator("body")).toContainText("400");
  await page.getByRole("button", { name: /Confirm & Execute Resolution/i }).click(); await expect(page).toHaveURL(/\/admin\/sessions$/);
  expect(await prisma.customerWalletEntry.count({ where: { sessionId: id("session:package-wallet"), entryType: "REFUND_CREDIT" } })).toBe(1);
});

test("ADMIN-RESOLUTION-05 package restore", async ({ page }) => {
  await signIn(page); await choose(page, id("session:package-restore"), "RESTORE_PACKAGE", "NO_EARNING", "PATIENT_NO_SHOW", "PATIENT_DID_NOT_ATTEND");
  await page.getByRole("button", { name: /Preview decision impact/i }).click(); await expect(page.locator("body")).toContainText(/Decision impact/i); await page.getByRole("button", { name: /Confirm & Execute Resolution/i }).click(); await expect(page).toHaveURL(/\/admin\/sessions$/);
  expect(await prisma.sessionPackageEntitlementDecision.count({ where: { sessionId: id("session:package-restore"), decisionType: "RESTORE_TO_PACKAGE" } })).toBe(1);
});

test("ADMIN-RESOLUTION-06 direct replacement", async ({ page }) => {
  await signIn(page); await choose(page, id("session:direct-replacement"), "CREATE_REPLACEMENT_SESSION", "NO_EARNING", "PATIENT_NO_SHOW", "REPLACEMENT_AGREED");
  const replacement = page.locator('input[type="datetime-local"]'); await expect(replacement).toBeVisible(); await replacement.fill(directReplacementStart.slice(0, 16)); await page.getByRole("button", { name: /Preview decision impact/i }).click(); const exec = page.waitForResponse((r) => r.url().match(/\/resolution$/) && r.request().method() === "POST"); await page.getByRole("button", { name: /Confirm & Execute Resolution/i }).click(); const execResponse = await exec; if (execResponse.status() !== 201) throw new Error(`replacement execute ${execResponse.status()}: ${await execResponse.text()}`); await expect(page).toHaveURL(/\/admin\/sessions$/);
  const rows = await prisma.session.findMany({ where: { originalSessionId: id("session:direct-replacement") } }); expect(rows).toHaveLength(1); expect(rows[0].fundingSource).toBe("ADMIN_REPLACEMENT"); expect(await prisma.payment.count({ where: { sessionId: rows[0].id } })).toBe(0);
});

test("ADMIN-RESOLUTION-07 package replacement", async ({ page }) => {
  await signIn(page); await choose(page, id("session:package-replacement"), "CREATE_REPLACEMENT_SESSION", "NO_EARNING", "PATIENT_NO_SHOW", "REPLACEMENT_AGREED"); await page.locator('input[type="datetime-local"]').fill(packageReplacementStart.slice(0, 16)); await page.getByRole("button", { name: /Preview decision impact/i }).click(); await page.getByRole("button", { name: /Confirm & Execute Resolution/i }).click(); await expect(page).toHaveURL(/\/admin\/sessions$/);
  const rows = await prisma.session.findMany({ where: { originalSessionId: id("session:package-replacement") } }); expect(rows).toHaveLength(1); expect(await prisma.payment.count({ where: { sessionId: rows[0].id } })).toBe(0);
});

test("ADMIN-RESOLUTION-09 OTHER requires note", async ({ page }) => {
  await signIn(page); await choose(page, id("session:other"), "KEEP_ORIGINAL", "NO_EARNING", "OTHER", "OTHER"); await page.locator("textarea").first().fill(""); const previewButton = page.getByRole("button", { name: /Preview decision impact/i }); await expect(previewButton).toBeDisabled(); await expect(page.locator("body")).toContainText(/explanation|custom finding/i); await page.locator("textarea").first().fill("Documented exception"); await expect(previewButton).toBeEnabled(); await previewButton.click(); await page.getByRole("button", { name: /Confirm & Execute Resolution/i }).click(); await expect(page).toHaveURL(/\/admin\/sessions$/); const row = await prisma.sessionResolution.findFirstOrThrow({ where: { sessionId: id("session:other") } }); expect(row.findingCode).toBe("OTHER"); expect(row.customReasonNote).toBe("Documented exception");
});

test("ADMIN-RESOLUTION-10 stale preview is rejected", async ({ page }) => {
  await signIn(page); await choose(page, id("session:stale"), "CREDIT_WALLET");
  const previewRequestPromise = page.waitForRequest((r) => r.url().includes("/resolution/preview") && r.method() === "POST");
  const previewResponsePromise = page.waitForResponse((r) => r.url().includes("/resolution/preview") && r.request().method() === "POST");
  await page.getByRole("button", { name: /Preview decision impact/i }).click();
  const previewRequest = await previewRequestPromise;
  const previewResponse = await previewResponsePromise;
  const previewBody = await previewResponse.json();
  const previewPlanHashA = previewBody?.data?.planHash ?? previewBody?.planHash;
  expect(previewPlanHashA).toEqual(expect.any(String));
  console.log('[STALE DIAGNOSTICS] sessionId', id("session:stale"), 'paymentId', id("payment:stale"), 'previewRequest', previewRequest.postDataJSON(), 'planHashA', previewPlanHashA);
  const beforePayment = await prisma.payment.findUniqueOrThrow({ where: { id: id("payment:stale") }, select: { amountTotal: true } });
  await prisma.payment.update({ where: { id: id("payment:stale") }, data: { amountSubtotal: 790, amountTotal: 640, amountFromGateway: 640, metadataJson: { financialBreakdown: { practitionerShareAmount: "512.00", platformCommissionAmount: "128.00" } } } });
  const diagnostic = await page.request.post(`/api/v1/admin/sessions/${id("session:stale")}/resolution/preview`, { data: { ...previewRequest.postDataJSON(), previewHash: undefined } });
  expect(diagnostic.status()).toBe(201);
  const diagnosticBody = await diagnostic.json();
  const previewPlanHashB = diagnosticBody?.data?.planHash ?? diagnosticBody?.planHash;
  expect(previewPlanHashB).toEqual(expect.any(String));
  expect(previewPlanHashB).not.toBe(previewPlanHashA);
  console.log('[STALE DIAGNOSTICS] mutated amountTotal 650 -> 640 planHashB', previewPlanHashB);
  const executeRequestPromise = page.waitForRequest((r) => r.url().match(/\/resolution$/) && r.method() === "POST");
  const executeResponsePromise = page.waitForResponse((r) => r.url().match(/\/resolution$/) && r.request().method() === "POST");
  await page.getByRole("button", { name: /Confirm & Execute Resolution/i }).click();
  const executeRequest = await executeRequestPromise;
  const executeResponse = await executeResponsePromise;
  console.log('[STALE DIAGNOSTICS] executeRequest', executeRequest.postDataJSON(), 'status', executeResponse.status(), 'body', await executeResponse.text());
  expect(executeRequest.postDataJSON().previewHash).toBe(previewPlanHashA);
  expect(executeResponse.status()).toBe(409);
  expect(JSON.stringify(await executeResponse.json())).toMatch(/STALE|stale/i);
  await expect(page.locator("body")).toContainText(/changed|refresh|stale/i);
  expect(await prisma.sessionResolution.count({ where: { sessionId: id("session:stale") } })).toBe(0);
  expect((await prisma.payment.findUniqueOrThrow({ where: { id: id("payment:stale") }, select: { amountTotal: true } })).amountTotal.toString()).toBe("640");
  expect(beforePayment.amountTotal.toString()).toBe("650");
});
