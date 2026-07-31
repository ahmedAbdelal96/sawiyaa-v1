import { test, expect } from '@playwright/test';

test.describe('Practitioner Application Step Issues Panel Compact Redesign', () => {
  // A valid-looking mock JWT token with 3 parts containing a future expiration and the correct role
  const mockJwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJwcmFjdGl0aW9uZXItdXNlci1pZC0xMjMiLCJyb2xlcyI6WyJQUkFDVElUSU9ORVIiXSwiZXhwIjo5OTk5OTk5OTk5fQ.mock-signature';

  const userDataObj = {
    id: 'practitioner-user-id-123',
    displayName: 'د. أحمد',
    roles: ['PRACTITIONER'],
    role: 'PRACTITIONER',
    primaryEmail: 'dr.ahmed@hesba.local',
    practitionerProfileId: 'practitioner-profile-id-123',
    practitionerStatus: 'PENDING'
  };

  test.beforeEach(async ({ page, context }) => {
    // 1. Inject auth cookies directly into browser context to satisfy server-side middleware.
    await context.addCookies([
      {
        name: 'sawiyaa_access_token',
        value: mockJwtToken,
        url: 'http://localhost:3000',
      },
      {
        name: 'sawiyaa_user_role',
        value: 'PRACTITIONER',
        url: 'http://localhost:3000',
      },
      {
        name: 'sawiyaa_user_data',
        value: encodeURIComponent(JSON.stringify(userDataObj)),
        url: 'http://localhost:3000',
      }
    ]);

    // Seed the client-side Zustand session storage as well to prevent hydration/client redirect
    await page.addInitScript((data) => {
      window.sessionStorage.setItem('sawiyaa-auth', JSON.stringify({
        state: {
          user: {
            id: data.id,
            email: data.primaryEmail,
            firstName: data.displayName,
            lastName: '',
            role: 'PRACTITIONER'
          },
          tenant: null,
          isInitialized: true
        }
      }));
    }, userDataObj);

    // 2. Intercept practitioners/me profile fetch with a complete structured profile
    await page.route('**/api/v1/practitioners/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            profile: {
              id: 'practitioner-profile-id-123',
              userId: 'practitioner-user-id-123',
              displayName: 'د. أحمد',
              status: 'PENDING',
              countryCode: 'EG',
              timezone: 'Africa/Cairo',
              bio: '',
              professionalTitle: '',
              yearsOfExperience: '0',
              languages: [],
              pricing: {
                session30: {
                  egp: 300,
                  usd: 15
                },
                session60: {
                  egp: 500,
                  usd: 25
                }
              },
              payoutDestination: {
                methodType: 'BANK_ACCOUNT',
                accountHolderName: '',
                bankName: '',
                bankAccountNumber: '',
                iban: '',
                walletProvider: '',
                walletIdentifier: ''
              },
              avatarUrl: ''
            }
          }
        }),
      });
    });

    // 3. Intercept practitioners/me/application fetch
    await page.route('**/api/v1/practitioners/me/application', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            status: 'DRAFT',
            submittedAt: null,
            reviewedAt: null,
            rejectReason: null
          }
        }),
      });
    });
  });

  test('proves issues render in a compact outer container with badge count', async ({ page }) => {
    // Mock the readiness check to return more than 4 issues to test collapsing
    await page.route('**/api/v1/practitioners/me/readiness', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            readiness: {
              isReady: false,
              issues: [
                { stepKey: 'professional', code: 'PROFESSIONAL_DETAILS_TITLE_MISSING', severity: 'BLOCKER', field: 'professionalTitle' },
                { stepKey: 'professional', code: 'PROFESSIONAL_DETAILS_BIO_MISSING', severity: 'BLOCKER', field: 'bio' },
                { stepKey: 'professional', code: 'PROFESSIONAL_DETAILS_YEARS_MISSING', severity: 'BLOCKER', field: 'yearsOfExperience' },
                { stepKey: 'professional', code: 'PROFESSIONAL_DETAILS_LANGUAGE_MISSING', severity: 'BLOCKER', field: 'languages' },
                { stepKey: 'professional', code: 'PROFESSIONAL_DETAILS_SPECIALTY_MISSING', severity: 'WARNING', field: 'specialties' },
              ]
            }
          }
        }),
      });
    });

    // Go directly to practitioner application
    await page.goto('http://localhost:3000/ar/practitioner/application');
    await page.waitForTimeout(2000); // Wait for transition/renders
    console.log('CURRENT URL AFTER GOTO:', page.url());

    // Ensure we are on the professional step tab
    const professionalTab = page.locator('button:has-text("الملف المهني"), button:has-text("Professional Profile")');
    if (await professionalTab.count()) {
      await professionalTab.click();
    }

    // 1. Verify outer container exists with light warning styling
    const issueStrip = page.locator('.border-warning-200.bg-warning-50\\/40');
    await expect(issueStrip).toBeVisible();

    // 2. Verify badge count is 5
    const badge = issueStrip.locator('.bg-warning-200');
    await expect(badge).toHaveText('5');

    // 3. Verify it is collapsed by default (showing 4 issues)
    const issueRows = issueStrip.locator('.divide-y > div');
    await expect(issueRows).toHaveCount(4);

    // 4. Verify toggle button exists and has correct count
    const toggleButton = issueStrip.locator('button:has-text("عرض الكل")');
    await expect(toggleButton).toBeVisible();
    await expect(toggleButton).toContainText('عرض الكل (5)');

    // 5. Expand issues list
    await toggleButton.click();
    await expect(issueRows).toHaveCount(5);

    // 6. Verify duplicate text is not rendered (title and description are distinct)
    const firstRowText = await issueRows.first().innerText();
    expect(firstRowText).toContain('المسمى المهني غير مكتمل');
    expect(firstRowText).toContain('اختر المسمى المهني الأنسب.');

    // 7. Verify accessibility (role button for keyboard nav on clickable rows)
    const clickableButton = issueRows.first().locator('button');
    await expect(clickableButton).toBeVisible();
    await expect(clickableButton).toHaveAttribute('type', 'button');
  });

  test('proves clicking an issue scrolls and focuses the related field', async ({ page }) => {
    // Mock 1 issue to test click action
    await page.route('**/api/v1/practitioners/me/readiness', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            readiness: {
              isReady: false,
              issues: [
                { stepKey: 'professional', code: 'PROFESSIONAL_DETAILS_BIO_MISSING', severity: 'BLOCKER', field: 'bio' },
              ]
            }
          }
        }),
      });
    });

    await page.goto('http://localhost:3000/ar/practitioner/application');
    await page.waitForTimeout(2000);

    // Ensure we are on the professional step tab
    const professionalTab = page.locator('button:has-text("الملف المهني"), button:has-text("Professional Profile")');
    if (await professionalTab.count()) {
      await professionalTab.click();
    }

    const issueStrip = page.locator('.border-warning-200.bg-warning-50\\/40');
    const clickableButton = issueStrip.locator('button:has-text("النبذة المهنية غير مكتملة")');
    await expect(clickableButton).toBeVisible();

    // The bio field text area
    const bioTextarea = page.locator('textarea#bio');
    await expect(bioTextarea).not.toBeFocused();

    // Click the issue row button
    await clickableButton.click();

    // Check that the bio textarea is focused now
    await expect(bioTextarea).toBeFocused();
  });
});
