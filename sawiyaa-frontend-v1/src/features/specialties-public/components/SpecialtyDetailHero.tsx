import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, BadgeInfo, LayoutGrid, Tag } from "lucide-react";
import type { Specialty } from "@/features/specialties/types/specialties.types";
import { getLocalizedSpecialtyName } from "@/features/specialties/utils/localized-specialty";

type Props = { specialty: Specialty };

export default async function SpecialtyDetailHero({ specialty }: Props) {
  const t = await getTranslations("specialties-public.detail");
  const locale = await getLocale();
  const specialtyName = getLocalizedSpecialtyName(specialty, locale);

  return (
    <div className="app-page-hero px-6 py-8">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/specialties"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary transition-colors hover:text-primary"
        >
          <ArrowLeft size={15} className="rtl:rotate-180" />
          <span>{t("backToListing")}</span>
        </Link>

        <p className="mt-5 text-sm text-text-muted">
          <span className="text-primary">Sawiyaa</span>
          {" / "}
          <span>{t("breadcrumb")}</span>
          {" / "}
          <span className="text-text-secondary">{specialtyName}</span>
        </p>

        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)] lg:items-start">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-primary/80">
              {t("eyebrow")}
            </p>
            <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-text-primary md:text-5xl dark:text-white/92">
              {specialtyName}
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-text-secondary">
              {specialty.description || t("aboutFallback")}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="app-panel-soft rounded-2xl p-4">
              <div className="flex items-center gap-2 text-xs font-medium text-text-muted">
                <BadgeInfo size={14} className="text-primary" />
                <span>{t("summaryTitle")}</span>
              </div>
              <p className="mt-2 text-sm leading-7 text-text-secondary">
                {t("summaryDescription")}
              </p>
            </div>

            <div className="app-panel-soft rounded-2xl p-4">
              <div className="flex items-center gap-2 text-xs font-medium text-text-muted">
                <Tag size={14} className="text-primary" />
                <span>{t("meta.slug")}</span>
              </div>
              <p className="mt-2 text-sm font-semibold text-text-primary dark:text-white/90">
                {specialty.slug}
              </p>
            </div>

            <div className="app-panel-soft rounded-2xl p-4">
              <div className="flex items-center gap-2 text-xs font-medium text-text-muted">
                <LayoutGrid size={14} className="text-primary" />
                <span>{t("meta.sortOrder")}</span>
              </div>
              <p className="mt-2 text-sm font-semibold text-text-primary dark:text-white/90">
                {specialty.sortOrder}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
