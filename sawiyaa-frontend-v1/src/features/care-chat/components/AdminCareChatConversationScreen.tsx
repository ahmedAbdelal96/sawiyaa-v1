"use client";

import { useLocale } from "next-intl";
import { ArrowRight, User, BadgeCheck, FileText, Calendar, Clock, ExternalLink, ShieldCheck } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ChatWorkspaceShell } from "@/components/shared/chat/ChatKit";
import CareChatConversationPanel from "./CareChatConversationPanel";
import { useAdminCareChatConversation } from "../hooks/use-care-chat";
import { formatCareChatDateTime } from "../lib/care-chat-ui";
import { ListStateSkeleton } from "@/components/shared/ContentStates";

type Props = {
  conversationId: string;
};

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  OPEN:      { label: "نشطة",       cls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800" },
  CLOSED:    { label: "مغلقة",      cls: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-white/10 dark:text-slate-300 dark:border-white/10" },
  EXPIRED:   { label: "منتهية",     cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800" },
  SUSPENDED: { label: "موقوفة",     cls: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800" },
  PENDING:   { label: "قيد الانتظار", cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800" },
};

export default function AdminCareChatConversationScreen({ conversationId }: Props) {
  const locale = useLocale();
  const isAr = locale === "ar";

  const query = useAdminCareChatConversation(conversationId);
  const conversation = query.data?.item ?? null;

  const backHref = `/${locale}/admin/care-chat`;

  const statusCfg = conversation ? (STATUS_MAP[conversation.status] ?? STATUS_MAP.OPEN) : null;

  return (
    <section className="h-full min-h-0 w-full overflow-hidden flex flex-col">
      <div className="flex-1 h-full flex flex-col min-h-0">

        {/* Top Bar */}
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div className="flex items-center gap-3">
            <Link
              href={backHref as never}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
            >
              <ArrowRight size={14} className="rtl:rotate-180" />
              <span>{isAr ? "العودة لطلبات الرعاية" : "Back to Care Requests"}</span>
            </Link>
            <span className="text-text-muted text-xs">/</span>
            <span className="text-xs font-semibold text-text-secondary truncate max-w-[200px]">
              {isAr ? "مراجعة المحادثة الإدارية" : "Admin Conversation Review"}
            </span>
          </div>

          {statusCfg && (
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold ${statusCfg.cls}`}>
              <ShieldCheck size={11} />
              {statusCfg.label}
            </span>
          )}
        </div>

        {/* Workspace Shell */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <ChatWorkspaceShell>
            {/* ── Left Sidebar: Context Panel ── */}
            <div className="hidden lg:flex flex-col w-[300px] shrink-0 h-full min-h-0 overflow-y-auto custom-scrollbar gap-4">

              {/* Parties Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5 space-y-4">
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <User size={12} />
                  {isAr ? "أطراف المحادثة" : "Conversation Parties"}
                </h2>

                {query.isLoading ? (
                  <ListStateSkeleton items={2} heightClass="h-14" />
                ) : conversation ? (
                  <div className="space-y-3">
                    {/* Patient */}
                    <div className="flex items-center gap-3 rounded-2xl border border-border-light/60 bg-surface-secondary/50 p-3 dark:bg-white/5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary font-bold text-sm dark:bg-primary/20">
                        {(conversation.patient.displayName ?? "P").charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-text-muted uppercase mb-0.5">
                          {isAr ? "المريض" : "Patient"}
                        </p>
                        <p className="text-sm font-bold text-text-primary dark:text-white truncate">
                          {conversation.patient.displayName ?? (isAr ? "مريض" : "Patient")}
                        </p>
                      </div>
                    </div>

                    {/* Practitioner */}
                    <div className="flex items-center gap-3 rounded-2xl border border-border-light/60 bg-surface-secondary/50 p-3 dark:bg-white/5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary dark:bg-primary/20">
                        <BadgeCheck size={18} className="text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-text-muted uppercase mb-0.5">
                          {isAr ? "المختص" : "Practitioner"}
                        </p>
                        <p className="text-sm font-bold text-text-primary dark:text-white truncate">
                          {conversation.practitioner.displayName ?? (isAr ? "أخصائي" : "Practitioner")}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Conversation Meta */}
              {conversation && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5 space-y-3">
                  <h2 className="text-[11px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                    <FileText size={12} />
                    {isAr ? "بيانات المحادثة" : "Conversation Info"}
                  </h2>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-text-muted font-medium flex items-center gap-1">
                        <Clock size={11} />
                        {isAr ? "الحالة" : "Status"}
                      </span>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusCfg?.cls ?? ""}`}>
                        {statusCfg?.label}
                      </span>
                    </div>

                    {conversation.expiresAt && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-text-muted font-medium flex items-center gap-1">
                          <Calendar size={11} />
                          {isAr ? "تنتهي في" : "Expires"}
                        </span>
                        <span className="font-semibold text-text-primary dark:text-white text-[11px]">
                          {formatCareChatDateTime(conversation.expiresAt, locale)}
                        </span>
                      </div>
                    )}

                    {conversation.closedAt && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-text-muted font-medium flex items-center gap-1">
                          <Calendar size={11} />
                          {isAr ? "أُغلقت في" : "Closed At"}
                        </span>
                        <span className="font-semibold text-text-primary dark:text-white text-[11px]">
                          {formatCareChatDateTime(conversation.closedAt, locale)}
                        </span>
                      </div>
                    )}

                    {conversation.relatedSessionId && (
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-text-muted font-medium flex items-center gap-1 shrink-0">
                          <FileText size={11} />
                          {isAr ? "جلسة مرتبطة" : "Session"}
                        </span>
                        <span className="font-mono text-[10px] text-text-secondary truncate">
                          {conversation.relatedSessionId}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-text-muted font-medium">
                        {isAr ? "الرسائل" : "Messages"}
                      </span>
                      <span className="font-bold text-text-primary dark:text-white">
                        {conversation.messages.length}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Link to the care-chat request */}
              {conversation?.linkedRequestId && (
                <Link
                  href={`/admin/care-chat/${conversation.linkedRequestId}` as never}
                  className="flex items-center justify-between gap-2 bg-primary-light/40 dark:bg-primary/10 border border-primary/20 rounded-2xl px-4 py-3 text-xs font-bold text-primary hover:bg-primary-light/60 transition"
                >
                  <span>{isAr ? "تفاصيل طلب الرعاية الأصلي" : "View Original Request"}</span>
                  <ExternalLink size={13} />
                </Link>
              )}

              {/* Read-only notice */}
              <div className="rounded-2xl border border-amber-200/80 bg-amber-50/60 dark:bg-amber-950/20 dark:border-amber-800 p-4 text-xs text-amber-800 dark:text-amber-300 leading-5">
                <p className="font-bold mb-1">
                  {isAr ? "وضع المراجعة الإدارية" : "Admin Review Mode"}
                </p>
                <p className="text-amber-700 dark:text-amber-400">
                  {isAr
                    ? "هذه المحادثة مرئية للإدمن بصلاحية قراءة فقط. لا يمكن الإرسال."
                    : "This conversation is visible to admins in read-only mode. Sending is disabled."}
                </p>
              </div>
            </div>

            {/* ── Main Chat Panel ── */}
            <div className="flex-1 h-full min-h-0 min-w-0 flex flex-col">
              <CareChatConversationPanel
                conversationId={conversationId}
                scope="admin"
                backHref={backHref}
                variant="embedded"
              />
            </div>
          </ChatWorkspaceShell>
        </div>
      </div>
    </section>
  );
}
