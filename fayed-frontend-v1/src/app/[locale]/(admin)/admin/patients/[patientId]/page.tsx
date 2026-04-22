import AdminPatient360Screen from "@/features/admin/patients/components/AdminPatient360Screen";

export default async function AdminPatientDetailsPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const { patientId } = await params;
  return <AdminPatient360Screen patientId={patientId} />;
}
