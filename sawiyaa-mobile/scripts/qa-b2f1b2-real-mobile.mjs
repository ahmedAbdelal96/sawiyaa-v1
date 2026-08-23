import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.BLOC_2F1B2_MOBILE_URL ?? 'http://127.0.0.1:8081';
const outputDir = process.env.BLOC_2F1B2_ARTIFACT_DIR ?? 'D:/Web/full-projects/sawiyaa/qa-artifacts/BLOC-2F1B2';
const titles = { ar: 'معالج أسري متقدم', en: 'Advanced Family Therapist' };
const tokens = { ar: 'متقدم', en: 'Advanced' };
const auth = {
  role: 'patient',
  user: { id: 'qa-b2f1b2-patient', displayName: 'QA Patient', status: 'ACTIVE', roles: ['PATIENT'] },
  tokens: {
    accessToken: 'qa-b2f1b2-access',
    refreshToken: 'qa-b2f1b2-refresh',
    accessTokenExpiresAt: '2099-01-01T00:00:00.000Z',
    refreshTokenExpiresAt: '2099-01-02T00:00:00.000Z',
  },
};

function envelope(data) { return JSON.stringify({ success: true, data }); }
function assert(condition, message) { if (!condition) throw new Error(`BLOC-2F1B2 Mobile assertion failed: ${message}`); }

function initializeStorage() {
  return ({ locale, auth: configuredAuth }) => {
    localStorage.clear();
    localStorage.setItem('sawiyaa.app.language', locale);
    localStorage.setItem('sawiyaa.mobile.device.id.v1', 'qa-b2f1b2-device');
    localStorage.setItem('sawiyaa.mobile.auth.tokens.access.v1', configuredAuth.tokens.accessToken);
    localStorage.setItem('sawiyaa.mobile.auth.tokens.refresh.v1', configuredAuth.tokens.refreshToken);
    localStorage.setItem('sawiyaa.mobile.auth.tokens.access.expiresAt.v1', configuredAuth.tokens.accessTokenExpiresAt);
    localStorage.setItem('sawiyaa.mobile.auth.tokens.refresh.expiresAt.v1', configuredAuth.tokens.refreshTokenExpiresAt);
    localStorage.setItem('sawiyaa.mobile.auth.session.v2', JSON.stringify({ role: configuredAuth.role, user: configuredAuth.user }));
  };
}

async function installRoutes(page) {
  await page.route('**/api/v1/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    const fulfill = (data) => route.fulfill({ status: 200, contentType: 'application/json; charset=utf-8', body: envelope(data) });

    // Acceptance-critical endpoint: never mock practitioner search responses.
    if (pathname.endsWith('/public/practitioners')) return route.continue();
    if (pathname.endsWith('/auth/me')) return fulfill({ userId: auth.user.id, roles: ['PATIENT'], isActive: true, isEmailVerified: true, isPhoneVerified: true, featureFlags: [] });
    if (pathname.includes('/auth/') && pathname.endsWith('/refresh')) return fulfill({ ...auth, nextStep: 'AUTHENTICATED' });
    if (pathname.endsWith('/patients/me')) return fulfill({ profile: { patientProfileId: 'qa-b2f1b2-profile', userId: auth.user.id, displayName: auth.user.displayName, locale: 'en', countryCode: 'EG', timezone: 'Africa/Cairo', isOnboardingCompleted: true } });
    if (pathname.endsWith('/users/me')) return fulfill({ id: auth.user.id, userId: auth.user.id, displayName: auth.user.displayName, roles: ['PATIENT'] });
    if (pathname.endsWith('/notifications/me/unread-count')) return fulfill({ item: { unreadCount: 0 } });
    if (pathname.endsWith('/chat/conversations/unread-summary')) return fulfill({ unreadCount: 0 });
    if (pathname.endsWith('/specialty-categories')) return fulfill({ categories: [] });
    if (pathname.endsWith('/specialties')) return fulfill({ specialties: [] });
    if (pathname.endsWith('/users/me/next-session')) return fulfill(null);
    return fulfill({ item: null, items: [], pagination: { page: 1, limit: 20, totalItems: 0, totalPages: 1 } });
  });
}

async function capture(browser, locale, width) {
  const context = await browser.newContext({ viewport: { width, height: 844 }, locale: locale === 'ar' ? 'ar-SA' : 'en-US', timezoneId: 'Africa/Cairo' });
  const page = await context.newPage();
  const errors = [];
  const requests = [];
  page.on('pageerror', (error) => errors.push(`${error.message}${error.stack ? `\n${error.stack}` : ''}`));
  page.on('request', (request) => { if (request.url().includes('/api/v1/')) requests.push(request.url()); });
  await installRoutes(page);
  await page.addInitScript(initializeStorage(), { locale, auth });
  await page.goto(`${baseUrl}/discovery?qaState=initial`, { waitUntil: 'networkidle', timeout: 60000 });
  const placeholder = locale === 'ar' ? 'ابحث عن مختص أو تخصص' : 'Search specialists or specialties';
  const search = page.getByPlaceholder(placeholder).first();
  await search.waitFor({ state: 'visible', timeout: 20000 });
  await search.fill(tokens[locale]);
  await page.getByText(titles[locale], { exact: true }).first().waitFor({ state: 'visible', timeout: 20000 });
  await page.waitForTimeout(800);
  const bodyText = await page.locator('body').innerText();
  const practitionerRequests = requests.filter((url) => url.includes('/public/practitioners'));
  assert(practitionerRequests.some((url) => new URL(url).searchParams.get('search') === tokens[locale]), `${locale} Mobile client must send search=<term>`);
  assert(bodyText.includes(titles[locale]), `${locale} Mobile must show requested-locale professional title`);
  assert((bodyText.match(/BLOC QA Practitioner A/g) ?? []).length === 1, `${locale} Mobile must render one practitioner card`);
  assert(!bodyText.includes(titles[locale === 'ar' ? 'en' : 'ar']), `${locale} Mobile must not leak opposite title`);
  assert(errors.length === 0, `${locale} Mobile page errors: ${errors.join(' | ')}`);
  const fileName = `mobile-discovery-${locale}-${width}-searched.png`;
  await page.screenshot({ path: path.join(outputDir, fileName), fullPage: false });
  await context.close();
  return { locale, width, request: practitionerRequests.find((url) => new URL(url).searchParams.get('search') === tokens[locale]), screenshot: fileName };
}

await fs.mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const results = [await capture(browser, 'ar', 360), await capture(browser, 'en', 390)];
  await fs.writeFile(path.join(outputDir, 'mobile-results.json'), JSON.stringify({ status: 'PASS', baseUrl, results }, null, 2), 'utf8');
  console.log(JSON.stringify({ status: 'PASS', outputDir, results }, null, 2));
} finally {
  await browser.close();
}
