import { NavigationIcons } from "./icons";
import type { NavigationConfig } from "./types";

// This config mirrors the current patient IA, but PatientAppShell is still the
// active renderer for the patient area. Keep both aligned until ownership is unified.
export const patientNavigation: NavigationConfig = [
  {
    key: "main",
    items: [
      { key: "home", icon: <NavigationIcons.dashboard />, path: "/patient" },
      { key: "matching", icon: <NavigationIcons.operations />, path: "/patient/matching" },
      { key: "assessments", icon: <NavigationIcons.reports />, path: "/patient/assessments" },
      { key: "practitioners", icon: <NavigationIcons.practitioners />, path: "/patient/practitioners" },
      { key: "sessions", icon: <NavigationIcons.calendar />, path: "/patient/sessions" },
    ],
  },
  {
    key: "workspace",
    items: [
      { key: "messages", icon: <NavigationIcons.chat />, path: "/patient/messages" },
      { key: "helpCenter", icon: <NavigationIcons.page />, path: "/patient/help" },
      { key: "academy", icon: <NavigationIcons.academy />, path: "/patient/academy" },
      { key: "payments", icon: <NavigationIcons.payments />, path: "/patient/payments" },
    ],
  },
  {
    key: "settings",
    items: [
      { key: "profile", icon: <NavigationIcons.users />, path: "/patient/profile" },
    ],
  },
];
