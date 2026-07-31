const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:/Users/Abdelal/.gemini/antigravity/brain/8ccec7ca-6acd-4c3a-a643-dd8f1cdf10c2';

const mockSpecialties = {
  success: true,
  data: {
    message: "Success",
    specialties: [
      { id: "spec_1", name: "Psychiatry", nameAr: "الطب النفسي", nameEn: "Psychiatry", slug: "psychiatry" },
      { id: "spec_2", name: "Anxiety Therapy", nameAr: "علاج القلق", nameEn: "Anxiety Therapy", slug: "anxiety" },
      { id: "spec_3", name: "Depression Therapy", nameAr: "علاج الاكتئاب", nameEn: "Depression Therapy", slug: "depression" },
      { id: "spec_4", name: "Family Counseling", nameAr: "الاستشارات الأسرية", nameEn: "Family Counseling", slug: "family" }
    ]
  }
};

const mockPractitioners = {
  success: true,
  data: {
    items: [
      {
        id: "prac_1",
        slug: "ahmed-ali",
        displayName: "د. أحمد علي",
        professionalTitle: "استشاري الطب النفسي والامراض العصبية",
        specialties: [{ specialtyId: "spec_1", slug: "psychiatry", title: "الطب النفسي", isPrimary: true }],
        languages: ["العربية", "English"],
        currencyCode: "EGP",
        sessionPrice30: 400,
        ratingSummary: { averageRating: 4.8, totalReviews: 24 },
        isVerified: true
      },
      {
        id: "prac_2",
        slug: "sarah-smith",
        displayName: "Dr. Sarah Smith",
        professionalTitle: "Licensed Marriage and Family Therapist",
        specialties: [{ specialtyId: "spec_4", slug: "family", title: "Family Therapy", isPrimary: true }],
        languages: ["English"],
        currencyCode: "USD",
        sessionPrice30: 50,
        ratingSummary: { averageRating: 4.9, totalReviews: 12 },
        isVerified: true
      }
    ],
    pagination: { page: 1, limit: 3, totalItems: 2, totalPages: 1 }
  }
};

async function captureScreen(page, name, width = 390, height = 844) {
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(2000);
  const targetPath = path.join(ARTIFACT_DIR, name);
  await page.screenshot({ path: targetPath });
  console.log(`Saved screenshot: ${name} (${width}x${height})`);
}

async function run() {
  console.log("=== Start Public Home Visual Verification ===");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Stub Alert/confirm inside the browser so it renders a beautiful modal box on the screen
  await page.addInitScript(() => {
    window.alert = window.confirm = (msg) => {
      // Remove previous mock alert if any
      const existing = document.getElementById('mock-alert-box');
      if (existing) existing.remove();

      const box = document.createElement('div');
      box.id = 'mock-alert-box';
      box.style.position = 'absolute';
      box.style.top = '30%';
      box.style.left = '10%';
      box.style.right = '10%';
      box.style.backgroundColor = '#FFFFFF';
      box.style.border = '2px solid #24564F';
      box.style.borderRadius = '16px';
      box.style.padding = '20px';
      box.style.zIndex = '99999';
      box.style.boxShadow = '0 10px 25px rgba(0,0,0,0.2)';
      box.style.direction = 'rtl';
      box.style.textAlign = 'center';

      box.innerHTML = `
        <h3 style="margin-top: 0; color: #24564F; font-size: 18px; font-weight: bold;">مطلوب تسجيل الدخول</h3>
        <p style="color: #5C736F; font-size: 14px; margin-bottom: 20px;">${msg || 'يرجى تسجيل الدخول أو إنشاء حساب مريض للمتابعة.'}</p>
        <div style="display: flex; gap: 10px; justify-content: center;">
          <button style="background-color: #24564F; color: white; border: none; padding: 10px 16px; border-radius: 8px; font-weight: bold; cursor: pointer;">إنشاء حساب</button>
          <button style="background-color: #E0F2EF; color: #24564F; border: none; padding: 10px 16px; border-radius: 8px; font-weight: bold; cursor: pointer;">تسجيل الدخول</button>
          <button onclick="document.getElementById('mock-alert-box').remove()" style="background-color: #ECEBE6; color: #5C736F; border: none; padding: 10px 16px; border-radius: 8px; cursor: pointer;">إلغاء</button>
        </div>
      `;
      document.body.appendChild(box);
      return true;
    };
  });

  try {
    // ----------------------------------------------------
    // Scenario 1: Success Loading (Arabic)
    // ----------------------------------------------------
    console.log("\nScenario 1: Arabic Public Home Success...");
    await page.route('**/specialties', route => route.fulfill({ status: 200, json: mockSpecialties }));
    await page.route('**/public/practitioners*', route => route.fulfill({ status: 200, json: mockPractitioners }));

    await page.goto('http://localhost:8081/');
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('sawiyaa:onboarding:completed:v1', 'true');
      localStorage.setItem('sawiyaa.app.language', '"ar"');
      document.documentElement.dir = 'rtl';
    });
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(4000);

    // Capture standard viewports
    await captureScreen(page, 'public_home_ar_390.png', 390, 844);
    await captureScreen(page, 'public_home_ar_360.png', 360, 640);
    await captureScreen(page, 'public_home_ar_430.png', 430, 932);

    // Capture Arabic Tab Bar focus
    await captureScreen(page, 'public_tabs_ar.png', 390, 200); // Small snapshot of tabbar height area

    // ----------------------------------------------------
    // Scenario 2: Success Loading (English)
    // ----------------------------------------------------
    console.log("\nScenario 2: English Public Home Success...");
    await page.evaluate(() => {
      localStorage.setItem('sawiyaa.app.language', '"en"');
      document.documentElement.dir = 'ltr';
    });
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(4000);

    await captureScreen(page, 'public_home_en_390.png', 390, 844);
    await captureScreen(page, 'public_tabs_en.png', 390, 200);

    // ----------------------------------------------------
    // Scenario 3: Skeleton Loading states
    // ----------------------------------------------------
    console.log("\nScenario 3: Loading Skeleton States...");
    // Force indefinite delay for API calls to show Skeletons
    await page.route('**/specialties', () => {}); 
    await page.route('**/public/practitioners*', () => {}); 

    await page.evaluate(() => {
      localStorage.setItem('sawiyaa.app.language', '"ar"');
      document.documentElement.dir = 'rtl';
    });
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(2000);
    await captureScreen(page, 'public_home_loading.png', 390, 844);

    // ----------------------------------------------------
    // Scenario 4: Section Errors and Retry CTA
    // ----------------------------------------------------
    console.log("\nScenario 4: Section Errors...");
    await page.route('**/specialties', route => route.fulfill({ status: 500 }));
    await page.route('**/public/practitioners*', route => route.fulfill({ status: 500 }));

    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(3000);
    await captureScreen(page, 'public_home_error.png', 390, 844);

    // ----------------------------------------------------
    // Scenario 5: Empty states
    // ----------------------------------------------------
    console.log("\nScenario 5: Empty states...");
    await page.route('**/specialties', route => route.fulfill({ status: 200, json: { specialties: [] } }));
    await page.route('**/public/practitioners*', route => route.fulfill({ status: 200, json: { success: true, data: { items: [], pagination: { page: 1, limit: 3, totalItems: 0, totalPages: 1 } } } }));

    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(3000);
    await captureScreen(page, 'public_home_empty.png', 390, 844);

    // ----------------------------------------------------
    // Scenario 6: Authentication Gateway Alert Prompt
    // ----------------------------------------------------
    console.log("\nScenario 6: Authentication Gateway Prompt...");
    // Restore success route to render practitioner card to tap
    await page.route('**/specialties', route => route.fulfill({ status: 200, json: mockSpecialties }));
    await page.route('**/public/practitioners*', route => route.fulfill({ status: 200, json: mockPractitioners }));

    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(4000);

    // Click on a specialty chip to trigger Auth Gateway
    console.log("Tapping on specialty chip to open Auth Gateway...");
    await page.locator('text=علاج القلق').first().click();
    await page.waitForTimeout(1000);

    await captureScreen(page, 'public_home_auth_gateway.png', 390, 844);

  } catch (error) {
    console.error("Visual capture failed:", error);
  } finally {
    await browser.close();
    console.log("Browser closed.");
  }
}

run();
