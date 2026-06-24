import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminCancellationPolicyEditor from "@/features/admin/sessions/components/AdminCancellationPolicyEditor";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin-sessions" });
  return {
    title: t("policy.meta.title"),
    description: t("policy.meta.description"),
  };
}

export default async function AdminSessionCancellationPolicyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="space-y-5">
      <AdminCancellationPolicyEditor />
    </div>
  );
}
