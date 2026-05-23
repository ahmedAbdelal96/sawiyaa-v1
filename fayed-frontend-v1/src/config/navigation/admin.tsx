import { NavigationIcons } from "./icons";
import { PermissionKey as PK } from "@/lib/auth/permissions";
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
      {
        key: "sessions",
        icon: <NavigationIcons.calendar />,
        path: "/sessions",
        requiredPermissions: [PK.SESSIONS_READ_ADMIN],
      },
      {
        key: "patients",
        icon: <NavigationIcons.users />,
        path: "/patients",
        requiredPermissions: [PK.PATIENTS_READ_ADMIN, PK.PATIENTS_SENSITIVE_READ],
      },
      { key: "practitioners", icon: <NavigationIcons.practitioners />, path: "/practitioners" },
      {
        key: "practitionerApplications",
        icon: <NavigationIcons.practitioners />,
        path: "/practitioner-applications",
        requiredPermissions: [PK.PRACTITIONER_APPLICATIONS_READ],
      },
      {
        key: "support",
        icon: <NavigationIcons.support />,
        path: "/support",
        namespace: "workspace",
        requiredPermissions: [PK.SUPPORT_TICKET_NOTE_INTERNAL, PK.SUPPORT_TICKET_ASSIGN],
      },
      {
        key: "careChat",
        icon: <NavigationIcons.chat />,
        path: "/care-chat",
        namespace: "workspace",
        requiredPermissions: [
          PK.CARE_CHAT_REQUEST_READ_ADMIN,
          PK.CARE_CHAT_CONVERSATION_READ_ADMIN,
          PK.CARE_CHAT_REQUEST_DECIDE,
        ],
      },
      {
        key: "chatConversations",
        icon: <NavigationIcons.chat />,
        path: "/chat-conversations",
        namespace: "workspace",
        requiredPermissions: [PK.CHAT_CONVERSATIONS_READ],
      },
      { key: "assessments", icon: <NavigationIcons.reports />, path: "/assessments" },
      {
        key: "notifications",
        icon: <NavigationIcons.notifications />,
        path: "/notifications",
        namespace: "workspace",
        requiredPermissions: [PK.NOTIFICATION_OPS_READ],
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
    requiredPermissions: [
      PK.FINANCE_EVENTS_READ,
      PK.ACCOUNTING_READ,
      PK.SETTLEMENTS_READ,
      PK.PRACTITIONER_PAYOUTS_READ,
      PK.REFUNDS_APPROVE,
      PK.REFUNDS_RETRY,
    ],
    items: [
      {
        key: "payments",
        icon: <NavigationIcons.payments />,
        requiredPermissions: [PK.FINANCE_EVENTS_READ, PK.REFUNDS_APPROVE, PK.REFUNDS_RETRY],
        subItems: [
          { key: "paymentsHome", path: "/payments" },
          { key: "paymentGatewayControl", path: "/payments/gateway-control" },
        ],
      },
      {
        key: "finance",
        icon: <NavigationIcons.settlements />,
        requiredPermissions: [PK.ACCOUNTING_READ, PK.FINANCE_EVENTS_READ],
        subItems: [
          { key: "financeDashboard", path: "/finance/dashboard" },
          { key: "financeLedger", path: "/finance/ledger" },
        ],
      },
      {
        key: "financeReconciliation",
        icon: <NavigationIcons.reports />,
        path: "/finance/accounting/reconciliation",
        requiredPermissions: [PK.ACCOUNTING_READ],
      },
      {
        key: "practitionerPayouts",
        icon: <NavigationIcons.settlements />,
        path: "/practitioner-payouts",
        requiredPermissions: [PK.PRACTITIONER_PAYOUTS_READ, PK.PRACTITIONER_PAYOUTS_WRITE],
      },
      {
        key: "practitionerPayoutsHistory",
        icon: <NavigationIcons.reports />,
        path: "/practitioner-payouts/history",
        requiredPermissions: [PK.PRACTITIONER_PAYOUTS_READ],
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
        requiredPermissions: [PK.FINANCE_EVENTS_READ],
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
      {
        key: "auditLog",
        icon: <NavigationIcons.reports />,
        path: "/audit",
        requiredPermissions: [PK.AUDIT_LOG_READ],
      },
      {
        key: "adminUsers",
        icon: <NavigationIcons.users />,
        path: "/users",
        requiredPermissions: [PK.ADMIN_USERS_READ],
      },
    ],
  },
];
