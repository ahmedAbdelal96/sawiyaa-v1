const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: false, args: ['--disable-gpu', '--no-sandbox'] });
  const page = await (await browser.newContext({ locale: 'ar-EG' })).newPage();
  await page.goto('http://localhost:3000/ar/signin/admin', { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="email"]').fill('admin@hesba.local');
  await page.locator('input[type="password"]').fill('Admin@12345');
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/ar\/admin/, { timeout: 15000 });
  await page.goto('http://localhost:3000/ar/admin/practitioners', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);
  const row = page.locator('tr').filter({ hasText: 'E2E-MSG-20260719 Practitioner A' }).first();
  await row.getByRole('button', { name: /^نشر المختص$/ }).click();
  const dialog = page.getByRole('dialog');
  await page.waitForTimeout(5000);
  console.log(JSON.stringify({ text: await dialog.innerText(), confirmDisabled: await dialog.getByRole('button').last().isDisabled() }));
  await browser.close();
})().catch((error) => { console.error(error); process.exitCode = 1; });
