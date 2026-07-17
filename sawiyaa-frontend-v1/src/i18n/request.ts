import { getRequestConfig } from "next-intl/server";
import { IntlErrorCode } from "next-intl";
import { routing } from "./routing";
import { warnMissingTranslation } from "./missing-key-warning";
import { resolveRequestTimeZone } from "./resolve-request-time-zone";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !routing.locales.includes(locale as "ar" | "en")) {
    locale = routing.defaultLocale;
  }

  const loadNamespace = async (namespace: string) => {
    try {
      const messageModule = await import(`../../messages/${locale}/${namespace}.json`);
      return messageModule.default;
    } catch {
      const fallback = await import(`../../messages/en/${namespace}.json`);
      return fallback.default;
    }
  };

  const namespaces = [
    "common",
    "navigation",
    "auth",
    "moderation",
    "home",
    "practitioners-listing",
    "practitioner-profile",
    "specialties-public",
    "patient-profile",
    "patient-dashboard",
    "patient-area",
    "instant-booking",
    "package-purchases",
    "refund-policies",
    "practitioner-area",
    "practitioner-finance",
    "practitioner-promo-codes",
    "practitioner-reviews",
    "admin-area",
    "admin-articles",
    "admin-notifications",
    "admin-chat-conversations",
    "notifications",
    "admin-audit",
    "admin-finance-operations",
    "admin-accounting",
    "admin-reports",
    "admin-moderation-reports",
    "admin-session-runtime",
    "admin-sessions",
    "admin-settings",
    "admin-package-plans",
    "admin-practitioner-payouts",
    "admin-package-settlements",
    "admin-refund-policies",
    "admin-featured-practitioners",
    "admin-patients",
    "admin-users",
    "payment-gateway-control",
    "payments",
    "sessions",
    "patient-journey",
    "guided-matching",
    "assessments",
    "support",
    "reviews",
    "care-chat",
    "public-articles",
    "public-pages",
    "academy",
    "errors",
    "help",
    "admin-help",
    "messages-shell",
  ] as const;

  const loadedMessages = await Promise.all(namespaces.map((namespace) => loadNamespace(namespace)));
  const messages = Object.fromEntries(
    namespaces.map((namespace, index) => [namespace, loadedMessages[index]])
  );
  const timeZone = await resolveRequestTimeZone();

  return {
    locale,
    messages,
    timeZone,
    onError(error) {
      if (process.env.NODE_ENV === "development" && error.code !== IntlErrorCode.MISSING_MESSAGE) {
        console.error("[i18n] Error:", error.message);
      }
    },
    getMessageFallback({ namespace, key, error }) {
      const path = [namespace, key].filter(Boolean).join(".");

      if (error.code === IntlErrorCode.MISSING_MESSAGE) {
        warnMissingTranslation({
          locale,
          namespace,
          key,
          fallbackLocale: routing.defaultLocale,
        });
        return `[${path}]`;
      }

      return `[${path}]`;
    },
  };
});
