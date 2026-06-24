"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { 
  Mail, 
  Phone, 
  ShieldCheck, 
  ShieldX, 
  UserRound,
  ShieldAlert,
  Activity,
  Gavel,
  CheckCircle2,
  XCircle,
  Database,
  UserCheck,
  Eye,
  Lock,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import { SurfaceCard, SurfaceStatCard } from "@/components/shared/SurfaceShell";
import ActionIconLink from "@/components/ui/action-icon-button/ActionIconLink";
import DirectionalArrowIcon from "@/components/ui/navigation/DirectionalArrowIcon";
import Button from "@/components/ui/button/Button";
import { useAuthState } from "@/stores/auth-store";
import { toAppError } from "@/lib/api/errors";
import { listAdminPatients } from "@/features/admin/patients/api/admin-patients.api";
import { listAdminPractitioners } from "@/features/admin/practitioners/api/admin-practitioners.api";
import { getAdminSessionAttendance } from "@/features/admin/session-runtime/api/admin-session-runtime.api";
import { getAdminChatConversation } from "@/features/admin/chat-conversations/api/admin-chat-conversations.api";
import { getAdminSupportTicket } from "@/features/support/api/support.api";
import { useCreateAdminSupportTicketForReporter } from "@/features/support/hooks/use-support";
import {
  ADMIN_MODERATION_STATUS_STYLES,
  doesActionRequireReason,
  getAdminModerationErrorKey,
  getAllowedModerationActions,
} from "../lib/admin-moderation-reports";
import {
  useAdminModerationReportDetail,
  useExecuteAdminModerationAction,
} from "../hooks/use-admin-moderation-reports";
import type {
  ModerationCaseActionType,
  ModerationCaseDetail,
  ModerationTargetSnapshot,
} from "../types/admin-moderation-reports.types";

type Props = {
  reportId: string;
};

const OPERATOR_ROLES = new Set([
  "ADMIN",
  "SUPER_ADMIN",
  "SUPPORT_AGENT",
  "CONTENT_REVIEWER",
]);

function formatDateTime(value: string | null, locale: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString(locale === "ar" ? "ar-SA" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: !locale.startsWith("ar"),
  });
}

function translateSnapshotKey(key: string, locale: string): string {
  if (locale !== "ar") {
    return key
      .replace(/_/g, " ")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/\s+/g, " ")
      .trim();
  }

  const normalized = key.replace(/_/g, "").replace(/\s+/g, "").toLowerCase();
  
  const translations: Record<string, string> = {
    tickettype: "نوع التذكرة",
    status: "الحالة",
    priority: "الأولوية",
    subject: "موضوع التذكرة",
    description: "الوصف",
    updatedat: "تاريخ التحديث",
    createdat: "تاريخ الإنشاء",
    category: "القسم",
    rating: "التقييم",
    comment: "التعليق",
    title: "العنوان",
    content: "المحتوى",
    authorid: "معرّف الكاتب",
    senderid: "معرّف المرسل",
    receiverid: "معرّف المستلم",
    message: "الرسالة",
    amount: "المبلغ",
    currency: "العملة",
    paymentmethod: "طريقة الدفع",
    practitionerid: "المعالج",
    patientid: "المريض",
    patientprofileid: "المريض (العميل)",
    practitionerprofileid: "المعالج (الممارس)",
    conversationstatus: "حالة المحادثة",
    participantcount: "عدد المشاركين",
    sessionid: "الجلسة المعنية",
    ratingvalue: "قيمة التقييم",
    reviewstatus: "حالة المراجعة",
    submittedat: "تاريخ التقديم",
    conversationid: "أطراف المحادثة",
    supportticketid: "تذكرة الدعم المرتبطة",
    sentat: "تاريخ الإرسال",
    preview: "نص الرسالة المُبلغ عنها",
    visibility: "حالة الظهور",
    slug: "معرف الرابط الفرعي للعنوان",
  };

  return translations[normalized] || key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}

function translateSnapshotValue(value: string, locale: string): string {
  if (locale !== "ar") return value;

  const normalized = value.trim().toUpperCase();

  const translations: Record<string, string> = {
    PAYMENT: "استفسار مالي / مدفوعات",
    GENERAL: "عام",
    TECHNICAL: "تقني",
    FEEDBACK: "ملاحظات وآراء",
    OPEN: "مفتوح",
    CLOSED: "مغلق",
    RESOLVED: "تم الحل",
    PENDING: "قيد الانتظار",
    ACTIVE: "نشط",
    INACTIVE: "غير نشط",
    HIGH: "عالية جداً",
    NORMAL: "عادية",
    LOW: "منخفضة",
    URGENT: "عاجل",
    PATIENT: "عميل",
    PRACTITIONER: "ممارس",
    ADMIN: "مسؤول",
    PUBLISHED: "منشور",
    DRAFT: "مسودة",
    ARCHIVED: "مؤرشف",
    APPROVED: "مقبول/معتمد",
    REJECTED: "مرفوض",
    PENDING_REVIEW: "قيد المراجعة",
    TRUE: "نعم",
    FALSE: "لا",
    EGP: "جنيه مصري",
    USD: "دولار أمريكي",
  };

  return translations[normalized] || value;
}

function formatSnapshotValue(value: unknown, locale: string): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "string") {
    const isIsoDate = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value);
    if (isIsoDate) {
      return formatDateTime(value, locale);
    }
    return translateSnapshotValue(value, locale);
  }
  if (typeof value === "number") return Number.isNaN(value) ? "-" : String(value);
  if (typeof value === "boolean") return value ? (locale === "ar" ? "نعم" : "true") : (locale === "ar" ? "لا" : "false");
  if (Array.isArray(value)) {
    return value.length 
      ? value.map((v) => formatSnapshotValue(v, locale)).join(", ") 
      : "-";
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "-";
    }
  }
  return String(value);
}

function DetailRow({
  label,
  value,
  mono = false,
  ltr = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  ltr?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border-light py-3 last:border-b-0 dark:border-white/8">
      <span className="text-xs font-medium text-text-muted">{label}</span>
      <span
        className={cn(
          "text-sm text-text-primary dark:text-white/90",
          mono && "font-mono text-xs sm:text-sm"
        )}
        dir={ltr ? "ltr" : undefined}
      >
        {value}
      </span>
    </div>
  );
}

function PatientProfileName({ profileId }: { profileId: string }) {
  const patientQuery = useQuery({
    queryKey: ["adminModeration", "patientNameLookup", profileId],
    enabled: !!profileId,
    queryFn: async () => {
      const data = await listAdminPatients({
        search: profileId,
        page: 1,
        limit: 5,
      });
      const match = data.items.find((p) => p.id === profileId);
      return match ? { displayName: match.displayName, email: match.primaryEmail } : null;
    },
    staleTime: 5 * 60_000,
  });

  if (patientQuery.isLoading) return <span className="text-text-muted">جاري التحميل...</span>;
  if (!patientQuery.data) return <span className="font-mono text-xs text-text-secondary">{profileId}</span>;
  
  const { displayName, email } = patientQuery.data;
  return (
    <span className="inline-flex flex-col items-end">
      <span className="font-semibold text-text-primary dark:text-white">{displayName ?? "غير معروف"}</span>
      {email && <span className="text-xs text-text-muted">{email}</span>}
    </span>
  );
}

function PractitionerProfileName({ profileId }: { profileId: string }) {
  const practitionerQuery = useQuery({
    queryKey: ["adminModeration", "practitionerNameLookup", profileId],
    enabled: !!profileId,
    queryFn: async () => {
      const data = await listAdminPractitioners({
        search: profileId,
        page: 1,
        limit: 5,
      });
      const match = data.items.find((p) => p.id === profileId);
      return match ? { displayName: match.displayName, email: match.email } : null;
    },
    staleTime: 5 * 60_000,
  });

  if (practitionerQuery.isLoading) return <span className="text-text-muted">جاري التحميل...</span>;
  if (!practitionerQuery.data) return <span className="font-mono text-xs text-text-secondary">{profileId}</span>;

  const { displayName, email } = practitionerQuery.data;
  return (
    <span className="inline-flex flex-col items-end">
      <span className="font-semibold text-text-primary dark:text-white">{displayName ?? "غير معروف"}</span>
      {email && <span className="text-xs text-text-muted">{email}</span>}
    </span>
  );
}

function SessionParticipantsLookup({ sessionId }: { sessionId: string }) {
  const sessionQuery = useQuery({
    queryKey: ["adminModeration", "sessionParticipantsLookup", sessionId],
    enabled: !!sessionId,
    queryFn: async () => {
      const data = await getAdminSessionAttendance(sessionId);
      return data.participants ?? null;
    },
    staleTime: 5 * 60_000,
  });

  if (sessionQuery.isLoading) return <span className="text-text-muted">جاري التحميل...</span>;
  if (!sessionQuery.data) return <span className="font-mono text-xs text-text-secondary">{sessionId}</span>;

  const { patient, practitioner } = sessionQuery.data;

  return (
    <span className="inline-flex flex-col items-end gap-1 text-right">
      <span className="text-xs text-text-muted">
        المريض: <span className="font-semibold text-text-primary dark:text-white">{patient?.displayName ?? "غير معروف"}</span>
      </span>
      <span className="text-xs text-text-muted">
        المعالج: <span className="font-semibold text-text-primary dark:text-white">{practitioner?.displayName ?? "غير معروف"}</span>
      </span>
    </span>
  );
}

function ConversationParticipantsLookup({ conversationId }: { conversationId: string }) {
  const conversationQuery = useQuery({
    queryKey: ["adminModeration", "conversationParticipantsLookup", conversationId],
    enabled: !!conversationId,
    queryFn: async () => {
      const data = await getAdminChatConversation(conversationId);
      return data.item;
    },
    staleTime: 5 * 60_000,
  });

  if (conversationQuery.isLoading) return <span className="text-text-muted">جاري التحميل...</span>;
  if (!conversationQuery.data) return <span className="font-mono text-xs text-text-secondary">{conversationId}</span>;

  const { patient, practitioner } = conversationQuery.data;

  return (
    <span className="inline-flex flex-col items-end gap-1 text-right">
      <span className="text-xs text-text-muted">
        المريض: <span className="font-semibold text-text-primary dark:text-white">{patient?.displayName ?? "غير معروف"}</span>
      </span>
      <span className="text-xs text-text-muted">
        المعالج: <span className="font-semibold text-text-primary dark:text-white">{practitioner?.displayName ?? "غير معروف"}</span>
      </span>
    </span>
  );
}

function SummaryCard({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <SurfaceCard variant="section" className="rounded-[28px] p-5 sm:p-6">
      <h2 className="text-base font-semibold text-text-primary dark:text-white/95">{title}</h2>
      {note ? <p className="mt-1 text-sm leading-6 text-text-secondary">{note}</p> : null}
      <div className="mt-4">{children}</div>
    </SurfaceCard>
  );
}

function ReporterQuickActions({
  displayName,
  email,
  phone,
  patientProfileId,
  practitionerProfileId,
}: {
  displayName: string | null;
  email: string | null;
  phone: string | null;
  patientProfileId: string | null;
  practitionerProfileId: string | null;
}) {
  const locale = useLocale();
  const primaryHref = patientProfileId
    ? `/admin/patients/${patientProfileId}`
    : practitionerProfileId
      ? `/admin/practitioners/${practitionerProfileId}`
      : null;

  const actionClassName =
    "inline-flex items-center gap-2 rounded-2xl border border-border-light bg-white px-4 py-2 text-sm font-semibold text-text-primary shadow-[0_10px_20px_-16px_rgba(34,52,56,0.08)] transition hover:border-primary/30 hover:bg-brand-25 dark:border-white/8 dark:bg-white/5 dark:text-white/90 dark:hover:bg-white/8";

  return (
    <div className="mt-3 flex flex-wrap gap-2 items-center">
      {primaryHref ? (
        <Link href={primaryHref as never} className={actionClassName}>
          <UserRound className="h-4 w-4 text-primary" />
          {displayName || "Profile"}
        </Link>
      ) : null}

      {email ? (
        <a href={`mailto:${email}`} className={cn(actionClassName, "dir-ltr")} dir="ltr">
          <Mail className="h-4 w-4 text-primary" />
          {email}
        </a>
      ) : null}

      {phone ? (
        <a href={`tel:${phone}`} className={cn(actionClassName, "dir-ltr")} dir="ltr">
          <Phone className="h-4 w-4 text-primary" />
          {phone}
        </a>
      ) : null}
    </div>
  );
}

function TargetQuickActions({
  onOpenSupport,
  isOpeningSupport,
  t,
}: {
  onOpenSupport: () => Promise<void>;
  isOpeningSupport: boolean;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => {
          void onOpenSupport();
        }}
        disabled={isOpeningSupport}
        className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_22px_-16px_rgba(68,161,148,0.38)] transition hover:bg-primary-hover"
      >
        {isOpeningSupport ? t("actions.submitting") : t("detail.actions.openSupportChat")}
      </button>
    </div>
  );
}

function resolveSupportHref(item: ModerationCaseDetail | undefined) {
  if (!item) return "/admin/messages?lane=support";

  if (item.targetType === "SUPPORT_TICKET") {
    return `/admin/messages?lane=support&id=${item.targetId}`;
  }

  if (item.targetType === "SUPPORT_MESSAGE") {
    const ticketId = item.targetSnapshot?.context?.supportTicketId;
    if (typeof ticketId === "string" && ticketId.trim().length > 0) {
      return `/admin/messages?lane=support&id=${ticketId}`;
    }
  }

  if (item.reporterUserId) {
    return `/admin/messages?lane=support&reporterUserId=${encodeURIComponent(item.reporterUserId)}`;
  }

  return "/admin/messages?lane=support";
}

function resolveDirectSupportTicketId(item: ModerationCaseDetail | undefined) {
  if (!item) return null;
  if (item.targetType === "SUPPORT_TICKET") return item.targetId;

  if (item.targetType === "SUPPORT_MESSAGE") {
    const ticketId = item.targetSnapshot?.context?.supportTicketId;
    if (typeof ticketId === "string" && ticketId.trim().length > 0) {
      return ticketId;
    }
  }

  return null;
}

function useResolvedReporter(item: ModerationCaseDetail | undefined) {
  const backendReporter = item?.reporter ?? null;
  const hasBackendIdentity =
    Boolean(backendReporter?.displayName) ||
    Boolean(backendReporter?.email) ||
    Boolean(backendReporter?.phone) ||
    Boolean(backendReporter?.patientProfileId) ||
    Boolean(backendReporter?.practitionerProfileId);
  const shouldFallback =
    Boolean(item) &&
    (!backendReporter || !hasBackendIdentity) &&
    item?.reporterRole === "PATIENT" &&
    Boolean(item?.reporterUserId);

  const fallbackQuery = useQuery({
    queryKey: ["adminModeration", "reporterFallbackPatient", item?.reporterUserId ?? ""],
    enabled: shouldFallback,
    queryFn: async () => {
      const reporterUserId = item?.reporterUserId;
      if (!reporterUserId) return null;
      const data = await listAdminPatients({
        search: reporterUserId,
        page: 1,
        limit: 10,
      });
      const match = data.items.find((candidate) => candidate.userId === reporterUserId);
      if (!match) return null;

      return {
        userId: match.userId,
        displayName: match.displayName,
        email: match.primaryEmail,
        phone: match.primaryPhone,
        patientProfileId: match.id,
        practitionerProfileId: null,
      } satisfies NonNullable<ModerationCaseDetail["reporter"]>;
    },
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  });

  return {
    reporter: hasBackendIdentity ? backendReporter : fallbackQuery.data ?? backendReporter ?? null,
    isLoadingFallback: shouldFallback && fallbackQuery.isFetching,
    fallbackError: fallbackQuery.error ? toAppError(fallbackQuery.error) : null,
    shouldFallback,
    hasBackendIdentity,
    backendReporter,
  };
}

function SummaryStatusCard({
  label,
  title,
  description,
  icon,
  tone = "neutral",
}: {
  label: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  tone?: "neutral" | "brand" | "primary" | "success" | "warning";
}) {
  const locale = useLocale();
  const toneClasses = {
    neutral: "border-border-light bg-surface-secondary text-text-primary dark:border-white/8 dark:bg-white/5",
    brand: "border-primary/20 bg-primary-light/50 text-text-brand dark:border-primary/30 dark:bg-primary/10",
    primary: "border-primary/20 bg-primary-light/50 text-text-brand dark:border-primary/30 dark:bg-primary/10",
    success: "border-success-500/25 bg-success-50/70 text-success-700 dark:border-success-500/20 dark:bg-success-950/20 dark:text-success-300",
    warning: "border-status-warning-border/30 bg-status-warning-soft/70 text-status-warning dark:border-warning-500/20 dark:bg-warning-950/20",
  };

  const iconClasses = {
    neutral: "bg-gray-100 text-text-muted dark:bg-white/10",
    brand: "bg-primary-light text-text-brand dark:bg-primary/20",
    primary: "bg-primary-light text-text-brand dark:bg-primary/20",
    success: "bg-success-50 text-success-700 dark:bg-success-900/30 dark:text-success-300",
    warning: "bg-status-warning-soft text-status-warning dark:bg-warning-800/25",
  };

  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl border p-5 transition-all duration-200",
      toneClasses[tone]
    )}>
      <div className="flex items-start gap-4">
        <div className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
          iconClasses[tone]
        )}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn(
            "text-[11px] font-bold uppercase text-text-muted",
            locale === "ar" ? "" : "tracking-[0.15em]"
          )}>
            {label}
          </p>
          <p className="mt-1.5 text-base font-bold text-text-primary dark:text-white">
            {title}
          </p>
          <p className="mt-1 text-xs leading-5 text-text-secondary">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

function SnapshotPanel({
  snapshot,
  t,
}: {
  snapshot: ModerationTargetSnapshot | null;
  t: ReturnType<typeof useTranslations>;
}) {
  const locale = useLocale();

  if (!snapshot) {
    return (
      <StateCard
        title={t("detail.snapshot.emptyHeading")}
        note={t("detail.snapshot.emptyNote")}
      />
    );
  }

  const entries = Object.entries(snapshot.context ?? {});
  if (entries.length === 0) {
    return (
      <StateCard
        title={t("detail.snapshot.emptyHeading")}
        note={t("detail.snapshot.emptyNote")}
      />
    );
  }

  return (
    <div className="rounded-[24px] border border-border-light px-4 dark:border-white/8">
      {entries.map(([key, value]) => {
        if (value === null || value === undefined) return null;

        // Custom render for patientProfileId
        if (key === "patientProfileId" && typeof value === "string") {
          return (
            <DetailRow
              key={key}
              label={translateSnapshotKey(key, locale)}
              value={<PatientProfileName profileId={value} />}
            />
          );
        }

        // Custom render for practitionerProfileId
        if (key === "practitionerProfileId" && typeof value === "string") {
          return (
            <DetailRow
              key={key}
              label={translateSnapshotKey(key, locale)}
              value={<PractitionerProfileName profileId={value} />}
            />
          );
        }

        // Custom render for sessionId (reviews)
        if (key === "sessionId" && typeof value === "string") {
          return (
            <DetailRow
              key={key}
              label={translateSnapshotKey(key, locale)}
              value={<SessionParticipantsLookup sessionId={value} />}
            />
          );
        }

        // Custom render for conversationId (messages)
        if (key === "conversationId" && typeof value === "string") {
          return (
            <DetailRow
              key={key}
              label={translateSnapshotKey(key, locale)}
              value={<ConversationParticipantsLookup conversationId={value} />}
            />
          );
        }

        const formatted = formatSnapshotValue(value, locale);
        const isLtrValue = typeof value === "string" && (
          /^\d+$/.test(value) || 
          value.includes("@") || 
          /^\d{4}-\d{2}-\d{2}/.test(value)
        );

        return (
          <DetailRow
            key={key}
            label={translateSnapshotKey(key, locale)}
            value={formatted}
            ltr={isLtrValue}
          />
        );
      })}
    </div>
  );
}

function getAllowedActions(item: ModerationCaseDetail, role?: string | null) {
  return getAllowedModerationActions({
    status: item.status,
    targetType: item.targetType,
    role,
  });
}

function getModerationCaseState(item: ModerationCaseDetail) {
  switch (item.status) {
    case "OPEN":
      return "open" as const;
    case "UNDER_REVIEW":
      return "review" as const;
    case "READY_FOR_ENFORCEMENT":
      return "enforcement" as const;
    case "RESOLVED":
      return "resolved" as const;
    case "DISMISSED":
      return "dismissed" as const;
  }
}

function getModerationTargetState(item: ModerationCaseDetail) {
  return item.targetSnapshot ? ("snapshotPresent" as const) : ("snapshotMissing" as const);
}

function getModerationActionPosture(input: {
  canOperate: boolean;
  availableActions: ModerationCaseActionType[];
}) {
  if (!input.canOperate) return "inspectionOnly" as const;
  if (input.availableActions.length > 0) return "limitedActions" as const;
  return "noActions" as const;
}

function OperationalSnapshot({
  item,
  canOperate,
  availableActions,
  t,
}: {
  item: ModerationCaseDetail;
  canOperate: boolean;
  availableActions: ModerationCaseActionType[];
  t: ReturnType<typeof useTranslations>;
}) {
  const caseState = getModerationCaseState(item);
  const targetState = getModerationTargetState(item);
  const actionPosture = getModerationActionPosture({ canOperate, availableActions });

  const caseTone =
    caseState === "resolved"
      ? "success"
      : caseState === "enforcement"
        ? "brand"
        : caseState === "review"
          ? "primary"
          : caseState === "open"
            ? "warning"
            : "neutral";
  const targetTone = targetState === "snapshotPresent" ? "brand" : "warning";
  const actionTone =
    actionPosture === "limitedActions"
      ? "primary"
      : actionPosture === "inspectionOnly"
        ? "neutral"
        : "warning";

  const caseIcons = {
    open: <ShieldAlert className="h-5 w-5" />,
    review: <Activity className="h-5 w-5" />,
    enforcement: <Gavel className="h-5 w-5" />,
    resolved: <CheckCircle2 className="h-5 w-5" />,
    dismissed: <XCircle className="h-5 w-5" />,
  };

  const targetIcons = {
    snapshotPresent: <Database className="h-5 w-5" />,
    snapshotMissing: <AlertCircle className="h-5 w-5" />,
  };

  const actionIcons = {
    limitedActions: <UserCheck className="h-5 w-5" />,
    noActions: <Eye className="h-5 w-5" />,
    inspectionOnly: <Lock className="h-5 w-5" />,
  };

  return (
    <SurfaceCard variant="section" className="rounded-[28px] p-5 sm:p-6">
      <h2 className="text-base font-semibold text-text-primary dark:text-white/95">
        {t("detail.sections.snapshotSummary")}
      </h2>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <SummaryStatusCard
          label={t("detail.snapshotCards.caseState.label")}
          title={t(`detail.snapshotCards.caseState.states.${caseState}.title` as Parameters<typeof t>[0])}
          description={t(`detail.snapshotCards.caseState.states.${caseState}.note` as Parameters<typeof t>[0])}
          icon={caseIcons[caseState]}
          tone={caseTone}
        />
        <SummaryStatusCard
          label={t("detail.snapshotCards.targetContext.label")}
          title={t(`detail.snapshotCards.targetContext.states.${targetState}.title` as Parameters<typeof t>[0])}
          description={t(`detail.snapshotCards.targetContext.states.${targetState}.note` as Parameters<typeof t>[0])}
          icon={targetIcons[targetState]}
          tone={targetTone}
        />
        <SummaryStatusCard
          label={t("detail.snapshotCards.actionPosture.label")}
          title={t(`detail.snapshotCards.actionPosture.states.${actionPosture}.title` as Parameters<typeof t>[0])}
          description={t(`detail.snapshotCards.actionPosture.states.${actionPosture}.note` as Parameters<typeof t>[0])}
          icon={actionIcons[actionPosture]}
          tone={actionTone}
        />
      </div>
    </SurfaceCard>
  );
}

export default function AdminModerationReportDetailScreen({ reportId }: Props) {
  const t = useTranslations("admin-moderation-reports");
  const locale = useLocale();
  const router = useRouter();
  const { user } = useAuthState();
  const canOperate = user?.role ? OPERATOR_ROLES.has(user.role) : false;
  const createOutreachTicket = useCreateAdminSupportTicketForReporter();

  const reportQuery = useAdminModerationReportDetail(reportId);
  const executeAction = useExecuteAdminModerationAction();

  const [selectedAction, setSelectedAction] = useState<ModerationCaseActionType | "">("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(
    null,
  );

  const item = reportQuery.data?.item;
  const resolvedReporter = useResolvedReporter(item);

  const supportHref = useMemo(() => resolveSupportHref(item), [item]);
  const directSupportTicketId = useMemo(() => resolveDirectSupportTicketId(item), [item]);

  const availableActions = useMemo(() => {
    if (!item) return [];
    return getAllowedActions(item, user?.role ?? null);
  }, [item, user?.role]);

  const handleOpenSupport = async () => {
    if (!item) return;

    if (directSupportTicketId) {
      try {
        await getAdminSupportTicket(directSupportTicketId);
        router.push(`/admin/messages?lane=support&id=${directSupportTicketId}` as never);
        return;
      } catch {
        // If the referenced ticket is missing or inaccessible, fallback to creating a fresh outreach thread.
      }
    }

    if (
      item.reporterUserId &&
      (item.reporterRole === "PATIENT" || item.reporterRole === "PRACTITIONER")
    ) {
      try {
        const created = await createOutreachTicket.mutateAsync({
          reporterUserId: item.reporterUserId,
          reporterRole: item.reporterRole,
          category: "GENERAL",
          subject: "متابعة من فريق الدعم بخصوص البلاغ",
          description: "مرحبًا، نحتاج بعض التفاصيل الإضافية لمتابعة البلاغ وحل المشكلة بأسرع وقت.",
          priority: "NORMAL",
        });
        router.push(`/admin/messages?lane=support&id=${created.item.id}` as never);
        return;
      } catch {
        router.push("/admin/messages?lane=support" as never);
        return;
      }
    }

    router.push("/admin/messages?lane=support" as never);
  };

  const reasonRequired = selectedAction ? doesActionRequireReason(selectedAction) : false;

  const handleActionSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!item) return;
    setFeedback(null);

    if (!selectedAction) {
      setFeedback({ tone: "error", message: t("actions.validation.select") });
      return;
    }

    if (reasonRequired && !reason.trim()) {
      setFeedback({ tone: "error", message: t("actions.validation.reasonRequired") });
      return;
    }

    try {
      await executeAction.mutateAsync({
        reportId: item.id,
        payload: {
          action: selectedAction,
          reason: reason.trim() || undefined,
          note: note.trim() || undefined,
        },
      });
      setFeedback({ tone: "success", message: t("actions.success") });
      setReason("");
      setNote("");
      setSelectedAction("");
    } catch (error) {
      setFeedback({
        tone: "error",
        message: t(getAdminModerationErrorKey(error) as Parameters<typeof t>[0]),
      });
    }
  };

  if (reportQuery.isLoading) {
    return (
      <div className="space-y-5">
        <SurfaceCard variant="section" className="rounded-[28px] p-5 sm:p-6">
          <ListStateSkeleton items={1} heightClass="h-28" />
        </SurfaceCard>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(360px,0.9fr)]">
          <div className="space-y-5">
            <ListStateSkeleton items={3} heightClass="h-52" />
          </div>
          <div className="space-y-5">
            <ListStateSkeleton items={3} heightClass="h-48" />
          </div>
        </div>
      </div>
    );
  }

  if (reportQuery.isError || !item) {
    const error = reportQuery.error ? toAppError(reportQuery.error) : null;
    const isNotFound =
      error?.statusCode === 404 ||
      error?.code === "MODERATION_REPORT_NOT_FOUND_IN_SCOPE" ||
      error?.code === "MODERATION_CASE_NOT_FOUND";

    return (
      <div className="mx-auto max-w-2xl">
        <StateCard
          icon={<ShieldX className="h-8 w-8 text-text-muted" />}
          title={
            isNotFound
              ? t("states.notFound.heading")
              : t("states.detailError.heading")
          }
          note={
            isNotFound ? t("states.notFound.note") : t("states.detailError.note")
          }
          action={{
            label: t("states.detailError.back"),
            href: (
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                {!isNotFound ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => reportQuery.refetch()}
                  >
                    {t("states.detailError.retry")}
                  </Button>
                ) : null}
                <Link
                  href="/admin/moderation/reports"
                  className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover"
                >
                  {t("states.detailError.back")}
                </Link>
              </div>
            ),
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <SurfaceCard variant="section" className="rounded-[28px] p-5 sm:p-6">
        <ActionIconLink
          href="/admin/moderation/reports"
          intent="view"
          label={t("detail.back")}
          icon={<DirectionalArrowIcon direction="back" className="h-4 w-4" />}
          className="mb-3"
        />

        <p className={cn(
          "mb-2 text-xs font-semibold uppercase text-primary",
          locale === "ar" ? "" : "tracking-[0.18em]"
        )}>
          {t("detail.eyebrow")}
        </p>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary dark:text-white/95 sm:text-3xl">
              {t("detail.title")}
            </h1>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${ADMIN_MODERATION_STATUS_STYLES[item.status]}`}
          >
            {t(`statuses.${item.status}` as Parameters<typeof t>[0])}
          </span>
        </div>
      </SurfaceCard>

      {feedback ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            feedback.tone === "success"
              ? "border-green-200 bg-green-50 text-green-800 dark:border-green-700/30 dark:bg-green-900/10 dark:text-green-300"
              : "border-red-200 bg-red-50 text-red-700 dark:border-red-700/30 dark:bg-red-900/10 dark:text-red-300"
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      <OperationalSnapshot
        item={item}
        canOperate={canOperate}
        availableActions={availableActions}
        t={t}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(360px,0.9fr)]">
        <div className="space-y-5">
          <SummaryCard title={t("detail.sections.case")}>
            <div className="rounded-[24px] border border-border-light px-4 dark:border-white/8">
              <DetailRow
                label={t("detail.fields.status")}
                value={t(`statuses.${item.status}` as Parameters<typeof t>[0])}
              />
              <DetailRow
                label={t("detail.fields.targetType")}
                value={t(`targetTypes.${item.targetType}` as Parameters<typeof t>[0])}
              />
              <DetailRow
                label={t("detail.fields.reason")}
                value={t(`reasons.${item.reason}` as Parameters<typeof t>[0])}
              />
              <DetailRow
                label={t("detail.fields.createdAt")}
                value={formatDateTime(item.createdAt, locale)}
              />
              <DetailRow
                label={t("detail.fields.lastActionAt")}
                value={formatDateTime(item.lastActionAt, locale)}
              />
            </div>
          </SummaryCard>

          <SummaryCard title={t("detail.sections.reporter")}>
            <div className="rounded-[24px] border border-border-light px-4 dark:border-white/8">
              <DetailRow
                label={t("detail.fields.reporterRole")}
                value={t(
                  `reporterRoles.${item.reporterRole}` as Parameters<typeof t>[0],
                )}
              />
              <DetailRow
                label={t("detail.fields.reporterName")}
                value={resolvedReporter.reporter?.displayName ?? "-"}
              />
              <DetailRow
                label={t("detail.fields.reporterEmail")}
                value={resolvedReporter.reporter?.email ?? "-"}
              />
              <DetailRow
                label={t("detail.fields.reporterPhone")}
                value={resolvedReporter.reporter?.phone ?? "-"}
                ltr={!!resolvedReporter.reporter?.phone}
              />
              <DetailRow
                label={t("detail.fields.note")}
                value={item.note ?? t("detail.fields.noNote")}
              />
            </div>

            {resolvedReporter.isLoadingFallback ? (
              <p className="mt-3 text-xs text-text-muted">{t("list.countLoading")}</p>
            ) : null}

            {resolvedReporter.reporter ? (
              <ReporterQuickActions
                displayName={resolvedReporter.reporter.displayName}
                email={resolvedReporter.reporter.email}
                phone={resolvedReporter.reporter.phone}
                patientProfileId={resolvedReporter.reporter.patientProfileId}
                practitionerProfileId={resolvedReporter.reporter.practitionerProfileId}
              />
            ) : null}

            <TargetQuickActions
              onOpenSupport={handleOpenSupport}
              isOpeningSupport={createOutreachTicket.isPending}
              t={t}
            />
          </SummaryCard>

          <SummaryCard title={t("detail.sections.snapshot")}>
            <SnapshotPanel snapshot={item.targetSnapshot} t={t} />
          </SummaryCard>
        </div>

        <div className="space-y-5">
          <SummaryCard title={t("detail.sections.actions")}>
            {canOperate ? (
              availableActions.length > 0 ? (
                <form onSubmit={handleActionSubmit} className="space-y-4">
                  <label className="block">
                    <span className={cn(
                      "mb-2 block text-xs font-semibold uppercase text-text-muted",
                      locale === "ar" ? "" : "tracking-[0.18em]"
                    )}>
                      {t("actions.fields.action")}
                    </span>
                    <select
                      value={selectedAction}
                      onChange={(event) =>
                        setSelectedAction(
                          event.target.value as ModerationCaseActionType | "",
                        )
                      }
                      className="w-full rounded-xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:ring-2 focus:ring-primary/20 focus:border-primary dark:border-white/8 dark:bg-white/5 dark:text-white"
                    >
                      <option value="">{t("actions.placeholders.selectAction")}</option>
                      {availableActions.map((action) => (
                        <option key={action} value={action}>
                          {t(`actions.options.${action}` as Parameters<typeof t>[0])}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className={cn(
                      "mb-2 block text-xs font-semibold uppercase text-text-muted",
                      locale === "ar" ? "" : "tracking-[0.18em]"
                    )}>
                      {t("actions.fields.reason")}
                    </span>
                    <input
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      placeholder={
                        reasonRequired
                          ? t("actions.placeholders.reasonRequired")
                          : t("actions.placeholders.reasonOptional")
                      }
                      className="w-full rounded-xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:ring-2 focus:ring-primary/20 focus:border-primary dark:border-white/8 dark:bg-white/5 dark:text-white"
                    />
                    {reasonRequired ? (
                      <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                        {t("actions.reasonRequiredNote")}
                      </p>
                    ) : null}
                  </label>

                  <label className="block">
                    <span className={cn(
                      "mb-2 block text-xs font-semibold uppercase text-text-muted",
                      locale === "ar" ? "" : "tracking-[0.18em]"
                    )}>
                      {t("actions.fields.note")}
                    </span>
                    <textarea
                      rows={3}
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      placeholder={t("actions.placeholders.note")}
                      className="w-full rounded-xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:ring-2 focus:ring-primary/20 focus:border-primary dark:border-white/8 dark:bg-white/5 dark:text-white"
                    />
                  </label>

                  <Button
                    type="submit"
                    disabled={executeAction.isPending}
                    className="w-full sm:w-auto"
                    startIcon={<ShieldCheck className="h-4 w-4" />}
                  >
                    {executeAction.isPending
                      ? t("actions.submitting")
                      : t("actions.submit")}
                  </Button>
                </form>
              ) : (
                <StateCard
                  title={t("actions.states.noActions.heading")}
                  note={t("actions.states.noActions.note")}
                />
              )
            ) : (
              <StateCard
                title={t("actions.states.notAuthorized.heading")}
                note={t("actions.states.notAuthorized.note")}
              />
            )}
          </SummaryCard>
        </div>
      </div>

      {/* Collapse widget for technical details */}
      <div className="mt-5">
        <details className="group rounded-2xl border border-border-light/60 bg-surface-secondary/30 p-4 transition-all duration-200 dark:border-white/8 dark:bg-white/2">
          <summary className="flex cursor-pointer items-center justify-between font-medium text-text-muted hover:text-text-primary transition-colors">
            <span>{t("detail.sections.technicalDetails" as Parameters<typeof t>[0])}</span>
            <span className="text-xs transition-transform duration-200 group-open:rotate-180">▼</span>
          </summary>
          <div className="mt-3 space-y-2 border-t border-border-light/40 pt-3 text-xs font-mono text-text-secondary">
            <div className="flex justify-between py-1">
              <span>Report ID:</span>
              <span className="select-all">{item.id}</span>
            </div>
            <div className="flex justify-between py-1">
              <span>Target ID:</span>
              <span className="select-all">{item.targetId}</span>
            </div>
            {item.reporterUserId && (
              <div className="flex justify-between py-1">
                <span>Reporter User ID:</span>
                <span className="select-all">{item.reporterUserId}</span>
              </div>
            )}
            {item.targetSnapshot?.kind && (
              <div className="flex justify-between py-1">
                <span>Snapshot Kind:</span>
                <span>{item.targetSnapshot.kind}</span>
              </div>
            )}
          </div>
        </details>
      </div>
    </div>
  );
}
