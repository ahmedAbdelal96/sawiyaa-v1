import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Compass, ArrowRight, ListChecks, Check } from "lucide-react";

export default async function GuidedCareSection() {
  const t = await getTranslations("home.guidedCare");

  const bullets = ["bullet1", "bullet2", "bullet3", "bullet4"] as const;

  return (
    <section className="px-6 py-16 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="app-panel overflow-hidden rounded-[32px] p-8 lg:grid lg:grid-cols-2 lg:gap-12 lg:p-10">
          {/* Left: Text */}
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-primary/80">
              {t("eyebrow")}
            </p>
            <h2 className="text-2xl font-bold text-text-primary md:text-3xl dark:text-white/92">
              {t("title")}
            </h2>
            <p className="mt-4 text-base leading-7 text-text-secondary">
              {t("subtitle")}
            </p>

            <ul className="mt-6 space-y-3">
              {bullets.map((key) => (
                <li key={key} className="flex items-start gap-3 text-sm text-text-secondary">
                  <Check size={15} className="mt-0.5 shrink-0 text-emerald-500" />
                  {t(`bullets.${key}`)}
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/specialties"
                className="inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-primary-hover"
              >
                {t("ctaPrimary")}
              </Link>
              <Link
                href="/practitioners"
                className="inline-flex items-center gap-2 rounded-2xl border border-border-light bg-white px-6 py-3.5 text-sm font-semibold text-text-primary transition hover:border-primary hover:bg-primary-light hover:text-primary dark:bg-surface"
              >
                {t("ctaSecondary")}
              </Link>
            </div>
          </div>

          {/* Right: Visual */}
          <div className="mt-8 lg:mt-0">
            <div className="rounded-[28px] bg-emerald-50/60 border border-emerald-100 p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-[22px] bg-emerald-100 text-emerald-600 ring-1 ring-inset ring-emerald-200">
                  <Compass size={22} />
                </div>
                <div>
                  <p className="text-sm font-bold text-text-primary dark:text-white/90">
                    {t("visualLabel")}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {t("visualHint")}
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                {([1, 2, 3] as const).map((i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-white/80 px-4 py-3 dark:bg-white/5"
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100">
                      <span className="text-xs font-bold text-emerald-600">{i}</span>
                    </div>
                    <p className="text-sm text-text-secondary">
                      {t(`visualStep.${i}`)}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex items-center justify-end">
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600">
                  {t("visualResult")}
                  <ArrowRight size={14} className="rtl:rotate-180" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}