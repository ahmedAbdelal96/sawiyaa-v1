import { NavigationIcons } from "./icons";
import type { NavigationConfig } from "./types";

// This config mirrors the current patient IA, but PatientAppShell is still the
// active renderer for the patient area. Keep both aligned until ownership is unified.
export const patientNavigation: NavigationConfig = [
  {
    key: "main",
    items: [
      { key: "home", icon: <NavigationIcons.dashboard />, path: "/" },
      { key: "matching", icon: <NavigationIcons.operations />, path: "/matching" },
      { key: "assessments", icon: <NavigationIcons.reports />, path: "/assessments" },
      { key: "practitioners", icon: <NavigationIcons.practitioners />, path: "/practitioners" },
      { key: "sessions", icon: <NavigationIcons.calendar />, path: "/sessions" },
    ],
  },
  {
    key: "workspace",
    items: [
      { key: "messages", icon: <NavigationIcons.chat />, path: "/messages" },
      { key: "helpCenter", icon: <NavigationIcons.page />, path: "/help" },
      { key: "academy", icon: <NavigationIcons.academy />, path: "/patient/academy" },
      { key: "payments", icon: <NavigationIcons.payments />, path: "/payments" },
    ],
  },
  {
    key: "settings",
    items: [
      { key: "profile", icon: <NavigationIcons.users />, path: "/profile" },
    ],
  },
];
