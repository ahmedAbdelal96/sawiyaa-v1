"use client";

import LanguageToggle from "@/components/public/LanguageToggle";
import ThemeToggle from "@/components/public/ThemeToggle";
import BrandMark from "@/components/shared/BrandMark";
import UserDropdown from "@/components/header/UserDropdown";
import { Link, usePathname } from "@/i18n/navigation";
import {
  BookOpen,
  Calendar,
  CreditCard,
  GraduationCap,
  HeartHandshake,
  Home,
  LifeBuoy,
  Sparkles,
  Stethoscope,
  User,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

type PatientAppShellProps = {
  children: ReactNode;
};

type PatientNavItem = {
  key: string;
  href: string;
  icon: ReactNode;
  mobileOnly?: boolean;
};

export default function PatientAppShell({ children }: PatientAppShellProps) {
  const pathname = usePathname();
  const tNav = useTranslations("navigation");
  const tArea = useTranslations("patient-area");
  const tJourney = useTranslations("patient-journey");

  // This shell is the active source of truth for patient navigation rendering.
  // Keep it aligned with src/config/navigation/patient.tsx until navigation ownership is unified.
  const topItems: PatientNavItem[] = [
    {
      key: "home",
      href: "/patient",
      icon: <Home className="h-4 w-4" />,
    },
    {
      key: "matching",
      href: "/patient/matching",
      icon: <HeartHandshake className="h-4 w-4" />,
    },
    {
      key: "assessments",
      href: "/patient/assessments",
      icon: <Sparkles className="h-4 w-4" />,
    },
    {
      key: "sessions",
      href: "/patient/sessions",
      icon: <Calendar className="h-4 w-4" />,
    },
  ];

  const utilityItems: PatientNavItem[] = [
    {
      key: "practitioners",
      href: "/patient/practitioners",
      icon: <Stethoscope className="h-4 w-4" />,
    },
    {
      key: "articles",
      href: "/patient/articles",
      icon: <BookOpen className="h-4 w-4" />,
    },
    {
      key: "support",
      href: "/patient/support",
      icon: <LifeBuoy className="h-4 w-4" />,
    },
    {
      key: "training",
      href: "/patient/training",
      icon: <GraduationCap className="h-4 w-4" />,
    },
    {
      key: "payments",
      href: "/patient/payments",
      icon: <CreditCard className="h-4 w-4" />,
    },
    {
      key: "profile",
      href: "/patient/profile",
      icon: <User className="h-4 w-4" />,
    },
  ];

  const mobileItems: PatientNavItem[] = [
    ...topItems,
    {
      key: "support",
      href: "/patient/support",
      icon: <LifeBuoy className="h-4 w-4" />,
      mobileOnly: true,
    },
  ];

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const getLabel = (key: string) => {
    if (key === "home") return tArea("shell.home");
    if (key === "matching") return tJourney("nextSteps.types.START_GUIDED_MATCHING.cta");
    if (key === "assessments") return tJourney("nextSteps.types.TAKE_ASSESSMENT.cta");
    if (key === "practitioners") return tNav("main.practitioners");
    if (key === "sessions") return tNav("main.sessions");
    if (key === "support") return tArea("shell.support");
    if (key === "articles") return tNav("main.articles");
    if (key === "training") return tNav("workspace.training");
    if (key === "payments") return tNav("main.payments");
    if (key === "profile") return tNav("settings.profile");
    return tNav(`main.${key}`);
  };

  return (
    <div className="min-h-screen bg-background dark:bg-background">
      <header className="sticky top-0 z-40 border-b border-border-light/70 bg-surface-secondary/92 backdrop-blur-xl dark:border-border-light dark:bg-surface-secondary/92">
        <div className="app-max-shell-patient mx-auto flex w-full items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <BrandMark compact href="/patient" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-text-primary dark:text-white">
                {tArea("shell.title")}
              </p>
              <p className="hidden truncate text-xs text-text-secondary dark:text-white/65 sm:block">
                {tArea("shell.subtitle")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <LanguageToggle />
            <ThemeToggle />
            <UserDropdown compact />
          </div>
        </div>

        <div className="app-max-shell-patient mx-auto hidden w-full flex-col items-start gap-3 px-6 pb-4 md:flex xl:flex-row xl:items-center xl:justify-between">
          <nav className="flex w-full flex-wrap items-center gap-2 xl:w-auto">
            {topItems.map((item) => (
              <ShellLink
                key={item.key}
                href={item.href}
                active={isActive(item.href)}
                icon={item.icon}
                label={getLabel(item.key)}
              />
            ))}
          </nav>

          <nav className="flex w-full flex-wrap items-center gap-2 xl:w-auto xl:justify-end">
            {utilityItems.map((item) => (
              <ShellLink
                key={item.key}
                href={item.href}
                active={isActive(item.href)}
                icon={item.icon}
                label={getLabel(item.key)}
                subtle
              />
            ))}
          </nav>
        </div>
      </header>

      <main className="app-max-shell-patient mx-auto w-full px-4 pb-24 pt-6 sm:px-6 sm:pt-8">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border-light/70 bg-surface-secondary/92 px-2 py-2 backdrop-blur-xl dark:border-border-light dark:bg-surface-secondary/92 md:hidden">
        <div className="mx-auto grid max-w-xl grid-cols-5 gap-1">
          {mobileItems.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={`flex flex-col items-center justify-center rounded-2xl px-2 py-2 text-[11px] font-medium transition ${
                isActive(item.href)
                  ? "bg-primary-light text-primary dark:bg-primary/15 dark:text-primary-light"
                  : "text-text-secondary hover:bg-surface-tertiary dark:text-white/70 dark:hover:bg-white/5 dark:hover:text-white"
              }`}
            >
              {item.icon}
              <span className="mt-1 truncate">{getLabel(item.key)}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

type ShellLinkProps = {
  href: string;
  active: boolean;
  icon: ReactNode;
  label: string;
  subtle?: boolean;
};

function ShellLink({ href, active, icon, label, subtle = false }: ShellLinkProps) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
        active
          ? "bg-primary-light text-primary shadow-sm dark:bg-primary/15 dark:text-primary-light"
          : subtle
            ? "text-text-secondary hover:bg-white/70 hover:text-text-primary dark:text-white/65 dark:hover:bg-white/5 dark:hover:text-white"
            : "bg-surface-secondary text-text-secondary hover:bg-surface-tertiary hover:text-text-primary dark:bg-surface-secondary dark:text-text-secondary dark:hover:bg-surface-tertiary dark:hover:text-text-primary"
      }`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
