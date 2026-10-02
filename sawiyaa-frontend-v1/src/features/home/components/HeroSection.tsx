import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  BadgeCheck,
  ShieldCheck,
  CalendarCheck,
  Sparkles,
  Lock,
  ArrowRight,
} from "lucide-react";

const TRUST_CHIPS = [
  { key: "trustedPractitioners", icon: BadgeCheck, color: "text-[#24564F]" },
  { key: "secureSessions", icon: Lock, color: "text-[#24564F]" },
  { key: "clearBooking", icon: CalendarCheck, color: "text-[#B58E58]" },
  { key: "supportWhenNeeded", icon: ShieldCheck, color: "text-[#3F6E58]" },
] as const;

export default async function HeroSection() {
  const locale = await getLocale();
  const t = await getTranslations("home.hero");
  const isAr = locale === "ar";

  return (
    <section className="relative overflow-hidden px-6 pb-12 pt-6 lg:px-12 lg:pb-16 lg:pt-10">
      {/* Subtle background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -start-16 top-0 h-64 w-64 rounded-full bg-[#24564F]/5 blur-3xl" />
        <div className="absolute -end-16 bottom-0 h-80 w-80 rounded-full bg-[#A7BFAE]/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto grid max-w-7xl gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(380px,0.85fr)] lg:items-center">
        {/* Left: Text & CTA Content */}
        <div className="max-w-2xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-[#24564F]/15 bg-white/80 px-3.5 py-1.5 shadow-xs backdrop-blur-xs dark:bg-white/5 dark:border-white/10 mb-5">
            <Sparkles size={14} className="text-[#C8A979]" />
            <span className="text-xs font-semibold text-[#24564F] dark:text-[#A7BFAE]">
              {t("badge")}
            </span>
          </div>

          <h1 className="text-3xl font-extrabold leading-[1.2] tracking-tight text-[#1C2F2B] sm:text-4xl lg:text-[2.85rem] dark:text-white/95">
            {t("headline")}
          </h1>

          <p className="mt-4 text-base sm:text-lg leading-relaxed text-text-secondary dark:text-white/70 max-w-xl">
            {t("subtext")}
          </p>

          {/* Primary & Secondary Action CTAs */}
          <div className="mt-7 flex flex-wrap items-center gap-3.5">
            <Link
              href="/practitioners"
              className="sawiyaa-btn-press inline-flex items-center justify-center gap-2 rounded-2xl bg-[#24564F] px-6 py-3.5 text-sm sm:text-base font-bold text-white shadow-[0_12px_24px_-10px_rgba(36,86,79,0.45)] transition hover:bg-[#1F4A44] hover:-translate-y-0.5"
            >
              <span>{t("ctaPrimary")}</span>
              <ArrowRight size={16} className={isAr ? "rotate-180" : ""} />
            </Link>

            <Link
              href="/specialties"
              className="sawiyaa-btn-press inline-flex items-center justify-center rounded-2xl border border-[#24564F]/20 bg-white/80 px-5 py-3.5 text-sm sm:text-base font-semibold text-[#24564F] transition hover:bg-[#EEF4EF] hover:border-[#24564F]/30 dark:bg-white/5 dark:text-white dark:border-white/15"
            >
              {t("ctaSecondary")}
            </Link>
          </div>

          {/* Trust Chips */}
          <div className="mt-9 flex flex-wrap items-center gap-2.5">
            {TRUST_CHIPS.map((chip) => {
              const Icon = chip.icon;
              return (
                <div
                  key={chip.key}
                  className="inline-flex items-center gap-2 rounded-full border border-border-light/70 bg-white/70 px-3.5 py-1.5 text-xs font-medium text-text-secondary shadow-2xs backdrop-blur-xs dark:border-white/5 dark:bg-white/[0.02]"
                >
                  <Icon size={14} className={chip.color} />
                  <span>{t(`trustChips.${chip.key}`)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Visual Artwork with Comfort Card */}
        <div className="relative hidden lg:block">
          <div className="relative overflow-hidden rounded-[32px] border border-border-light/70 bg-white p-3 shadow-[0_24px_48px_-20px_rgba(36,86,79,0.14)] dark:border-white/10 dark:bg-surface-secondary">
            <div className="overflow-hidden rounded-[24px] bg-[#FCFAF6] dark:bg-white/5 relative h-[320px] w-full">
              <Image
                src="/images/banner/banner.png"
                alt="Sawiyaa Care"
                fill
                priority
                sizes="(min-width: 1024px) 450px, 100vw"
                className="object-cover transition-transform duration-500 hover:scale-[1.02]"
              />
            </div>

            {/* Floating Trust Card */}
            <div className="absolute -bottom-4 -start-4 rounded-2xl border border-[#E8DED0] bg-white p-3.5 shadow-[0_16px_32px_-12px_rgba(36,86,79,0.18)] dark:bg-surface-secondary dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF4EF] text-[#24564F] dark:bg-primary/20 dark:text-primary-light">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#1C2F2B] dark:text-white/95">
                    {t("floatingTrust.title")}
                  </p>
                  <p className="text-[11px] font-medium text-text-secondary dark:text-white/60">
                    {t("floatingTrust.subtitle")}
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