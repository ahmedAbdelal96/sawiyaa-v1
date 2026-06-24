import { requireAuthenticatedArea } from "@/lib/auth/access";
import PatientAppShell from "@/components/patient/PatientAppShell";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function PatientLayout({ children, params }: Props) {
  const { locale } = await params;
  await requireAuthenticatedArea(locale, "patient");
  return <PatientAppShell>{children}</PatientAppShell>;
}
