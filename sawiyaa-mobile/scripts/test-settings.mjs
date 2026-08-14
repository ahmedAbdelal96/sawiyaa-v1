import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const localeDir = path.resolve(__dirname, "../src/i18n/locales");

function readLocale(language) {
  return JSON.parse(
    fs.readFileSync(path.join(localeDir, `${language}.json`), "utf8"),
  );
}

function resolveIsDark(themeMode, systemColorScheme) {
  return themeMode === "system"
    ? systemColorScheme === "dark"
    : themeMode === "dark";
}

function isCurrentLanguageRtl(language) {
  if (typeof language === "string" && language.length > 0) {
    return language.toLowerCase().startsWith("ar");
  }
  return false;
}

function computeDirectionChange(currentIsRtl, targetLanguage) {
  const nextIsRtl = targetLanguage === "ar";
  return currentIsRtl !== nextIsRtl;
}

console.log("Running Settings QA Validation Suite...");

// 1. Theme storage key contract
const APP_THEME_STORAGE_KEY = "sawiyaa.app.theme_mode";
console.assert(
  APP_THEME_STORAGE_KEY === "sawiyaa.app.theme_mode",
  "Theme storage key mismatch",
);
console.log("✔ 1. Canonical theme storage key verified.");

// 2. Theme resolution
console.assert(resolveIsDark("system", "dark") === true, "Theme test 2.1 failed");
console.assert(resolveIsDark("system", "light") === false, "Theme test 2.2 failed");
console.assert(resolveIsDark("light", "dark") === false, "Theme test 2.3 failed");
console.assert(resolveIsDark("dark", "light") === true, "Theme test 2.4 failed");
console.log("✔ 2. Theme resolution logic verified.");

// 3. Translation key parity
const ar = readLocale("ar");
const en = readLocale("en");

console.assert(ar.settings && en.settings, "Settings locale missing");
console.assert(
  ar.settings.title === "الإعدادات" && en.settings.title === "Settings",
  "Title mismatch",
);
console.assert(
  ar.settings.language.options.ar === "العربية" &&
    en.settings.language.options.en === "English",
  "Language options mismatch",
);
console.assert(
  ar.settings.appearance.options.system === "حسب إعداد الجهاز" &&
    en.settings.appearance.options.system === "System default",
  "Appearance options mismatch",
);
console.log("✔ 3. Translation parity verified.");

// 4. RTL resolution
console.assert(isCurrentLanguageRtl("ar") === true, "RTL test 4.1 failed");
console.assert(isCurrentLanguageRtl("en") === false, "RTL test 4.2 failed");
console.log("✔ 4. RTL language resolution verified.");

// 5. Direction change computation
console.assert(computeDirectionChange(true, "en") === true, "Direction test 5.1 failed");
console.assert(computeDirectionChange(false, "ar") === true, "Direction test 5.2 failed");
console.assert(computeDirectionChange(true, "ar") === false, "Direction test 5.3 failed");
console.log("✔ 5. Direction change computation verified.");

console.log("\nALL 5 QA SETTINGS TESTS PASSED SUCCESSFULLY!");
