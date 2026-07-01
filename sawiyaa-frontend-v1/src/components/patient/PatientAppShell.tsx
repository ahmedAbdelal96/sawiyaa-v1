"use client";

import LanguageToggle from "@/components/public/LanguageToggle";
import ThemeToggle from "@/components/public/ThemeToggle";
import BrandMark from "@/components/shared/BrandMark";
import UserDropdown from "@/components/header/UserDropdown";
import Avatar from "@/components/ui/avatar/Avatar";
import UserNotificationDropdown from "@/features/notifications/components/UserNotificationDropdown";
import ActionIconButton from "@/components/ui/action-icon-button/ActionIconButton";
import { Drawer } from "@/components/ui/modal";
import { Link, usePathname } from "@/i18n/navigation";
import { useAuthState } from "@/stores/auth-store";
import { useAuthActions } from "@/stores/auth-store";
import { useCurrentUser } from "@/features/users/hooks/use-users";
import { usePatientProfile } from "@/features/patients/hooks/use-patients";
import UnifiedMessagesLauncher from "@/features/messages-shell/components/UnifiedMessagesLauncher";
import MessagesHeaderButton from "@/features/messages-shell/components/MessagesHeaderButton";
import {
  BookOpen,
  Calendar,
  CreditCard,
  GraduationCap,
  HeartHandshake,
  LogOut,
  Home,
  LifeBuoy,
  Menu,
  MessageSquare,
  Settings,
  Sparkles,
  Stethoscope,
  Wallet,
  User,
  X,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";

type PatientAppShellProps = {
  children: ReactNode;
};

type PatientNavItem = {
  key: string;
  href: string;
  icon: ReactNode;
};

export default function PatientAppShell({ children }: PatientAppShellProps) {
  const pathname = usePathname();
  const locale = useLocale();
  const tNav = useTranslations("navigation");
  const tArea = useTranslations("patient-area");
  const tJourney = useTranslations("patient-journey");
  const tCommon = useTranslations("common.nav");
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const { user } = useAuthState();
  const { logout } = useAuthActions();
  const router = useRouter();
  const currentUserQuery = useCurrentUser(Boolean(user));
  const patientProfileQuery = usePatientProfile(user?.role === "PATIENT" && Boolean(user));

  const displayName =
    currentUserQuery.data?.displayName?.trim() ||
    `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() ||
    user?.email ||
    "User";
  const userEmail = user?.email || "";
  const patientAvatar = patientProfileQuery.data?.profile.avatarDataUrl ?? null;
  const apiAvatar = currentUserQuery.data?.avatarDataUrl ?? null;
  const effectiveAvatar = patientAvatar ?? apiAvatar ?? user?.avatar ?? null;
  const userInitial = displayName.charAt(0).toUpperCase();

  // This shell is the active source of truth for patient navigation rendering.
  // Keep it aligned with src/config/navigation/patient.tsx until navigation ownership is unified.
  const topItems: PatientNavItem[] = [
    {
      key: "home",
      href: "/patient",
      icon: <Home className="h-4 w-4" />,
    },
    {
      key: "practitioners",
      href: "/patient/practitioners",
      icon: <Stethoscope className="h-4 w-4" />,
    },
    {
      key: "academy",
      href: "/patient/academy",
      icon: <GraduationCap className="h-4 w-4" />,
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

  const userQuickLinks: PatientNavItem[] = [
    {
      key: "academy",
      href: "/patient/academy",
      icon: <GraduationCap className="h-4 w-4" />,
    },
    {
      key: "articles",
      href: "/patient/articles",
      icon: <BookOpen className="h-4 w-4" />,
    },
    {
      key: "wallet",
      href: "/patient/wallet",
      icon: <Wallet className="h-4 w-4" />,
    },
    {
      key: "payments",
      href: "/patient/payments",
      icon: <CreditCard className="h-4 w-4" />,
    },
  ];

  const drawerItems: PatientNavItem[] = [
    ...topItems,
    ...userQuickLinks,
    {
      key: "profile",
      href: "/patient/profile",
      icon: <User className="h-4 w-4" />,
    },
  ];
  const drawerPrimaryItems = topItems;
  const drawerSecondaryItems: PatientNavItem[] = [
    ...userQuickLinks,
    { key: "settings", href: "/patient/settings", icon: <Settings className="h-4 w-4" /> },
    { key: "profile", href: "/patient/profile", icon: <User className="h-4 w-4" /> },
  ];

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const getLabel = (key: string) => {
    if (key === "home") return tArea("shell.home");
    if (key === "matching") return tJourney("nextSteps.types.START_GUIDED_MATCHING.cta");
    if (key === "assessments") return tJourney("nextSteps.types.TAKE_ASSESSMENT.cta");
    if (key === "practitioners") return tNav("main.practitioners");
    if (key === "academy") return tNav("main.academy");
    if (key === "sessions") return tNav("main.sessions");
    if (key === "messages") return locale === "ar" ? "الرسائل" : "Messages";
    if (key === "support") return tArea("shell.support");
    if (key === "academy") return tNav("main.academy");
    if (key === "articles") return tNav("main.articles");
    if (key === "wallet") return tNav("main.wallet");
    if (key === "payments") return tNav("main.payments");
    if (key === "profile") return tNav("settings.profile");
    if (key === "settings") return tCommon("settings");
    return tNav(`main.${key}`);
  };

  return (
    <div className="min-h-screen bg-background dark:bg-background">
      <header className="sticky top-0 z-[60] w-full border-b border-border-light/80 bg-white/95 dark:bg-surface-secondary/95 text-text-primary shadow-[0_10px_24px_-26px_rgba(31,42,45,0.18)] backdrop-blur-xl transition-all duration-300">
        <div className="app-max-shell-patient mx-auto flex w-full items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="md:hidden">
              <ActionIconButton
                label={tNav("patientShell.areaTitle")}
                icon={<Menu className="h-4 w-4" />}
                onClick={() => setIsMobileNavOpen((open) => !open)}
              />
            </div>
            <BrandMark compact href="/patient" />
            <div className="min-w-0 md:max-w-[260px]">
              <p className="truncate text-sm font-semibold text-text-primary dark:text-white">
                {tArea("shell.title")}
              </p>
              <p className="hidden truncate text-xs text-text-secondary dark:text-white/65 sm:block">
                {tArea("shell.subtitle")}
              </p>
            </div>
          </div>

          <nav className="mx-4 hidden flex-1 items-center justify-center gap-2 md:flex">
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

          <div className="flex items-center gap-1">
            <LanguageToggle />
            <ThemeToggle />
            <MessagesHeaderButton role="patient" />
            <UserNotificationDropdown role="patient" />
            <UserDropdown
              compact
              quickLinks={userQuickLinks.map((item) => ({
                key: item.key,
                href: item.href,
                label: getLabel(item.key),
                icon: item.icon,
              }))}
            />
          </div>
        </div>
      </header>

      <main className="app-max-shell-patient mx-auto w-full px-4 pb-10 pt-0 sm:px-6 sm:pt-0">
        {children}
      </main>

      <Drawer
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
        side={locale === "ar" ? "right" : "left"}
        ariaLabel={tNav("patientShell.areaTitle")}
        className={`w-[320px] sm:w-[340px] ${locale === "ar" ? "rounded-l-[28px]" : "rounded-r-[28px]"}`}
        showCloseButton={false}
        inset={false}
        showHandle={false}
        backdropClassName="bg-black/55 backdrop-blur-0"
      >
        <div className="flex h-full flex-col bg-white dark:bg-surface-secondary">
          <div className="relative overflow-hidden">
            <div className="h-[150px] bg-gradient-to-br from-surface-tertiary via-surface-secondary to-primary-light dark:from-surface-tertiary dark:via-surface-secondary dark:to-primary/15">
              <div className="absolute inset-0 opacity-60 [background:radial-gradient(circle_at_30%_20%,rgba(68,161,148,0.22),transparent_45%),radial-gradient(circle_at_70%_30%,rgba(143,198,191,0.18),transparent_55%)]" />
              <div className="absolute inset-0 opacity-25 [background:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.25)_1px,transparent_0)] [background-size:18px_18px]" />
            </div>

            <div className="absolute start-3 top-3">
              <button
                type="button"
                title={locale === "ar" ? "إغلاق" : "Close"}
                aria-label={locale === "ar" ? "إغلاق" : "Close"}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border-light/80 bg-white/80 text-text-primary shadow-sm backdrop-blur-sm transition hover:bg-white dark:border-white/20 dark:bg-surface-secondary/70 dark:text-white dark:hover:bg-surface-secondary"
                onClick={() => setIsMobileNavOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="absolute bottom-4 start-4 end-4 flex items-center gap-3">
              <Avatar
                src={effectiveAvatar}
                name={displayName}
                size="custom"
                className="h-14 w-14 ring-2 ring-white/35"
              />

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-text-primary dark:text-white">{displayName}</p>
                {userEmail ? (
                  <p className="truncate text-xs text-text-secondary dark:text-white/70">{userEmail}</p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="app-drawer-scroll flex-1 overflow-y-auto px-3 py-3">
            <nav className="space-y-1">
              {drawerPrimaryItems.map((item) => (
                <DrawerItem
                  key={`${item.key}-${item.href}`}
                  href={item.href}
                  icon={item.icon}
                  label={getLabel(item.key)}
                  active={isActive(item.href)}
                  onNavigate={() => setIsMobileNavOpen(false)}
                />
              ))}
            </nav>

            <div className="my-4 border-t border-border-light/70 dark:border-white/10" />

            <nav className="space-y-1">
              {drawerSecondaryItems.map((item) => (
                <DrawerItem
                  key={`${item.key}-${item.href}`}
                  href={item.href}
                  icon={item.icon}
                  label={getLabel(item.key)}
                  active={isActive(item.href)}
                  onNavigate={() => setIsMobileNavOpen(false)}
                />
              ))}
            </nav>
          </div>

          <div className="border-t border-border-light/70 p-3 dark:border-white/10">
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold text-text-secondary transition hover:bg-surface-tertiary hover:text-text-primary dark:text-white/80 dark:hover:bg-white/5 dark:hover:text-white"
              onClick={async () => {
                setIsMobileNavOpen(false);
                await logout();
                router.push("/signin");
                router.refresh();
              }}
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-surface-secondary text-text-primary ring-1 ring-inset ring-border-light/70 dark:bg-white/6 dark:text-white/90 dark:ring-white/10">
                <LogOut className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1 truncate">{tCommon("logout")}</span>
            </button>
          </div>
        </div>
      </Drawer>

      <UnifiedMessagesLauncher role="patient" showFloatingTrigger={false} />
    </div>
  );
}

function DrawerItem({
  href,
  icon,
  label,
  active,
  onNavigate,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  active: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition ${
        active
          ? "bg-primary/10 text-primary dark:bg-white/10 dark:text-white"
          : "text-text-secondary hover:bg-surface-tertiary hover:text-text-primary dark:text-white/90 dark:hover:bg-white/6 dark:hover:text-white"
      }`}
    >
      <span
        className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ring-1 ring-inset ${
          active
            ? "bg-white text-primary ring-primary/20 dark:bg-white/14 dark:text-white dark:ring-white/16"
            : "bg-surface-secondary text-text-primary ring-border-light/70 dark:bg-white/6 dark:text-white/90 dark:ring-white/10"
        }`}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </Link>
  );
}

type ShellLinkProps = {
  href: string;
  active: boolean;
  icon: ReactNode;
  label: string;
};

function ShellLink({ href, active, icon, label }: ShellLinkProps) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
        active
          ? "bg-primary-light text-primary shadow-sm dark:bg-primary/15 dark:text-primary-light"
          : "bg-surface-secondary text-text-secondary hover:bg-surface-tertiary hover:text-text-primary dark:bg-surface-secondary dark:text-text-secondary dark:hover:bg-surface-tertiary dark:hover:text-text-primary"
      }`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
