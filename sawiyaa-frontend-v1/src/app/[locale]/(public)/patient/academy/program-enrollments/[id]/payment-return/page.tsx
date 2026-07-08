import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import PublicAcademyProgramPaymentReturnScreen from "@/features/academy-programs/components/PublicAcademyProgramPaymentReturnScreen";

type Props = {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{
    token?: string;
    redirect_status?: string;
    success?: string;
    pending?: string;
    order?: string;
    id?: string;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "academy" });

  return {
    title: t("meta.publicPaymentReturnTitle"),
    description: t("meta.publicPaymentReturnDescription"),
  };
}

export default async function AcademyProgramPaymentReturnPage({ params, searchParams }: Props) {
  const { locale, id } = await params;
  const { token, redirect_status, success, pending, order, id: providerPaymentId } =
    await searchParams;
  setRequestLocale(locale);

  const normalizedRedirectStatus =
    redirect_status ??
    (success === "true" && pending === "false"
      ? "succeeded"
      : success === "false" && pending === "false"
        ? "failed"
        : null);

  return (
    <PublicAcademyProgramPaymentReturnScreen
      enrollmentId={id}
      token={token ?? ""}
      redirectStatus={normalizedRedirectStatus}
      providerReference={order ?? providerPaymentId ?? null}
    />
  );
}
