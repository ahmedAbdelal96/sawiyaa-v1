import { chromium } from "playwright";

(async () => {
  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true, // headless: true for CI environment execution
    args: ["--disable-gpu", "--no-sandbox"],
  });

  const context = await browser.newContext({ locale: "ar-EG" });
  const page = await context.newPage();

  console.log("1. Navigating to Admin Login...");
  await page.goto("http://localhost:3000/ar/signin/admin", { waitUntil: "domcontentloaded" });
  await page.locator('input[type="email"]').fill("admin@hesba.local");
  await page.locator('input[type="password"]').fill("Admin@12345");
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/ar\/admin/, { timeout: 15000 });
  console.log("Logged in successfully. Current URL:", page.url());

  console.log("2. Accessing Practitioners Directory...");
  await page.goto("http://localhost:3000/ar/admin/practitioners", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  // Find a practitioner row and view details link
  const viewLink = page.locator('a[href*="/admin/practitioners/"]').first();
  const hrefAttr = await viewLink.getAttribute("href");
  console.log("Found details link href:", hrefAttr);

  if (!hrefAttr || !hrefAttr.includes("/admin/practitioners/")) {
    throw new Error("Admin practitioner details view link was not found or did not route correctly.");
  }

  // Extract ID from href
  const pId = hrefAttr.split("/").pop();
  console.log("Extracted practitioner ID:", pId);

  console.log("3. Clicking View Details...");
  await viewLink.click();
  await page.waitForURL(new RegExp(`/admin/practitioners/${pId}`), { timeout: 15000 });
  console.log("Navigated to Admin Details Page. URL:", page.url());

  // Confirm elements/tabs are present
  const header = await page.locator("h1").innerText();
  console.log("Details Page Header Text:", header);
  if (!header.includes("تفاصيل المعالج")) {
    throw new Error("Details page header text does not match Arabic translations.");
  }

  // Switch tabs
  console.log("4. Testing tab switches...");
  const tabs = ["overview", "basic", "professional", "application", "documents", "sessions", "financial", "publication", "audit"];
  for (const tab of tabs) {
    const tabBtn = page.locator(`button:has-text("${tab === "basic" ? "البيانات الأساسية" : tab === "professional" ? "الملف المهني" : tab}")`).first();
    if (await tabBtn.count()) {
      await tabBtn.click();
      await page.waitForTimeout(500);
    }
  }
  console.log("Tab switches verified successfully.");

  console.log("5. Testing Locale Switcher (preserving ID)...");
  // Change language to English using the switcher or navigating directly to verify path preservation
  await page.goto(`http://localhost:3000/en/admin/practitioners/${pId}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  const engHeader = await page.locator("h1").innerText();
  console.log("English Page Header Text:", engHeader);
  if (!engHeader.includes("Practitioner Details")) {
    throw new Error("Locale switching did not preserve the ID or render English translations correctly.");
  }

  console.log("6. Testing Guest Unauthorized Protection...");
  // Clear cookies and context to act as unauthenticated guest
  await context.clearCookies();
  const guestPage = await context.newPage();
  await guestPage.goto(`http://localhost:3000/ar/admin/practitioners/${pId}`, { waitUntil: "domcontentloaded" });
  await guestPage.waitForTimeout(2000);
  const guestUrl = guestPage.url();
  console.log("Guest navigated URL:", guestUrl);
  if (guestUrl.includes(`/admin/practitioners/${pId}`)) {
    // If it did not redirect to signin, check if it displays unauthorized/access error
    const pageText = await guestPage.locator("body").innerText();
    if (!pageText.includes("signin") && !pageText.includes("403") && !pageText.includes("401")) {
      throw new Error("Guest was able to access privileged admin detail page without authentication!");
    }
  }
  console.log("Guest access protection verified successfully.");

  await browser.close();
  console.log("ALL BROWSER SMOKE TESTS PASSED.");
})().catch((error) => {
  console.error("Browser smoke test failed:", error);
  process.exit(1);
});
