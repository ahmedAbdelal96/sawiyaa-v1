"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Menu, X } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import LanguageToggle from "./LanguageToggle";
import UserDropdown from "@/components/header/UserDropdown";
import { useAuthState } from "@/stores/auth-store";

export default function PublicNavbar() {
  const t = useTranslations("home.nav");
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAuthenticated } = useAuthState();

  const NAV_LINKS = [
    { href: "/", label: t("home") },
    { href: "/specialties", label: t("specialties") },
    { href: "/practitioners", label: t("practitioners") },
    { href: "/articles", label: t("articles") },
    { href: "/refund-policies", label: t("policies") },
  ];

  return (
    <header className="fixed top-0 z-50 w-full glass-header shadow-theme-xs dark:shadow-none dark:border-b dark:border-border-light">
      <nav className="app-max-shell-public mx-auto flex items-center justify-between px-6 py-3.5">
        {/* Logo + desktop nav */}
        <div className="flex items-center gap-10">
          <Link
            href="/"
            className="text-2xl font-bold tracking-tight text-primary"
          >
            Sawiyaa
          </Link>
          <ul className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => {
              const isActive =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={
                      isActive
                        ? "rounded-xl bg-primary-light px-3.5 py-2 text-sm font-semibold text-primary shadow-[inset_0_0_0_1px_rgba(95,143,139,0.12)] dark:bg-primary/14"
                        : "rounded-xl px-3.5 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-tertiary hover:text-primary dark:hover:bg-white/5"
                    }
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Desktop right-side controls */}
        <div className="hidden items-center gap-1 md:flex">
          <LanguageToggle />
          <ThemeToggle />
          <div className="mx-2 h-5 w-px bg-border-light" />
          {isAuthenticated ? (
            <UserDropdown />
          ) : (
            <>
              <Link
                href="/signin"
                className="rounded-xl px-3.5 py-2 text-sm font-medium text-text-secondary transition-all hover:bg-surface-tertiary hover:text-primary dark:hover:bg-white/5"
              >
                {t("login")}
              </Link>
              <Link
                href="/signup"
                className="rounded-2xl bg-primary px-5 py-2 text-sm font-semibold text-white shadow-[0_12px_24px_-14px_rgba(95,143,139,0.45)] transition-all hover:bg-primary-hover active:scale-95"
              >
                {t("startJourney")}
              </Link>
            </>
          )}
        </div>

        {/* Mobile: toggles + hamburger */}
        <div className="flex items-center gap-1 md:hidden">
          <LanguageToggle />
          <ThemeToggle />
          {isAuthenticated && <UserDropdown compact />}
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-tertiary"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={t("openMenu")}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-border-light bg-surface-secondary/98 px-5 pb-5 pt-3 md:hidden dark:bg-surface-secondary/98">
          <ul className="mb-4 flex flex-col gap-0.5">
            {NAV_LINKS.map((link) => {
              const isActive =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-surface-tertiary hover:text-primary dark:hover:bg-white/5 ${isActive ? "font-semibold text-primary" : "text-text-secondary"}`}
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          {!isAuthenticated && (
            <div className="flex flex-col gap-2">
              <Link
                href="/signin"
                className="rounded-xl border border-border-light px-4 py-2.5 text-center text-sm font-medium text-primary transition-colors hover:bg-surface-tertiary"
                onClick={() => setMobileOpen(false)}
              >
                {t("login")}
              </Link>
              <Link
                href="/signup"
                className="rounded-xl bg-primary px-4 py-2.5 text-center text-sm font-semibold text-white"
                onClick={() => setMobileOpen(false)}
              >
                {t("startJourney")}
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
