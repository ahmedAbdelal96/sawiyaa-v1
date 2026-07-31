import { test, expect } from '@playwright/test';

test.describe('Admin Practitioner Details Page UI & Behavior', () => {
  const pId = '8752f853-d90d-4658-a641-8a54d59dffdd';
  const mockSlug = 'dr-john-doe';

  test.beforeEach(async ({ page }) => {
    // Log in as admin to establish session cookies
    await page.goto('http://localhost:3000/ar/signin/admin');
    await page.locator('input[type="email"]').fill('admin@hesba.local');
    await page.locator('input[type="password"]').fill('Admin@12345');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/ar\/admin/);
  });

  test('proves primary row details action uses admin route and does not use public slug', async ({ page }) => {
    // Mock practitioners list API response
    await page.route('**/api/v1/admin/practitioners?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: pId,
              slug: mockSlug,
              displayName: 'Dr. John Doe',
              status: 'APPROVED',
              isPublicProfilePublished: true,
              user: { status: 'ACTIVE' },
              specialties: [],
            },
          ],
          pagination: { page: 1, limit: 10, totalItems: 1, totalPages: 1 },
        }),
      });
    });

    await page.goto('http://localhost:3000/ar/admin/practitioners');

    const viewButton = page.locator(`a[href*="/admin/practitioners/${pId}"]`);
    await expect(viewButton).toBeVisible();

    const publicPreviewButton = page.locator(`a[href*="/practitioners/${mockSlug}"]`);
    await expect(publicPreviewButton).toBeVisible();
    await expect(publicPreviewButton).toHaveAttribute('target', '_blank');
  });

  test('proves details page handles loading state', async ({ page }) => {
    await page.route(`**/api/v1/admin/practitioners/${pId}`, async (route) => {
      // delay response to show loading state
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ details: {} }),
      });
    });

    // Navigate to page (trigger loading)
    await page.goto(`http://localhost:3000/ar/admin/practitioners/${pId}`);
    // Check loading indicator / skeleton is visible
    const skeleton = page.locator('.animate-pulse, .skeleton');
    await expect(skeleton.first()).toBeVisible();
  });

  test('proves details page handles 404 state safely', async ({ page }) => {
    await page.route(`**/api/v1/admin/practitioners/${pId}`, async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Practitioner not found' }),
      });
    });

    await page.goto(`http://localhost:3000/ar/admin/practitioners/${pId}`);
    // The details page should render the error UI
    await expect(page.locator('text=Failed to load practitioner details, تعذر تحميل بيانات المعالج')).toBeVisible();
  });

  test('proves details page handles missing optional data without breaking tabs', async ({ page }) => {
    // Mock minimal payload (missing bio, pricing, payout info, credentials, application)
    await page.route(`**/api/v1/admin/practitioners/${pId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          details: {
            id: pId,
            userId: 'user-123',
            publicSlug: mockSlug,
            displayName: 'Minimal Practitioner',
            avatarUrl: null,
            accountStatus: 'ACTIVE',
            profileStatus: 'APPROVED',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            countryCode: null,
            countryName: null,
            email: null,
            phone: null,
            timezone: null,
            defaultLocale: null,
            practitionerType: 'OTHER',
            practitionerGender: null,
            professionalTitle: null,
            bio: null,
            yearsOfExperience: null,
            languages: [],
            acceptsPackages: false,
            isInstantBookingEnabled: false,
            pricing: {
              session30: { egp: null, usd: null },
              session60: { egp: null, usd: null },
            },
            specialties: [],
            credentials: [],
            payoutDestination: null,
            application: null,
            operations: {
              totalSessions: 0,
              completedSessions: 0,
              upcomingSessions: 0,
              cancelledSessions: 0,
            },
            auditLogs: [],
          },
        }),
      });
    });

    await page.goto(`http://localhost:3000/ar/admin/practitioners/${pId}`);

    // Expect name to render
    await expect(page.locator('text=Minimal Practitioner')).toBeVisible();

    // Click tabs and ensure no React crashes/breaks
    const professionalTab = page.locator('button:has-text("الملف المهني"), button:has-text("Professional Profile")');
    await professionalTab.click();
    await expect(page.locator('text=سنوات الخبرة, Experience')).toBeVisible();

    const financialTab = page.locator('button:has-text("المالية"), button:has-text("Financial")');
    await financialTab.click();
    await expect(page.locator('text=لم يتم تحديد بيانات تحويل المستحقات, No payout details registered')).toBeVisible();
  });
});
