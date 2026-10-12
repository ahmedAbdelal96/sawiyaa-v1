import type { ApiPayload } from "@/lib/api/contracts";
import httpClient from "@/lib/api/http-client";
import { extractData } from "@/lib/api/response";

export type ManualAdminMethod = {
  id: string; code: string; type: string; displayNameAr: string; displayNameEn: string;
  accountHolderName: string; accountIdentifier: string; instructionsAr: string | null; instructionsEn: string | null;
  availabilityMode: string; countryIsoCodes: string[]; isEnabled: boolean; sortOrder: number;
};
export type ManualAdminMethodInput = Omit<ManualAdminMethod, "id" | "countryIsoCodes"> & { countryIsoCodes: string[] };
export type ManualAdminSubmission = {
  id: string; paymentId: string; attemptNumber: number; status: string; senderAccountName: string;
  amount: string; currencyCode: string; submittedAt: string; rejectionReason: string | null; resubmitUntil: string | null;
  method: ManualAdminMethod; proofStoredFileId: string; paymentStatus?: string | null; payer?: string | null;
  program?: { titleAr: string; titleEn: string } | null; enrollmentId?: string | null;
};

export async function listManualPaymentMethods() {
  const response = await httpClient.get<ApiPayload<ManualAdminMethod[]>>("/manual-payments/admin/methods");
  return extractData(response.data);
}
export async function createManualPaymentMethod(input: ManualAdminMethodInput) {
  const response = await httpClient.post<ApiPayload<{ item: ManualAdminMethod }>>("/manual-payments/admin/methods", input);
  return extractData(response.data).item;
}
export async function updateManualPaymentMethod(id: string, input: ManualAdminMethodInput) {
  const response = await httpClient.patch<ApiPayload<{ item: ManualAdminMethod }>>(`/manual-payments/admin/methods/${id}`, input);
  return extractData(response.data).item;
}
export async function setManualPaymentMethodEnabled(id: string, enabled: boolean) {
  const response = await httpClient.patch<ApiPayload<{ item: ManualAdminMethod }>>(`/manual-payments/admin/methods/${id}/enabled`, { enabled });
  return extractData(response.data).item;
}
export async function listManualPaymentSubmissions() {
  const response = await httpClient.get<ApiPayload<{ items: ManualAdminSubmission[] }>>("/manual-payments/admin/submissions", { params: { status: "UNDER_REVIEW" } });
  return extractData(response.data).items;
}
export async function approveManualPayment(id: string) {
  const response = await httpClient.post<ApiPayload<{ item: ManualAdminSubmission }>>(`/manual-payments/admin/submissions/${id}/approve`);
  return extractData(response.data).item;
}
export async function rejectManualPayment(id: string, reason: string) {
  const response = await httpClient.post<ApiPayload<{ item: ManualAdminSubmission }>>(`/manual-payments/admin/submissions/${id}/reject`, { reason });
  return extractData(response.data).item;
}
