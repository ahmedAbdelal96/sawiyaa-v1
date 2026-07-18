import { chromium } from "playwright";
const ar = (value) => new RegExp(value);
const pageUrl = "http://localhost:3000/ar/practitioner/application";
const email = process.env.QA_EMAIL;
const password = process.env.QA_PASSWORD;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const result = { requests: [], beforeSubmit: null, submit: null, duplicate: null };
page.on("response", (r) => { if (r.url().includes("/api/v1/")) result.requests.push({ method: r.request().method(), path: new URL(r.url()).pathname, status: r.status() }); });
await page.goto("http://localhost:3000/ar/signin?mode=practitioner", { waitUntil: "domcontentloaded" });
await page.locator('input[name="email"]').fill(email);
await page.locator('input[name="password"]').fill(password);
await page.locator('button[type="submit"]').click();
await page.waitForTimeout(1200);
await page.goto(pageUrl, { waitUntil: "domcontentloaded" }).catch(() => undefined);
await page.waitForTimeout(5000);

const step = (n) => page.getByRole("button", { name: n === 2 ? ar("\\u0627\\u0644\\u0645\\u0644\\u0641 \\u0627\\u0644\\u0645\\u0647\\u0646\\u064a") : ar("\\u0627\\u0644\\u062f\\u0641\\u0639 \\u0648\\u0627\\u0644\\u062a\\u0642\\u062f\\u064a\\u0645") });
const saveDraft = page.getByRole("button", { name: ar("\\u062d\\u0641\\u0638 \\u0627\\u0644\\u0645\\u0633\\u0648\\u062f\\u0629") }).last();
const chooseFirst = async (selects) => { for (let i = 0; i < await selects.count(); i += 1) { if (await selects.nth(i).locator("option").count() > 1) await selects.nth(i).selectOption({ index: 1 }); } };

await step(2).click();
await page.waitForTimeout(400);
const text = page.locator('input[type="text"]');
if (await text.count()) await text.first().fill("Clinical psychology E2E practitioner");
const numbers = page.locator('input[type="number"]');
if (await numbers.count()) await numbers.first().fill("5");
const bio = page.locator("textarea");
if (await bio.count()) await bio.first().fill("Synthetic QA biography for local end-to-end verification.");
const selects2 = page.locator("select");
await chooseFirst(selects2);
const lang = page.locator("button").filter({ hasText: ar("\\u0627\\u062e\\u062a\\u0631 \\u0644\\u063a\\u0629") }).first();
if (await lang.count()) { await lang.click(); await page.getByRole("button", { name: ar("^\\u0627\\u0644\\u0639\\u0631\\u0628\\u064a\\u0629$") }).last().click(); }
const sub = page.locator("button").filter({ hasText: ar("\\u0627\\u062e\\u062a\\u0631 \\u062a\\u062e\\u0635\\u0635") }).first();
if (await sub.count()) { await sub.click(); const options = page.locator("button").filter({ hasText: ar("^\\u0639\\u0644\\u0627\\u062c") }); if (await options.count()) await options.first().click(); }
const saveSpecialties = page.getByRole("button", { name: ar("\\u062d\\u0641\\u0638 \\u0627\\u0644\\u062a\\u062e\\u0635\\u0635\\u0627\\u062a") });
if (await saveSpecialties.count()) await saveSpecialties.click();
await saveDraft.click();
await page.waitForTimeout(700);

await step(4).click();
await page.waitForTimeout(400);
const paySelects = page.locator("select");
if (await paySelects.count()) await paySelects.first().selectOption({ index: 1 });
const payText = page.locator('input[type="text"]');
for (const [i, value] of ["E2E QA Account Holder", "Banque Misr", "QA-E2E-ACCOUNT-0001"].entries()) if (i < await payText.count()) await payText.nth(i).fill(value);
const payNumbers = page.locator('input[type="number"]');
for (const [i, value] of ["500", "800", "20", "30"].entries()) if (i < await payNumbers.count()) await payNumbers.nth(i).fill(value);
await saveDraft.click();
await page.waitForTimeout(1000);

await page.getByRole("button", { name: ar("\\u0627\\u0644\\u0645\\u0624\\u0647\\u0644\\u0627\\u062a") }).click();
await page.waitForTimeout(500);
const textBefore = await page.locator("body").innerText();
result.beforeSubmit = { readyStep3: !textBefore.includes("غير مكتمل"), tail: textBefore.slice(-1600) };
const next = page.getByRole("button", { name: ar("^\\u0627\\u0644\\u062a\\u0627\\u0644\\u064a$") });
if (await next.count()) await next.click();
await page.waitForTimeout(1000);
const submit = page.getByRole("button", { name: ar("\\u0625\\u0631\\u0633\\u0627\\u0644 \\u0627\\u0644\\u0637\\u0644\\u0628") }).last();
if (await submit.count()) {
  const req = page.waitForResponse((r) => r.url().includes("/practitioners/me/application") && r.request().method() === "POST", { timeout: 15000 }).catch(() => null);
  await submit.click();
  const response = await req;
  await page.waitForTimeout(1000);
  result.submit = { status: response?.status() ?? null, tail: (await page.locator("body").innerText()).slice(-1600) };
  const again = page.getByRole("button", { name: ar("\\u0625\\u0631\\u0633\\u0627\\u0644 \\u0627\\u0644\\u0637\\u0644\\u0628") }).last();
  if (await again.count()) {
    const req2 = page.waitForResponse((r) => r.url().includes("/practitioners/me/application") && r.request().method() === "POST", { timeout: 10000 }).catch(() => null);
    await again.click().catch(() => undefined);
    const response2 = await req2;
    await page.waitForTimeout(700);
    result.duplicate = { status: response2?.status() ?? null, tail: (await page.locator("body").innerText()).slice(-800) };
  }
}
console.log(JSON.stringify(result));
await browser.close();
