import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  Compass,
  GraduationCap,
  HeartHandshake,
  Lock,
  Search,
  Sparkles,
  UserRoundPlus,
} from "lucide-react";

export default async function HeroSection() {
  const t = await getTranslations("home.hero");

  const quickLinks = [
    { href: "/signup?mode=patient", label: t("quickMatching"), icon: Compass },
    { href: "/signup?mode=patient", label: t("quickAssessment"), icon: Sparkles },
    { href: "/practitioners", label: t("quickPractitioners"), icon: Search },
    { href: "/academy", label: t("quickAcademy"), icon: GraduationCap },
    { href: "/signin?mode=patient", label: t("quickSupport"), icon: HeartHandshake },
  ];

  return (
    <section className="relative overflow-hidden px-6 pb-16 pt-10 lg:px-12 lg:pb-24 lg:pt-16">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -start-16 top-16 h-56 w-56 rounded-full bg-white/65 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] lg:items-center">
        <div className="max-w-3xl">
          <span className="app-chip mb-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            {t("badge")}
          </span>

          <h1 className="max-w-3xl text-[3rem] font-bold leading-[0.98] tracking-[-0.03em] text-text-primary md:text-[4.5rem] dark:text-white/95">
            {t("headlinePart1")}{" "}
            <span className="text-primary">{t("headlineHighlight")}</span>{" "}
            {t("headlinePart2")}
          </h1>

          <p className="mt-6 max-w-2xl text-[1.075rem] leading-8 text-text-secondary">
            {t("subtext")}
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              href="/signup?mode=patient"
              className="app-lift inline-flex items-center rounded-2xl bg-primary px-6 py-3.5 text-base font-semibold text-white shadow-[0_18px_32px_-20px_rgba(95,143,139,0.5)] transition hover:-translate-y-0.5 hover:bg-primary-hover"
            >
              {t("ctaPrimary")}
            </Link>
            <Link
              href="/practitioners"
              className="app-panel inline-flex items-center rounded-2xl px-6 py-3.5 text-base font-semibold text-primary transition hover:bg-primary-light"
            >
              {t("ctaSecondary")}
            </Link>
            <Link
              href="/academy"
              className="app-panel inline-flex items-center rounded-2xl px-6 py-3.5 text-base font-semibold text-text-primary transition hover:bg-surface-tertiary hover:text-primary dark:text-white/90 dark:hover:bg-white/5"
            >
              {t("ctaAcademy")}
            </Link>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <span className="font-semibold text-text-primary dark:text-white/90">
                {t("statPractitioners")}
              </span>
            </div>
            <div className="h-4 w-px bg-border-light" />
            <div className="flex items-center gap-1.5 text-sm text-text-secondary">
              <Lock size={13} className="text-primary" />
              <span>{t("trustBadge")}</span>
            </div>
          </div>
        </div>

        <div className="relative hidden lg:block">
          <div className="app-panel relative overflow-hidden rounded-[38px] p-6">
            <div className="absolute inset-x-6 top-6 h-40 rounded-[28px] bg-primary-light" />

            <div className="relative mt-28 rounded-[30px] bg-white p-6 shadow-[0_24px_56px_-34px_rgba(25,52,57,0.28)] dark:bg-surface-secondary/95">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-15 w-15 items-center justify-center rounded-[20px] bg-primary text-lg font-bold text-white shadow-[0_14px_24px_-14px_rgba(95,143,139,0.5)]">
                  <UserRoundPlus size={26} />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-text-primary dark:text-white/90">
                    {t("panelTitle")}
                  </p>
                  <p className="text-sm text-text-secondary">{t("panelNote")}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-border-light bg-surface px-4 py-4">
                <p className="text-xs font-medium text-text-muted">{t("quickTitle")}</p>
                <div className="mt-3 flex flex-wrap gap-2.5">
                  {quickLinks.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="app-chip inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold transition hover:bg-primary hover:text-white"
                      >
                        <Icon size={13} />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>

            <Link
              href="/signup?mode=patient"
              className="mt-5 flex w-full items-center justify-center rounded-2xl bg-primary py-3.5 text-sm font-semibold text-white transition hover:bg-primary-hover"
            >
                {t("sessionCta")}
              </Link>
            </div>

            <div className="absolute -bottom-4 -start-4 rounded-[24px] border border-border-light bg-surface-secondary/94 px-5 py-4 shadow-[0_18px_32px_-26px_rgba(25,52,57,0.18)] backdrop-blur">
              <p className="text-xs font-medium text-text-muted">{t("quickCardLabel")}</p>
              <p className="mt-1 text-sm font-semibold text-text-primary dark:text-white/90">
                {t("quickCardValue")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
