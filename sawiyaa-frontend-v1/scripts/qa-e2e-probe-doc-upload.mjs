import { chromium } from "playwright";

const email = process.env.QA_EMAIL;
const password = process.env.QA_PASSWORD;
const ar = (value) => new RegExp(value);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto("http://localhost:3000/ar/signin?mode=practitioner", { waitUntil: "domcontentloaded" });
await page.locator('input[name="email"]').fill(email);
await page.locator('input[name="password"]').fill(password);
await page.locator('button[type="submit"]').click();
await page.waitForTimeout(800);
await page.goto("http://localhost:3000/ar/practitioner/application", { waitUntil: "domcontentloaded" }).catch(() => undefined);
await page.waitForTimeout(1200);
console.log(JSON.stringify({ beforeStepUrl: page.url(), buttons: (await page.locator("button").allTextContents()).slice(0, 20) }));
await page.getByRole("button", { name: /^3/ }).click();
await page.waitForTimeout(300);
const upload = page.getByRole("button", { name: ar("\\u0631\\u0641\\u0639 \\u0645\\u0633\\u062a\\u0646\\u062f") }).first();
await upload.click();
await page.waitForTimeout(200);
console.log(JSON.stringify({
  inputs: await page.locator("input").evaluateAll((xs) => xs.map((x, i) => ({ i, type: x.type, accept: x.accept }))),
  selects: await page.locator("select").evaluateAll((xs) => xs.map((x, i) => ({ i, options: [...x.options].map((o) => ({ text: o.text, value: o.value })) }))),
  buttons: await page.locator("button").allTextContents(),
}));
await browser.close();
