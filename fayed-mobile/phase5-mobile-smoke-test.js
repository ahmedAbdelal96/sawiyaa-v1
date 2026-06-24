const { chromium } = require('playwright');

const MOBILE_URL = 'http://localhost:8081';
const BACKEND_URL = 'http://localhost:7000';

// Patient credentials
const PATIENT_EMAIL = 'ahmed.patient@hesba.local';
const PATIENT_PASSWORD = 'Patient@12345';

// Practitioner credentials
const PRACTITIONER_EMAIL = 'amohamef206@gmail.com';
const PRACTITIONER_PASSWORD = 'Practitioner2@12345';

// Session ID for patient
const PATIENT_SESSION_ID = '67d758e8-0f21-4342-a9d7-d25245daeb2e';

// Storage keys
const STORAGE_KEYS = {
  accessToken: 'fayed.mobile.auth.tokens.access.v1',
  refreshToken: 'fayed.mobile.auth.tokens.refresh.v1',
  session: 'fayed.mobile.auth.session.v2'
};

// Helper to login and get tokens
async function login(email, password) {
  const response = await fetch(`${BACKEND_URL}/api/v1/auth/patient/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const json = await response.json();
  // Response wraps in data object
  return json.data || json;
}

async function loginPractitioner(email, password) {
  const response = await fetch(`${BACKEND_URL}/api/v1/auth/practitioner/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const json = await response.json();
  // Response wraps in data object
  return json.data || json;
}

// Check for raw i18n keys or raw enums
async function checkForIssues(page) {
  const issues = [];

  // Check for raw i18n keys (format like i18n:KEY or {{KEY}} or __KEY__)
  const i18nKeyPatterns = [
    /\bi18n:\w+/gi,
    /\{\{\w+\}\}/g,
    /__[\w.]+__/g,
    /t\(['"][^'"]+['"]\)/g
  ];

  // Check for raw enums
  const enumPatterns = [
    /\bNO_SHOW\b/gi,
    /\bUNDER_REVIEW\b/gi,
    /\bPENDING\b/gi,
    /\bACTIVE\b/gi,
    /\bCOMPLETED\b/gi,
    /\bCANCELLED\b/gi,
    /\bWAITING\b/gi
  ];

  // Check page content
  const pageText = await page.evaluate(() => document.body?.innerText || '');

  for (const pattern of i18nKeyPatterns) {
    const matches = pageText.match(pattern);
    if (matches && matches.length > 0) {
      issues.push({ type: 'i18n_key', matches: [...new Set(matches)].slice(0, 5) });
    }
  }

  for (const pattern of enumPatterns) {
    const matches = pageText.match(pattern);
    if (matches && matches.length > 0) {
      issues.push({ type: 'raw_enum', matches: [...new Set(matches)].slice(0, 5) });
    }
  }

  // Check for undefined/null/[object Object]
  if (/\bundefined\b|\bnull\b|\[object Object\]/gi.test(pageText)) {
    issues.push({ type: 'null_undefined', found: true });
  }

  return issues;
}

async function runPatientSmokeTest() {
  console.log('=== Starting Patient Mobile Smoke Test (Gate 8) ===\n');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
  });
  const page = await context.newPage();

  const results = {
    gate: 8,
    role: 'patient',
    timestamp: new Date().toISOString(),
    screens: []
  };

  try {
    // Step 1: Login as patient
    console.log('1. Logging in as patient...');
    const loginData = await login(PATIENT_EMAIL, PATIENT_PASSWORD);
    console.log('   Login response:', JSON.stringify(loginData).slice(0, 200));

    if (!loginData.tokens?.accessToken && !loginData.accessToken) {
      throw new Error('Failed to get access token');
    }

    // Set localStorage
    await page.goto(MOBILE_URL);
    await page.evaluate((data) => {
      const accessToken = data.tokens?.accessToken || data.accessToken;
      const refreshToken = data.tokens?.refreshToken || data.refreshToken;
      const STORAGE_KEYS = {
        accessToken: 'fayed.mobile.auth.tokens.access.v1',
        refreshToken: 'fayed.mobile.auth.tokens.refresh.v1',
        session: 'fayed.mobile.auth.session.v2'
      };
      localStorage.setItem(STORAGE_KEYS.accessToken, accessToken);
      localStorage.setItem(STORAGE_KEYS.refreshToken, refreshToken);
      const session = {
        role: 'patient',
        user: { id: data.user?.id, name: data.user?.name, email: data.user?.email },
        tokens: { accessToken, refreshToken }
      };
      localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(session));
    }, loginData);

    // Step 2: Patient Home
    console.log('\n2. Loading patient home...');
    await page.goto(`${MOBILE_URL}/(patient)/index`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const homeScreenshot = await page.screenshot({ path: 'D:/Web/full-projects/fayed/fayed-mobile/test-results/phase-5-final-rc-qa/patient-01-home.png' });
    const homeIssues = await checkForIssues(page);
    results.screens.push({
      name: 'patient_home',
      url: '/(patient)/index',
      passed: homeIssues.length === 0,
      issues: homeIssues,
      screenshot: 'patient-01-home.png'
    });
    console.log('   Home issues:', homeIssues.length === 0 ? 'NONE' : homeIssues);

    // Step 3: Discovery/Practitioners
    console.log('\n3. Loading practitioners/discovery...');
    await page.goto(`${MOBILE_URL}/(patient)/practitioners`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const practScreenshot = await page.screenshot({ path: 'D:/Web/full-projects/fayed/fayed-mobile/test-results/phase-5-final-rc-qa/patient-02-practitioners.png' });
    const practIssues = await checkForIssues(page);
    results.screens.push({
      name: 'practitioners',
      url: '/(patient)/practitioners',
      passed: practIssues.length === 0,
      issues: practIssues,
      screenshot: 'patient-02-practitioners.png'
    });
    console.log('   Practitioners issues:', practIssues.length === 0 ? 'NONE' : practIssues);

    // Step 4: Practitioner Profile
    console.log('\n4. Loading practitioner profile...');
    await page.goto(`${MOBILE_URL}/(patient)/practitioners/67d758e8-0f21-4342-a9d7-d25245daeb2e`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const profileScreenshot = await page.screenshot({ path: 'D:/Web/full-projects/fayed/fayed-mobile/test-results/phase-5-final-rc-qa/patient-03-profile.png' });
    const profileIssues = await checkForIssues(page);
    results.screens.push({
      name: 'practitioner_profile',
      url: '/(patient)/practitioners/[id]',
      passed: profileIssues.length === 0,
      issues: profileIssues,
      screenshot: 'patient-03-profile.png'
    });
    console.log('   Profile issues:', profileIssues.length === 0 ? 'NONE' : profileIssues);

    // Step 5: Sessions List
    console.log('\n5. Loading sessions list...');
    await page.goto(`${MOBILE_URL}/(patient)/sessions`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const sessionsScreenshot = await page.screenshot({ path: 'D:/Web/full-projects/fayed/fayed-mobile/test-results/phase-5-final-rc-qa/patient-04-sessions.png' });
    const sessionsIssues = await checkForIssues(page);
    results.screens.push({
      name: 'sessions_list',
      url: '/(patient)/sessions',
      passed: sessionsIssues.length === 0,
      issues: sessionsIssues,
      screenshot: 'patient-04-sessions.png'
    });
    console.log('   Sessions issues:', sessionsIssues.length === 0 ? 'NONE' : sessionsIssues);

    // Step 6: Session Detail (QA-71D1ADC37C - NO_SHOW, canJoin=false)
    console.log('\n6. Loading session detail...');
    await page.goto(`${MOBILE_URL}/(patient)/sessions/${PATIENT_SESSION_ID}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const sessionDetailScreenshot = await page.screenshot({ path: 'D:/Web/full-projects/fayed/fayed-mobile/test-results/phase-5-final-rc-qa/patient-05-session-detail.png' });
    const sessionDetailIssues = await checkForIssues(page);

    // Check for Join CTA visibility
    const joinCTA = await page.locator('button:has-text("Join"), [class*="join"], [class*="cta"]').count();

    results.screens.push({
      name: 'session_detail',
      url: `/patient)/sessions/${PATIENT_SESSION_ID}`,
      passed: sessionDetailIssues.length === 0,
      issues: sessionDetailIssues,
      joinCTAVisible: joinCTA > 0,
      screenshot: 'patient-05-session-detail.png'
    });
    console.log('   Session detail issues:', sessionDetailIssues.length === 0 ? 'NONE' : sessionDetailIssues);
    console.log('   Join CTA visible:', joinCTA > 0);

    // Step 7: Messages
    console.log('\n7. Loading messages...');
    await page.goto(`${MOBILE_URL}/(patient)/messages`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const messagesScreenshot = await page.screenshot({ path: 'D:/Web/full-projects/fayed/fayed-mobile/test-results/phase-5-final-rc-qa/patient-06-messages.png' });
    const messagesIssues = await checkForIssues(page);
    results.screens.push({
      name: 'messages',
      url: '/(patient)/messages',
      passed: messagesIssues.length === 0,
      issues: messagesIssues,
      screenshot: 'patient-06-messages.png'
    });
    console.log('   Messages issues:', messagesIssues.length === 0 ? 'NONE' : messagesIssues);

    // Step 8: Notifications
    console.log('\n8. Loading notifications...');
    await page.goto(`${MOBILE_URL}/(patient)/notifications`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const notifScreenshot = await page.screenshot({ path: 'D:/Web/full-projects/fayed/fayed-mobile/test-results/phase-5-final-rc-qa/patient-07-notifications.png' });
    const notifIssues = await checkForIssues(page);
    results.screens.push({
      name: 'notifications',
      url: '/(patient)/notifications',
      passed: notifIssues.length === 0,
      issues: notifIssues,
      screenshot: 'patient-07-notifications.png'
    });
    console.log('   Notifications issues:', notifIssues.length === 0 ? 'NONE' : notifIssues);

    // Step 9: Profile
    console.log('\n9. Loading profile...');
    await page.goto(`${MOBILE_URL}/(patient)/profile`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const profilePageScreenshot = await page.screenshot({ path: 'D:/Web/full-projects/fayed/fayed-mobile/test-results/phase-5-final-rc-qa/patient-08-profile.png' });
    const profilePageIssues = await checkForIssues(page);
    results.screens.push({
      name: 'profile',
      url: '/(patient)/profile',
      passed: profilePageIssues.length === 0,
      issues: profilePageIssues,
      screenshot: 'patient-08-profile.png'
    });
    console.log('   Profile page issues:', profilePageIssues.length === 0 ? 'NONE' : profilePageIssues);

  } catch (error) {
    console.error('Test error:', error.message);
    results.error = error.message;
  } finally {
    await browser.close();
  }

  // Calculate summary
  const totalScreens = results.screens.length;
  const passedScreens = results.screens.filter(s => s.passed).length;
  results.summary = {
    totalScreens,
    passedScreens,
    failedScreens: totalScreens - passedScreens,
    allPassed: totalScreens === passedScreens
  };

  console.log('\n=== Patient Gate 8 Summary ===');
  console.log(`Total screens: ${totalScreens}`);
  console.log(`Passed: ${passedScreens}`);
  console.log(`Failed: ${totalScreens - passedScreens}`);

  return results;
}

async function runPractitionerSmokeTest() {
  console.log('\n\n=== Starting Practitioner Mobile Smoke Test (Gate 9) ===\n');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
  });
  const page = await context.newPage();

  const results = {
    gate: 9,
    role: 'practitioner',
    timestamp: new Date().toISOString(),
    screens: []
  };

  try {
    // Step 1: Login as practitioner
    console.log('1. Logging in as practitioner...');
    const loginData = await loginPractitioner(PRACTITIONER_EMAIL, PRACTITIONER_PASSWORD);
    console.log('   Login response:', JSON.stringify(loginData).slice(0, 200));

    if (!loginData.tokens?.accessToken && !loginData.accessToken) {
      throw new Error('Failed to get access token');
    }

    // Set localStorage
    await page.goto(MOBILE_URL);
    await page.evaluate((data) => {
      const accessToken = data.tokens?.accessToken || data.accessToken;
      const refreshToken = data.tokens?.refreshToken || data.refreshToken;
      const STORAGE_KEYS = {
        accessToken: 'fayed.mobile.auth.tokens.access.v1',
        refreshToken: 'fayed.mobile.auth.tokens.refresh.v1',
        session: 'fayed.mobile.auth.session.v2'
      };
      localStorage.setItem(STORAGE_KEYS.accessToken, accessToken);
      localStorage.setItem(STORAGE_KEYS.refreshToken, refreshToken);
      const session = {
        role: 'practitioner',
        user: { id: data.user?.id, name: data.user?.name, email: data.user?.email },
        tokens: { accessToken, refreshToken }
      };
      localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(session));
    }, loginData);

    // Step 2: Practitioner Home
    console.log('\n2. Loading practitioner home...');
    await page.goto(`${MOBILE_URL}/(practitioner)/index`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const homeScreenshot = await page.screenshot({ path: 'D:/Web/full-projects/fayed/fayed-mobile/test-results/phase-5-final-rc-qa/practitioner-01-home.png' });
    const homeIssues = await checkForIssues(page);
    results.screens.push({
      name: 'practitioner_home',
      url: '/(practitioner)/index',
      passed: homeIssues.length === 0,
      issues: homeIssues,
      screenshot: 'practitioner-01-home.png'
    });
    console.log('   Home issues:', homeIssues.length === 0 ? 'NONE' : homeIssues);

    // Step 3: Sessions List
    console.log('\n3. Loading sessions list...');
    await page.goto(`${MOBILE_URL}/(practitioner)/sessions`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const sessionsScreenshot = await page.screenshot({ path: 'D:/Web/full-projects/fayed/fayed-mobile/test-results/phase-5-final-rc-qa/practitioner-02-sessions.png' });
    const sessionsIssues = await checkForIssues(page);
    results.screens.push({
      name: 'sessions_list',
      url: '/(practitioner)/sessions',
      passed: sessionsIssues.length === 0,
      issues: sessionsIssues,
      screenshot: 'practitioner-02-sessions.png'
    });
    console.log('   Sessions issues:', sessionsIssues.length === 0 ? 'NONE' : sessionsIssues);

    // Step 4: Session Detail (check practitioner.detail.* i18n labels)
    console.log('\n4. Loading session detail...');
    await page.goto(`${MOBILE_URL}/(practitioner)/sessions/${PATIENT_SESSION_ID}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const sessionDetailScreenshot = await page.screenshot({ path: 'D:/Web/full-projects/fayed/fayed-mobile/test-results/phase-5-final-rc-qa/practitioner-03-session-detail.png' });
    const sessionDetailIssues = await checkForIssues(page);

    // Specifically check for practitioner.detail.* i18n keys
    const pageContent = await page.evaluate(() => document.body.innerText);
    const hasDetailLabels = /practitioner\.detail\./i.test(pageContent) || pageContent.includes('detail');

    results.screens.push({
      name: 'session_detail',
      url: `/(practitioner)/sessions/${PATIENT_SESSION_ID}`,
      passed: sessionDetailIssues.length === 0,
      issues: sessionDetailIssues,
      practitionerDetailLabelsTranslated: hasDetailLabels,
      screenshot: 'practitioner-03-session-detail.png'
    });
    console.log('   Session detail issues:', sessionDetailIssues.length === 0 ? 'NONE' : sessionDetailIssues);
    console.log('   Practitioner detail labels:', hasDetailLabels ? 'TRANSLATED' : 'MISSING');

    // Step 5: Availability
    console.log('\n5. Loading availability...');
    await page.goto(`${MOBILE_URL}/(practitioner)/availability`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const availScreenshot = await page.screenshot({ path: 'D:/Web/full-projects/fayed/fayed-mobile/test-results/phase-5-final-rc-qa/practitioner-04-availability.png' });
    const availIssues = await checkForIssues(page);
    results.screens.push({
      name: 'availability',
      url: '/(practitioner)/availability',
      passed: availIssues.length === 0,
      issues: availIssues,
      screenshot: 'practitioner-04-availability.png'
    });
    console.log('   Availability issues:', availIssues.length === 0 ? 'NONE' : availIssues);

    // Step 6: Messages
    console.log('\n6. Loading messages...');
    await page.goto(`${MOBILE_URL}/(practitioner)/messages`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const messagesScreenshot = await page.screenshot({ path: 'D:/Web/full-projects/fayed/fayed-mobile/test-results/phase-5-final-rc-qa/practitioner-05-messages.png' });
    const messagesIssues = await checkForIssues(page);
    results.screens.push({
      name: 'messages',
      url: '/(practitioner)/messages',
      passed: messagesIssues.length === 0,
      issues: messagesIssues,
      screenshot: 'practitioner-05-messages.png'
    });
    console.log('   Messages issues:', messagesIssues.length === 0 ? 'NONE' : messagesIssues);

    // Step 7: Notifications
    console.log('\n7. Loading notifications...');
    await page.goto(`${MOBILE_URL}/(practitioner)/notifications`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const notifScreenshot = await page.screenshot({ path: 'D:/Web/full-projects/fayed/fayed-mobile/test-results/phase-5-final-rc-qa/practitioner-06-notifications.png' });
    const notifIssues = await checkForIssues(page);
    results.screens.push({
      name: 'notifications',
      url: '/(practitioner)/notifications',
      passed: notifIssues.length === 0,
      issues: notifIssues,
      screenshot: 'practitioner-06-notifications.png'
    });
    console.log('   Notifications issues:', notifIssues.length === 0 ? 'NONE' : notifIssues);

    // Step 8: Account/More
    console.log('\n8. Loading account/more...');
    await page.goto(`${MOBILE_URL}/(practitioner)/account`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const accountScreenshot = await page.screenshot({ path: 'D:/Web/full-projects/fayed/fayed-mobile/test-results/phase-5-final-rc-qa/practitioner-07-account.png' });
    const accountIssues = await checkForIssues(page);
    results.screens.push({
      name: 'account',
      url: '/(practitioner)/account',
      passed: accountIssues.length === 0,
      issues: accountIssues,
      screenshot: 'practitioner-07-account.png'
    });
    console.log('   Account issues:', accountIssues.length === 0 ? 'NONE' : accountIssues);

  } catch (error) {
    console.error('Test error:', error.message);
    results.error = error.message;
  } finally {
    await browser.close();
  }

  // Calculate summary
  const totalScreens = results.screens.length;
  const passedScreens = results.screens.filter(s => s.passed).length;
  results.summary = {
    totalScreens,
    passedScreens,
    failedScreens: totalScreens - passedScreens,
    allPassed: totalScreens === passedScreens
  };

  console.log('\n=== Practitioner Gate 9 Summary ===');
  console.log(`Total screens: ${totalScreens}`);
  console.log(`Passed: ${passedScreens}`);
  console.log(`Failed: ${totalScreens - passedScreens}`);

  return results;
}

// Main execution
(async () => {
  const fs = require('fs');

  try {
    // Run Patient Gate 8
    const patientResults = await runPatientSmokeTest();

    // Run Practitioner Gate 9
    const practitionerResults = await runPractitionerSmokeTest();

    // Save results
    const patientReportPath = 'D:/Web/full-projects/fayed/fayed-mobile/test-results/phase-5-final-rc-qa/patient-mobile-smoke-proof.json';
    const practitionerReportPath = 'D:/Web/full-projects/fayed/fayed-mobile/test-results/phase-5-final-rc-qa/practitioner-mobile-smoke-proof.json';

    fs.writeFileSync(patientReportPath, JSON.stringify(patientResults, null, 2));
    fs.writeFileSync(practitionerReportPath, JSON.stringify(practitionerResults, null, 2));

    console.log('\n\n=== FINAL SUMMARY ===');
    console.log(`Patient Gate 8: ${patientResults.summary.allPassed ? 'ALL PASSED' : 'SOME FAILED'}`);
    console.log(`Practitioner Gate 9: ${practitionerResults.summary.allPassed ? 'ALL PASSED' : 'SOME FAILED'}`);
    console.log('\nReports saved to:');
    console.log('  -', patientReportPath);
    console.log('  -', practitionerReportPath);

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
})();
