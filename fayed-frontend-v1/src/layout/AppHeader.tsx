"use client";

import { ThemeToggleButton } from "@/components/shared/ThemeToggleButton";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import BrandMark from "@/components/shared/BrandMark";
import NotificationDropdown from "@/components/header/NotificationDropdown";
import UserDropdown from "@/components/header/UserDropdown";
import { useSidebar } from "@/stores";
import React, { useState } from "react";

const AppHeader: React.FC = () => {
  const [isApplicationMenuOpen, setApplicationMenuOpen] = useState(false);
  const { isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar();

  const handleToggle = () => {
    if (window.innerWidth >= 1024) {
      toggleSidebar();
    } else {
      toggleMobileSidebar();
    }
  };

  return (
    <header className="sticky top-0 z-40 flex w-full border-b border-border-light bg-surface-secondary/90 backdrop-blur dark:border-border-light dark:bg-surface-secondary/90">
      <div className="flex grow flex-col items-center justify-between lg:flex-row lg:px-6">
        <div className="flex w-full items-center justify-between gap-3 border-b border-border-light px-3 py-3 dark:border-border-light lg:border-b-0 lg:px-0 lg:py-4">
          <div className="flex items-center gap-3">
            <button
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-border-light bg-surface text-text-secondary transition-colors hover:bg-primary-light hover:text-text-brand dark:border-border-light dark:bg-surface-tertiary dark:text-text-secondary lg:h-11 lg:w-11"
              onClick={handleToggle}
              aria-label="Toggle Sidebar"
            >
              {isMobileOpen ? "X" : "="}
            </button>
            <div className="lg:hidden">
              <BrandMark compact />
            </div>
          </div>

          <div className="hidden lg:flex lg:flex-col">
            <span className="text-sm font-semibold text-text-primary">Fayed</span>
            <span className="text-xs text-text-secondary">
              Calm digital care workspace
            </span>
          </div>

          <button
            onClick={() => setApplicationMenuOpen((prev) => !prev)}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-text-secondary hover:bg-primary-light hover:text-text-brand dark:text-text-secondary dark:hover:bg-surface-tertiary lg:hidden"
            aria-label="Toggle header menu"
          >
            ...
          </button>
        </div>

        <div
          className={`${
            isApplicationMenuOpen ? "flex" : "hidden"
          } w-full items-center justify-between gap-4 px-5 py-4 shadow-theme-md lg:flex lg:w-auto lg:px-0 lg:shadow-none`}
        >
          <div className="flex items-center gap-2 2xsm:gap-3">
            <LanguageSwitcher />
            <ThemeToggleButton />
            <NotificationDropdown />
          </div>
          <UserDropdown />
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
