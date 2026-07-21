const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: false, args: ['--disable-gpu', '--no-sandbox'] });
  const context = await browser.newContext({ locale: 'ar-EG' });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('http://localhost:3000/ar/signin/admin', { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="email"]').fill('admin@hesba.local');
  await page.locator('input[type="password"]').fill('Admin@12345');
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/ar\/admin/, { timeout: 15000 });
  await page.goto('http://localhost:3000/ar/admin/practitioners', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);
  const row = page.locator('tr').filter({ hasText: 'احمد عبدالعال' }).first();
  await row.getByRole('button', { name: /^نشر المختص$/ }).click();
  const dialog = page.getByRole('dialog');
  await page.waitForTimeout(5000);
  const modalText = await dialog.innerText();
  const buttons = await dialog.getByRole('button').allTextContents();
  const confirm = dialog.getByRole('button').last();
  const initiallyDisabled = await confirm.isDisabled();
  console.log(JSON.stringify({ modalText, buttons, initiallyDisabled }));
  await confirm.click();
  await page.waitForTimeout(1200);
  const password = page.locator('input[type="password"]').last();
  if (await password.count() && await password.isVisible()) {
    await password.fill('Admin@12345');
    await page.getByRole('button', { name: /تأكيد/ }).last().click();
  }
  await page.waitForTimeout(3500);
  console.log(JSON.stringify({ row: await row.innerText(), errors }));
  await browser.close();
})().catch((error) => { console.error(error); process.exitCode = 1; });
