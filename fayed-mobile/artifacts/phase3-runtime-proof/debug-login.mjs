import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });

await page.goto("http://localhost:19007/signin/patient", {
  waitUntil: "networkidle",
});
console.log("URL after goto:", page.url());

await page
  .getByPlaceholder("name@example.com")
  .fill("ahmed.patient@hesba.local");
await page.getByPlaceholder("أدخل كلمة المرور").fill("Patient@12345");
await page.locator("text=تسجيل الدخول كمريض").last().click();
await page.waitForTimeout(4000);

console.log("URL after submit:", page.url());
const bodyText = await page.locator("body").innerText();
console.log(bodyText.slice(0, 4000));
await page.screenshot({
  path: "D:/Web/full-projects/fayed/fayed-mobile/artifacts/phase3-runtime-proof/debug-login-result.png",
  fullPage: true,
});

await browser.close();
