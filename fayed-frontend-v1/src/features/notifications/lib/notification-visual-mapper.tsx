import React from "react";
import {
  MessageSquare,
  Calendar,
  LifeBuoy,
  CreditCard,
  AlertTriangle,
  Bell,
  Clock,
} from "lucide-react";
import type { useTranslations } from "next-intl";

import type { NotificationContext, NotificationPrimaryAction } from "../types/user-notifications.types";

export type NotificationVisualProps = {
  icon: React.ReactNode;
  tone: "message" | "session" | "support" | "payment" | "system" | "warning" | "content";
  title: string;
  subtitle: string;
  contextLine?: string;
  actionLabel?: string;
  technicalSlug: string;
};

export function getNotificationVisualProps(
  slug: string,
  category: string | null | undefined,
  t: ReturnType<typeof useTranslations>,
  namespace: "admin" | "user" = "admin",
  locale: string = "en",
  context?: NotificationContext,
  primaryAction?: NotificationPrimaryAction
): NotificationVisualProps {
  const normalizedSlug = slug || "";
  // Translate slugs using safe keys where dots are replaced by hyphens
  const safeSlug = normalizedSlug.replace(/\./g, "-");
  
  // Define icons and tones based on slug patterns or categories
  let icon: React.ReactNode = <Bell className="h-4 w-4" />;
  let tone: NotificationVisualProps["tone"] = "system";

  if (
    normalizedSlug.startsWith("messages.") ||
    normalizedSlug === "GENERAL_CHAT_MESSAGE" ||
    normalizedSlug.toLowerCase().includes("message") ||
    normalizedSlug.toLowerCase().includes("chat")
  ) {
    icon = <MessageSquare className="h-4 w-4" />;
    tone = "message";
  } else if (normalizedSlug.startsWith("sessions.")) {
    if (normalizedSlug.includes("reminder") || normalizedSlug.includes("available")) {
      icon = <Clock className="h-4 w-4" />;
      tone = "warning"; // amber for reminders
    } else if (normalizedSlug.includes("cancelled")) {
      icon = <Calendar className="h-4 w-4" />;
      tone = "content"; // rose/warning tone for cancellations
    } else {
      icon = <Calendar className="h-4 w-4" />;
      tone = "session";
    }
  } else if (normalizedSlug.startsWith("support.")) {
    icon = <LifeBuoy className="h-4 w-4" />;
    tone = "support";
  } else if (normalizedSlug.startsWith("payments.")) {
    icon = <CreditCard className="h-4 w-4" />;
    tone = normalizedSlug.includes("failed") ? "warning" : "payment";
  }

  // Resolve titles and subtitles from translation files using next-intl
  let title = "";
  let subtitle = "";

  const titleKey1 = (namespace === "admin" ? `notifications.slugs.${safeSlug}.title` : `slugs.${safeSlug}.title`);
  const titleKey2 = (namespace === "admin" ? `notifications.slugs.${normalizedSlug}.title` : `slugs.${normalizedSlug}.title`);

  const subtitleKey1 = (namespace === "admin" ? `notifications.slugs.${safeSlug}.subtitle` : `slugs.${safeSlug}.subtitle`);
  const subtitleKey2 = (namespace === "admin" ? `notifications.slugs.${normalizedSlug}.subtitle` : `slugs.${normalizedSlug}.subtitle`);

  const fallbackTitleKey = (namespace === "admin" ? "notifications.slugs.fallback.title" : "slugs.fallback.title");
  const fallbackSubtitleKey = (namespace === "admin" ? "notifications.slugs.fallback.subtitle" : "slugs.fallback.subtitle");

  const tryTranslate = (key: string) => {
    try {
      const res = t(key as any);
      if (res && !(res.startsWith("[") && res.endsWith("]"))) {
        return res;
      }
    } catch {}
    return "";
  };

  title = tryTranslate(titleKey1) || tryTranslate(titleKey2);
  subtitle = tryTranslate(subtitleKey1) || tryTranslate(subtitleKey2);

  if (!title) {
    title = tryTranslate(fallbackTitleKey) || (locale === "ar" ? "إشعار نظام" : "System notification");
  }
  if (!subtitle) {
    subtitle = tryTranslate(fallbackSubtitleKey) || (locale === "ar" ? "نظام" : "System");
  }

  // Enrichment formatting (contextLine and actionLabel)
  let contextLine = "";
  let actionLabel = "";
  const isAr = locale.startsWith("ar");

  const formatTime = (isoString?: string) => {
    if (!isoString) return "";
    try {
      const date = new Date(isoString);
      let hours = date.getHours();
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? (isAr ? "م" : "PM") : (isAr ? "ص" : "AM");
      hours = hours % 12;
      hours = hours ? hours : 12;
      return `${hours}:${minutes} ${ampm}`;
    } catch {
      return "";
    }
  };

  if (context) {
    const maskId = (id?: string) => {
      if (!id) return "";
      const clean = id.replace(/^(user_|session_|ticket_|msg_|conv_|payment_|refund_)/, "");
      return clean.slice(-4).toUpperCase();
    };

    const rId = context.recipientId ? maskId(context.recipientId) : "";
    const entityIdToUse = context.relatedEntityId || primaryAction?.id;
    const eId = entityIdToUse ? maskId(entityIdToUse) : "";

    const fallbackLine = isAr
      ? `مستخدم ...${rId || "النظام"} · جلسة ...${eId || "مجهولة"}`
      : `User ...${rId || "System"} · Session ...${eId || "unknown"}`;

    const pName = context.patientName;
    const docName = context.practitionerName;
    const sender = context.senderName;
    const timeFormatted = formatTime(context.sessionStartAt);

    if (slug.startsWith("sessions.")) {
      if (pName && docName) {
        contextLine = isAr
          ? `جلسة بين ${pName} و ${docName}${timeFormatted ? ` · ${timeFormatted}` : ""}`
          : `Session between ${pName} and ${docName}${timeFormatted ? ` · ${timeFormatted}` : ""}`;
      } else {
        contextLine = fallbackLine;
      }
    } else if (slug.startsWith("messages.") || slug === "GENERAL_CHAT_MESSAGE") {
      if (sender) {
        const otherParticipant = context.recipientRole === "PATIENT" ? (docName || (isAr ? "الممارس" : "Practitioner")) : (pName || (isAr ? "المستفيد" : "Patient"));
        contextLine = isAr
          ? `من ${sender} · جلسة مع ${otherParticipant}`
          : `From ${sender} · Session with ${otherParticipant}`;
      } else {
        contextLine = fallbackLine;
      }
    } else if (slug.startsWith("support.") || slug.includes("support")) {
      if (context.supportTicketSubject) {
        contextLine = isAr
          ? `تذكرة: ${context.supportTicketSubject}`
          : `Ticket: ${context.supportTicketSubject}`;
      } else {
        contextLine = isAr
          ? `تذكرة ...${eId || "مجهولة"}`
          : `Ticket ...${eId || "unknown"}`;
      }
    } else if (slug.startsWith("payments.")) {
      if (docName) {
        contextLine = isAr
          ? `جلسة مع ${docName} · راجع حالة الدفع`
          : `Session with ${docName} · Review payment status`;
      } else {
        contextLine = fallbackLine;
      }
    }

    if (!contextLine) {
      contextLine = fallbackLine;
    }
  }

  if (primaryAction) {
    if (primaryAction.kind === "messages") {
      actionLabel = isAr ? "فتح المحادثة" : "Open conversation";
    } else if (primaryAction.kind === "session") {
      actionLabel = isAr ? "فتح الجلسة" : "Open session";
    } else if (primaryAction.kind === "support") {
      actionLabel = isAr ? "فتح تذكرة الدعم" : "Open support ticket";
    } else if (primaryAction.kind === "details") {
      actionLabel = isAr ? "عرض التفاصيل" : "View details";
    }
  }

  return {
    icon,
    tone,
    title,
    subtitle,
    contextLine: contextLine || undefined,
    actionLabel: actionLabel || undefined,
    technicalSlug: normalizedSlug,
  };
}

export function mapNotificationErrorCode(
  code: string | null | undefined,
  t: ReturnType<typeof useTranslations>,
  namespace: "admin" | "user" = "admin"
): string | null {
  if (!code) return null;
  const errorKey = (namespace === "admin"
    ? `notifications.errors.${code}`
    : `errors.${code}`) as Parameters<typeof t>[0];

  const fallbackKey = (namespace === "admin"
    ? "notifications.errors.fallback"
    : "errors.fallback") as Parameters<typeof t>[0];

  try {
    const message = t(errorKey);
    if (message.startsWith("[") && message.endsWith("]")) {
      return t(fallbackKey);
    }
    return message;
  } catch {
    return t(fallbackKey);
  }
}
