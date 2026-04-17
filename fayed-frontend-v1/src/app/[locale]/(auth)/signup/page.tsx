import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ callbackUrl?: string }>;
};

export default async function SignUp({ params, searchParams }: Props) {
  const { locale } = await params;
  const { callbackUrl } = await searchParams;
  const redirectTarget = callbackUrl
    ? `/${locale}/signup/patient?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : `/${locale}/signup/patient`;

  redirect(redirectTarget);
}
