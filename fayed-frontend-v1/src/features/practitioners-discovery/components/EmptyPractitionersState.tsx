import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SearchX } from "lucide-react";

type Props = {
  basePath?: string;
};

export default async function EmptyPractitionersState({ basePath = "/practitioners" }: Props) {
  const t = await getTranslations("practitioners-listing");

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary-light dark:bg-primary/15">
        <SearchX size={36} className="text-primary" />
      </div>

      <h3 className="mb-3 text-xl font-bold text-text-primary dark:text-white/90">
        {t("empty.title")}
      </h3>
      <p className="mb-8 max-w-sm text-text-secondary">{t("empty.subtitle")}</p>

      <Link
        href={basePath}
        className="inline-flex items-center rounded-xl border border-border-light bg-white px-6 py-3 font-semibold text-primary transition-all hover:border-primary hover:bg-primary hover:text-white dark:bg-surface-secondary"
      >
        {t("empty.clearFilters")}
      </Link>
    </div>
  );
}
