import { getTranslations, getLocale } from "next-intl/server";
import { Lock, BadgeCheck, Clock, HeartHandshake } from "lucide-react";

const PILLARS = [
  {
    key: "privacy",
    icon: Lock,
    color: "text-[#24564F]",
    bg: "bg-[#EEF4EF]",
  },
  {
    key: "certified",
    icon: BadgeCheck,
    color: "text-[#B58E58]",
    bg: "bg-amber-50 dark:bg-amber-950/20",
  },
  {
    key: "flexible",
    icon: Clock,
    color: "text-[#3F6E58]",
    bg: "bg-emerald-50 dark:bg-emerald-950/20",
  },
  {
    key: "arabic",
    icon: HeartHandshake,
    color: "text-[#24564F]",
    bg: "bg-[#EEF4EF]",
  },
] as const;

export default async function WhySawiyaaSection() {
  const [t, locale] = await Promise.all([
    getTranslations("home.whySawiyaa"),
    getLocale(),
  ]);

  return (
    <section className="px-6 py-12 lg:px-12 lg:py-16 bg-[#FCFAF6] dark:bg-[#101919] border-y border-border-light/50 dark:border-white/5">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 text-center max-w-2xl mx-auto">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#24564F]">
            {t("eyebrow")}
          </p>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1C2F2B] dark:text-white/95">
            {t("title")}
          </h2>
          <p className="mt-2 text-sm sm:text-base text-text-secondary dark:text-white/70">
            {t("desc")}
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div
                key={pillar.key}
                className="app-panel app-lift flex flex-col rounded-[22px] border border-border-light/70 bg-white p-5 shadow-2xs transition hover:-translate-y-1 dark:bg-surface-secondary dark:border-white/10"
              >
                <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${pillar.bg} ${pillar.color}`}>
                  <Icon size={20} />
                </div>
                <h3 className="text-base font-bold text-[#1C2F2B] dark:text-white/90">
                  {t(`${pillar.key}Title` as never)}
                </h3>
                <p className="mt-2 text-xs sm:text-sm leading-relaxed text-text-secondary dark:text-white/70">
                  {t(`${pillar.key}Desc` as never)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
