"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowRight,
  CheckCircle2,
  XCircle,
  MessageSquareText,
  User,
  Calendar,
  Clock,
  ShieldAlert,
  Loader2,
  FileText,
  BadgeCheck,
  Ban,
  Sparkles,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import Button from "@/components/ui/button/Button";
import { toAppError } from "@/lib/api/errors";
import {
  useAdminCareChatRequest,
  useDecideAdminCareChatRequest,
  useRevokeAdminCareChatRequest,
} from "../hooks/use-care-chat";
import {
  formatCareChatDateTime,
  getCareChatErrorKey,
} from "../lib/care-chat-ui";
import type { CareChatRequestStatus } from "../types/care-chat.types";

type Props = {
  requestId: string;
};

const STATUS_COLOURS: Record<CareChatRequestStatus, { bg: string; text: string; labelAr: string; labelEn: string }> = {
  PENDING: { bg: "bg-amber-50 dark:bg-amber-500/15 border-amber-200 dark:border-amber-500/30", text: "text-amber-700 dark:text-amber-300", labelAr: "بانتظار الموافقة", labelEn: "Pending" },
  APPROVED: { bg: "bg-emerald-50 dark:bg-emerald-500/15 border-emerald-200 dark:border-emerald-500/30", text: "text-emerald-700 dark:text-emerald-300", labelAr: "تمت الموافقة", labelEn: "Approved" },
  REJECTED: { bg: "bg-rose-50 dark:bg-rose-500/15 border-rose-200 dark:border-rose-500/30", text: "text-rose-700 dark:text-rose-300", labelAr: "مرفوض", labelEn: "Rejected" },
  EXPIRED: { bg: "bg-surface-tertiary dark:bg-white/10 border-border-light", text: "text-text-muted", labelAr: "منتهي", labelEn: "Expired" },
  REVOKED: { bg: "bg-surface-tertiary dark:bg-white/10 border-border-light", text: "text-text-muted", labelAr: "مسحوب الصلاحية", labelEn: "Revoked" },
  CANCELLED: { bg: "bg-surface-tertiary dark:bg-white/10 border-border-light", text: "text-text-muted", labelAr: "ملغي من المريض", labelEn: "Cancelled" },
};

export default function AdminCareChatRequestScreen({ requestId }: Props) {
  const t = useTranslations("care-chat");
  const locale = useLocale();
  const isAr = locale === "ar";

  const request = useAdminCareChatRequest(requestId);
  const decide = useDecideAdminCareChatRequest(requestId);
  const revoke = useRevokeAdminCareChatRequest(requestId);

  const [approveNote, setApproveNote] = useState("");
  const [rejectNote, setRejectNote] = useState("");
  const [revokeNote, setRevokeNote] = useState("");

  if (request.isLoading) {
    return <ListStateSkeleton items={4} heightClass="h-32" />;
  }

  if (request.isError || !request.data) {
    const error = request.error ? toAppError(request.error) : null;
    const isNotFound = error?.statusCode === 404 || error?.code === "requestNotFound";
    return (
      <StateCard
        title={isNotFound ? "الطلب غير موجود" : "حدث خطأ أثناء التمرير"}
        note={isNotFound ? "تأكد من معرف الطلب وحاول مجدداً" : "تأكد من الاتصال بالشبكة"}
        action={{
          label: "العودة لقائمة الطلبات",
          href: "/admin/care-chat",
        }}
      />
    );
  }

  const item = request.data.item;
  const patientName = item.patient.displayName || (isAr ? "مريض" : "Patient");
  const practitionerName = item.practitioner.displayName || (isAr ? "أخصائي" : "Practitioner");
  const canDecide = item.status === "PENDING";
  const canRevoke = item.status === "APPROVED";
  const statusCfg = STATUS_COLOURS[item.status] || STATUS_COLOURS.PENDING;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-[28px] border border-border-light/60 bg-gradient-to-br from-primary-light/40 via-white to-surface p-6 shadow-sm dark:from-primary/10 dark:via-surface dark:to-surface">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <Link
              href="/admin/care-chat"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline mb-1"
            >
              <ArrowRight size={14} className="rtl:rotate-180" />
              <span>العودة لطلبات محادثة الرعاية</span>
            </Link>
            <h1 className="text-xl font-extrabold text-text-primary dark:text-white sm:text-2xl">
              تفاصيل طلب محادثة الرعاية
            </h1>
            <p className="text-xs text-text-secondary">
              طلب بين المريض <span className="font-bold text-text-primary dark:text-white">{patientName}</span> والمعالج <span className="font-bold text-text-primary dark:text-white">{practitionerName}</span>
            </p>
          </div>

          <span className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-extrabold shadow-xs ${statusCfg.bg} ${statusCfg.text}`}>
            <span>{isAr ? statusCfg.labelAr : statusCfg.labelEn}</span>
          </span>
        </div>
      </div>

      {/* 2-Column Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.75fr)] lg:items-start">
        {/* ── Left Main Column: Request Context & Identity Cards ── */}
        <div className="space-y-6">
          {/* Parties Identity Card */}
          <div className="rounded-[28px] border border-border-light bg-white p-6 shadow-sm dark:bg-surface space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-primary">
              أطراف المحادثة المطلوبة
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Patient Card */}
              <div className="rounded-2xl border border-border-light/60 bg-surface-secondary/50 p-4 dark:bg-white/5 space-y-2">
                <span className="text-[11px] font-bold text-text-muted uppercase">المريض المتقدم بالطلب</span>
                <div className="flex items-center gap-3 pt-1">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary font-bold text-sm dark:bg-primary/20">
                    {patientName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-text-primary dark:text-white truncate">
                      {patientName}
                    </p>
                    <p className="text-xs text-text-muted">مريض مسجل منصة سويّة</p>
                  </div>
                </div>
              </div>

              {/* Practitioner Card */}
              <div className="rounded-2xl border border-border-light/60 bg-surface-secondary/50 p-4 dark:bg-white/5 space-y-2">
                <span className="text-[11px] font-bold text-text-muted uppercase">المختص المستهدف</span>
                <div className="flex items-center gap-3 pt-1">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary font-bold text-sm dark:bg-primary/20">
                    <User size={20} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <p className="text-sm font-bold text-text-primary dark:text-white truncate">
                        {practitionerName}
                      </p>
                      <BadgeCheck size={15} className="text-primary shrink-0" />
                    </div>
                    <p className="text-xs text-text-muted">معالج نفسي معتمد</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Request Reason & Linked Session */}
          <div className="rounded-[28px] border border-border-light bg-white p-6 shadow-sm dark:bg-surface space-y-4">
            <div className="flex items-center gap-2 border-b border-border-light/50 pb-3 dark:border-white/10">
              <FileText size={18} className="text-primary" />
              <h2 className="text-base font-bold text-text-primary dark:text-white">
                تفاصيل وسبب تقديم الطلب
              </h2>
            </div>

            <div className="rounded-2xl border border-primary/15 bg-primary-light/20 p-4 dark:bg-primary/10">
              <span className="text-xs font-bold text-primary block mb-1">السبب المدخل من المريض:</span>
              <p className="text-sm text-text-primary italic leading-relaxed dark:text-white/90">
                "{item.reason || "لم يذكر المريض سبباً مفصلاً"}"
              </p>
            </div>

            {item.relatedSessionId ? (
              <div className="flex items-center gap-3 rounded-2xl border border-border-light/60 bg-surface-secondary p-4 dark:bg-white/5">
                <Calendar size={18} className="text-primary shrink-0" />
                <div>
                  <p className="text-xs font-bold text-text-primary dark:text-white">
                    مرتبط بجلسة علاجية سابقة
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">
                    معرف الجلسة: {item.relatedSessionId}
                  </p>
                </div>
              </div>
            ) : null}

            {item.internalReviewNote ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:bg-amber-950/20 dark:border-amber-800">
                <span className="text-xs font-bold text-amber-800 dark:text-amber-300 block mb-1">
                  ملاحظات مراجعة الإدارة السابقة:
                </span>
                <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                  {item.internalReviewNote}
                </p>
              </div>
            ) : null}
          </div>

          {/* Active Conversation Box if Approved */}
          {item.linkedConversationId ? (
            <div className="rounded-[28px] border border-emerald-200 bg-emerald-50/70 p-6 shadow-sm dark:bg-emerald-950/20 dark:border-emerald-800 space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md">
                  <MessageSquareText size={22} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-emerald-900 dark:text-emerald-200">
                    قناة المحادثة المباشرة نشطة حالياً
                  </h3>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                    يمكنك الاطلاع ومتابعة الرسائل الدائرة بين المريض والمعالج من منظور إداري.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  href={`/admin/care-chat/conversations/${item.linkedConversationId}` as never}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
                >
                  <MessageSquareText size={16} />
                  <span>فتح نافذة المحادثة الإدارية ↗️</span>
                </Link>
              </div>
            </div>
          ) : null}
        </div>

        {/* ── Right Column: Decision & Control Sidebar ── */}
        <div className="space-y-6">
          {/* Action Decision Form for Pending Items */}
          {canDecide ? (
            <div className="rounded-[28px] border border-border-light bg-white p-6 shadow-sm dark:bg-surface space-y-5">
              <div className="border-b border-border-light/50 pb-3 dark:border-white/10">
                <h2 className="text-base font-bold text-text-primary dark:text-white">
                  اتخاذ قرار بشأن الطلب
                </h2>
                <p className="text-xs text-text-muted mt-0.5">
                  اختر قبول الطلب وتفعيل قناة التواقل أو رفضه مع ذكر السبب.
                </p>
              </div>

              {/* Approve Box */}
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-3 dark:bg-emerald-950/20 dark:border-emerald-800">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 size={16} />
                  <span>قبول الطلب وتفعيل المحادثة</span>
                </div>
                <textarea
                  rows={2}
                  value={approveNote}
                  onChange={(e) => setApproveNote(e.target.value)}
                  placeholder="ملاحظات قبول اختيارية..."
                  className="w-full rounded-xl border border-emerald-200 bg-white p-2.5 text-xs text-text-primary outline-none focus:border-emerald-500 dark:bg-white/5 dark:text-white"
                />
                <Button
                  size="sm"
                  variant="primary"
                  disabled={decide.isPending}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  onClick={() =>
                    decide.mutate({
                      decision: "APPROVE",
                      note: approveNote.trim() || undefined,
                    })
                  }
                >
                  {decide.isPending ? "جاري المعالجة..." : "تأكيد قبول الطلب 🟢"}
                </Button>
              </div>

              {/* Reject Box */}
              <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 space-y-3 dark:bg-rose-950/20 dark:border-rose-800">
                <div className="flex items-center gap-2 text-xs font-bold text-rose-800 dark:text-rose-300">
                  <XCircle size={16} />
                  <span>رفض الطلب</span>
                </div>
                <textarea
                  rows={2}
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  placeholder="سبب الرفض ليتم إرساله للمريض..."
                  className="w-full rounded-xl border border-rose-200 bg-white p-2.5 text-xs text-text-primary outline-none focus:border-rose-500 dark:bg-white/5 dark:text-white"
                />
                <Button
                  size="sm"
                  variant="danger"
                  disabled={decide.isPending || rejectNote.trim().length < 3}
                  className="w-full font-bold"
                  onClick={() =>
                    decide.mutate({
                      decision: "REJECT",
                      note: rejectNote.trim() || undefined,
                    })
                  }
                >
                  {decide.isPending ? "جاري المعالجة..." : "تأكيد رفض الطلب 🔴"}
                </Button>
              </div>

              {decide.isError ? (
                <p className="text-xs text-rose-600 font-semibold text-center">
                  {t(getCareChatErrorKey(decide.error) as Parameters<typeof t>[0])}
                </p>
              ) : null}
            </div>
          ) : null}

          {/* Revoke Option for Approved Items */}
          {canRevoke ? (
            <div className="rounded-[28px] border border-rose-200 bg-rose-50/40 p-6 shadow-sm dark:bg-rose-950/20 dark:border-rose-800 space-y-4">
              <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300">
                <Ban size={18} />
                <h2 className="text-base font-bold">سحب صلاحية المحادثة</h2>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                استخدم خيار سحب الصلاحية لإيقاف قناة المحادثة المباشرة بين الطرفين لأسباب إدارية أو تنظيمية.
              </p>
              <textarea
                rows={2}
                value={revokeNote}
                onChange={(e) => setRevokeNote(e.target.value)}
                placeholder="سبب سحب الصلاحية..."
                className="w-full rounded-xl border border-rose-200 bg-white p-2.5 text-xs text-text-primary outline-none focus:border-rose-500 dark:bg-white/5 dark:text-white"
              />
              <Button
                size="sm"
                variant="danger"
                disabled={revoke.isPending}
                className="w-full font-bold"
                onClick={() =>
                  revoke.mutate({
                    note: revokeNote.trim() || undefined,
                  })
                }
              >
                {revoke.isPending ? "جاري تنفيذ السحب..." : "تأكيد سحب الصلاحية ⛔"}
              </Button>
            </div>
          ) : null}

          {/* Timeline Audit Log */}
          <div className="rounded-[28px] border border-border-light bg-white p-5 shadow-sm dark:bg-surface space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted border-b border-border-light/50 pb-2 dark:border-white/10">
              سجل التوقيت المرجعي
            </h2>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-text-muted">تاريخ إنشاء الطلب:</span>
                <span className="font-semibold text-text-primary dark:text-white">
                  {formatCareChatDateTime(item.requestedAt, locale)}
                </span>
              </div>
              {item.reviewedAt ? (
                <div className="flex items-center justify-between">
                  <span className="text-text-muted">تاريخ مراجعة القرار:</span>
                  <span className="font-semibold text-text-primary dark:text-white">
                    {formatCareChatDateTime(item.reviewedAt, locale)}
                  </span>
                </div>
              ) : null}
              {item.expiresAt ? (
                <div className="flex items-center justify-between">
                  <span className="text-text-muted">تاريخ انتهاء القناة:</span>
                  <span className="font-semibold text-text-primary dark:text-white">
                    {formatCareChatDateTime(item.expiresAt, locale)}
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
