import { NavigationIcons } from "./icons";
import { PermissionKey as PK } from "@/lib/auth/permissions";
import type { NavigationConfig } from "./types";

export const adminNavigation: NavigationConfig = [
  {
    key: "core",
    titleKey: "title",
    namespace: "main",
    collapsible: false,
    items: [
      { key: "dashboard", icon: <NavigationIcons.dashboard />, path: "/dashboard", namespace: "main" },
      {
        key: "messages",
        icon: <NavigationIcons.chat />,
        path: "/messages",
        namespace: "workspace",
        requiredPermissions: [
          PK.SUPPORT_TICKET_NOTE_INTERNAL,
          PK.SUPPORT_TICKET_ASSIGN,
          PK.CARE_CHAT_REQUEST_READ_ADMIN,
          PK.CARE_CHAT_CONVERSATION_READ_ADMIN,
          PK.CHAT_CONVERSATIONS_READ,
        ],
      },
      {
        key: "notifications",
        icon: <NavigationIcons.notifications />,
        path: "/notifications",
        namespace: "workspace",
        requiredPermissions: [PK.NOTIFICATION_OPS_READ],
      },
      {
        key: "helpCenter",
        icon: <NavigationIcons.page />,
        namespace: "workspace",
        subItems: [
          { key: "helpCenterHome", path: "/help", namespace: "workspace" },
          { key: "helpCategories", path: "/help/categories", namespace: "workspace" },
          { key: "helpQuestions", path: "/help/questions", namespace: "workspace" },
        ],
      },
    ],
  },
  {
    key: "operations",
    titleKey: "title",
    namespace: "main",
    collapsible: true,
    items: [
      {
        key: "sessions",
        icon: <NavigationIcons.calendar />,
        path: "/sessions",
        namespace: "main",
        requiredPermissions: [PK.SESSIONS_READ_ADMIN],
      },
      {
        key: "patients",
        icon: <NavigationIcons.users />,
        path: "/patients",
        namespace: "main",
        requiredPermissions: [PK.PATIENTS_READ_ADMIN, PK.PATIENTS_SENSITIVE_READ],
      },
      { key: "practitioners", icon: <NavigationIcons.practitioners />, path: "/practitioners", namespace: "main" },
      {
        key: "practitionerApplications",
        icon: <NavigationIcons.practitioners />,
        path: "/practitioner-applications",
        namespace: "main",
        requiredPermissions: [PK.PRACTITIONER_APPLICATIONS_READ],
      },
      {
        key: "featuredPractitioners",
        icon: <NavigationIcons.practitioners />,
        path: "/practitioners/featured",
        namespace: "main",
        requiredPermissions: [PK.FEATURED_PRACTITIONERS_READ],
      },
      { key: "assessments", icon: <NavigationIcons.reports />, path: "/assessments", namespace: "main" },
    ],
  },
  {
    key: "finance",
    titleKey: "title",
    namespace: "main",
    collapsible: true,
    requiredPermissions: [
      PK.FINANCE_EVENTS_READ,
      PK.ACCOUNTING_READ,
      PK.PRACTITIONER_PAYOUTS_READ,
      PK.REFUNDS_APPROVE,
      PK.REFUNDS_RETRY,
    ],
    items: [
      {
        key: "financeAccounts",
        icon: <NavigationIcons.wallet />,
        namespace: "main",
        groupLabel: true,
        requiredPermissions: [PK.ACCOUNTING_READ, PK.FINANCE_EVENTS_READ, PK.PRACTITIONER_PAYOUTS_READ, PK.PRACTITIONER_PAYOUTS_WRITE, PK.REFUNDS_APPROVE, PK.REFUNDS_RETRY],
        subItems: [
          { key: "financeDashboard", path: "/finance", namespace: "main" },
          { key: "payments", path: "/payments", namespace: "main" },
          { key: "practitionerPayouts", path: "/practitioner-payouts", namespace: "main" },
          { key: "practitionerPayoutsHistory", path: "/practitioner-payouts/history", namespace: "main" },
        ],
      },
      {
        key: "financeReview",
        icon: <NavigationIcons.reports />,
        namespace: "main",
        groupLabel: true,
        requiredPermissions: [PK.ACCOUNTING_READ, PK.FINANCE_EVENTS_READ, PK.PRACTITIONER_PAYOUTS_READ, PK.REFUNDS_APPROVE, PK.REFUNDS_RETRY],
        subItems: [
          { key: "sessionEarningReviews", path: "/finance/session-earning-reviews", namespace: "main" },
          { key: "financeLedger", path: "/finance/ledger", namespace: "main" },
          { key: "financeReconciliation", path: "/finance/accounting/reconciliation", namespace: "main" },
        ],
      },
    ],
  },
  {
    key: "contentMarketplace",
    titleKey: "title",
    namespace: "main",
    collapsible: true,
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
      { key: "articles", icon: <NavigationIcons.page />, path: "/articles", namespace: "workspace" },
      {
        key: "academy",
        icon: <NavigationIcons.academy />,
        path: "/academy/programs",
        namespace: "workspace",
      },
      { key: "specialties", icon: <NavigationIcons.specialties />, path: "/specialties", namespace: "workspace" },
    ],
  },
  {
    key: "oversight",
    titleKey: "title",
    namespace: "main",
    collapsible: true,
    items: [
      {
        key: "reports",
        icon: <NavigationIcons.reports />,
        namespace: "main",
        requiredPermissions: [PK.FINANCE_EVENTS_READ],
        subItems: [
          { key: "reportsHome", path: "/reports", namespace: "main" },
          { key: "reportsSessions", path: "/reports/sessions", namespace: "main" },
          { key: "reportsPaymentsRevenue", path: "/reports/payments-revenue", namespace: "main" },
          { key: "reportsSupport", path: "/reports/support", namespace: "main" },
          { key: "reportsCareRequests", path: "/reports/care-requests", namespace: "main" },
          { key: "reportsPayouts", path: "/reports/payouts", namespace: "main" },
        ],
      },
      { key: "reviews", icon: <NavigationIcons.reports />, path: "/reviews", namespace: "workspace" },
      {
        key: "moderationReports",
        icon: <NavigationIcons.reports />,
        path: "/moderation/reports",
        namespace: "workspace",
      },
      {
        key: "auditLog",
        icon: <NavigationIcons.reports />,
        path: "/audit",
        namespace: "workspace",
        requiredPermissions: [PK.AUDIT_LOG_READ],
      },
    ],
  },
  {
    key: "settings",
    titleKey: "title",
    namespace: "workspace",
    collapsible: true,
    items: [
      {
        key: "adminUsers",
        icon: <NavigationIcons.users />,
        path: "/users",
        namespace: "workspace",
        requiredPermissions: [PK.ADMIN_USERS_READ],
      },
    ],
  },
];
