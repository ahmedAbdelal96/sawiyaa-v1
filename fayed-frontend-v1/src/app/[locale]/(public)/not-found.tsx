import { SearchX } from "lucide-react";
import { getTranslations } from "next-intl/server";
import PublicPageState from "@/components/public/PublicPageState";

export default async function PublicNotFound() {
  const t = await getTranslations("public-pages.notFound");

  return (
    <PublicPageState
      icon={<SearchX size={40} />}
      eyebrow={t("eyebrow")}
      title={t("title")}
      description={t("description")}
      actions={[
        { href: "/", label: t("home"), primary: true },
        { href: "/practitioners", label: t("practitioners") },
        { href: "/specialties", label: t("specialties") },
      ]}
    />
  );
}
