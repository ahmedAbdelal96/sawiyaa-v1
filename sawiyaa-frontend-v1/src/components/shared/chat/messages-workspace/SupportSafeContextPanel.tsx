"use client";

import { useLocale } from "next-intl";
import type { CanonicalConversation } from "@/features/messages-shell/types/messages-shell.types";

interface Props {
  conversation: CanonicalConversation | null;
  onResolve?: () => void;
  isResolving?: boolean;
}

export default function SupportSafeContextPanel({ conversation, onResolve, isResolving }: Props) {
  const locale = useLocale();
  const isAr = locale.startsWith("ar");

  if (!conversation) return null;

  const formattedDate = (iso: string) => {
    try {
      return new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  const getStatusLabel = (status: string) => {
    if (status === "RESOLVED") return isAr ? "تم الحل" : "Resolved";
    if (status === "WAITING_FOR_USER") return isAr ? "بانتظار المستخدم" : "Waiting for user";
    if (status === "NEEDS_SUPPORT_REPLY") return isAr ? "تحتاج إلى رد" : "Needs support reply";
    return status;
  };

  return (
    <div className="flex h-full w-[300px] shrink-0 flex-col gap-4 border-s border-border-light/80 bg-white p-4 dark:border-white/10 dark:bg-slate-900/40">
      {/* User Card */}
      <div className="flex flex-col items-center text-center pb-4 border-b border-border-light/80 dark:border-white/10">
        <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-teal-600/20 to-teal-600/5 text-lg font-bold text-teal-700 ring-2 ring-teal-600/20 dark:text-teal-400">
          {conversation.otherParty?.displayName?.charAt(0).toUpperCase() || "U"}
        </span>
        <h4 className="mt-2 text-sm font-bold text-text-primary dark:text-white">
          {conversation.otherParty?.displayName || (isAr ? "مستخدم المنصة" : "Platform User")}
        </h4>
        <span className="mt-0.5 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-text-secondary dark:bg-white/10 dark:text-white/60">
          {conversation.otherParty?.publicRoleLabel === "Patient"
            ? (isAr ? "مريض" : "Patient")
            : conversation.otherParty?.publicRoleLabel === "Practitioner"
            ? (isAr ? "مختص" : "Practitioner")
            : (isAr ? "مستخدم" : "User")}
        </span>
      </div>

      {/* Ticket Details */}
      <div className="flex-1 space-y-3.5 min-h-0 overflow-y-auto">
        <h3 className="text-xs font-bold text-text-muted dark:text-white/60 uppercase tracking-wide">
          {isAr ? "تفاصيل تذكرة الدعم" : "Support Ticket Info"}
        </h3>

        <div className="space-y-2 text-xs">
          <div>
            <span className="text-text-muted dark:text-white/40 block">{isAr ? "العنوان" : "Subject"}</span>
            <span className="font-semibold text-text-primary dark:text-white block mt-0.5">
              {conversation.subject || conversation.title}
            </span>
          </div>

          <div>
            <span className="text-text-muted dark:text-white/40 block">{isAr ? "حالة التذكرة" : "Status"}</span>
            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold mt-1 ${
              conversation.isResolved
                ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                : "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400"
            }`}>
              {getStatusLabel(conversation.supportQueueState || conversation.status)}
            </span>
          </div>

          <div>
            <span className="text-text-muted dark:text-white/40 block">{isAr ? "تاريخ الإنشاء" : "Created At"}</span>
            <span className="text-text-secondary dark:text-white/80 block mt-0.5">
              {formattedDate(conversation.createdAt)}
            </span>
          </div>

          <div>
            <span className="text-text-muted dark:text-white/40 block">{isAr ? "آخر نشاط" : "Last Activity"}</span>
            <span className="text-text-secondary dark:text-white/80 block mt-0.5">
              {formattedDate(conversation.lastActivityAt || conversation.updatedAt)}
            </span>
          </div>
        </div>
      </div>

      {/* Resolve Action Button */}
      {!conversation.isResolved && onResolve && (
        <button
          onClick={onResolve}
          disabled={isResolving}
          className="w-full rounded-xl bg-teal-600 py-2.5 text-xs font-bold text-white transition hover:bg-teal-700 disabled:opacity-50"
        >
          {isResolving ? (isAr ? "جاري الإنهاء..." : "Resolving...") : (isAr ? "إنهاء التذكرة (حل)" : "Resolve Ticket")}
        </button>
      )}
    </div>
  );
}
