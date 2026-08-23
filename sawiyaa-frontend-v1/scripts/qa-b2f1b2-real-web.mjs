import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.BLOC_2F1B2_WEB_URL ?? 'http://127.0.0.1:3100';
const outputDir = process.env.BLOC_2F1B2_ARTIFACT_DIR ?? 'D:/Web/full-projects/sawiyaa/qa-artifacts/BLOC-2F1B2';
const titles = { ar: 'معالج أسري متقدم', en: 'Advanced Family Therapist' };
const tokens = { ar: 'متقدم', en: 'Advanced' };

function assert(condition, message) {
  if (!condition) throw new Error(`BLOC-2F1B2 Web assertion failed: ${message}`);
}

async function captureDiscovery(browser, locale, width, suffix) {
  const context = await browser.newContext({ viewport: { width, height: 960 }, locale: locale === 'ar' ? 'ar-SA' : 'en-US', timezoneId: 'Africa/Cairo' });
  const page = await context.newPage();
  const errors = [];
  const requests = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (request.url().includes('/api/v1/')) requests.push(request.url());
  });
  await page.goto(`${baseUrl}/${locale}/practitioners`, { waitUntil: 'networkidle', timeout: 60000 });
  const search = page.locator('input[name="search"]').first();
  await search.waitFor({ state: 'visible', timeout: 20000 });
  await page.screenshot({ path: path.join(outputDir, `web-discovery-${locale}-${width}-${suffix}-before.png`), fullPage: false });

  await search.fill(tokens[locale]);
  await page.waitForURL((url) => url.searchParams.get('search') === tokens[locale], { timeout: 20000 });
  try {
    await page.getByText(titles[locale], { exact: true }).first().waitFor({ state: 'visible', timeout: 20000 });
  } catch (error) {
    console.error(JSON.stringify({ stage: 'discovery-after-search', locale, url: page.url(), body: (await page.locator('body').innerText()).slice(0, 2600) }, null, 2));
    throw error;
  }
  await page.waitForTimeout(500);
  const bodyText = await page.locator('body').innerText();
  assert(bodyText.includes(titles[locale]), `${locale} discovery must show requested-locale professional title`);
  assert((bodyText.match(/BLOC QA Practitioner A/g) ?? []).length === 1, `${locale} discovery must render one practitioner A card`);
  assert(!bodyText.includes(titles[locale === 'ar' ? 'en' : 'ar']), `${locale} discovery must not show the opposite localized title`);
  assert(errors.length === 0, `${locale} discovery page errors: ${errors.join(' | ')}`);
  await page.screenshot({ path: path.join(outputDir, `web-discovery-${locale}-${width}-${suffix}-after.png`), fullPage: false });
  await context.close();
  return { locale, width, requestContract: 'SSR navigation URL carries search=<term>', screenshots: [`web-discovery-${locale}-${width}-${suffix}-before.png`, `web-discovery-${locale}-${width}-${suffix}-after.png`] };
}

async function capturePackages(browser, locale, width) {
  const context = await browser.newContext({ viewport: { width, height: 960 }, locale: locale === 'ar' ? 'ar-SA' : 'en-US', timezoneId: 'Africa/Cairo' });
  await context.addCookies([{ name: 'preferred_language', value: locale, url: baseUrl }]);
  const page = await context.newPage();
  const errors = [];
  const requests = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (request.url().includes('/api/v1/')) requests.push(request.url());
  });
  await page.goto(`${baseUrl}/${locale}/packages`, { waitUntil: 'networkidle', timeout: 60000 });
  const search = page.getByPlaceholder(locale === 'ar' ? 'ابحث باسم المختص أو التخصص...' : 'Search practitioner name or specialty...');
  await search.waitFor({ state: 'visible', timeout: 20000 });
  await search.fill(tokens[locale]);
  await page.getByText(titles[locale], { exact: true }).first().waitFor({ state: 'visible', timeout: 20000 });
  await page.waitForTimeout(500);
  const bodyText = await page.locator('body').innerText();
  const offerRequests = requests.filter((url) => url.includes('/public/package-offers'));
  assert(offerRequests.some((url) => new URL(url).searchParams.get('search') === tokens[locale]), `${locale} package client must send search=<term>`);
  assert(bodyText.includes(titles[locale]), `${locale} packages must show requested-locale professional title`);
  assert((bodyText.match(/BLOC QA Practitioner A/g) ?? []).length === 1, `${locale} packages must render one practitioner A offer`);
  assert(!bodyText.includes(titles[locale === 'ar' ? 'en' : 'ar']), `${locale} packages must not show opposite localized title`);
  assert(bodyText.includes(locale === 'ar' ? 'باقة من 4 جلسات' : '4-session package'), `${locale} packages must preserve the package plan presentation`);
  assert(errors.length === 0, `${locale} packages page errors: ${errors.join(' | ')}`);
  const fileName = `web-packages-${locale}-${width}-after.png`;
  await page.screenshot({ path: path.join(outputDir, fileName), fullPage: false });
  await context.close();
  return { locale, width, request: offerRequests.find((url) => new URL(url).searchParams.get('search') === tokens[locale]), screenshot: fileName };
}

await fs.mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const results = {
    discovery: [
      await captureDiscovery(browser, 'ar', 390, 'mobile'),
      await captureDiscovery(browser, 'en', 390, 'mobile'),
      await captureDiscovery(browser, 'ar', 1280, 'desktop'),
      await captureDiscovery(browser, 'en', 1280, 'desktop'),
    ],
    packages: [
      await capturePackages(browser, 'ar', 390),
      await capturePackages(browser, 'en', 390),
      await capturePackages(browser, 'ar', 1280),
      await capturePackages(browser, 'en', 1280),
    ],
  };
  await fs.writeFile(path.join(outputDir, 'web-results.json'), JSON.stringify({ status: 'PASS', baseUrl, results }, null, 2), 'utf8');
  console.log(JSON.stringify({ status: 'PASS', outputDir, results }, null, 2));
} finally {
  await browser.close();
}
