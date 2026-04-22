import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales } from "expo-localization";
import { I18nManager } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import en from "./locales/en.json";
import ar from "./locales/ar.json";

const resources = {
  en: { translation: en },
  ar: { translation: ar },
};

export type AppLanguage = "ar" | "en";

const APP_LANGUAGE_STORAGE_KEY = "fayed.app.language";
const DEFAULT_LANGUAGE: AppLanguage = "ar";

function normalizeLanguage(value: string | null | undefined): AppLanguage {
  return value?.startsWith("ar") ? "ar" : "en";
}

function applyRtlDirection(language: AppLanguage) {
  const nextIsRTL = language === "ar";
  const didDirectionChange = I18nManager.isRTL !== nextIsRTL;

  if (didDirectionChange) {
    I18nManager.allowRTL(nextIsRTL);
    I18nManager.forceRTL(nextIsRTL);
  }

  return didDirectionChange;
}

// Fallback if expo-localization doesn't return anything
const deviceLanguage = normalizeLanguage(
  getLocales()[0]?.languageCode || DEFAULT_LANGUAGE,
);

// Arabic-first fallback unless the device is already Arabic or user has an explicit saved choice.
const initialLanguage: AppLanguage =
  deviceLanguage === "ar" ? "ar" : DEFAULT_LANGUAGE;
applyRtlDirection(initialLanguage);

i18n.use(initReactI18next).init({
  resources,
  lng: initialLanguage,
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: {
    escapeValue: false, // React already safely escapes
  },
});

async function hydratePersistedLanguage() {
  try {
    const persistedLanguage = await AsyncStorage.getItem(
      APP_LANGUAGE_STORAGE_KEY,
    );
    if (!persistedLanguage) {
      return;
    }

    const normalizedLanguage = normalizeLanguage(persistedLanguage);
    applyRtlDirection(normalizedLanguage);

    if (i18n.language !== normalizedLanguage) {
      await i18n.changeLanguage(normalizedLanguage);
    }
  } catch {
    // Ignore persistence read issues and keep device language fallback.
  }
}

void hydratePersistedLanguage();

export async function setAppLanguage(language: AppLanguage) {
  const normalizedLanguage = normalizeLanguage(language);
  const requiresRestart = applyRtlDirection(normalizedLanguage);

  await i18n.changeLanguage(normalizedLanguage);

  try {
    await AsyncStorage.setItem(APP_LANGUAGE_STORAGE_KEY, normalizedLanguage);
  } catch {
    // Keep runtime language change even if local persistence fails.
  }

  return { requiresRestart };
}

export default i18n;
