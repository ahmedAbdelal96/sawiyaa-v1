const { chromium } = require('playwright');

(async () => {

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const browser = await chromium.launch({
  executablePath: chromePath,
  headless: false,
  args: ['--disable-gpu', '--no-sandbox'],
});
const context = await browser.newContext({ locale: 'ar-EG' });
const page = await context.newPage();
const consoleErrors = [];
const publicationResponses = [];
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
page.on('pageerror', (error) => consoleErrors.push(error.message));
page.on('response', async (response) => {
  if (response.url().includes('/publication')) {
    publicationResponses.push({ url: response.url(), status: response.status(), body: await response.text().catch(() => '') });
  }
});

await page.goto('http://localhost:3000/ar/signin/admin', { waitUntil: 'domcontentloaded' });
await page.locator('input[type="email"]').fill('admin@hesba.local');
await page.locator('input[type="password"]').fill('Admin@12345');
await page.locator('button[type="submit"]').click();
await page.waitForURL(/\/ar\/admin/, { timeout: 15000 });
await page.goto('http://localhost:3000/ar/admin/practitioners', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3500);

const bodyText = await page.locator('body').innerText();
const row = page.locator('tr').filter({ hasText: 'احمد عبدالعال' }).first();
const rowText = await row.innerText();
const actions = await row.locator('button').allTextContents();
console.log(JSON.stringify({
  url: page.url(),
  hasSeparateApprovalBadge: rowText.includes('الموافقة'),
  hasSeparatePublicationBadge: rowText.includes('النشر'),
  hasUnpublishAction: actions.some((value) => value.includes('إلغاء النشر')),
  rowText,
  actions,
}));

await row.getByRole('button', { name: /إلغاء نشر المختص/ }).click();
await page.getByRole('dialog').waitFor({ state: 'visible' });
const dialog = page.getByRole('dialog');
await page.waitForTimeout(5000);
const dialogText = await dialog.innerText();
if ((await dialog.locator('#publicationReason').count()) === 0) {
  console.log(JSON.stringify({ dialogText, publicationResponses }));
  throw new Error('publication modal did not load its impact payload');
}
const dialogControls = {
  titleExposed: await dialog.getByRole('heading').count() > 0,
  reason: await dialog.locator('#publicationReason').count() > 0,
  checkbox: await dialog.locator('input[type="checkbox"]').count() > 0,
  confirmDisabledInitially: await dialog.getByRole('button', { name: /تأكيد إلغاء النشر/ }).isDisabled(),
  direction: await dialog.evaluate((element) => getComputedStyle(element).direction),
};
await dialog.locator('#publicationReason').fill('سبب اختبار إلغاء النشر');
const acknowledge = dialog.locator('input[type="checkbox"]');
await acknowledge.check();
const confirm = dialog.getByRole('button', { name: /تأكيد إلغاء النشر/ });
const enabledAfterRequiredFields = !(await confirm.isDisabled());
console.log(JSON.stringify({ dialogText, dialogControls, enabledAfterRequiredFields, publicationResponses }));
await confirm.click();
await page.waitForTimeout(1200);
const passwordInput = page.locator('input[type="password"]').last();
if (await passwordInput.count() && await passwordInput.isVisible()) {
  await passwordInput.fill('Admin@12345');
  await page.getByRole('button', { name: /تأكيد/ }).last().click();
}
await page.waitForTimeout(3500);
const rowAfterUnpublish = page.locator('tr').filter({ hasText: 'احمد عبدالعال' }).first();
console.log(JSON.stringify({ afterUnpublish: await rowAfterUnpublish.innerText(), visiblePasswordInputs: await page.locator('input[type="password"]:visible').count(), publicationResponses }));

await rowAfterUnpublish.getByRole('button', { name: /^نشر المختص$/ }).click();
await page.getByRole('dialog').waitFor({ state: 'visible' });
const publishDialog = page.getByRole('dialog');
await page.waitForTimeout(5000);
const publishText = await publishDialog.innerText();
console.log(JSON.stringify({ publishText, publishButtons: await publishDialog.getByRole('button').allTextContents() }));
const publishButton = publishDialog.getByRole('button', { name: /تأكيد النشر/ });
console.log(JSON.stringify({ publishText, publishDisabled: await publishButton.isDisabled() }));
await publishButton.click();
await page.waitForTimeout(1200);
const publishPasswordInput = page.locator('input[type="password"]').last();
if (await publishPasswordInput.count() && await publishPasswordInput.isVisible()) {
  await publishPasswordInput.fill('Admin@12345');
  await page.getByRole('button', { name: /تأكيد/ }).last().click();
}
await page.waitForTimeout(3500);
const rowAfterPublish = page.locator('tr').filter({ hasText: 'احمد عبدالعال' }).first();
console.log(JSON.stringify({ afterPublish: await rowAfterPublish.innerText(), consoleErrors }));
await browser.close();
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
