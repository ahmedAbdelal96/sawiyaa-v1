"use client";

import { ThemeToggleButton } from "@/components/shared/ThemeToggleButton";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import BrandMark from "@/components/shared/BrandMark";
import ActionIconButton from "@/components/ui/action-icon-button/ActionIconButton";
import NotificationDropdown from "@/components/header/NotificationDropdown";
import UserDropdown from "@/components/header/UserDropdown";
import MessagesHeaderButton from "@/features/messages-shell/components/MessagesHeaderButton";
import UserNotificationDropdown from "@/features/notifications/components/UserNotificationDropdown";
import { useSidebar } from "@/stores";
import { Menu, X } from "lucide-react";
import { useLocale } from "next-intl";
import React from "react";

type AppHeaderProps = {
  messagingRole?: "admin" | "practitioner" | "patient";
};

const AppHeader: React.FC<AppHeaderProps> = ({ messagingRole }) => {
  const { isExpanded, isHovered, isMobileOpen, toggleSidebar, toggleMobileSidebar } =
    useSidebar();
  const locale = useLocale();
  const isRTL = locale === "ar";

  const handleToggle = () => {
    if (window.innerWidth >= 1024) {
      toggleSidebar();
    } else {
      toggleMobileSidebar();
    }
  };

  const headerOffsetClass = isMobileOpen
    ? "inset-x-0"
    : isRTL
      ? isExpanded || isHovered
        ? "lg:right-[290px] lg:left-0"
        : "lg:right-[90px] lg:left-0"
      : isExpanded || isHovered
        ? "lg:left-[290px] lg:right-0"
        : "lg:left-[90px] lg:right-0";

  return (
    <header
      className={`fixed top-0 z-[60] border-b border-border-light/80 bg-surface-secondary/92 backdrop-blur-xl dark:border-border-light dark:bg-surface-secondary/92 ${headerOffsetClass} transition-all duration-300 ease-in-out`}
    >
      <div className="mx-auto flex w-full items-center justify-between gap-3 px-4 py-2.5 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <ActionIconButton
            label={isMobileOpen ? "Close Sidebar" : "Toggle Sidebar"}
            icon={isMobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            onClick={handleToggle}
            intent="neutral"
            className="h-9 w-9 rounded-2xl lg:h-10 lg:w-10"
          />
          <BrandMark compact />
        </div>

        <div className="hidden min-w-0 items-center gap-2.5 lg:flex">
          <LanguageSwitcher />
          <ThemeToggleButton />
          {messagingRole ? <MessagesHeaderButton role={messagingRole} /> : null}
          {messagingRole === "practitioner" ? (
            <UserNotificationDropdown role="practitioner" />
          ) : null}
          <NotificationDropdown />
          <div className="ml-1.5 shrink-0">
            <UserDropdown compact />
          </div>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <LanguageSwitcher />
          <ThemeToggleButton />
          <div className="ml-1 shrink-0">
            <UserDropdown compact />
          </div>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
