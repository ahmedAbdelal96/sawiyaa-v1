import { chromium } from "playwright";
import fs from "node:fs";

const FRONTEND = process.env.FRONTEND_BASE_URL || "http://localhost:3000";
const email = process.env.QA_EMAIL;
const password = process.env.QA_PASSWORD;
const fixtureDir = process.env.QA_FIXTURE_DIR;
const out = process.env.QA_OUT_DIR || "artifacts/qa-practitioner-application";
fs.mkdirSync(out, { recursive: true });

const ar = (value) => new RegExp(value);
const rx = {
  saveDraft: ar("\\u062d\\u0641\\u0638 \\u0627\\u0644\\u0645\\u0633\\u0648\\u062f\\u0629"),
  upload: ar("^\\u0631\\u0641\\u0639 \\u0645\\u0633\\u062a\\u0646\\u062f$"),
  cancel: ar("^\\u0625\\u0644\\u063a\\u0627\\u0621$"),
  modalSave: ar("^\\u062d\\u0641\\u0638$"),
  next: ar("^\\u0627\\u0644\\u062a\\u0627\\u0644\\u064a$"),
  submit: ar("\\u0625\\u0631\\u0633\\u0627\\u0644 \\u0627\\u0644\\u0637\\u0644\\u0628"),
};

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();
const results = { account: email, validations: [], uploads: [], persistence: null, submission: null, duplicateSubmission: null };

async function waitStable() {
  await page.waitForTimeout(500);
}

async function loginAndOpen() {
  await page.goto(`${FRONTEND}/ar/signin/practitioner`, { waitUntil: "domcontentloaded" });
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await waitStable();
  await page.goto(`${FRONTEND}/ar/practitioner/application`, { waitUntil: "domcontentloaded" }).catch(() => undefined);
  await page.waitForTimeout(1200);
  if (!(await page.getByRole("button", { name: /^1/ }).count())) {
    await page.goto(`${FRONTEND}/ar/practitioner/application`, { waitUntil: "domcontentloaded" }).catch(() => undefined);
    await page.waitForTimeout(1200);
  }
}

async function clickStep(number) {
  const step = page.getByRole("button", { name: new RegExp(`^${number}`) });
  await step.click();
  await waitStable();
}

async function saveDraft() {
  const button = page.getByRole("button", { name: rx.saveDraft }).last();
  await button.click();
  await waitStable();
}

function bodyText() {
  return page.locator("body").innerText();
}

async function fillBasic() {
  await clickStep(1);
  const selects = page.locator("select");
  if (await selects.count() > 0) await selects.nth(0).selectOption({ index: 1 });
  for (let i = 1; i < await selects.count(); i += 1) {
    const options = await selects.nth(i).locator("option").count();
    if (options > 1) await selects.nth(i).selectOption({ index: 1 });
  }
  const text = page.locator('input[type="text"]');
  if (await text.count()) await text.first().fill(`E2E Practitioner ${Date.now()}`);
  const avatar = `${fixtureDir}/qa-practitioner-avatar.png`;
  const file = page.locator('input[type="file"]').first();
  await file.setInputFiles(avatar);
  await waitStable();
  await saveDraft();
}

async function fillProfessional() {
  await clickStep(2);
  const text = page.locator('input[type="text"]');
  if (await text.count()) await text.first().fill("Clinical psychology E2E practitioner");
  const bio = page.locator("textarea");
  if (await bio.count()) await bio.first().fill("Synthetic QA biography for local end-to-end verification.");
  const languagePicker = page.locator("button").filter({ hasText: ar("\\u0627\\u062e\\u062a\\u0631 \\u0627\\u0644\\u0644\\u063a\\u0629") }).first();
  if (await languagePicker.count()) {
    await languagePicker.click();
    const arabicOption = page.getByRole("button", { name: ar("^\\u0627\\u0644\\u0639\\u0631\\u0628\\u064a\\u0629$") }).last();
    if (await arabicOption.count()) await arabicOption.click();
  }
  await saveDraft();
}

async function fillPayment() {
  await clickStep(4);
  const selects = page.locator("select");
  if (await selects.count()) await selects.first().selectOption({ index: 1 });
  const text = page.locator('input[type="text"]');
  const textValues = ["E2E QA Account Holder", "Banque Misr", "QA-E2E-ACCOUNT-0001"];
  for (let i = 0; i < Math.min(await text.count(), textValues.length); i += 1) await text.nth(i).fill(textValues[i]);
  const numbers = page.locator('input[type="number"]');
  const numberValues = ["500", "800", "20", "30"];
  for (let i = 0; i < Math.min(await numbers.count(), numberValues.length); i += 1) await numbers.nth(i).fill(numberValues[i]);
  await saveDraft();
}

async function upload(filePath, credentialType, expectedStatus, label) {
  await clickStep(3);
  await page.getByRole("button", { name: rx.upload }).first().click();
  await waitStable();
  const modalFile = page.locator('input[type="file"]').first();
  await modalFile.setInputFiles(filePath);
  const type = page.locator("select").first();
  if (await type.count()) await type.selectOption(credentialType);
  const request = page.waitForResponse((response) => response.url().includes("/practitioners/me/credentials/upload"), { timeout: 10000 }).catch(() => null);
  await page.getByRole("button", { name: rx.modalSave }).last().click();
  const response = await request;
  await waitStable();
  const status = response?.status() ?? null;
  const text = await bodyText();
  results.uploads.push({ label, credentialType, status, expectedStatus, errorVisible: /غير صالح|تعذر|مطلوب|فشل/.test(text.slice(-1800)) });
  if (await page.getByRole("button", { name: rx.cancel }).count()) await page.getByRole("button", { name: rx.cancel }).last().click().catch(() => undefined);
  return status;
}

await loginAndOpen();
await fillBasic();
await fillProfessional();
await fillPayment();

const invalid = `${fixtureDir}/qa-invalid-document.txt`;
const fakePdf = `${fixtureDir}/qa-fake-pdf.pdf`;
const empty = `${fixtureDir}/qa-empty-file.pdf`;
const oversized = `${fixtureDir}/qa-oversized-document.pdf`;
await upload(invalid, "LICENSE", 400, "invalid MIME text");
await upload(fakePdf, "LICENSE", 400, "fake PDF content");
await upload(empty, "LICENSE", 400, "empty file");
await upload(oversized, "LICENSE", 400, "oversized file");

const validFiles = [
  ["qa-license.pdf", "LICENSE", "professional license"],
  ["qa-qualification.pdf", "DEGREE", "academic degree"],
  ["qa-certificate.jpg", "CERTIFICATION", "professional certificate"],
  ["qa-certificate.jpg", "NATIONAL_ID_FRONT", "identity front"],
  ["qa-certificate.jpg", "NATIONAL_ID_BACK", "identity back"],
];
for (const [name, type, label] of validFiles) await upload(`${fixtureDir}/${name}`, type, 201, label);

await clickStep(3);
const beforeRefresh = await bodyText();
await page.reload({ waitUntil: "domcontentloaded" });
await waitStable();
const afterRefresh = await bodyText();
results.persistence = { beforeHasDocuments: !beforeRefresh.includes("لا يوجد مستندات مضافة بعد"), afterHasDocuments: !afterRefresh.includes("لا يوجد مستندات مضافة بعد") };

await clickStep(4);
const submitButton = page.getByRole("button", { name: rx.submit }).last();
const submitResponsePromise = page.waitForResponse((response) => response.url().includes("/practitioners/me/application") && response.request().method() === "POST", { timeout: 15000 }).catch(() => null);
await submitButton.click();
const submitResponse = await submitResponsePromise;
await waitStable();
results.submission = { status: submitResponse?.status() ?? null, text: (await bodyText()).slice(-1200) };

const duplicate = page.getByRole("button", { name: rx.submit }).last();
if (await duplicate.count()) {
  const duplicateResponsePromise = page.waitForResponse((response) => response.url().includes("/practitioners/me/application") && response.request().method() === "POST", { timeout: 10000 }).catch(() => null);
  await duplicate.click().catch(() => undefined);
  const duplicateResponse = await duplicateResponsePromise;
  await waitStable();
  results.duplicateSubmission = { status: duplicateResponse?.status() ?? null, text: (await bodyText()).slice(-800) };
}

fs.writeFileSync(`${out}/result.json`, JSON.stringify(results, null, 2), "utf8");
await page.screenshot({ path: `${out}/final.png`, fullPage: true });
console.log(JSON.stringify(results));
await browser.close();
