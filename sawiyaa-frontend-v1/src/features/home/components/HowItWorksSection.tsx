import { getTranslations } from "next-intl/server";
import { HOW_IT_WORKS_STEPS } from "@/features/home/data/home-data";

const STEP_KEYS = ["step1", "step2", "step3"] as const;

export default async function HowItWorksSection() {
  const t = await getTranslations("home.howItWorks");

  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mb-14 max-w-3xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-primary/80">
            {t("eyebrow")}
          </p>
          <h2 className="text-3xl font-bold text-text-primary md:text-4xl dark:text-white/92">
            {t("title")}
          </h2>
          <p className="mt-4 text-lg leading-8 text-text-secondary">
            {t("subtitle")}
          </p>
        </div>

        <div className="rounded-[36px] bg-[#FCFAF6] border border-[#E8DED0] p-6 shadow-sawiyaa-small dark:border-white/5 dark:bg-[#101919]">
          <div className="grid gap-6 md:grid-cols-3">
            {HOW_IT_WORKS_STEPS.map((step, i) => {
              const Icon = step.icon;
              const key = STEP_KEYS[i];

              return (
                <div
                  key={step.id}
                  className={`app-panel app-lift rounded-[30px] p-6 sm:p-7 ${
                    step.offset ? "md:translate-y-6" : ""
                  }`}
                >
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <span className="app-chip rounded-full px-3 py-1 text-xs font-semibold">
                      {t("stepLabel")} {step.id}
                    </span>
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl ring-1 ring-inset ring-black/4 ${step.iconBg}`}
                    >
                      <Icon size={22} className={step.iconColor} />
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-text-primary dark:text-white/90">
                    {t(`${key}Title`)}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-text-secondary">
                    {t(`${key}Desc`)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
