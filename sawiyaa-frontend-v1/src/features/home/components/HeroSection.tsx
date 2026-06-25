import { getLocale, getTranslations } from "next-intl/server";
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
  const locale = await getLocale();
  const t = await getTranslations("home.hero");

  return (
    <section className="relative overflow-hidden px-6 pb-14 pt-8 lg:px-12 lg:pb-20 lg:pt-14">
      {/* Premium Motion CSS Keyframes */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-12px) scale(1.03); }
        }
        @keyframes float-reverse {
          0%, 100% { transform: translateY(0px) scale(1.03); }
          50% { transform: translateY(12px) scale(1); }
        }
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(24px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-float-1 {
          animation: float-slow 7s ease-in-out infinite;
        }
        .animate-float-2 {
          animation: float-reverse 9s ease-in-out infinite;
        }
        .animate-fade-up {
          opacity: 0;
          animation: fade-in-up 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .delay-100 { animation-delay: 100ms; }
        .delay-200 { animation-delay: 200ms; }
        .delay-300 { animation-delay: 300ms; }
      `}} />

      {/* Subtle background decoration */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -start-20 top-0 h-72 w-72 rounded-full bg-primary/8 blur-3xl animate-float-1" />
        <div className="absolute -end-20 bottom-0 h-96 w-96 rounded-full bg-secondary/12 blur-3xl animate-float-2" />
      </div>

      <div className="relative z-10 mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(400px,0.9fr)] lg:items-center">
        {/* Left: Text content */}
        <div className="max-w-3xl">
          <h1 className="animate-fade-up text-[2.6rem] font-bold leading-[1.08] tracking-[-0.03em] text-text-primary md:text-[3.5rem] dark:text-white/95">
            {t("headline")}
          </h1>

          <p className="animate-fade-up delay-100 mt-5 text-[1.05rem] leading-8 text-text-secondary md:text-[1.1rem]">
            {t("subtext")}
          </p>

          <div className="animate-fade-up delay-200 mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/practitioners"
              className="app-lift inline-flex items-center rounded-2xl bg-primary px-6 py-3.5 text-sm font-semibold text-white shadow-[0_18px_32px_-20px_rgba(95,143,139,0.5)] transition duration-300 hover:-translate-y-1 hover:shadow-lg active:translate-y-0"
            >
              {t("ctaPrimary")}
            </Link>
            <Link
              href="/signin/practitioner"
              className="app-lift inline-flex items-center rounded-2xl border border-border-light bg-surface-secondary px-6 py-3.5 text-sm font-semibold text-text-primary transition duration-300 hover:-translate-y-1 hover:bg-surface-tertiary hover:shadow-md active:translate-y-0 dark:border-white/10 dark:bg-surface-secondary"
            >
              {locale === "ar" ? "دخول المختصين" : "Specialist Login"}
            </Link>
            <Link
              href="/specialties"
              className="inline-flex items-center rounded-2xl px-6 py-3.5 text-sm font-semibold text-primary transition duration-300 hover:bg-primary-light hover:text-primary-hover"
            >
              {t("ctaSecondary")}
            </Link>
          </div>

          {/* Trust chips */}
          <div className="animate-fade-up delay-300 mt-10 flex flex-wrap items-center gap-3">
            {TRUST_CHIPS.map((chip) => {
              const Icon = chip.icon;
              return (
                <div
                  key={chip.key}
                  className="group/chip inline-flex items-center gap-2.5 rounded-full border border-border-light/60 bg-white/50 px-4 py-2 text-sm text-text-secondary transition-all duration-300 hover:border-primary/20 hover:bg-white hover:text-text-primary hover:shadow-theme-xs dark:border-white/5 dark:bg-white/[0.01] dark:hover:bg-white/[0.04]"
                >
                  <Icon size={15} className={`${chip.color} transition-transform duration-300 group-hover/chip:scale-110`} />
                  <span className="font-medium text-xs md:text-sm">{t(`trustChips.${chip.key}`)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Visual composition */}
        <div className="animate-fade-up delay-200 relative hidden lg:block group">
          <div className="absolute -inset-1.5 rounded-[38px] bg-gradient-to-tr from-primary/30 to-secondary/30 opacity-70 blur-xl transition duration-1000 group-hover:opacity-100" />
          <div className="relative overflow-hidden rounded-[36px] border border-border-light/80 bg-white p-2.5 shadow-[0_32px_64px_-24px_rgba(36,86,79,0.18)] dark:border-white/10 dark:bg-surface-secondary">
            <div className="overflow-hidden rounded-[28px] bg-surface-tertiary">
              <img
                src="/images/banner/banner.png"
                alt="Sawiyaa Platform Banner"
                className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-[1.01]"
              />
            </div>
          </div>

          {/* Premium Floating Badge */}
          <div className="absolute -bottom-5 -start-5 animate-float-2 rounded-2xl border border-border-soft bg-white p-4 shadow-[0_16px_36px_-12px_rgba(36,86,79,0.16)] dark:border-white/10 dark:bg-surface-secondary">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <BadgeCheck size={20} />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                  {locale === "ar" ? "معايير سويّة" : "Sawiyaa Standards"}
                </p>
                <p className="text-xs font-bold text-text-primary dark:text-white/90">
                  {locale === "ar" ? "رعاية معتمدة وآمنة" : "Certified & Secure"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}