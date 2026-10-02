import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function PatientInstantBookingPage({ params }: Props) {
  const { locale } = await params;
  redirect(`/${locale}/patient/practitioners?onlineNow=true&instantBookingEnabled=true`);
}
