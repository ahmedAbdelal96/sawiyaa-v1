import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";
import PractitionerCard from "@/features/practitioners-discovery/components/PractitionerCard";
import type { PublicPractitioner } from "@/features/practitioners-discovery/types/practitioner";

type Props = {
  specialtySlug: string;
  practitioners: PublicPractitioner[];
  specialtyLabels: Record<string, string>;
  languageLabels: Record<string, string>;
  totalItems: number;
};

export default async function SpecialtyPractitionersTeaser({
  specialtySlug,
  practitioners,
  specialtyLabels,
  languageLabels,
  totalItems,
}: Props) {
  const t = await getTranslations("specialties-public.detail.practitioners");

  const countLabel =
    totalItems === 1 ? t("resultCountSingle") : t("resultCount", { count: totalItems });

  return (
    <div className="border-t border-border-light bg-surface px-6 py-12 dark:border-border-light dark:bg-surface">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary/80">
              {t("eyebrow")}
            </p>
            <h2 className="mt-3 text-3xl font-bold text-text-primary dark:text-white/92">
              {t("title")}
            </h2>
            <p className="mt-3 max-w-3xl text-base leading-8 text-text-secondary">
              {t("subtitle")}
            </p>
          </div>

          <div className="rounded-full bg-primary/6 px-4 py-2 text-sm font-medium text-text-brand dark:bg-primary/12">
            {countLabel}
          </div>
        </div>

        {practitioners.length > 0 ? (
          <>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {practitioners.map((practitioner) => (
                <PractitionerCard
                  key={practitioner.id}
                  practitioner={practitioner}
                  specialtyLabels={specialtyLabels}
                  languageLabels={languageLabels}
                />
              ))}
            </div>

            <div className="mt-8 flex justify-center">
              <Link
                href={`/practitioners?specialtySlug=${specialtySlug}`}
                className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary/90"
              >
                {t("cta")}
                <ArrowRight size={15} className="rtl:rotate-180" />
              </Link>
            </div>
          </>
        ) : (
          <div className="rounded-[28px] border border-dashed border-border-light bg-white px-6 py-14 text-center dark:border-border-light dark:bg-surface-secondary">
            <h3 className="text-xl font-semibold text-text-primary dark:text-white/90">
              {t("emptyTitle")}
            </h3>
            <p className="mt-3 text-text-secondary">{t("emptySubtitle")}</p>
            <div className="mt-6">
              <Link
                href="/practitioners"
                className="inline-flex items-center gap-2 rounded-2xl border border-border-light px-5 py-3 text-sm font-medium text-text-secondary transition hover:bg-surface-tertiary dark:hover:bg-white/5"
              >
                {t("fallbackCta")}
                <ArrowRight size={15} className="rtl:rotate-180" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
