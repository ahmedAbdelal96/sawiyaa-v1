import { redirect } from "next/navigation";

export default async function PractitionerRootPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/practitioner/dashboard`);
}
