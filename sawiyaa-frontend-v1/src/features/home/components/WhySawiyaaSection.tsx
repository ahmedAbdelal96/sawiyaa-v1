import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { WHY_FEATURES } from "@/features/home/data/home-data";

const FEATURE_KEYS = ["privacy", "certified", "flexible", "arabic"] as const;

export default async function WhySawiyaaSection() {
  const t = await getTranslations("home.whySawiyaa");

  return (
    <section className="px-6 py-24">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[minmax(0,0.96fr)_minmax(0,1.04fr)] lg:items-start">
        <div className="bg-[#24564F] text-white overflow-hidden rounded-[34px] p-8 shadow-sawiyaa-logo dark:bg-surface-secondary dark:text-white">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#A7BFAE] dark:text-primary-light/80">
            {t("eyebrow")}
          </p>
          <h2 className="text-3xl font-bold leading-tight text-white md:text-4xl">
            {t("title")}
          </h2>
          <p className="mt-5 text-lg leading-8 text-emerald-50/90 dark:text-white/80">{t("desc")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/specialties"
              className="inline-flex items-center rounded-2xl bg-[#FCFAF6] px-6 py-3.5 text-sm font-semibold text-[#24564F] transition hover:bg-[#EEF4EF] hover:shadow-md"
            >
              {t("cta")}
            </Link>
            <Link
              href="/practitioners"
              className="inline-flex items-center rounded-2xl border border-white/20 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/20 dark:text-white/90"
            >
              {t("secondaryCta")}
            </Link>
          </div>

          <ul className="mt-7 grid gap-2 text-sm leading-7 text-emerald-100/90 dark:text-white/70">
            <li className="relative ps-5">
              <span className="absolute start-0 top-2 h-1.5 w-1.5 rounded-full bg-emerald-300" />
              {t("signals.verifiedProfiles")}
            </li>
            <li className="relative ps-5">
              <span className="absolute start-0 top-2 h-1.5 w-1.5 rounded-full bg-emerald-300" />
              {t("signals.publishedContent")}
            </li>
            <li className="relative ps-5">
              <span className="absolute start-0 top-2 h-1.5 w-1.5 rounded-full bg-emerald-300" />
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
