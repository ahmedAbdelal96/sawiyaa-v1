import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import PaymentReturnPanel from "@/features/payments/components/PaymentReturnPanel";

type Props = {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{
    redirect_status?: string;
    success?: string;
    pending?: string;
    order?: string;
    id?: string;
    payment_intent?: string;
    payment_intent_client_secret?: string;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "payments" });
  return {
    title: t("meta.returnTitle"),
  };
}

export default async function PatientSessionPaymentReturnPage({ params, searchParams }: Props) {
  const { locale, id } = await params;
  const { redirect_status, success, pending, order, id: providerPaymentId } = await searchParams;
  setRequestLocale(locale);

  const normalizedRedirectStatus =
    redirect_status ??
    (success === "true" && pending === "false"
      ? "succeeded"
      : success === "false" && pending === "false"
        ? "failed"
        : null);

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <PaymentReturnPanel
        redirectStatus={normalizedRedirectStatus}
        sessionId={id}
        providerReference={order ?? providerPaymentId ?? null}
      />
    </div>
  );
}
