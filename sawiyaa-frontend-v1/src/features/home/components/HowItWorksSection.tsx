import { getTranslations } from "next-intl/server";
import { UserCheck, CalendarCheck, Video } from "lucide-react";

const STEPS = [
  {
    id: 1,
    key: "step1",
    icon: UserCheck,
    color: "text-[#24564F]",
    bg: "bg-[#EEF4EF]",
  },
  {
    id: 2,
    key: "step2",
    icon: CalendarCheck,
    color: "text-[#B58E58]",
    bg: "bg-amber-50 dark:bg-amber-950/20",
  },
  {
    id: 3,
    key: "step3",
    icon: Video,
    color: "text-[#3F6E58]",
    bg: "bg-emerald-50 dark:bg-emerald-950/20",
  },
] as const;

export default async function HowItWorksSection() {
  const t = await getTranslations("home.howItWorks");

  return (
    <section className="px-6 py-12 lg:px-12 lg:py-16">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 text-center max-w-2xl mx-auto">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#24564F]">
            {t("eyebrow")}
          </p>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1C2F2B] dark:text-white/95">
            {t("title")}
          </h2>
          <p className="mt-2 text-sm sm:text-base text-text-secondary dark:text-white/70">
            {t("subtitle")}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.id}
                className="app-panel app-lift flex flex-col rounded-[24px] border border-border-light/70 bg-white p-6 shadow-2xs transition hover:-translate-y-1 dark:bg-surface-secondary dark:border-white/10"
              >
                <div className="mb-5 flex items-center justify-between">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#24564F] text-xs font-bold text-white">
                    {step.id}
                  </span>
                  <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${step.bg} ${step.color}`}>
                    <Icon size={20} />
                  </div>
                </div>

                <h3 className="text-lg font-bold text-[#1C2F2B] dark:text-white/90">
                  {t(`${step.key}Title` as never)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary dark:text-white/70">
                  {t(`${step.key}Desc` as never)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
