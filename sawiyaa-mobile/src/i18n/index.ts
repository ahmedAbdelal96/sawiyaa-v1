import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales } from "expo-localization";
import { I18nManager } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import en from "./locales/en.json";
import ar from "./locales/ar.json";
import { warnMissingTranslation } from "./missing-key-warning";

const resources = {
  en: { translation: en },
  ar: { translation: ar },
};

export type AppLanguage = "ar" | "en";

const APP_LANGUAGE_STORAGE_KEY = "sawiyaa.app.language";
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

function resolveTranslationNamespace(options: unknown): string | undefined {
  if (!options || typeof options !== "object") return undefined;

  const ns = (options as { ns?: string | readonly string[] }).ns;
  if (typeof ns === "string") return ns;
  if (Array.isArray(ns) && typeof ns[0] === "string") return ns[0];
  return undefined;
}

function resolveTranslationLanguage(options: unknown): AppLanguage {
  if (!options || typeof options !== "object") return initialLanguage;

  const lng = (options as { lng?: string }).lng;
  return normalizeLanguage(lng ?? i18n.language);
}

function hasPluralizedTranslation(
  language: AppLanguage,
  namespace: string | undefined,
  key: string,
) {
  const pluralSuffixes = ["zero", "one", "two", "few", "many", "other"] as const;

  return pluralSuffixes.some((suffix) =>
    i18n.exists(`${key}_${suffix}`, {
      lng: language,
      ns: namespace,
      fallbackLng: [] as never,
    } as never),
  );
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
  saveMissing: process.env.NODE_ENV !== "production",
  missingKeyHandler(lngs, ns, key) {
    warnMissingTranslation({
      lang: lngs[0] ?? initialLanguage,
      namespace: ns,
      key,
      fallbackLanguages: lngs.slice(1),
    });
  },
  interpolation: {
    escapeValue: false, // React already safely escapes
  },
});

const originalTranslate = i18n.t.bind(i18n);
i18n.t = ((key: unknown, options?: unknown) => {
  if (typeof key === "string" && process.env.NODE_ENV !== "production") {
    const namespace = resolveTranslationNamespace(options);
    const language = resolveTranslationLanguage(options);
    const resource = i18n.getResource(
      language,
      namespace ?? "translation",
      key,
    );
    const existsInCurrentLanguage = resource !== undefined;

    const isPluralizedKey = typeof options === "object" && options !== null && "count" in options;

    if (!existsInCurrentLanguage && !(isPluralizedKey && hasPluralizedTranslation(language, namespace, key))) {
      warnMissingTranslation({
        lang: language,
        namespace,
        key,
        fallbackLanguages: language === DEFAULT_LANGUAGE ? [] : [DEFAULT_LANGUAGE],
      });
    }
  }

  return originalTranslate(key as never, options as never);
}) as typeof i18n.t;

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
