import { NavigationIcons } from "./icons";
import type { NavigationConfig } from "./types";

export const practitionerNavigation: NavigationConfig = [
  {
    key: "main",
    titleKey: "practitionerMain.title",
    namespace: "main",
    items: [
      { key: "dashboard", icon: <NavigationIcons.dashboard />, path: "/dashboard" },
      { key: "sessions", icon: <NavigationIcons.calendar />, path: "/sessions" },
      { key: "availability", icon: <NavigationIcons.availability />, path: "/availability" },
    ],
  },
  {
    key: "workspace",
    titleKey: "practitionerWorkspace.title",
    namespace: "workspace",
    items: [
      { key: "careChat", icon: <NavigationIcons.support />, path: "/care-chat" },
      { key: "support", icon: <NavigationIcons.chat />, path: "/support" },
      { key: "helpCenter", icon: <NavigationIcons.page />, path: "/help" },
    ],
  },
  {
    key: "finance",
    titleKey: "practitionerFinance.title",
    namespace: "main",
    items: [
      { key: "wallet", icon: <NavigationIcons.wallet />, path: "/wallet" },
      { key: "ledger", icon: <NavigationIcons.ledger />, path: "/ledger" },
      { key: "settlements", icon: <NavigationIcons.settlements />, path: "/settlements" },
    ],
  },
  {
    key: "readiness",
    titleKey: "practitionerReadiness.title",
    namespace: "settings",
    items: [
      { key: "profile", icon: <NavigationIcons.auth />, path: "/profile" },
      { key: "specialties", icon: <NavigationIcons.practitioners />, path: "/specialties" },
      { key: "credentials", icon: <NavigationIcons.page />, path: "/credentials" },
      { key: "packageAvailability", icon: <NavigationIcons.settings />, path: "/settings" },
      { key: "application", icon: <NavigationIcons.operations />, path: "/application" },
    ],
  },
];

export const practitionerOnboardingNavigation: NavigationConfig = [
  {
    key: "readiness",
    titleKey: "practitionerReadiness.title",
    namespace: "settings",
    items: [{ key: "application", icon: <NavigationIcons.operations />, path: "/application" }],
  },
];
