import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.resolve(__dirname, "..", "customer-screenshots", "web-mobile", "current");
const OUTPUT_PATH = path.resolve(__dirname, "customer-overview-ar.png");

const SCREENS = [
  { file: "01-home-ar.png", title: "01. الرئيسية (العميل)", desc: "لوحة المتابعة والرحلة النفسية" },
  { file: "02-discovery-ar.png", title: "02. استكشاف المختصين", desc: "بطاقات المختصين والتسعير السريع" },
  { file: "03-discovery-filters-ar.png", title: "03. فلاتر البحث", desc: "التخصص، اللغة، التوفر والجنس" },
  { file: "04-practitioner-profile-ar.png", title: "04. الملف التعريفي للمختص", desc: "الخبرات والتقييمات والتسعير" },
  { file: "05-booking-select-time-ar.png", title: "05. اختيار مدة الجلسة", desc: "المدة والسعر قبل اختيار الموعد" },
  { file: "06-booking-confirm-ar.png", title: "06. اختيار موعد الجلسة", desc: "التاريخ والتوقيتات المتاحة" },
  { file: "07-checkout-ar.png", title: "07. مراجعة الدفع", desc: "حالة الدفع الطبيعية دون تغطية السياسة" },
  { file: "08-checkout-wallet-ar.png", title: "08. الدفع عبر المحفظة", desc: "خصم الرصيد وسداد المتبقي" },
  { file: "09-instant-booking-ar.png", title: "09. الحجز الفوري", desc: "جلسة عاجلة مع المختص المتاح" },
  { file: "10-sessions-ar.png", title: "10. قائمة الجلسات", desc: "الجلسات القادمة وسجل الجلسات" },
  { file: "11-session-detail-ar.png", title: "11. تفاصيل الجلسة", desc: "معلومات الجلسة وزر الانضمام" },
  { file: "12-messages-inbox-ar.png", title: "12. صندوق الرسائل", desc: "محادثات الجلسات والدعم" },
  { file: "13-message-thread-ar.png", title: "13. محادثة الجلسة", desc: "الدردشة الآمنة مع المختص" },
  { file: "14-payments-ar.png", title: "14. المحفظة", desc: "الرصيد والنشاط المالي الأخير" },
  { file: "15-wallet-ar.png", title: "15. معاملات المحفظة", desc: "سجل المدفوعات والإيداعات والاستردادات" },
  { file: "16-notifications-ar.png", title: "16. مركز الإشعارات", desc: "تنبيهات المواعيد والرسائل" },
  { file: "17-support-ar.png", title: "17. راسل الدعم", desc: "إرسال طلب دعم جديد" },
  { file: "18-profile-ar.png", title: "18. الحساب والمزيد", desc: "الملف الشخصي والإعدادات" },
  { file: "19-settings-ar.png", title: "19. الإعدادات والتفضيلات", desc: "اللغة والمنطقة الزمنية" },
];

async function generate() {
  console.log("Generating Visual QA Contact Sheet...");
  const cardsHtml = SCREENS.map((s) => {
    const imgPath = path.join(SCREENSHOTS_DIR, s.file);
    const exists = fs.existsSync(imgPath);
    const base64 = exists ? fs.readFileSync(imgPath).toString("base64") : "";
    const src = base64 ? `data:image/png;base64,${base64}` : "";

    return `
      <div class="card">
        <div class="card-header">
          <div class="card-title">${s.title}</div>
          <div class="card-desc">${s.desc}</div>
          <div class="card-file">${s.file}</div>
        </div>
        <div class="img-wrapper">
          ${src ? `<img src="${src}" alt="${s.title}" />` : `<div class="missing">صورة غير متوفرة</div>`}
        </div>
      </div>
    `;
  }).join("\n");

  const html = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8" />
      <title>Sawiyaa Mobile — Visual QA Customer Contact Sheet</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          background: #0f172a;
          color: #f8fafc;
          padding: 32px 24px;
        }
        .header {
          text-align: center;
          margin-bottom: 32px;
          border-bottom: 1px solid #334155;
          padding-bottom: 24px;
        }
        .header h1 {
          font-size: 28px;
          color: #38bdf8;
          margin-bottom: 8px;
        }
        .header p {
          font-size: 15px;
          color: #94a3b8;
        }
        .badge {
          display: inline-block;
          background: #0369a1;
          color: #e0f2fe;
          font-size: 13px;
          font-weight: 600;
          padding: 4px 12px;
          border-radius: 9999px;
          margin-top: 10px;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
          max-width: 1700px;
          margin: 0 auto;
        }
        .card {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
          display: flex;
          flex-direction: column;
        }
        .card-header {
          padding: 14px 16px;
          background: #1e293b;
          border-bottom: 1px solid #334155;
        }
        .card-title {
          font-size: 15px;
          font-weight: 700;
          color: #f1f5f9;
          margin-bottom: 4px;
        }
        .card-desc {
          font-size: 12px;
          color: #94a3b8;
          margin-bottom: 6px;
        }
        .card-file {
          font-family: monospace;
          font-size: 11px;
          color: #38bdf8;
          background: #0f172a;
          padding: 2px 6px;
          border-radius: 4px;
          display: inline-block;
        }
        .img-wrapper {
          background: #000;
          padding: 12px;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 480px;
        }
        .img-wrapper img {
          max-width: 100%;
          height: auto;
          border-radius: 10px;
          border: 1px solid #334155;
        }
        .missing {
          color: #ef4444;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>سويّة موبايل — لوحة المراجعة البصرية لتجربة العميل (Visual QA Contact Sheet)</h1>
        <p>بيئة الفحص البصري: Expo Web / عرض الهاتف (390 × 844) / اتجاه عربي أصيل (RTL)</p>
        <span class="badge">FIXTURE-BASED VISUAL QA — 19 SCREENS</span>
      </div>
      <div class="grid">
        ${cardsHtml}
      </div>
    </body>
    </html>
  `;

  const htmlPath = path.resolve(__dirname, "contact-sheet.html");
  fs.writeFileSync(htmlPath, html, "utf8");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1750, height: 2600 } });
  await page.setContent(html, { waitUntil: "load" });
  await page.screenshot({ path: OUTPUT_PATH, fullPage: true });
  await browser.close();

  // Clean up html template
  fs.unlinkSync(htmlPath);

  console.log(`Contact sheet generated successfully at:\n${OUTPUT_PATH}`);
}

generate().catch((err) => {
  console.error("Failed generating contact sheet:", err);
  process.exit(1);
});
