/* eslint-disable no-undef */
const { chromium } = require('playwright');

const base = 'http://127.0.0.1:8088';
const accessExp = new Date(Date.now() + 60 * 60 * 1000).toISOString();
const refreshExp = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

function json(data) {
  return { status: 200, contentType: 'application/json', body: JSON.stringify(data) };
}

async function setupApiMocks(context) {
  const mockPractitioner = {
    id: 'p-1',
    slug: 'bulk-practitioner-51',
    displayName: 'د. فهد الشمري',
    professionalTitle: 'أخصائي نفسي إكلينيكي',
    fullBio: 'متخصص في علاج القلق والاكتئاب بأساليب معرفية سلوكية مبسطة وداعمة.',
    bioSnippet: 'خبرة عملية في الدعم السلوكي وبناء العادات الصحية بخطوات هادئة.',
    specialties: [{ specialtyId: 's-1', slug: 'psychology', title: 'دعم نفسي', isPrimary: true }],
    languages: ['ar'],
    countryCode: 'SA',
    practitionerType: 'PSYCHOLOGIST',
    practitionerGender: 'MALE',
    sessionPrice30: 180,
    sessionPrice60: 320,
    isOnlineNow: true,
    acceptsCoupon: true,
    acceptsPackage: true,
    yearsExperience: 12,
    ratingSummary: { averageRating: 4.9, totalReviews: 120 },
    avatarUrl: null,
    isVerified: true,
    credentialsSummary: { totalCredentials: 5, approvedCredentials: 5 },
  };

  await context.route('**/api/v1/**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const p = url.pathname;

    if (p.endsWith('/auth/patient/refresh') && req.method() === 'POST') {
      return route.fulfill(
        json({
          success: true,
          data: {
            message: 'ok',
            tokens: {
              accessToken: 'demo-access-token',
              refreshToken: 'demo-refresh-token',
              accessTokenExpiresAt: accessExp,
              refreshTokenExpiresAt: refreshExp,
            },
            user: {
              id: 'u-1',
              displayName: 'سعود الفيصل',
              status: 'ACTIVE',
              roles: ['PATIENT'],
              primaryEmail: 'saud@example.com',
            },
          },
        }),
      );
    }

    if (p.endsWith('/users/me')) {
      return route.fulfill(
        json({
          success: true,
          data: {
            userId: 'u-1',
            displayName: 'سعود الفيصل',
            locale: 'ar',
            accountStatus: 'ACTIVE',
            roles: { roles: ['PATIENT'], hasPatientRole: true },
            securityState: { isActive: true, isEmailVerified: true, isPhoneVerified: false },
            profileLinks: { patientProfileId: 'pp-1' },
          },
        }),
      );
    }

    if (p.endsWith('/patients/me')) {
      return route.fulfill(
        json({
          success: true,
          data: {
            profile: {
              patientProfileId: 'pp-1',
              userId: 'u-1',
              displayName: 'سعود الفيصل',
              dateOfBirth: '1992-08-14',
              gender: 'MALE',
              locale: 'ar',
              countryCode: 'SA',
              timezone: 'Africa/Cairo',
              isOnboardingCompleted: true,
              onboardingCompletedAt: new Date(Date.now() - 8 * 86400000).toISOString(),
              createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
              updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
            },
          },
        }),
      );
    }

    if (p.endsWith('/patients/me/journey')) {
      return route.fulfill(
        json({
          success: true,
          data: {
            item: {
              summary: {
                suggestedNextAction: 'JOIN_UPCOMING_SESSION',
                nextSessionAt: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
                hasPendingPayment: false,
                hasOpenSupportTicket: false,
              },
            },
          },
        }),
      );
    }

    if (p.endsWith('/patients/me/sessions')) {
      return route.fulfill(
        json({
          success: true,
          data: {
            items: [
              {
                id: 'sess-1',
                sessionCode: 'FS-001',
                status: 'SCHEDULED',
                sessionMode: 'VIDEO',
                scheduledStartAt: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
                durationMinutes: 60,
                practitioner: { id: 'p-1', slug: 'bulk-practitioner-51', displayName: 'د. فهد الشمري' },
                paymentStatus: 'PAID',
              },
            ],
            pagination: { page: 1, limit: 20, totalItems: 1, totalPages: 1 },
          },
        }),
      );
    }

    if (p.endsWith('/public/practitioners/bulk-practitioner-51')) {
      return route.fulfill(json({ success: true, data: { item: mockPractitioner } }));
    }

    if (p.endsWith('/public/practitioners/bulk-practitioner-51/availability/windows')) {
      const now = Date.now();
      return route.fulfill(
        json({
          success: true,
          data: {
            timezone: 'Africa/Cairo',
            range: { from: new Date(now).toISOString(), to: new Date(now + 7 * 86400000).toISOString() },
            windows: [
              { startsAt: new Date(now + 86400000).toISOString(), endsAt: new Date(now + 86400000 + 1800000).toISOString() },
              { startsAt: new Date(now + 2 * 86400000).toISOString(), endsAt: new Date(now + 2 * 86400000 + 1800000).toISOString() },
              { startsAt: new Date(now + 3 * 86400000).toISOString(), endsAt: new Date(now + 3 * 86400000 + 3600000).toISOString() },
            ],
          },
        }),
      );
    }

    if (p.endsWith('/specialties')) {
      return route.fulfill(
        json({
          success: true,
          data: {
            specialties: [
              { id: 's-1', slug: 'psychology', name: 'دعم نفسي', description: null, isActive: true, sortOrder: 1 },
              { id: 's-2', slug: 'nutrition', name: 'تغذية', description: null, isActive: true, sortOrder: 2 },
              { id: 's-3', slug: 'coaching', name: 'لايف ستايل', description: null, isActive: true, sortOrder: 3 },
            ],
          },
        }),
      );
    }

    if (p.endsWith('/public/practitioners')) {
      return route.fulfill(
        json({
          success: true,
          data: {
            items: [mockPractitioner],
            pagination: { page: 1, limit: 20, totalItems: 1, totalPages: 1 },
          },
        }),
      );
    }

    return route.fulfill(json({ success: true, data: {} }));
  });
}

async function shot(context, pathname, out) {
  const page = await context.newPage();
  await page.goto(`${base}${pathname}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2200);
  await page.screenshot({ path: out, fullPage: true });
  await page.close();
}

(async () => {
  const browser = await chromium.launch({ headless: true });

  const publicContext = await browser.newContext({ viewport: { width: 430, height: 932 }, locale: 'ar-EG' });
  await shot(publicContext, '/', 'artifacts/splash-strict-parity.png');
  await shot(publicContext, '/welcome', 'artifacts/welcome-strict-parity.png');
  await publicContext.close();

  const appContext = await browser.newContext({ viewport: { width: 430, height: 932 }, locale: 'ar-EG' });
  await appContext.addInitScript(
    ({ accessExp, refreshExp }) => {
      localStorage.setItem('fayed.access-token', 'demo-access-token');
      localStorage.setItem('fayed.refresh-token', 'demo-refresh-token');
      localStorage.setItem('fayed.access-token.expiresAt', accessExp);
      localStorage.setItem('fayed.refresh-token.expiresAt', refreshExp);
    },
    { accessExp, refreshExp },
  );

  await setupApiMocks(appContext);
  await shot(appContext, '/home', 'artifacts/home-journey-strict-parity.png');
  await shot(appContext, '/profile', 'artifacts/profile-strict-parity.png');
  await shot(appContext, '/practitioners', 'artifacts/practitioners-list-strict-parity.png');
  await shot(appContext, '/practitioners/bulk-practitioner-51', 'artifacts/practitioner-details-strict-parity.png');

  await appContext.close();
  await browser.close();
})();
