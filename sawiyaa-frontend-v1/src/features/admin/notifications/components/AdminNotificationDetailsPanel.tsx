"use client";

import React, { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Copy, Check, Info, AlertTriangle, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getNotificationVisualProps, mapNotificationErrorCode } from "../lib/notification-mappers";
import { formatAdminNotificationDateTime, DetailField } from "./admin-notification-utils";
import { getAdminNotificationStatusTone, getDeliveryAttemptTone } from "../lib/admin-notification-status";
import type { AdminNotificationDetailItem } from "../types/admin-notifications.types";

interface AdminNotificationDetailsPanelProps {
  item: AdminNotificationDetailItem;
  isDrawer?: boolean;
}

const TONE_CLASSES: Record<string, string> = {
  message: "bg-teal-50/50 text-teal-700 border border-teal-100 dark:bg-teal-500/5 dark:text-teal-300 dark:border-teal-500/10",
  session: "bg-teal-50/50 text-teal-700 border border-teal-100 dark:bg-teal-500/5 dark:text-teal-300 dark:border-teal-500/10",
  support: "bg-teal-50/50 text-teal-700 border border-teal-100 dark:bg-teal-500/5 dark:text-teal-300 dark:border-teal-500/10",
  payment: "bg-teal-50/50 text-teal-700 border border-teal-100 dark:bg-teal-500/5 dark:text-teal-300 dark:border-teal-500/10",
  system: "bg-gray-50/50 text-gray-700 border border-gray-100 dark:bg-white/5 dark:text-white/70 dark:border-white/10",
  warning: "bg-amber-50/50 text-amber-700 border border-amber-100 dark:bg-amber-500/5 dark:text-amber-300 dark:border-amber-500/10",
  content: "bg-rose-50/50 text-rose-700 border border-rose-100 dark:bg-rose-500/5 dark:text-rose-300 dark:border-rose-500/10",
};

function maskUserId(userId: string, locale: string): string {
  const lastFour = userId.slice(-4);
  return locale === "ar" ? `مستخدم ...${lastFour}` : `User ...${lastFour}`;
}

function sanitizeNotificationDisplayText(text: string | null | undefined, locale: string, t: any): string {
  if (!text) return "";
  const isAr = locale.startsWith("ar");
  
  // Regular expression to match absolute or localhost URLs
  const urlRegex = /https?:\/\/[^\s]+/g;
  
  if (!urlRegex.test(text)) {
    return text;
  }
  
  const cleanText = text.trim();
  // If the whole text is just a URL (or begins/ends with URL with optional spaces/punctuation)
  if (cleanText.replace(/[:.\s]+/g, "").match(/^https?:\/\/[^\s]+$/) || cleanText.match(/^https?:\/\/[^\s]+$/)) {
    return t("notifications.fallback.secureActionAttached");
  }
  
  // Specific template pattern replacements for natural flow
  let replaced = text;
  if (replaced.includes("افتح صفحة الجلسة للانضمام بأمان")) {
    replaced = replaced.replace(/افتح صفحة الجلسة للانضمام بأمان[:\s]*https?:\/\/[^\s]+/g, "يمكن فتح الجلسة بأمان من زر الإجراء المتاح في هذه الصفحة.");
  }
  if (replaced.includes("Open the session page to join securely")) {
    replaced = replaced.replace(/Open the session page to join securely[:\s]*https?:\/\/[^\s]+/g, "Open the session securely using the available action button.");
  }
  
  // Generic fallback for other URLs (replace URL with a natural text phrase)
  replaced = replaced.replace(urlRegex, () => {
    return isAr 
      ? "زر الإجراء المتاح" 
      : "the available action button";
  });
  
  // Clean up double periods or trailing colons
  return replaced.replace(/:\s*$/, ".").replace(/\.\.+/g, ".").trim();
}

function mapSessionStatus(status: string | null | undefined, locale: string): string {
  if (!status) return "—";
  const isAr = locale.startsWith("ar");
  const upperStatus = status.toUpperCase();
  
  switch (upperStatus) {
    case "READY_TO_JOIN":
      return isAr ? "جاهزة للانضمام" : "Ready to Join";
    case "IN_PROGRESS":
      return isAr ? "قيد التنفيذ" : "In Progress";
    case "COMPLETED":
      return isAr ? "مكتملة" : "Completed";
    case "CANCELLED":
      return isAr ? "ملغاة" : "Cancelled";
    case "PENDING":
      return isAr ? "قيد الانتظار" : "Pending";
    default:
      return status;
  }
}

function redactUrlsInTechnical(text: string): string {
  return text.replace(/https?:\/\/[^\s"]+/g, "[redacted-url]");
}

export default function AdminNotificationDetailsPanel({ item, isDrawer = false }: AdminNotificationDetailsPanelProps) {
  const t = useTranslations("admin-notifications");
  const locale = useLocale();
  const isAr = locale.startsWith("ar");
  const [copied, setCopied] = useState(false);
  const [showTechnical, setShowTechnical] = useState(false);

  const visualRaw = getNotificationVisualProps(
    item.typeSlug,
    item.category,
    t,
    "admin",
    locale,
    item.context,
    item.primaryAction,
  );
  
  const visual = {
    ...visualRaw,
    title: sanitizeNotificationDisplayText(visualRaw.title, locale, t),
    subtitle: sanitizeNotificationDisplayText(visualRaw.subtitle, locale, t),
    contextLine: sanitizeNotificationDisplayText(visualRaw.contextLine, locale, t),
  };

  const toneClass = TONE_CLASSES[visual.tone] || TONE_CLASSES.system;

  const handleCopyJson = async () => {
    try {
      const jsonStr = redactUrlsInTechnical(JSON.stringify(item, null, 2));
      await navigator.clipboard.writeText(jsonStr);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy diagnostic JSON", err);
    }
  };

  const latestErrorCode = item.attempts.find(a => a.errorCode)?.errorCode;
  const friendlyError = mapNotificationErrorCode(latestErrorCode, t);

  // Determine target link for primary action buttons
  let actionHref: string | null = null;
  if (item.primaryAction) {
    if (item.primaryAction.kind === "session") {
      actionHref = "/admin/sessions";
    } else if (item.primaryAction.kind === "messages") {
      const lane = item.primaryAction.lane || "session";
      actionHref = item.primaryAction.id
        ? `/admin/messages?lane=${lane}&id=${item.primaryAction.id}`
        : `/admin/messages?lane=${lane}`;
    } else if (item.primaryAction.kind === "support") {
      actionHref = item.primaryAction.id
        ? `/admin/messages?lane=support&id=${item.primaryAction.id}`
        : "/admin/messages?lane=support";
    }
  }

  // Render context helper
  const renderContextField = (label: string, value: React.ReactNode) => {
    if (!value) return null;
    return (
      <div className="bg-surface-secondary/50 dark:bg-white/5 px-3 py-2 rounded-xl border border-border-light/20">
        <span className="text-text-muted block text-[10px] uppercase font-bold tracking-wider mb-0.5">{label}</span>
        <span className="font-semibold text-text-primary dark:text-white/90">{value}</span>
      </div>
    );
  };

  // Helper for delivery status card
  const renderDeliveryStatusCard = () => {
    if (item.status === "FAILED") {
      return (
        <div className="bg-rose-50/60 border border-rose-100 dark:bg-rose-500/5 dark:border-rose-500/10 rounded-2xl p-4 flex items-start gap-3 text-xs text-rose-800 dark:text-rose-300">
          <AlertTriangle className="mt-0.5 h-4.5 w-4.5 shrink-0 text-rose-600 dark:text-rose-400" />
          <div className="flex-1 min-w-0">
            <span className="font-bold block mb-1">
              {t("notifications.detail.failedDelivery")}
            </span>
            <span className="text-rose-700 dark:text-rose-400 font-medium">
              {friendlyError || t("notifications.errors.fallback")}
            </span>
          </div>
        </div>
      );
    }
    if (item.status === "QUEUED" || item.status === "PENDING") {
      return (
        <div className="bg-amber-50/60 border border-amber-100 dark:bg-amber-500/5 dark:border-amber-500/10 rounded-2xl p-4 flex items-start gap-3 text-xs text-amber-800 dark:text-amber-300 font-medium">
          <Info className="mt-0.5 h-4.5 w-4.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="flex-1 min-w-0">
            <span className="font-bold block mb-1">
              {isAr ? "قيد الجدولة والانتظار" : "Scheduled / Queued for Delivery"}
            </span>
            <span className="text-amber-700 dark:text-amber-400">
              {isAr 
                ? "الإشعار في قائمة الجدولة وسيتم إرساله في الوقت المحدد."
                : "The notification is queued and will be sent at the scheduled time."}
            </span>
          </div>
        </div>
      );
    }
    if (item.status === "SENT" || item.status === "DELIVERED" || item.status === "READ") {
      return (
        <div className="bg-teal-50/60 border border-teal-100 dark:bg-teal-500/5 dark:border-teal-500/10 rounded-2xl p-4 flex items-start gap-3 text-xs text-teal-800 dark:text-teal-300 font-medium font-semibold">
          <Check className="mt-0.5 h-4.5 w-4.5 shrink-0 text-teal-600 dark:text-teal-400" />
          <div className="flex-1 min-w-0">
            <span className="font-bold block mb-1">
              {isAr ? "تم إرسال الإشعار بنجاح" : "Notification Delivered Successfully"}
            </span>
            <span className="text-teal-700 dark:text-teal-400">
              {isAr 
                ? "تم تسليم الإشعار بنجاح إلى جهاز المستلم."
                : "The notification was successfully sent and delivered to the recipient."}
            </span>
          </div>
        </div>
      );
    }
    // Fallback or cancelled/suppressed
    return (
      <div className="bg-gray-50 border border-gray-200 dark:bg-white/5 dark:border-white/10 rounded-2xl p-4 flex items-start gap-3 text-xs text-text-secondary">
        <Info className="mt-0.5 h-4.5 w-4.5 shrink-0 text-text-muted" />
        <div className="flex-1 min-w-0 font-medium">
          <span className="font-bold block mb-1">
            {isAr ? "حالة الإشعار" : "Notification Status"}
          </span>
          <span>
            {item.suppressedReason 
              ? `${t("notifications.list.suppressedReason", { reason: item.suppressedReason })}`
              : (isAr ? `الحالة: ${item.status}` : `Status: ${item.status}`)}
          </span>
        </div>
      </div>
    );
  };

  // Main UI Blocks
  const summaryCard = (
    <article className="bg-surface-primary rounded-2xl border border-border-light/60 p-4 dark:bg-white/5 dark:border-white/5 shadow-sm space-y-3.5">
      <div className="flex items-start gap-3">
        <div className={`p-2.5 rounded-xl shrink-0 ${toneClass}`}>
          {visual.icon}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-text-primary dark:text-white/95 leading-tight">
            {visual.title}
          </h2>
          <p className="mt-1 text-xs font-semibold text-text-secondary leading-normal">
            {visual.contextLine || visual.subtitle}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pt-2 border-t border-border-light/40 dark:border-white/5">
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold ${getAdminNotificationStatusTone(item.status)}`}>
          {t(`notifications.statuses.${item.status}` as Parameters<typeof t>[0])}
        </span>
        <span className="inline-flex items-center rounded-full bg-surface-secondary dark:bg-white/10 px-2.5 py-0.5 text-[10px] font-bold text-text-secondary dark:text-white/80">
          {t(`notifications.channels.${item.channel}` as Parameters<typeof t>[0])}
        </span>
        <span className="inline-flex items-center rounded-full bg-surface-secondary dark:bg-white/10 px-2.5 py-0.5 text-[10px] font-bold text-text-secondary dark:text-white/80">
          {t(`notifications.categories.${item.category}` as Parameters<typeof t>[0])}
        </span>
        <span className="inline-flex items-center rounded-full bg-surface-secondary dark:bg-white/10 px-2.5 py-0.5 text-[10px] font-bold text-text-secondary dark:text-white/80">
          {item.context?.recipientName 
            ? `${item.context.recipientName} (${item.context.recipientRole || "USER"})`
            : maskUserId(item.userId, locale)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[10px] text-text-muted pt-2 border-t border-border-light/40 dark:border-white/5">
        <div>
          <span className="font-semibold block">{isAr ? "تاريخ الإنشاء" : "Created At"}</span>
          <span className="font-mono text-text-secondary dark:text-white/70 block mt-0.5">
            {formatAdminNotificationDateTime(item.createdAt, locale)}
          </span>
        </div>
        <div>
          <span className="font-semibold block">
            {item.scheduledFor ? t("notifications.fields.scheduledFor") : (isAr ? "آخر تحديث" : "Last Updated")}
          </span>
          <span className="font-mono text-text-secondary dark:text-white/70 block mt-0.5">
            {formatAdminNotificationDateTime(item.scheduledFor || item.updatedAt, locale)}
          </span>
        </div>
      </div>
    </article>
  );

  const relatedContextCard = item.context && (item.context.patientName || item.context.practitionerName || item.context.supportTicketSubject || item.context.senderName) ? (
    <section className="bg-surface-primary rounded-2xl border border-border-light/60 p-4 dark:bg-white/5 dark:border-white/5 shadow-sm space-y-3.5">
      <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
        {t("notifications.detail.relatedContext")}
      </h3>

      <div className="grid gap-3 sm:grid-cols-2 text-xs">
        {renderContextField(isAr ? "المريض" : "Patient", item.context.patientName)}
        {renderContextField(isAr ? "المختص" : "Practitioner", item.context.practitionerName)}
        {renderContextField(isAr ? "موعد الجلسة" : "Session Time", item.context.sessionStartAt ? formatAdminNotificationDateTime(item.context.sessionStartAt, locale) : null)}
        {renderContextField(isAr ? "حالة الجلسة" : "Session Status", mapSessionStatus(item.context.sessionStatus, locale))}
        {renderContextField(isAr ? "المرسل" : "Sender", item.context.senderName)}
        {renderContextField(isAr ? "المستلم" : "Recipient", item.context.recipientName)}
        {renderContextField(isAr ? "موضوع التذكرة" : "Ticket Subject", item.context.supportTicketSubject)}
        {item.relatedEntityId && renderContextField(
          isAr ? "رقم الكيان المرتبط" : "Related Entity ID",
          <span className="font-mono" dir="ltr">{`...${item.relatedEntityId.slice(-4).toUpperCase()}`}</span>
        )}
      </div>

      {actionHref && (
        <div className="pt-1 flex justify-start">
          <Link
            href={actionHref as any}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-teal-600 dark:bg-teal-500 hover:bg-teal-700 dark:hover:bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:shadow-md"
          >
            <span>
              {visual.actionLabel || (
                item.primaryAction?.kind === "messages" 
                  ? t("notifications.detail.openConversation") 
                  : item.primaryAction?.kind === "support"
                    ? t("notifications.detail.openSupportTicket")
                    : t("notifications.detail.openSession")
              )}
            </span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </section>
  ) : null;

  const deliveryCard = (
    <section className="bg-surface-primary rounded-2xl border border-border-light/60 p-4 dark:bg-white/5 dark:border-white/5 shadow-sm space-y-3.5">
      <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
        {t("notifications.detail.deliveryStatus")}
      </h3>
      {renderDeliveryStatusCard()}
    </section>
  );

  const attemptsTimelineCard = (
    <section className="bg-surface-primary rounded-2xl border border-border-light/60 p-4 dark:bg-white/5 dark:border-white/5 shadow-sm space-y-3.5">
      <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
        {t("notifications.detail.attemptsTimeline")}
      </h3>

      {item.attempts.length > 0 ? (
        <div className="relative border-l-2 border-border-light dark:border-white/10 ml-3.5 rtl:ml-0 rtl:mr-3.5 rtl:border-r-2 rtl:border-l-0 pl-6 rtl:pl-0 rtl:pr-6 space-y-4 pt-1">
          {item.attempts.map((attempt) => {
            const attemptFriendlyError = mapNotificationErrorCode(attempt.errorCode, t);
            const statusTone = getDeliveryAttemptTone(attempt.status);
            return (
              <div key={attempt.id} className="relative">
                {/* Timeline Circle */}
                <span className="absolute -left-[32px] rtl:-right-[32px] top-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full border border-border-light bg-surface-primary text-[10px] font-bold text-text-secondary dark:border-white/10 dark:bg-surface-secondary">
                  {attempt.attemptNumber}
                </span>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-text-primary dark:text-white/90">
                      {attempt.provider || (isAr ? "مزوّد غير معروف" : "Unknown Provider")}
                    </span>
                    <span className={`inline-block rounded-full px-2 py-0.25 text-[10px] font-bold ${statusTone}`}>
                      {t(`notifications.deliveryStatuses.${attempt.status}` as Parameters<typeof t>[0])}
                    </span>
                    <span className="text-[10px] text-text-muted font-mono ml-auto rtl:ml-0 rtl:mr-auto">
                      {formatAdminNotificationDateTime(attempt.attemptedAt, locale)}
                    </span>
                  </div>
                  {attempt.errorCode && (
                    <div className="text-text-secondary dark:text-white/80 font-medium">
                      <span className="text-text-muted">{isAr ? "النتيجة: " : "Result: "}</span>
                      <span>{attemptFriendlyError || t("notifications.errors.fallback")}</span>
                    </div>
                  )}
                  {attempt.errorMessage && (
                    <p className="text-[11px] text-text-muted italic block border-l border-border-light pl-2 rtl:border-l-0 rtl:border-r rtl:pl-0 rtl:pr-2">
                      {attempt.errorMessage}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border-light p-4 text-center dark:border-white/5">
          <p className="text-xs text-text-muted font-semibold">
            {t("notifications.detail.noAttempts")}
          </p>
        </div>
      )}
    </section>
  );

  const snapshotCard = (
    <section className="bg-surface-primary rounded-2xl border border-border-light/60 p-4 dark:bg-white/5 dark:border-white/5 shadow-sm space-y-3.5">
      <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
        {t("notifications.detail.messageSnapshot")}
      </h3>

      {item.titleSnapshot || item.subjectSnapshot || item.bodySnapshot ? (
        <div className="space-y-3">
          {item.titleSnapshot && (
            <div className="rounded-xl bg-surface-secondary/70 p-3 dark:bg-white/5 border border-border-light/30">
              <span className="text-[10px] text-text-muted block font-bold mb-0.5">
                {isAr ? "العنوان" : "Title"}
              </span>
              <p className="text-xs font-semibold text-text-primary dark:text-white/90">
                {sanitizeNotificationDisplayText(item.titleSnapshot, locale, t)}
              </p>
            </div>
          )}
          {item.subjectSnapshot && (
            <div className="rounded-xl bg-surface-secondary/70 p-3 dark:bg-white/5 border border-border-light/30">
              <span className="text-[10px] text-text-muted block font-bold mb-0.5">
                {isAr ? "الموضوع" : "Subject"}
              </span>
              <p className="text-xs font-semibold text-text-primary dark:text-white/90">
                {sanitizeNotificationDisplayText(item.subjectSnapshot, locale, t)}
              </p>
            </div>
          )}
          {item.bodySnapshot && (
            <div className="rounded-xl bg-surface-secondary/70 p-3.5 dark:bg-white/5 border border-border-light/30">
              <span className="text-[10px] text-text-muted block font-bold mb-1">
                {isAr ? "محتوى الرسالة" : "Message Body"}
              </span>
              <p className="text-xs text-text-primary dark:text-white/80 whitespace-pre-wrap leading-relaxed">
                {sanitizeNotificationDisplayText(item.bodySnapshot, locale, t)}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl bg-surface-secondary/50 p-4 border border-dashed border-border-light text-center dark:bg-white/5">
          <p className="text-xs text-text-muted font-semibold">
            {t("notifications.detail.noContentSnapshot")}
          </p>
        </div>
      )}
    </section>
  );

  const technicalDetailsCard = (
    <section className="bg-surface-primary rounded-2xl border border-border-light/60 p-4 dark:bg-white/5 dark:border-white/5 shadow-sm">
      <button
        type="button"
        onClick={() => setShowTechnical(!showTechnical)}
        className="flex w-full items-center justify-between text-left rtl:text-right"
      >
        <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
          {t("notifications.detail.technicalDetails")}
        </span>
        <span className="text-xs font-bold text-teal-600 dark:text-teal-400 select-none flex items-center gap-1 hover:opacity-85 transition">
          {showTechnical ? (
            <>
              <span>{isAr ? "إخفاء التفاصيل" : "Hide Technical"}</span>
              <ChevronUp className="h-3.5 w-3.5" />
            </>
          ) : (
            <>
              <span>{isAr ? "عرض التفاصيل" : "Show Technical"}</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </>
          )}
        </span>
      </button>

      {showTechnical && (
        <div className="mt-4 space-y-4 border-t border-border-light/40 pt-4 dark:border-white/5">
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailField 
              label={t("notifications.technical.typeSlug")} 
              value={<span className="font-mono text-xs" dir="ltr">{item.typeSlug}</span>} 
            />
            <DetailField 
              label={t("notifications.technical.category")} 
              value={<span className="font-mono text-xs" dir="ltr">{item.category}</span>} 
            />
            <DetailField
              label={t("notifications.technical.relatedType")}
              value={<span className="font-mono text-xs" dir="ltr">{item.relatedEntityType || "—"}</span>}
            />
            <DetailField
              label={t("notifications.technical.relatedId")}
              value={<span className="font-mono text-xs" dir="ltr">{item.relatedEntityId || "—"}</span>}
            />
            <DetailField 
              label={t("notifications.technical.recipientId")} 
              value={<span className="font-mono text-xs" dir="ltr">{item.userId}</span>} 
            />
            <DetailField
              label={t("notifications.technical.errorCode")}
              value={<span className="font-mono text-xs" dir="ltr">{latestErrorCode || "—"}</span>}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                {t("notifications.technical.rawLogs")}
              </span>
              <button
                type="button"
                onClick={handleCopyJson}
                className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-600 dark:text-teal-400 hover:opacity-85 transition"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3" />
                    <span>{t("notifications.technical.copySuccess")}</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span>{t("notifications.technical.payloadCopy")}</span>
                  </>
                )}
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl bg-surface-tertiary p-3 border border-border-light/40 dark:bg-white/5 dark:border-white/5 font-mono text-[10px] text-text-secondary max-h-48 overflow-y-auto" dir="ltr">
              <pre>{redactUrlsInTechnical(JSON.stringify(item, null, 2))}</pre>
            </div>
          </div>
        </div>
      )}
    </section>
  );

  if (isDrawer) {
    // Single-column layout for Drawer
    return (
      <div className="space-y-5">
        {summaryCard}
        {relatedContextCard}
        {deliveryCard}
        {attemptsTimelineCard}
        {snapshotCard}
        {technicalDetailsCard}
      </div>
    );
  }

  // 2-column or 3-column layout for details route screen (main-column and side-column)
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-5">
          {summaryCard}
          {relatedContextCard}
          {deliveryCard}
          {attemptsTimelineCard}
        </div>

        {/* Side Column */}
        <div className="space-y-5">
          {snapshotCard}
        </div>
      </div>

      {/* Full width technical details */}
      {technicalDetailsCard}
    </div>
  );
}
