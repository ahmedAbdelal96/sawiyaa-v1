"use client";

import React from "react";
import DynamicSidebar from "@/layout/DynamicSidebar";
import { adminNavigation, type NavigationConfig } from "@/config/navigation";

type AppSidebarProps = {
  navigation?: NavigationConfig;
  basePathPrefix?: string;
};

/**
 * Backward-compatible sidebar wrapper.
 *
 * We keep this component to avoid breaking any legacy imports, but delegate all
 * rendering logic to DynamicSidebar so navigation is defined in one source of truth.
 */
const AppSidebar: React.FC<AppSidebarProps> = ({
  navigation = adminNavigation,
  basePathPrefix = "",
}) => {
  return <DynamicSidebar navigation={navigation} basePathPrefix={basePathPrefix} />;
};

export default AppSidebar;
