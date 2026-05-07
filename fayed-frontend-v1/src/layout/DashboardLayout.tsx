"use client";

import React from "react";
import { useLocale } from "next-intl";
import { NavigationConfig } from "@/config/navigation";
import AppHeader from "@/layout/AppHeader";
import Backdrop from "@/layout/Backdrop";
import DynamicSidebar from "@/layout/DynamicSidebar";
import UnifiedMessagesLauncher from "@/features/messages-shell/components/UnifiedMessagesLauncher";
import { useSidebar } from "@/stores";

interface DashboardLayoutProps {
  children: React.ReactNode;
  navigation: NavigationConfig;
  basePathPrefix?: string; // e.g., "/admin" or ""
  layoutVariant?: "admin" | "practitioner";
  messagingRole?: "admin" | "practitioner";
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
}: DashboardLayoutProps) {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const locale = useLocale();
  const isRTL = locale === "ar";

  // Keep content width and offset in sync with sidebar width to avoid clipping
  // on narrower desktop breakpoints (especially in RTL).
  const mainContentLayout = isMobileOpen
    ? "w-full"
    : isExpanded || isHovered
      ? isRTL
        ? "w-full lg:mr-[290px] lg:w-[calc(100%-290px)]"
        : "w-full lg:ml-[290px] lg:w-[calc(100%-290px)]"
      : isRTL
        ? "w-full lg:mr-[90px] lg:w-[calc(100%-90px)]"
        : "w-full lg:ml-[90px] lg:w-[calc(100%-90px)]";

  const shellMaxClass =
    layoutVariant === "practitioner" ? "app-max-shell-practitioner" : "app-max-shell-admin";

  return (
    <div className="min-h-screen xl:flex">
      <DynamicSidebar navigation={navigation} basePathPrefix={basePathPrefix} />
      <Backdrop />

      <div
        className={`min-w-0 transition-all duration-300 ease-in-out ${mainContentLayout}`}
      >
        <AppHeader messagingRole={messagingRole} />

        <div className={`${shellMaxClass} mx-auto w-full min-w-0 px-4 pb-4 pt-24 md:px-6 md:pb-6 md:pt-24`}>
          {children}
        </div>
      </div>

      {messagingRole ? (
        <UnifiedMessagesLauncher role={messagingRole} showFloatingTrigger={false} />
      ) : null}
    </div>
  );
}
