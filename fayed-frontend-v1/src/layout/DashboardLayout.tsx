"use client";

import React from "react";
import { useLocale } from "next-intl";
import { NavigationConfig } from "@/config/navigation";
import AppHeader from "@/layout/AppHeader";
import Backdrop from "@/layout/Backdrop";
import DynamicSidebar from "@/layout/DynamicSidebar";
import UnifiedMessagesLauncher from "@/features/messages-shell/components/UnifiedMessagesLauncher";

interface DashboardLayoutProps {
  children: React.ReactNode;
  navigation: NavigationConfig;
  basePathPrefix?: string; // e.g., "/admin" or ""
  layoutVariant?: "admin" | "practitioner";
  messagingRole?: "admin" | "practitioner";
  contentMode?: "constrained" | "full";
}

/**
 * Shared protected-area layout for the active practitioner/admin surfaces.
 *
 * @param navigation sidebar navigation config for the current role area
 * @param basePathPrefix role-area path prefix such as "/admin" or "/practitioner"
 */
export default function DashboardLayout({
  children,
  navigation,
  basePathPrefix = "",
  layoutVariant = "admin",
  messagingRole,
  contentMode = "constrained",
}: DashboardLayoutProps) {
  const locale = useLocale();
  const isRTL = locale === "ar";
  const mainContentLayout = isRTL ? "lg:mr-[304px]" : "lg:ml-[304px]";

  const shellMaxClass =
    layoutVariant === "practitioner" ? "app-max-shell-practitioner" : "app-max-shell-admin";

  return (
    <div className="min-h-screen xl:flex bg-background text-text-primary">
      <DynamicSidebar navigation={navigation} basePathPrefix={basePathPrefix} density="compact" />
      <Backdrop />

      <div
        className={`min-w-0 flex-1 transition-all duration-300 ease-in-out ${mainContentLayout}`}
      >
        <AppHeader messagingRole={messagingRole} />

        <div
          className={
            contentMode === "full"
              ? "w-full min-w-0 px-4 pb-4 pt-24 md:px-6 md:pb-6 md:pt-24"
              : `${shellMaxClass} mx-auto w-full min-w-0 px-4 pb-4 pt-24 md:px-6 md:pb-6 md:pt-24`
          }
        >
          {children}
        </div>
      </div>

      {messagingRole ? (
        <UnifiedMessagesLauncher role={messagingRole} showFloatingTrigger={false} />
      ) : null}
    </div>
  );
}
