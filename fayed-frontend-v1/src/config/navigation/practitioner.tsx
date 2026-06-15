import { NavigationIcons } from "./icons";
import type { NavigationConfig } from "./types";

export const practitionerNavigation: NavigationConfig = [
  {
    key: "practitionerWorkspaceTitle",
    titleKey: "title",
    namespace: "main",
    items: [
      { key: "dashboard", icon: <NavigationIcons.dashboard />, path: "/dashboard", namespace: "main" },
      { key: "sessions", icon: <NavigationIcons.calendar />, path: "/sessions", namespace: "main" },
      { key: "availability", icon: <NavigationIcons.availability />, path: "/availability", namespace: "main" },
    ],
  },
  {
    key: "practitionerMessagesSupport",
    titleKey: "title",
    namespace: "workspace",
    items: [
      { key: "messages", icon: <NavigationIcons.chat />, path: "/messages", namespace: "workspace" },
      { key: "helpCenter", icon: <NavigationIcons.page />, path: "/help", namespace: "workspace" },
    ],
  },
  {
    key: "practitionerFinance",
    titleKey: "title",
    namespace: "main",
    items: [
      { key: "wallet", icon: <NavigationIcons.wallet />, path: "/wallet", namespace: "main" },
      { key: "ledger", icon: <NavigationIcons.ledger />, path: "/ledger", namespace: "main" },
      { key: "promoCodes", icon: <NavigationIcons.promoCodes />, path: "/promo-codes", namespace: "main" },
      { key: "settlements", icon: <NavigationIcons.settlements />, path: "/settlements", namespace: "main" },
    ],
  },
  {
    key: "practitionerProfileSettings",
    titleKey: "title",
    namespace: "settings",
    items: [
      { key: "profile", icon: <NavigationIcons.auth />, path: "/profile", namespace: "settings" },
      { key: "specialties", icon: <NavigationIcons.practitioners />, path: "/specialties", namespace: "settings" },
      { key: "credentials", icon: <NavigationIcons.page />, path: "/credentials", namespace: "settings" },
      { key: "packageAvailability", icon: <NavigationIcons.settings />, path: "/settings", namespace: "settings" },
      { key: "application", icon: <NavigationIcons.operations />, path: "/application", namespace: "settings" },
    ],
  },
];

export const practitionerOnboardingNavigation: NavigationConfig = [
  {
    key: "practitionerProfile",
    titleKey: "title",
    namespace: "settings",
    items: [{ key: "application", icon: <NavigationIcons.operations />, path: "/application" }],
  },
];
