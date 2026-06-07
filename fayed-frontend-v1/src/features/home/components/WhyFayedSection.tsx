import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { WHY_FEATURES } from "@/features/home/data/home-data";

const FEATURE_KEYS = ["privacy", "certified", "flexible", "arabic"] as const;

export default async function WhyFayedSection() {
  const t = await getTranslations("home.whyFayed");

  return (
    <section className="px-6 py-24">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[minmax(0,0.96fr)_minmax(0,1.04fr)] lg:items-start">
        <div className="app-panel overflow-hidden rounded-[34px] p-8">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-primary/80">
            {t("eyebrow")}
          </p>
          <h2 className="text-3xl font-bold leading-tight text-text-primary md:text-4xl dark:text-text-primary">
            {t("title")}
          </h2>
          <p className="mt-5 text-lg leading-8 text-text-secondary">{t("desc")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/specialties"
              className="inline-flex items-center rounded-2xl bg-primary px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-primary-hover"
            >
              {t("cta")}
            </Link>
            <Link
              href="/practitioners"
              className="inline-flex items-center rounded-2xl border border-border-light bg-surface-secondary px-6 py-3.5 text-sm font-semibold text-text-primary transition hover:border-primary hover:bg-primary-light hover:text-primary dark:text-white/90"
            >
              {t("secondaryCta")}
            </Link>
          </div>

          <ul className="mt-7 grid gap-2 text-sm leading-7 text-text-secondary">
            <li className="relative ps-5">
              <span className="absolute start-0 top-2 h-1.5 w-1.5 rounded-full bg-primary/70" />
              {t("signals.verifiedProfiles")}
            </li>
            <li className="relative ps-5">
              <span className="absolute start-0 top-2 h-1.5 w-1.5 rounded-full bg-primary/70" />
              {t("signals.publishedContent")}
            </li>
            <li className="relative ps-5">
              <span className="absolute start-0 top-2 h-1.5 w-1.5 rounded-full bg-primary/70" />
              {t("signals.secureJourney")}
            </li>
          </ul>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {WHY_FEATURES.map((feature, i) => {
            const Icon = feature.icon;
            const key = FEATURE_KEYS[i];

            return (
              <div
                key={feature.id}
                className={`app-panel app-lift rounded-[30px] p-6 hover:-translate-y-1 ${
                  i === 1 || i === 3 ? "sm:translate-y-6" : ""
                }`}
              >
                <div
                  className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl ring-1 ring-inset ring-black/4 ${feature.bgColor} ${feature.ringColor}`}
                >
                  <Icon size={22} className={feature.iconColor} />
                </div>
                <h4 className="text-lg font-bold text-text-primary dark:text-white/90">
                  {t(`${key}Title`)}
                </h4>
                <p className="mt-3 text-sm leading-7 text-text-secondary">
                  {t(`${key}Desc`)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
