import { API_CONFIG } from "@/lib/api/config";

export function buildPatientAcademyProgramPaymentReturnUrl(input: {
  locale: string;
  enrollmentId: string;
  origin: string;
  token?: string;
}) {
  const base = `${input.origin.replace(/\/?$/, "")}/${input.locale}/patient/academy/program-enrollments/${input.enrollmentId}/payment-return`;
  if (input.token) {
    return `${base}?token=${encodeURIComponent(input.token)}`;
  }
  return base;
}

export function buildPatientAcademyProgramPaymentRedirectUrl(input: {
  enrollmentId: string;
  returnUrl: string;
}) {
  return `${API_CONFIG.baseURL}/patients/me/academy/program-enrollments/${input.enrollmentId}/pay/redirect?returnUrl=${encodeURIComponent(
    input.returnUrl,
  )}`;
}

export function buildPublicAcademyProgramPaymentRedirectUrl(input: {
  enrollmentId: string;
  token: string;
  returnUrl?: string;
}) {
  const params = new URLSearchParams({ token: input.token });
  if (input.returnUrl) {
    params.set("returnUrl", input.returnUrl);
  }
  return `${API_CONFIG.baseURL}/academy/program-enrollments/${input.enrollmentId}/pay/redirect?${params.toString()}`;
}
