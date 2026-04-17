import { getRequestConfig } from "next-intl/server";
import { IntlErrorCode } from "next-intl";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !routing.locales.includes(locale as "ar" | "en")) {
    locale = routing.defaultLocale;
  }

  // Load namespace with fallback to English.
  const loadNamespace = async (namespace: string) => {
    try {
      const messageModule = await import(`../../messages/${locale}/${namespace}.json`);
      return messageModule.default;
    } catch {
      const fallback = await import(`../../messages/en/${namespace}.json`);
      return fallback.default;
    }
  };

  const [
    common,
    navigation,
    auth,
    home,
    practitionersListing,
    practitionerProfile,
    specialtiesPublic,
    patientProfile,
    patientDashboard,
    patientArea,
    practitionerArea,
    practitionerFinance,
    practitionerReviews,
    adminArea,
    adminArticles,
    adminNotifications,
    adminFinanceOperations,
    adminSettlements,
    adminModerationReports,
    adminSessionRuntime,
    adminSessions,
    adminSettings,
    payments,
    sessions,
    patientJourney,
    guidedMatching,
    assessments,
    support,
    reviews,
    careChat,
    publicArticles,
    publicPages,
    training,
    errors,
  ] = await Promise.all([
    loadNamespace("common"),
    loadNamespace("navigation"),
    loadNamespace("auth"),
    loadNamespace("home"),
    loadNamespace("practitioners-listing"),
    loadNamespace("practitioner-profile"),
    loadNamespace("specialties-public"),
    loadNamespace("patient-profile"),
    loadNamespace("patient-dashboard"),
    loadNamespace("patient-area"),
    loadNamespace("practitioner-area"),
    loadNamespace("practitioner-finance"),
    loadNamespace("practitioner-reviews"),
    loadNamespace("admin-area"),
    loadNamespace("admin-articles"),
    loadNamespace("admin-notifications"),
    loadNamespace("admin-finance-operations"),
    loadNamespace("admin-settlements"),
    loadNamespace("admin-moderation-reports"),
    loadNamespace("admin-session-runtime"),
    loadNamespace("admin-sessions"),
    loadNamespace("admin-settings"),
    loadNamespace("payments"),
    loadNamespace("sessions"),
    loadNamespace("patient-journey"),
    loadNamespace("guided-matching"),
    loadNamespace("assessments"),
    loadNamespace("support"),
    loadNamespace("reviews"),
    loadNamespace("care-chat"),
    loadNamespace("public-articles"),
    loadNamespace("public-pages"),
    loadNamespace("training"),
    loadNamespace("errors"),
  ]);

  return {
    locale,
    messages: {
      common,
      navigation,
      auth,
      home,
      "practitioners-listing": practitionersListing,
      "practitioner-profile": practitionerProfile,
      "specialties-public": specialtiesPublic,
      "patient-profile": patientProfile,
      "patient-dashboard": patientDashboard,
      "patient-area": patientArea,
      "practitioner-area": practitionerArea,
      "practitioner-finance": practitionerFinance,
      "practitioner-reviews": practitionerReviews,
      "admin-area": adminArea,
      "admin-articles": adminArticles,
      "admin-notifications": adminNotifications,
      "admin-finance-operations": adminFinanceOperations,
      "admin-settlements": adminSettlements,
      "admin-moderation-reports": adminModerationReports,
      "admin-session-runtime": adminSessionRuntime,
      "admin-sessions": adminSessions,
      "admin-settings": adminSettings,
      payments,
      sessions,
      "patient-journey": patientJourney,
      "guided-matching": guidedMatching,
      assessments,
      support,
      reviews,
      "care-chat": careChat,
      "public-articles": publicArticles,
      "public-pages": publicPages,
      training,
      errors,
    },
    onError(error) {
      if (error.code === IntlErrorCode.MISSING_MESSAGE) {
        console.warn("[i18n] Missing translation:", {
          key: error.message,
          locale,
        });
      } else {
        console.error("[i18n] Error:", error.message);
      }
    },
    getMessageFallback({ namespace, key, error }) {
      const path = [namespace, key].filter(Boolean).join(".");

      if (error.code === IntlErrorCode.MISSING_MESSAGE) {
        return `[${path}]`;
      }

      return `[${path}]`;
    },
  };
});
