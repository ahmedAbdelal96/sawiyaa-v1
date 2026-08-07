"use client";

import { useLocale } from "next-intl";
import type { CanonicalConversation } from "@/features/messages-shell/types/messages-shell.types";
import { formatEffectiveViewerDateTime } from "@/lib/time-formatting";

interface Props {
  conversation: CanonicalConversation | null;
  onResolve?: () => void;
  isResolving?: boolean;
}

export default function SupportSafeContextPanel({
  conversation,
  onResolve,
  isResolving,
}: Props) {
  const locale = useLocale();
  const isAr = locale.startsWith("ar");

  if (!conversation) return null;

  const formattedDate = (iso: string) =>
    formatEffectiveViewerDateTime(iso, undefined, {
      locale,
      fallbackText: iso,
    });

  const getStatusLabel = (status: string) => {
    if (status === "RESOLVED") return isAr ? "تم الحل" : "Resolved";
    if (status === "WAITING_FOR_USER")
      return isAr ? "بانتظار المستخدم" : "Waiting for user";
    if (status === "NEEDS_SUPPORT_REPLY")
      return isAr ? "تحتاج إلى رد" : "Needs support reply";
    return status;
  };

  return (
    <div className="border-border-light/80 flex h-full w-[285px] shrink-0 flex-col gap-4 border-s bg-white p-4 shadow-xs dark:border-white/10 dark:bg-slate-900/60">
      {/* User Card */}
      <div className="border-border-light/70 flex flex-col items-center border-b pb-4 text-center dark:border-white/10">
        <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 text-base font-extrabold text-primary ring-1 ring-primary/20 shadow-2xs dark:text-primary-light">
          {conversation.otherParty?.displayName?.charAt(0).toUpperCase() || "U"}
        </span>
        <h4 className="text-text-primary mt-2 text-xs font-bold dark:text-white">
          {conversation.otherParty?.displayName ||
            (isAr ? "مستخدم المنصة" : "Platform User")}
        </h4>
        <span className="text-text-secondary mt-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold dark:bg-white/10 dark:text-white/70">
          {conversation.otherParty?.publicRoleLabel === "Patient"
            ? isAr
              ? "مريض"
              : "Patient"
            : conversation.otherParty?.publicRoleLabel === "Practitioner"
              ? isAr
                ? "مختص"
                : "Practitioner"
              : isAr
                ? "مستخدم"
                : "User"}
        </span>
      </div>

      {/* Ticket Details */}
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto custom-scrollbar">
        <h3 className="text-text-muted text-[10px] font-extrabold tracking-wider uppercase dark:text-white/50">
          {isAr ? "تفاصيل تذكرة الدعم" : "Support Ticket Info"}
        </h3>

        <div className="space-y-2.5 text-xs">
          <div className="rounded-xl border border-border-light/70 bg-surface-secondary/40 p-2.5 dark:border-white/5 dark:bg-white/5">
            <span className="text-text-muted block text-[10px] font-semibold dark:text-white/40">
              {isAr ? "العنوان" : "Subject"}
            </span>
            <span className="text-text-primary mt-0.5 block font-bold leading-snug dark:text-white text-xs">
              {conversation.subject || conversation.title}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 rounded-xl border border-border-light/70 bg-surface-secondary/40 p-2.5 dark:border-white/5 dark:bg-white/5">
            <span className="text-text-muted text-[10px] font-semibold dark:text-white/40">
              {isAr ? "حالة التذكرة" : "Status"}
            </span>
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                conversation.isResolved
                  ? "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                  : "bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
              }`}
            >
              {getStatusLabel(
                conversation.supportQueueState || conversation.status,
              )}
            </span>
          </div>

          <div className="rounded-xl border border-border-light/70 bg-surface-secondary/40 p-2.5 space-y-1.5 dark:border-white/5 dark:bg-white/5">
            <div>
              <span className="text-text-muted block text-[10px] font-semibold dark:text-white/40">
                {isAr ? "تاريخ الإنشاء" : "Created At"}
              </span>
              <span className="text-text-secondary mt-0.5 block text-[11px] font-medium dark:text-white/80">
                {formattedDate(conversation.createdAt)}
              </span>
            </div>

            <div>
              <span className="text-text-muted block text-[10px] font-semibold dark:text-white/40">
                {isAr ? "آخر نشاط" : "Last Activity"}
              </span>
              <span className="text-text-secondary mt-0.5 block text-[11px] font-medium dark:text-white/80">
                {formattedDate(
                  conversation.lastActivityAt || conversation.updatedAt,
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Resolve Action Button */}
      {!conversation.isResolved && onResolve && (
        <button
          onClick={onResolve}
          disabled={isResolving}
          className="w-full rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
        >
          {isResolving
            ? isAr
              ? "جاري الإنهاء..."
              : "Resolving..."
            : isAr
              ? "إنهاء التذكرة (حل)"
              : "Resolve Ticket"}
        </button>
      )}
    </div>
  );
}
