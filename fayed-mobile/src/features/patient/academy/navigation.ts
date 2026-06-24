import * as Linking from "expo-linking";
import { Platform } from "react-native";
import { apiClient } from "../../../lib/api";

function ensureTrailingSlash(value: string) {
  return value.endsWith("/") ? value : `${value}/`;
}

export function buildAcademyEnrollmentPaymentReturnBaseUrl() {
  const academyEnrollmentsPath = "/academy/enrollments";

  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.location?.origin) {
      return ensureTrailingSlash(
        `${window.location.origin}${academyEnrollmentsPath}`,
      );
    }

    return ensureTrailingSlash(Linking.createURL(academyEnrollmentsPath));
  }

  return ensureTrailingSlash(
    Linking.createURL(academyEnrollmentsPath, {
      scheme: "sawiyaa",
    }),
  );
}

export function buildAcademyEnrollmentPaymentReturnUrl(input: {
  enrollmentId: string;
  token: string;
}) {
  const baseUrl = buildAcademyEnrollmentPaymentReturnBaseUrl();
  const returnUrl = new URL(
    `${input.enrollmentId}/payment-return`,
    baseUrl,
  );
  returnUrl.searchParams.set("token", input.token);
  return returnUrl.toString();
}

export function buildAcademyEnrollmentPaymentRedirectUrl(input: {
  enrollmentId: string;
  token: string;
  returnUrl: string;
}) {
  const baseUrl = apiClient.defaults.baseURL?.trim();

  if (!baseUrl) {
    throw new Error("API base URL is required to open Academy payment.");
  }

  const redirectUrl = new URL(
    `academy/enrollments/${input.enrollmentId}/pay/redirect`,
    baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`,
  );
  redirectUrl.searchParams.set("token", input.token);
  redirectUrl.searchParams.set("returnUrl", input.returnUrl);
  return redirectUrl.toString();
}
