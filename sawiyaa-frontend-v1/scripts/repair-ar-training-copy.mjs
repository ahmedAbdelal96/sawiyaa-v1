import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.join(scriptDir, "..", "messages", "ar", "training.json");

function setDeep(target, pathParts, value) {
  let current = target;
  for (let index = 0; index < pathParts.length - 1; index += 1) {
    const key = pathParts[index];
    if (!current[key] || typeof current[key] !== "object") {
      current[key] = {};
    }
    current = current[key];
  }

  current[pathParts[pathParts.length - 1]] = value;
}

function main() {
  const content = fs.readFileSync(filePath, "utf8");
  const data = JSON.parse(content);

  const updates = {
    "courseTypes.LIVE_COURSE": "دورة مباشرة",
    "patient.catalog.eyebrow": "تصفّح حسب الموضوع",
    "patient.catalog.heading": "البرامج المتاحة",
    "patient.catalog.note":
      "تصفّح البرامج التدريبية المنشورة حسب التخصص أو ابحث عن الموضوع الذي تريده. افتح أي برنامج لمراجعة جدوله وابدأ عندما يكون التسجيل مفتوحًا.",
    "patient.catalog.count": "{value, number} برنامج متاح",
    "patient.catalog.publishedAt": "تم النشر في {date}",
    "patient.catalog.fallbackDescription":
      "افتح هذا التدريب لمراجعة حالة الجداول الحالية وتوقيت التسجيل الحقيقي.",
    "patient.catalog.openDetails": "فتح تفاصيل البرنامج",
    "patient.catalog.results.all": "يظهر {start}-{end} من أصل {total, number} برنامج منشور",
    "patient.catalog.results.filtered": "يظهر {start}-{end} من أصل {total, number} برنامج مطابق",
    "patient.catalog.filters.searchLabel": "بحث",
    "patient.catalog.filters.searchPlaceholder": "ابحث في البرامج التدريبية",
    "patient.catalog.filters.searchButton": "بحث",
    "patient.catalog.filters.clear": "مسح الفلاتر",
    "patient.catalog.filters.categoryLabel": "التخصص",
    "patient.catalog.filters.allCategories": "كل التخصصات",
    "patient.catalog.filters.categoryCount": "{value, number}",
    "patient.catalog.filters.allCount": "الكل",
    "patient.catalog.states.empty.heading": "لا يوجد تدريب متاح الآن",
    "patient.catalog.states.empty.note": "لا توجد برامج تدريبية منشورة في الكتالوج الحالي.",
    "patient.catalog.states.filteredEmpty.heading": "لا توجد برامج تطابق هذه التصفية",
    "patient.catalog.states.filteredEmpty.note":
      "جرّب تخصصًا آخر أو امسح الفلاتر لعرض برامج منشورة أكثر.",
  };

  for (const [key, value] of Object.entries(updates)) {
    setDeep(data, key.split("."), value);
  }

  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

main();
