import { chromium } from "playwright";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto("http://localhost:3000/ar/signin?mode=practitioner", { waitUntil: "domcontentloaded" });
await page.locator('input[name="email"]').fill(process.env.QA_EMAIL);
await page.locator('input[name="password"]').fill(process.env.QA_PASSWORD);
await page.locator('button[type="submit"]').click();
await page.waitForTimeout(700);
await page.goto("http://localhost:3000/ar/practitioner/application", { waitUntil: "domcontentloaded" }).catch(() => undefined);
await page.waitForTimeout(900);
for (const step of ["/^1/", "/^2/", "/^4/"]) {
  await page.getByRole("button", { name: new RegExp(step.slice(1, -1)) }).click();
  await page.waitForTimeout(250);
  console.log(step, JSON.stringify({
    inputs: await page.locator("input").evaluateAll((xs) => xs.map((x, i) => ({ i, type: x.type, name: x.name, placeholder: x.placeholder, value: x.value }))),
    textareas: await page.locator("textarea").evaluateAll((xs) => xs.map((x, i) => ({ i, placeholder: x.placeholder, value: x.value }))),
    selects: await page.locator("select").evaluateAll((xs) => xs.map((x, i) => ({ i, value: x.value, options: [...x.options].slice(0, 5).map((o) => ({ t: o.text, v: o.value })) }))),
  }));
}
await browser.close();
