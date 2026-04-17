import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AlertCircle } from "lucide-react";

type Props = {
  basePath?: string;
};

export default async function ListingErrorState({ basePath = "/practitioners" }: Props) {
  const t = await getTranslations("practitioners-listing");

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-50 dark:bg-red-500/10">
        <AlertCircle size={36} className="text-red-500" />
      </div>

      <h3 className="mb-3 text-xl font-bold text-text-primary dark:text-white/90">
        {t("error.title")}
      </h3>
      <p className="mb-8 max-w-sm text-text-secondary">{t("error.subtitle")}</p>

      <Link
        href={basePath}
        className="inline-flex items-center rounded-xl border border-border-light bg-white px-6 py-3 font-semibold text-primary transition-all hover:border-primary hover:bg-primary hover:text-white dark:bg-surface-secondary"
      >
        {t("error.retry")}
      </Link>
    </div>
  );
}
