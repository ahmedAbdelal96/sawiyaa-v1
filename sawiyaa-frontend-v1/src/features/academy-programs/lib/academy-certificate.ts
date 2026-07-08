import { API_BASE_URL } from "@/config/api";

export function resolveAcademyCertificateDownloadUrl(input: {
  enrollmentId: string;
  surface: "admin" | "patient";
}) {
  const path =
    input.surface === "admin"
      ? `/admin/academy/program-enrollments/${input.enrollmentId}/certificate`
      : `/patients/me/academy/program-enrollments/${input.enrollmentId}/certificate`;

  return `${API_BASE_URL}${path}`;
}
