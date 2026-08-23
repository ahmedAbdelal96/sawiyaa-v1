import { redirect } from "next/navigation";

export default async function TraineeRootPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}/trainee/academy`);
}
