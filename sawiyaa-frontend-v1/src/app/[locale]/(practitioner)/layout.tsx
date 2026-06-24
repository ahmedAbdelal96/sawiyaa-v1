import { requireAuthenticatedArea } from "@/lib/auth/access";
import PractitionerShell from "@/features/practitioners/components/PractitionerShell";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function PractitionerLayout({ children, params }: Props) {
  const { locale } = await params;
  await requireAuthenticatedArea(locale, "practitioner");
  return <PractitionerShell>{children}</PractitionerShell>;
}
