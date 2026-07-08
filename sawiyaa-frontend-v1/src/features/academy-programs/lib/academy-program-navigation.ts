import { API_CONFIG } from "@/lib/api/config";

export function buildPatientAcademyProgramPaymentReturnUrl(input: {
  locale: string;
  enrollmentId: string;
  origin: string;
}) {
  return `${input.origin.replace(/\/?$/, "")}/${input.locale}/patient/academy/program-enrollments/${input.enrollmentId}/payment-return`;
}

export function buildPatientAcademyProgramPaymentRedirectUrl(input: {
  enrollmentId: string;
  returnUrl: string;
}) {
  return `${API_CONFIG.baseURL}/patients/me/academy/program-enrollments/${input.enrollmentId}/pay/redirect?returnUrl=${encodeURIComponent(
    input.returnUrl,
  )}`;
}
