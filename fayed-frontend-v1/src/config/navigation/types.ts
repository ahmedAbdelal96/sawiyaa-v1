import React from "react";

export type NavigationSectionKey = string;

export type NavItem = {
  key: string;
  icon: React.ReactNode;
  path?: string;
  namespace?: string;
  subItems?: { key: string; path: string; namespace?: string }[];
};

export type NavigationSection = {
  key: NavigationSectionKey;
  titleKey?: string;
  namespace?: string;
  items: NavItem[];
};

export type NavigationConfig = NavigationSection[];
