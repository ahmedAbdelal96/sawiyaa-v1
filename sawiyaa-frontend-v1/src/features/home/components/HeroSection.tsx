import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  BadgeCheck,
  CircleDollarSign,
  Compass,
  ListChecks,
  MessageCircle,
  Sparkles,
  Video,
} from "lucide-react";

const TRUST_CHIPS = [
  { key: "trustedPractitioners", icon: BadgeCheck, color: "text-teal-600" },
  { key: "clearBooking", icon: CircleDollarSign, color: "text-sky-600" },
  { key: "secureSessions", icon: Video, color: "text-indigo-600" },
  { key: "supportWhenNeeded", icon: MessageCircle, color: "text-amber-600" },
] as const;

export default async function HeroSection() {
  const t = await getTranslations("home.hero");

  return (
    <section className="relative overflow-hidden px-6 pb-14 pt-8 lg:px-12 lg:pb-20 lg:pt-14">
      {/* Subtle background decoration */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -start-20 top-0 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -end-20 bottom-0 h-80 w-80 rounded-full bg-secondary/6 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(400px,0.9fr)] lg:items-center">
        {/* Left: Text content */}
        <div className="max-w-3xl">
          <h1 className="text-[2.6rem] font-bold leading-[1.08] tracking-[-0.03em] text-text-primary md:text-[3.5rem] dark:text-white/95">
            {t("headline")}
          </h1>

          <p className="mt-5 text-[1.05rem] leading-8 text-text-secondary md:text-[1.1rem]">
            {t("subtext")}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/practitioners"
              className="app-lift inline-flex items-center rounded-2xl bg-primary px-7 py-4 text-base font-semibold text-white shadow-[0_18px_32px_-20px_rgba(95,143,139,0.5)] transition hover:-translate-y-0.5 hover:bg-primary-hover"
            >
              {t("ctaPrimary")}
            </Link>
            <Link
              href="/specialties"
              className="app-panel inline-flex items-center rounded-2xl px-7 py-4 text-base font-semibold text-primary transition hover:bg-primary-light"
            >
              {t("ctaSecondary")}
            </Link>
          </div>

          {/* Trust chips */}
          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
            {TRUST_CHIPS.map((chip) => {
              const Icon = chip.icon;
              return (
                <div
                  key={chip.key}
                  className="inline-flex items-center gap-2 text-sm text-text-secondary"
                >
                  <Icon size={15} className={chip.color} />
                  <span>{t(`trustChips.${chip.key}`)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Visual composition */}
        <div className="relative hidden lg:block">
          <div className="app-panel relative overflow-hidden rounded-[38px] p-6">
            {/* Background accent panel */}
            <div className="absolute inset-x-6 top-6 h-48 rounded-[28px] bg-primary/7" />

            <div className="relative mt-36 rounded-[30px] bg-white p-6 shadow-[0_24px_56px_-34px_rgba(25,52,57,0.22)] dark:bg-surface-secondary/95">
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                {t("panel.guidedPathLabel")}
              </p>

              {/* Guided path options */}
              <div className="mb-5 flex flex-wrap gap-2">
                <span className="app-chip inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium">
                  <Compass size={12} className="text-emerald-600" />
                  {t("panel.pathNotSure")}
                </span>
                <span className="app-chip inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium">
                  <Sparkles size={12} className="text-sky-600" />
                  {t("panel.pathKnowSpecialty")}
                </span>
                <span className="app-chip inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium">
                  <ListChecks size={12} className="text-indigo-600" />
                  {t("panel.pathDirect")}
                </span>
              </div>

              {/* Divider */}
              <div className="my-4 h-px bg-border-light" />

              {/* Generic booking preview */}
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-sky-50 text-sky-600 ring-1 ring-inset ring-sky-200">
                  <BadgeCheck size={20} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-text-primary dark:text-white/90">
                    {t("panel.bookingPreview")}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {t("panel.bookingPreviewHint")}
                  </p>
                </div>
              </div>

              {/* Clear steps signal */}
              <div className="flex items-center gap-2 rounded-2xl bg-surface-tertiary px-4 py-3">
                <BadgeCheck size={16} className="text-teal-600" />
                <p className="text-xs font-medium text-text-secondary">
                  {t("panel.clearSteps")}
                </p>
              </div>
            </div>

            {/* Floating trust badge */}
            <div className="absolute -bottom-4 -start-4 rounded-[24px] border border-border-light bg-white px-5 py-4 shadow-[0_18px_32px_-26px_rgba(25,52,57,0.18)] dark:bg-surface-secondary/94">
              <div className="flex items-center gap-2">
                <BadgeCheck size={16} className="text-teal-600" />
                <div>
                  <p className="text-xs font-medium text-text-muted">
                    {t("panel.trustLabel")}
                  </p>
                  <p className="text-sm font-semibold text-text-primary dark:text-white/90">
                    {t("panel.trustValue")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}