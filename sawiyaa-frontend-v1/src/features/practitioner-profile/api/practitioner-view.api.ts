import httpClient from "@/lib/api/http-client";

export async function trackPatientPractitionerView(slug: string): Promise<void> {
  await httpClient.post(`/patients/me/practitioner-views/${encodeURIComponent(slug)}`);
}
