"use client";

import React, { useMemo, useState } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { useAuthActions, useAuthState } from "@/stores/auth-store";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { LogOut, User } from "lucide-react";
import { usePatientProfile } from "@/features/patients/hooks/use-patients";
import type { ReactNode } from "react";

type UserDropdownProps = {
  compact?: boolean;
  quickLinks?: Array<{
    key: string;
    href: string;
    label: string;
    icon?: ReactNode;
  }>;
};

function getProfileHref(role?: string | null) {
  if (role === "PATIENT") return "/patient/profile";
  if (role === "PRACTITIONER") return "/practitioner/profile";
  if (role === "ADMIN" || role === "SUPPORT_AGENT" || role === "CONTENT_REVIEWER")
    return "/admin/settings";
  return null;
}

export default function UserDropdown({ compact = false, quickLinks = [] }: UserDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { user, tenant, isLoading } = useAuthState();
  const patientProfileQuery = usePatientProfile(user?.role === "PATIENT" && Boolean(user));
  const { logout } = useAuthActions();
  const locale = useLocale();
  const t = useTranslations("common.nav");
  const router = useRouter();

  const displayName = useMemo(() => {
    if (!user) return t("user");

    const fullName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
    return fullName || user.email || t("user");
  }, [t, user]);

  const userEmail = user?.email || "";
  const userInitial = displayName.charAt(0).toUpperCase();
  const profileHref = getProfileHref(user?.role);
  const dropdownAlignment = locale === "ar" ? "left-0 origin-top-left" : "right-0 origin-top-right";
  const patientAvatar = patientProfileQuery.data?.profile.avatarDataUrl ?? null;
  const effectiveAvatar = user?.role === "PATIENT" ? patientAvatar : user?.avatar ?? null;

  const handleLogout = async () => {
    setIsOpen(false);
    await logout();
    router.push("/signin");
    router.refresh();
  };

  if (!user) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={`dropdown-toggle flex items-center gap-3 rounded-full border border-border-light bg-surface-secondary px-2.5 py-1.5 text-text-primary transition hover:border-primary/40 hover:bg-primary-light dark:border-border-light dark:bg-surface-secondary dark:text-text-primary dark:hover:bg-surface-tertiary ${
          compact ? "" : "pr-3"
        }`}
        aria-label={t("account")}
      >
        {effectiveAvatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={effectiveAvatar}
            alt={displayName}
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-light text-sm font-semibold text-primary dark:bg-primary/15 dark:text-primary-light">
            {userInitial}
          </span>
        )}

        {!compact && (
          <span className="hidden min-w-0 text-start sm:block">
            <span className="block truncate text-sm font-semibold">{displayName}</span>
            {userEmail && (
              <span className="block truncate text-xs text-text-secondary dark:text-white/65">
                {userEmail}
              </span>
            )}
          </span>
        )}
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        className={`${dropdownAlignment} mt-3 flex w-[260px] flex-col rounded-2xl border border-border-light bg-surface-secondary p-3 shadow-theme-lg dark:border-border-light dark:bg-surface-secondary`}
      >
        <div className="px-1 pb-3">
          <span className="block text-sm font-semibold text-text-primary dark:text-white">
            {displayName}
          </span>
          {userEmail && (
            <span className="mt-0.5 block text-xs text-text-secondary dark:text-white/65">
              {userEmail}
            </span>
          )}
          {tenant && (
            <span className="mt-1 block text-xs text-primary dark:text-primary-light">
              {tenant.name}
            </span>
          )}
        </div>

        {quickLinks.length > 0 ? (
          <ul className="flex flex-col gap-1 border-t border-border-light pt-3 dark:border-border-light">
            {quickLinks.map((link) => (
              <li key={link.key}>
                <DropdownItem
                  tag="a"
                  href={link.href}
                  onItemClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-text-primary hover:bg-primary-light dark:text-text-primary dark:hover:bg-surface-tertiary"
                >
                  {link.icon ?? null}
                  {link.label}
                </DropdownItem>
              </li>
            ))}
          </ul>
        ) : null}

        {profileHref ? (
          <ul
            className={`flex flex-col gap-1 border-t border-border-light pt-3 dark:border-border-light ${
              quickLinks.length > 0 ? "mt-3" : ""
            }`}
          >
            <li>
              <DropdownItem
                tag="a"
                href={profileHref}
                onItemClick={() => setIsOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-text-primary hover:bg-primary-light dark:text-text-primary dark:hover:bg-surface-tertiary"
              >
                <User className="h-4 w-4" />
                {t("profile")}
              </DropdownItem>
            </li>
          </ul>
        ) : null}

        <button
          onClick={handleLogout}
          disabled={isLoading}
          className={`${profileHref ? "mt-3" : "mt-0"} flex w-full items-center gap-3 rounded-xl px-3 py-2 text-start text-sm font-medium text-text-primary transition hover:bg-primary-light dark:text-text-primary dark:hover:bg-surface-tertiary disabled:opacity-50`}
        >
          <LogOut className="h-4 w-4" />
          {t("logout")}
        </button>
      </Dropdown>
    </div>
  );
}
