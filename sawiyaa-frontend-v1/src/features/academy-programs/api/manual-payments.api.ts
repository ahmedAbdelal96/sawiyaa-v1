import type { ApiPayload } from "@/lib/api/contracts";
import httpClient from "@/lib/api/http-client";
import { extractData } from "@/lib/api/response";
import type { ManualPaymentMethod, ManualPaymentSubmission } from "../types/academy-programs.types";

export async function getManualPaymentMethods() {
  const response = await httpClient.get<ApiPayload<{ items: ManualPaymentMethod[] }>>("/manual-payments/methods");
  return extractData(response.data).items;
}

export async function getManualPaymentSubmissions(enrollmentId: string, token?: string) {
  const response = await httpClient.get<ApiPayload<{ items: ManualPaymentSubmission[] }>>(`/manual-payments/academy/enrollments/${enrollmentId}/submissions`, { params: token ? { token } : undefined });
  return extractData(response.data).items;
}

export async function submitManualPaymentProof(input: {
  enrollmentId: string;
  methodId: string;
  senderAccountName: string;
  notes?: string;
  proof: File;
  token?: string;
}) {
  const formData = new FormData();
  formData.append("methodId", input.methodId);
  formData.append("senderAccountName", input.senderAccountName);
  if (input.notes) formData.append("notes", input.notes);
  if (input.token) formData.append("token", input.token);
  formData.append("proof", input.proof);
  const response = await httpClient.post<ApiPayload<{ item: ManualPaymentSubmission }>>(`/manual-payments/academy/enrollments/${input.enrollmentId}/submissions`, formData);
  return extractData(response.data).item;
}
