"use client";

import React from "react";
import { ThemeToggleButton } from "@/components/shared/ThemeToggleButton";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import BrandMark from "@/components/shared/BrandMark";
import ActionIconButton from "@/components/ui/action-icon-button/ActionIconButton";
import NotificationDropdown from "@/components/header/NotificationDropdown";
import UserDropdown from "@/components/header/UserDropdown";
import MessagesHeaderButton from "@/features/messages-shell/components/MessagesHeaderButton";
import UserNotificationDropdown from "@/features/notifications/components/UserNotificationDropdown";
import { useSidebar } from "@/stores";
import { Menu, X, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from "lucide-react";
import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";

type AppHeaderProps = {
  messagingRole?: "admin" | "practitioner" | "patient";
};

const AppHeader: React.FC<AppHeaderProps> = ({ messagingRole }) => {
  const { isExpanded, isHovered, isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar();
  const locale = useLocale();
  const isRTL = locale === "ar";

  const headerOffsetClass = isRTL
    ? isExpanded || isHovered
      ? "lg:right-[304px] lg:left-0"
      : "lg:right-[88px] lg:left-0"
    : isExpanded || isHovered
      ? "lg:left-[304px] lg:right-0"
      : "lg:left-[88px] lg:right-0";

  return (
    <header
      className={cn(
        "fixed top-0 z-[60] border-b border-border-light/80 bg-white/95 dark:bg-surface/95 text-text-primary shadow-[0_10px_24px_-26px_rgba(31,42,45,0.18)] backdrop-blur-xl transition-all duration-300 ease-out",
        isMobileOpen ? "inset-x-0" : headerOffsetClass,
      )}
    >
      <div className="mx-auto flex w-full items-center justify-between gap-3 px-4 py-3 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <ActionIconButton
            label={locale === "ar" ? (isMobileOpen ? "إغلاق القائمة" : "فتح القائمة") : isMobileOpen ? "Close sidebar" : "Open sidebar"}
            icon={isMobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            onClick={toggleMobileSidebar}
            intent="neutral"
            className="h-10 w-10 rounded-2xl lg:hidden"
          />

          <ActionIconButton
            label={
              isRTL
                ? isExpanded || isHovered
                  ? "إغلاق القائمة الجانبية"
                  : "توسيع القائمة الجانبية"
                : isExpanded || isHovered
                  ? "Collapse sidebar"
                  : "Expand sidebar"
            }
            icon={
              isRTL ? (
                isExpanded || isHovered ? <PanelRightClose className="h-4.5 w-4.5" /> : <PanelRightOpen className="h-4.5 w-4.5" />
              ) : (
                isExpanded || isHovered ? <PanelLeftClose className="h-4.5 w-4.5" /> : <PanelLeftOpen className="h-4.5 w-4.5" />
              )
            }
            onClick={toggleSidebar}
            intent="neutral"
            className="hidden lg:flex h-10 w-10 rounded-2xl border border-border-light bg-surface-secondary/80 hover:bg-primary/10 hover:text-primary transition-all cursor-pointer shrink-0"
          />

          <div className="flex min-w-0 items-center gap-3">
            <div className="hidden min-w-0 lg:block">
              <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                Sawiyaa
              </p>
              <p className="text-sm font-medium text-text-primary">
                {locale === "ar" ? "لوحة الإدارة" : "Admin shell"}
              </p>
            </div>
          </div>
        </div>

        <div className="hidden min-w-0 items-center gap-3 lg:flex">
          <LanguageSwitcher />
          <ThemeToggleButton />
          {messagingRole ? <MessagesHeaderButton role={messagingRole} /> : null}
          {messagingRole === "admin" ? (
            <NotificationDropdown />
          ) : messagingRole ? (
            <UserNotificationDropdown role={messagingRole} />
          ) : null}
          <div className="ms-2 shrink-0">
            <UserDropdown compact />
          </div>
        </div>

        <div className="flex items-center gap-3 lg:hidden">
          <LanguageSwitcher />
          <ThemeToggleButton />
          <div className="ms-2 shrink-0">
            <UserDropdown compact />
          </div>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
