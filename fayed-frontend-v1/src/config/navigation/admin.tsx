import { NavigationIcons } from "./icons";
import type { NavigationConfig } from "./types";

export const adminNavigation: NavigationConfig = [
  {
    key: "overview",
    titleKey: "title",
    namespace: "main",
    items: [
      { key: "dashboard", icon: <NavigationIcons.dashboard />, path: "/dashboard" },
    ],
  },
  {
    key: "operations",
    titleKey: "title",
    namespace: "main",
    items: [
      { key: "sessions", icon: <NavigationIcons.calendar />, path: "/sessions" },
      { key: "patients", icon: <NavigationIcons.users />, path: "/patients" },
      { key: "practitioners", icon: <NavigationIcons.practitioners />, path: "/practitioners" },
      {
        key: "practitionerApplications",
        icon: <NavigationIcons.practitioners />,
        path: "/practitioner-applications",
      },
      {
        key: "support",
        icon: <NavigationIcons.support />,
        path: "/support",
        namespace: "workspace",
      },
      {
        key: "careChat",
        icon: <NavigationIcons.chat />,
        path: "/care-chat",
        namespace: "workspace",
      },
      { key: "assessments", icon: <NavigationIcons.reports />, path: "/assessments" },
      {
        key: "notifications",
        icon: <NavigationIcons.notifications />,
        path: "/notifications",
        namespace: "workspace",
      },
    ],
  },
  {
    key: "catalog",
    titleKey: "title",
    namespace: "workspace",
    items: [
      {
        key: "packagePlans",
        icon: <NavigationIcons.payments />,
        path: "/package-plans",
        namespace: "main",
      },
      {
        key: "refundPolicies",
        icon: <NavigationIcons.page />,
        path: "/refund-policies",
        namespace: "main",
      },
      { key: "articles", icon: <NavigationIcons.page />, path: "/articles" },
      { key: "academy", icon: <NavigationIcons.training />, path: "/academy" },
      { key: "training", icon: <NavigationIcons.training />, path: "/training" },
      { key: "specialties", icon: <NavigationIcons.specialties />, path: "/specialties" },
      {
        key: "helpCenter",
        icon: <NavigationIcons.page />,
        subItems: [
          { key: "helpCenterHome", path: "/help" },
          { key: "helpCategories", path: "/help/categories" },
          { key: "helpQuestions", path: "/help/questions" },
        ],
      },
    ],
  },
  {
    key: "financeOps",
    titleKey: "title",
    namespace: "main",
    items: [
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
          { key: "financeReconciliation", path: "/finance/reconciliation" },
        ],
      },
      {
        key: "practitionerPayouts",
        icon: <NavigationIcons.settlements />,
        path: "/practitioner-payouts",
      },
      {
        key: "practitionerPayoutsHistory",
        icon: <NavigationIcons.reports />,
        path: "/practitioner-payouts/history",
      },
    ],
  },
  {
    key: "insights",
    titleKey: "title",
    namespace: "workspace",
    items: [
      {
        key: "reports",
        icon: <NavigationIcons.reports />,
        namespace: "main",
        subItems: [
          { key: "reportsHome", path: "/reports", namespace: "main" },
          { key: "reportsSessions", path: "/reports/sessions", namespace: "main" },
          {
            key: "reportsPaymentsRevenue",
            path: "/reports/payments-revenue",
            namespace: "main",
          },
          { key: "reportsSupport", path: "/reports/support", namespace: "main" },
          {
            key: "reportsCareRequests",
            path: "/reports/care-requests",
            namespace: "main",
          },
          { key: "reportsPayouts", path: "/reports/payouts", namespace: "main" },
        ],
      },
      { key: "reviews", icon: <NavigationIcons.reports />, path: "/reviews" },
      {
        key: "moderationReports",
        icon: <NavigationIcons.reports />,
        path: "/moderation/reports",
      },
      { key: "auditLog", icon: <NavigationIcons.reports />, path: "/audit" },
    ],
  },
];
