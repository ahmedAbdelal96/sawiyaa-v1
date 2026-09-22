import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { HelpCircle, ArrowRight, CheckCircle2 } from "lucide-react";

export default async function GuidedCareSection() {
  const [t, locale] = await Promise.all([
    getTranslations("home.guidedCare"),
    getLocale(),
  ]);
  const isAr = locale === "ar";
  const bullets = ["bullet1", "bullet2", "bullet3"] as const;

  return (
    <section className="px-6 py-12 lg:px-12 lg:py-16">
      <div className="mx-auto max-w-5xl">
        <div className="app-panel overflow-hidden rounded-[28px] border border-border-light/70 bg-gradient-to-br from-white via-[#FCFAF6] to-white p-6 sm:p-10 shadow-sm dark:bg-surface-secondary dark:border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#EEF4EF] text-[#24564F] dark:bg-primary/20 dark:text-primary-light">
              <HelpCircle size={24} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#24564F]">
                {t("eyebrow")}
              </p>
              <h2 className="text-xl sm:text-2xl font-bold text-[#1C2F2B] dark:text-white/95">
                {t("title")}
              </h2>
            </div>
          </div>

          <p className="text-sm sm:text-base leading-relaxed text-text-secondary dark:text-white/70 max-w-2xl">
            {t("subtitle")}
          </p>

          <ul className="mt-6 grid gap-3 sm:grid-cols-3">
            {bullets.map((key) => (
              <li
                key={key}
                className="flex items-center gap-2.5 rounded-xl bg-[#FCFAF6] p-3 text-xs sm:text-sm font-medium text-text-primary dark:bg-white/5 dark:text-white/85 border border-border-light/40"
              >
                <CheckCircle2 size={16} className="shrink-0 text-[#24564F]" />
                <span>{t(`bullets.${key}` as never)}</span>
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/specialties"
              className="sawiyaa-btn-press inline-flex items-center justify-center gap-2 rounded-xl bg-[#24564F] px-5 py-3 text-sm font-bold text-white shadow-xs transition hover:bg-[#1F4A44]"
            >
              <span>{t("ctaSecondary")}</span>
              <ArrowRight size={14} className={isAr ? "rotate-180" : ""} />
            </Link>

            <Link
              href="/help"
              className="sawiyaa-btn-press inline-flex items-center justify-center rounded-xl border border-border-light bg-white px-5 py-3 text-sm font-semibold text-[#24564F] transition hover:bg-[#EEF4EF] dark:bg-white/5 dark:text-white dark:border-white/10"
            >
              {t("ctaPrimary")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}