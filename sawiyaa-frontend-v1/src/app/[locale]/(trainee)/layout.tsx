import { requireAuthenticatedArea } from "@/lib/auth/access";
import TraineeAppShell from "@/components/trainee/TraineeAppShell";

export default async function TraineeLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireAuthenticatedArea(locale, "trainee");
  return <TraineeAppShell>{children}</TraineeAppShell>;
}
