const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:/Users/IT/.gemini/antigravity/brain/7c27f882-2735-4866-b9a8-a2d420934ff8';

async function captureScreen(page, name, width = 390, height = 844, clip = null) {
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(1000);
  const targetPath = path.join(ARTIFACT_DIR, name);
  const options = { path: targetPath };
  if (clip) options.clip = clip;
  await page.screenshot(options);
  console.log(`Saved screenshot: ${name} (${width}x${height})`);
}

async function run() {
  console.log("=== Start Rebuilt Mobile Public Home Visual Verification ===");

  if (!fs.existsSync(ARTIFACT_DIR)) {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 1. Arabic 390x844 viewports & focused crops
    console.log("\n1. Capturing Arabic 390x844 Viewports & Components...");
    await page.goto('http://localhost:8081/');
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('sawiyaa:onboarding:completed:v1', 'true');
      localStorage.setItem('sawiyaa.app.language', '"ar"');
      document.documentElement.dir = 'rtl';
    });
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(3000);

    // Arabic Full Viewport 390x844
    await captureScreen(page, 'public_home_ar_390.png', 390, 844);

    // Focused Arabic Header (Top 70px)
    await captureScreen(page, 'public_header_ar.png', 390, 844, { x: 0, y: 0, width: 390, height: 75 });

    // Focused Arabic Hero (y: 70 to 380)
    await captureScreen(page, 'public_hero_ar.png', 390, 844, { x: 0, y: 70, width: 390, height: 320 });

    // Focused Arabic Trust Row (y: 380 to 480)
    await captureScreen(page, 'public_trust_ar.png', 390, 844, { x: 0, y: 380, width: 390, height: 110 });

    // Focused Patient Actions (inside Hero)
    await captureScreen(page, 'public_patient_actions_ar.png', 390, 844, { x: 0, y: 220, width: 390, height: 160 });

    // Focused Practitioner Sign In (y: 480 to 560)
    await captureScreen(page, 'public_practitioner_ar.png', 390, 844, { x: 0, y: 480, width: 390, height: 80 });

    // 2. Arabic 360x640 Compact Viewport
    console.log("\n2. Capturing Arabic 360x640 Viewport...");
    await captureScreen(page, 'public_home_ar_360.png', 360, 640);

    // 3. Arabic 430x932 Large Viewport
    console.log("\n3. Capturing Arabic 430x932 Viewport...");
    await captureScreen(page, 'public_home_ar_430.png', 430, 932);

    // 4. English 390x844 Viewport & Header
    console.log("\n4. Capturing English 390x844 Viewport & Header...");
    await page.evaluate(() => {
      localStorage.setItem('sawiyaa.app.language', '"en"');
      document.documentElement.dir = 'ltr';
    });
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(3000);

    // English Full Viewport 390x844
    await captureScreen(page, 'public_home_en_390.png', 390, 844);

    // Focused English Header
    await captureScreen(page, 'public_header_en.png', 390, 844, { x: 0, y: 0, width: 390, height: 75 });

    console.log("\nVisual capture completed successfully!");
  } catch (error) {
    console.error("Visual capture failed:", error);
  } finally {
    await browser.close();
  }
}

run();
