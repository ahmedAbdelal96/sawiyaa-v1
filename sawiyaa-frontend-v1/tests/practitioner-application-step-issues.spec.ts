import { test, expect } from '@playwright/test';

test.describe('Practitioner Application Step Issues Panel Compact Redesign', () => {
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

  test.beforeEach(async ({ page }) => {
    // Pipe browser console messages to node process stdout
    page.on('console', msg => {
      console.log(`BROWSER CONSOLE [${msg.type()}]:`, msg.text());
    });

    // 1. Mock the login endpoint to return a direct authenticated session (bypassing OTP)
    await page.route('**/api/v1/auth/practitioner/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            nextStep: 'AUTHENTICATED',
            tokens: {
              accessToken: mockJwtToken,
              refreshToken: mockJwtToken
            },
            user: userDataObj
          }
        }),
      });
    });

    // 2. Mock auth/me endpoint
    await page.route('**/api/v1/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            user: {
              id: 'practitioner-user-id-123',
              displayName: 'د. أحمد',
              roles: ['PRACTITIONER'],
              primaryEmail: 'dr.ahmed@hesba.local'
  }
          }
        }),
      });
    });

    // 3. Mock notifications unread count
    await page.route('**/api/v1/notifications/me/unread-count', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            item: {
              unreadCount: 0
            }
          }
        }),
      });
    });

    // 4. Mock conversations unread summary
    await page.route('**/api/v1/messages/conversations/unread-summary', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            unreadCount: 0
          }
        }),
      });
    });

    // 5. Mock practitioners countries
    await page.route('**/api/v1/practitioners/me/countries', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: []
        }),
      });
    });

    // 6. Mock practitioners credentials
    await page.route('**/api/v1/practitioners/me/credentials', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: []
        }),
      });
    });

    // 7. Mock specialty categories
    await page.route('**/api/v1/specialty-categories', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: []
        }),
      });
    });

    // 8. Mock specialties list
    await page.route('**/api/v1/specialties', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: []
        }),
      });
    });

    // 9. Intercept practitioners/me profile fetch with a complete structured profile
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

    // 10. Intercept practitioners/me/application fetch
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
    // Mock the readiness check to return more than 4 issues under the correct steps structure
    await page.route('**/api/v1/practitioners/me/readiness', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            readiness: {
              isReady: false,
              completion: {
                steps: [
                  {
                    key: 'professionalDetails',
                    percent: 20,
                    issues: [
                      { code: 'PROFESSIONAL_DETAILS_TITLE_MISSING', severity: 'BLOCKER', requirementScope: 'SUBMISSION', field: 'professionalTitle' },
                      { code: 'PROFESSIONAL_DETAILS_BIO_MISSING', severity: 'BLOCKER', requirementScope: 'SUBMISSION', field: 'bio' },
                      { code: 'PROFESSIONAL_DETAILS_YEARS_MISSING', severity: 'BLOCKER', requirementScope: 'SUBMISSION', field: 'yearsOfExperience' },
                      { code: 'PROFESSIONAL_DETAILS_LANGUAGE_MISSING', severity: 'BLOCKER', requirementScope: 'SUBMISSION', field: 'languages' },
                      { code: 'PROFESSIONAL_DETAILS_SPECIALTY_MISSING', severity: 'WARNING', requirementScope: 'SUBMISSION', field: 'specialties' },
                    ]
                  }
                ]
              }
            }
          }
        }),
      });
    });

    // Go to signin page to perform client-side authentication first
    await page.goto('http://localhost:3000/ar/signin/practitioner');
    await page.locator('input[type="email"]').fill('dr.ahmed@hesba.local');
    await page.locator('input[type="password"]').fill('Practitioner@12345');
    await page.locator('button[type="submit"]').click();

    // Wait for the client-side redirect to complete
    await page.waitForURL('**/ar/practitioner/application', { timeout: 10000 });

    // Click the professional step tab using test ID (guarantees Playwright waits for element)
    await page.locator('[data-testid="practitioner-application-step-professional"]').click();

    // 1. Verify outer container exists with light warning styling
    const issueStrip = page.locator('.border-status-warning-border.bg-status-warning-soft\\/40');
    await expect(issueStrip).toBeVisible();

    // 2. Verify badge count is 5
    const badge = issueStrip.locator('.bg-status-warning');
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
    expect(firstRowText).toContain('المسمى المهني');
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
              completion: {
                steps: [
                  {
                    key: 'professionalDetails',
                    percent: 50,
                    issues: [
                      { code: 'PROFESSIONAL_DETAILS_BIO_MISSING', severity: 'BLOCKER', requirementScope: 'SUBMISSION', field: 'bio' },
                    ]
                  }
                ]
              }
            }
          }
        }),
      });
    });

    await page.goto('http://localhost:3000/ar/signin/practitioner');
    await page.locator('input[type="email"]').fill('dr.ahmed@hesba.local');
    await page.locator('input[type="password"]').fill('Practitioner@12345');
    await page.locator('button[type="submit"]').click();

    await page.waitForURL('**/ar/practitioner/application', { timeout: 10000 });

    // Click the professional step tab using test ID
    await page.locator('[data-testid="practitioner-application-step-professional"]').click();

    const issueStrip = page.locator('.border-status-warning-border.bg-status-warning-soft\\/40');
    const clickableButton = issueStrip.locator('button:has-text("النبذة المهنية")');
    await expect(clickableButton).toBeVisible();

    const bioTextarea = page.locator('textarea#bio');
    await expect(bioTextarea).not.toBeFocused();

    await clickableButton.click();
    await expect(bioTextarea).toBeFocused();
  });
});
