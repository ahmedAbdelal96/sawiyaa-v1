import PatientAcademyProgramEnrollmentDetailScreen from "@/features/academy-programs/components/PatientAcademyProgramEnrollmentDetailScreen";

export default async function TraineeAcademyEnrollmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PatientAcademyProgramEnrollmentDetailScreen enrollmentId={id} />;
}
