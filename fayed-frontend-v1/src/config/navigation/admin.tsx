import { NavigationIcons } from "./icons";
import type { NavigationConfig } from "./types";

export const adminNavigation: NavigationConfig = [
  {
    key: "main",
    items: [
      { key: "dashboard", icon: <NavigationIcons.dashboard />, path: "/dashboard" },
      { key: "sessions", icon: <NavigationIcons.calendar />, path: "/sessions" },
      { key: "practitioners", icon: <NavigationIcons.practitioners />, path: "/practitioners" },
      {
        key: "practitionerApplications",
        icon: <NavigationIcons.practitioners />,
        path: "/practitioner-applications",
      },
      { key: "payments", icon: <NavigationIcons.payments />, path: "/payments" },
      {
        key: "settlements",
        icon: <NavigationIcons.settlements />,
        subItems: [
          { key: "settlementsBatches", path: "/settlements" },
          { key: "settlementsDues", path: "/settlements/dues" },
          { key: "settlementsPayouts", path: "/settlements/payouts" },
        ],
      },
      { key: "assessments", icon: <NavigationIcons.reports />, path: "/assessments" },
    ],
  },
  {
    key: "workspace",
    items: [
      { key: "support", icon: <NavigationIcons.support />, path: "/support" },
      { key: "notifications", icon: <NavigationIcons.notifications />, path: "/notifications" },
      { key: "specialties", icon: <NavigationIcons.specialties />, path: "/specialties" },
      { key: "careChat", icon: <NavigationIcons.chat />, path: "/care-chat" },
      { key: "reviews", icon: <NavigationIcons.reports />, path: "/reviews" },
      {
        key: "moderationReports",
        icon: <NavigationIcons.reports />,
        path: "/moderation/reports",
      },
      { key: "articles", icon: <NavigationIcons.page />, path: "/articles" },
      { key: "training", icon: <NavigationIcons.training />, path: "/training" },
    ],
  },
];
