import { NavigationIcons } from "./icons";
import type { NavigationConfig } from "./types";

export const adminNavigation: NavigationConfig = [
  {
    key: "main",
    items: [
      { key: "dashboard", icon: <NavigationIcons.dashboard />, path: "/dashboard" },
      { key: "sessions", icon: <NavigationIcons.calendar />, path: "/sessions" },
      { key: "patients", icon: <NavigationIcons.users />, path: "/patients" },
      { key: "practitioners", icon: <NavigationIcons.practitioners />, path: "/practitioners" },
      { key: "packagePlans", icon: <NavigationIcons.payments />, path: "/package-plans" },
      { key: "refundPolicies", icon: <NavigationIcons.page />, path: "/refund-policies" },
      {
        key: "practitionerApplications",
        icon: <NavigationIcons.practitioners />,
        path: "/practitioner-applications",
      },
      {
        key: "payments",
        icon: <NavigationIcons.payments />,
        subItems: [
          { key: "paymentsHome", path: "/payments" },
          { key: "paymentGatewayControl", path: "/payments/gateway-control" },
        ],
      },
      {
        key: "finance",
        icon: <NavigationIcons.settlements />,
        subItems: [
          { key: "financeDashboard", path: "/finance/dashboard" },
          { key: "financeLedger", path: "/finance/ledger" },
          { key: "financeReconciliation", path: "/finance/reconciliation" }
        ],
      },
      {
        key: "reports",
        icon: <NavigationIcons.reports />,
        subItems: [
          { key: "reportsHome", path: "/reports" },
          { key: "reportsSessions", path: "/reports/sessions" },
          { key: "reportsPaymentsRevenue", path: "/reports/payments-revenue" },
          { key: "reportsSupport", path: "/reports/support" },
          { key: "reportsCareRequests", path: "/reports/care-requests" },
          { key: "reportsPayouts", path: "/reports/payouts" },
        ],
      },
      { key: "practitionerPayouts", icon: <NavigationIcons.settlements />, path: "/practitioner-payouts" },
      { key: "practitionerPayoutsHistory", icon: <NavigationIcons.reports />, path: "/practitioner-payouts/history" },
      { key: "assessments", icon: <NavigationIcons.reports />, path: "/assessments" },
    ],
  },
  {
    key: "workspace",
    items: [
      { key: "support", icon: <NavigationIcons.support />, path: "/support" },
      {
        key: "helpCenter",
        icon: <NavigationIcons.page />,
        subItems: [
          { key: "helpCenterHome", path: "/help" },
          { key: "helpCategories", path: "/help/categories" },
          { key: "helpQuestions", path: "/help/questions" },
        ],
      },
      { key: "notifications", icon: <NavigationIcons.notifications />, path: "/notifications" },
      { key: "auditLog", icon: <NavigationIcons.reports />, path: "/audit" },
      { key: "specialties", icon: <NavigationIcons.specialties />, path: "/specialties" },
      { key: "careChat", icon: <NavigationIcons.chat />, path: "/care-chat" },
      { key: "reviews", icon: <NavigationIcons.reports />, path: "/reviews" },
      {
        key: "moderationReports",
        icon: <NavigationIcons.reports />,
        path: "/moderation/reports",
      },
      { key: "articles", icon: <NavigationIcons.page />, path: "/articles" },
      { key: "academy", icon: <NavigationIcons.training />, path: "/academy" },
      { key: "training", icon: <NavigationIcons.training />, path: "/training" },
    ],
  },
];
