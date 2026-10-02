import fs from "fs";
import path from "path";
import { APP_THEME_STORAGE_KEY, DEFAULT_THEME_MODE, resolveThemeMode, type ThemeMode } from "../../src/providers/theme-constants";

type JsonObject = { [key: string]: unknown };

const localeDir = path.resolve(__dirname, "../../src/i18n/locales");

function readLocale(language: "ar" | "en"): JsonObject {
  return JSON.parse(
    fs.readFileSync(path.join(localeDir, `${language}.json`), "utf8"),
  ) as JsonObject;
}

function resolveIsDark(themeMode: ThemeMode, systemColorScheme: 'light' | 'dark' | null | undefined): boolean {
  return themeMode === 'system' ? systemColorScheme === 'dark' : themeMode === 'dark';
}

function isCurrentLanguageRtl(language?: string | null): boolean {
  if (typeof language === "string" && language.length > 0) {
    return language.toLowerCase().startsWith("ar");
  }
  return false;
}

function computeDirectionChange(currentIsRtl: boolean, targetLanguage: "ar" | "en"): boolean {
  const nextIsRtl = targetLanguage === "ar";
  return currentIsRtl !== nextIsRtl;
}

describe("Settings & Appearance Preference Resolution", () => {
  test("1. Canonical storage key for appearance theme mode is correctly specified", () => {
    expect(APP_THEME_STORAGE_KEY).toBe("sawiyaa.app.theme_mode");
  });

  test("2. New users default to light and invalid stored values fall back to light", () => {
    expect(DEFAULT_THEME_MODE).toBe("light");
    expect(resolveThemeMode(null)).toBe("light");
    expect(resolveThemeMode(undefined)).toBe("light");
    expect(resolveThemeMode("invalid")).toBe("light");
  });

  test("3. Valid stored theme preferences are preserved", () => {
    expect(resolveThemeMode("light")).toBe("light");
    expect(resolveThemeMode("dark")).toBe("dark");
    expect(resolveThemeMode("system")).toBe("system");
  });

  test("4. Theme mode resolution obeys device settings when 'system', and overrides when explicit", () => {
    // System mode follows device color scheme
    expect(resolveIsDark("system", "dark")).toBe(true);
    expect(resolveIsDark("system", "light")).toBe(false);
    expect(resolveIsDark("system", undefined)).toBe(false);

    // Light mode explicitly overrides system dark
    expect(resolveIsDark("light", "dark")).toBe(false);
    expect(resolveIsDark("light", "light")).toBe(false);

    // Dark mode explicitly overrides system light
    expect(resolveIsDark("dark", "light")).toBe(true);
    expect(resolveIsDark("dark", "dark")).toBe(true);
  });

  test("5. Translation keys for settings exist and match between ar and en", () => {
    const ar = readLocale("ar");
    const en = readLocale("en");

    expect(ar.settings).toBeDefined();
    expect(en.settings).toBeDefined();

    const arSettings = ar.settings as JsonObject;
    const enSettings = en.settings as JsonObject;

    expect(arSettings.title).toBe("الإعدادات");
    expect(enSettings.title).toBe("Settings");

    const arLangOptions = (arSettings.language as JsonObject).options as JsonObject;
    const enLangOptions = (enSettings.language as JsonObject).options as JsonObject;

    expect(arLangOptions.ar).toBe("العربية");
    expect(enLangOptions.ar).toBe("العربية");
    expect(arLangOptions.en).toBe("English");
    expect(enLangOptions.en).toBe("English");

    const arAppOptions = (arSettings.appearance as JsonObject).options as JsonObject;
    const enAppOptions = (enSettings.appearance as JsonObject).options as JsonObject;

    expect(arAppOptions.system).toBe("حسب إعداد الجهاز");
    expect(enAppOptions.system).toBe("System default");
    expect(arAppOptions.light).toBe("فاتح");
    expect(enAppOptions.light).toBe("Light");
    expect(arAppOptions.dark).toBe("داكن");
    expect(enAppOptions.dark).toBe("Dark");
  });

  test("6. Language RTL resolution resolves reactively based on active locale string", () => {
    expect(isCurrentLanguageRtl("ar")).toBe(true);
    expect(isCurrentLanguageRtl("ar-EG")).toBe(true);
    expect(isCurrentLanguageRtl("en")).toBe(false);
    expect(isCurrentLanguageRtl("en-US")).toBe(false);
  });

  test("7. Direction change calculation detects when native reload is required", () => {
    // Switching Arabic (RTL) -> English (LTR) requires direction update
    expect(computeDirectionChange(true, "en")).toBe(true);

    // Switching English (LTR) -> Arabic (RTL) requires direction update
    expect(computeDirectionChange(false, "ar")).toBe(true);

    // Re-selecting current language does not trigger direction change
    expect(computeDirectionChange(true, "ar")).toBe(false);
    expect(computeDirectionChange(false, "en")).toBe(false);
  });
});
