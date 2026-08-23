import { NavigationIcons } from "./icons";
import type { NavigationConfig } from "./types";

export const practitionerNavigation: NavigationConfig = [
  {
    key: "practitionerWorkspaceTitle",
    titleKey: "title",
    namespace: "main",
    items: [
      { key: "home", icon: <NavigationIcons.dashboard />, path: "/dashboard", namespace: "practitionerNavigation" },
      { key: "sessions", icon: <NavigationIcons.calendar />, path: "/sessions", namespace: "practitionerNavigation" },
      { key: "instantBooking", icon: <NavigationIcons.instantBooking />, path: "/instant-booking", namespace: "practitionerNavigation" },
      { key: "schedule", icon: <NavigationIcons.availability />, path: "/availability", namespace: "practitionerNavigation" },
    ],
  },
  {
    key: "practitionerMessagesSupport",
    titleKey: "title",
    namespace: "workspace",
    items: [
      { key: "messages", icon: <NavigationIcons.chat />, path: "/messages", namespace: "practitionerNavigation" },
      { key: "helpCenter", icon: <NavigationIcons.page />, path: "/help", namespace: "practitionerNavigation" },
    ],
  },
  {
    key: "practitionerFinance",
    titleKey: "title",
    namespace: "main",
    items: [
      { key: "earnings", icon: <NavigationIcons.wallet />, path: "/wallet", namespace: "practitionerNavigation" },
      { key: "transactions", icon: <NavigationIcons.ledger />, path: "/ledger", namespace: "practitionerNavigation" },
      { key: "promoCodes", icon: <NavigationIcons.promoCodes />, path: "/promo-codes", namespace: "practitionerNavigation" },
      { key: "transfers", icon: <NavigationIcons.settlements />, path: "/settlements", namespace: "practitionerNavigation" },
    ],
  },
  {
    key: "practitionerProfileSettings",
    titleKey: "title",
    namespace: "settings",
    items: [
      { key: "profile", icon: <NavigationIcons.auth />, path: "/profile", namespace: "practitionerNavigation" },
      { key: "specialties", icon: <NavigationIcons.practitioners />, path: "/specialties", namespace: "practitionerNavigation" },
      { key: "credentials", icon: <NavigationIcons.page />, path: "/credentials", namespace: "practitionerNavigation" },
      { key: "packageAvailability", icon: <NavigationIcons.settings />, path: "/settings", namespace: "practitionerNavigation" },
      { key: "application", icon: <NavigationIcons.operations />, path: "/application", namespace: "practitionerNavigation" },
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
