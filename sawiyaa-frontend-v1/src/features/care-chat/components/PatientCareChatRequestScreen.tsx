"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  ArrowRight,
  MessageSquareText,
  User,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  BadgeCheck,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import { toAppError } from "@/lib/api/errors";
import { usePatientCareChatRequest } from "../hooks/use-care-chat";
import { formatCareChatDateTime } from "../lib/care-chat-ui";
import type { CareChatRequestStatus } from "../types/care-chat.types";

type Props = {
  requestId: string;
};

const STATUS_COLOURS: Record<CareChatRequestStatus, { bg: string; text: string }> = {
  PENDING: { bg: "bg-amber-50 dark:bg-amber-500/15 border-amber-200 dark:border-amber-500/30", text: "text-amber-700 dark:text-amber-300" },
  APPROVED: { bg: "bg-emerald-50 dark:bg-emerald-500/15 border-emerald-200 dark:border-emerald-500/30", text: "text-emerald-700 dark:text-emerald-300" },
  REJECTED: { bg: "bg-rose-50 dark:bg-rose-500/15 border-rose-200 dark:border-rose-500/30", text: "text-rose-700 dark:text-rose-300" },
  EXPIRED: { bg: "bg-surface-tertiary dark:bg-white/10 border-border-light", text: "text-text-muted" },
  REVOKED: { bg: "bg-surface-tertiary dark:bg-white/10 border-border-light", text: "text-text-muted" },
  CANCELLED: { bg: "bg-surface-tertiary dark:bg-white/10 border-border-light", text: "text-text-muted" },
};

export default function PatientCareChatRequestScreen({ requestId }: Props) {
  const t = useTranslations("care-chat");
  const locale = useLocale();
  const request = usePatientCareChatRequest(requestId);

  if (request.isLoading) {
    return <ListStateSkeleton items={3} heightClass="h-32" />;
  }

  if (request.isError || !request.data) {
    const error = request.error ? toAppError(request.error) : null;
    const isNotFound = error?.statusCode === 404 || error?.code === "requestNotFound";
    return (
      <StateCard
        title={isNotFound ? t("patientPresentation.detailNotFoundTitle") : t("patientPresentation.detailLoadErrorTitle")}
        note={isNotFound ? t("patientPresentation.detailNotFoundNote") : t("patientPresentation.detailLoadErrorNote")}
        action={{
          label: t("patientPresentation.backToRequests"),
          href: "/patient/care-chat",
        }}
      />
    );
  }

  const item = request.data.item;
  const practitionerName = item.practitioner.displayName || t("common.fallbacks.practitioner");
  const statusCfg = STATUS_COLOURS[item.status] || STATUS_COLOURS.PENDING;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      {/* Header Banner */}
      <div className="rounded-[28px] border border-border-light/60 bg-gradient-to-br from-primary-light/40 via-white to-surface p-6 shadow-sm dark:from-primary/10 dark:via-surface dark:to-surface">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <Link
              href="/patient/care-chat"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline mb-1"
            >
              <ArrowRight size={14} className="rtl:rotate-180" />
              <span>{t("patientPresentation.backToRequests")}</span>
            </Link>
            <h1 className="text-xl font-extrabold text-text-primary dark:text-white sm:text-2xl">
              {t("patientPresentation.detailTitle")}
            </h1>
            <p className="text-xs text-text-secondary">
              {t("patientPresentation.detailSubtitle", { name: practitionerName })}
            </p>
          </div>

          <span className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-extrabold shadow-xs ${statusCfg.bg} ${statusCfg.text}`}>
            <span>{t(`common.requestStatuses.${item.status}` as Parameters<typeof t>[0])}</span>
          </span>
        </div>
      </div>

      {/* Status Alert Hero Box */}
      {item.status === "PENDING" ? (
        <div className="rounded-[28px] border border-amber-200 bg-amber-50/70 p-5 shadow-sm dark:bg-amber-950/20 dark:border-amber-800 flex items-start gap-3.5">
          <Clock size={24} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
              {t("patientPresentation.pendingHeading")}
            </h3>
            <p className="text-xs text-amber-800 dark:text-amber-300 mt-1 leading-relaxed">
              {t("patientPresentation.pendingNote")}
            </p>
          </div>
        </div>
      ) : item.status === "APPROVED" && item.linkedConversationId ? (
        <div className="rounded-[28px] border border-emerald-200 bg-emerald-50 p-6 shadow-sm dark:bg-emerald-950/20 dark:border-emerald-800 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-emerald-900 dark:text-emerald-200">
                {t("patientPresentation.approvedHeading")} 💬
              </h3>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                {t("patientPresentation.approvedNote")}
              </p>
            </div>
          </div>

          <div className="pt-1">
            <Link
              href={`/patient/care-chat/conversations/${item.linkedConversationId}` as never}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-7 py-3 text-sm font-bold text-white shadow-md transition hover:bg-emerald-700"
            >
              <MessageSquareText size={18} />
              <span>{t("patientPresentation.openConversation")} 🚀</span>
            </Link>
          </div>
        </div>
      ) : item.status === "REJECTED" ? (
        <div className="rounded-[28px] border border-rose-200 bg-rose-50/80 p-5 shadow-sm dark:bg-rose-950/20 dark:border-rose-800 flex items-start gap-3.5">
          <XCircle size={24} className="text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-rose-900 dark:text-rose-200">
              {t("patientPresentation.rejectedHeading")}
            </h3>
            <p className="text-xs text-rose-800 dark:text-rose-300 mt-1 leading-relaxed">
              {t("patientPresentation.rejectedNote")}
            </p>
          </div>
        </div>
      ) : null}

      {/* Target Practitioner Card */}
      <div className="rounded-[28px] border border-border-light bg-white p-6 shadow-sm dark:bg-surface space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-primary">
          {t("patientPresentation.targetLabel")}
        </h2>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-light text-primary font-bold text-lg dark:bg-primary/20">
              <User size={26} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-bold text-text-primary dark:text-white">
                  {practitionerName}
                </h3>
                <BadgeCheck size={18} className="text-primary shrink-0" />
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                {t("patientPresentation.specialistType")}
              </p>
            </div>
          </div>

          <Link
            href="/patient/practitioners"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border-light bg-surface-secondary px-4 py-2 text-xs font-bold text-text-primary hover:border-primary/40 dark:bg-white/5 dark:text-white"
          >
            <span>{t("patient.list.states.empty.cta")}</span>
            <ArrowRight size={14} className="rtl:rotate-180" />
          </Link>
        </div>
      </div>

      {/* Request Details & Submitted Reason */}
      <div className="rounded-[28px] border border-border-light bg-white p-6 shadow-sm dark:bg-surface space-y-4">
        <div className="flex items-center gap-2 border-b border-border-light/50 pb-3 dark:border-white/10">
          <FileText size={18} className="text-primary" />
          <h2 className="text-base font-bold text-text-primary dark:text-white">
            {t("patientPresentation.reasonHeading")}
          </h2>
        </div>

        <div className="rounded-2xl border border-primary/15 bg-primary-light/20 p-4 dark:bg-primary/10">
          <span className="text-xs font-bold text-primary block mb-1">{t("patientPresentation.reasonSubmittedLabel")}</span>
          <p className="text-sm text-text-primary italic leading-relaxed dark:text-white/90">
            &ldquo;{item.reason || t("patientPresentation.reasonNotProvided")}&rdquo;
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2">
          <div className="flex items-center gap-2 text-text-secondary">
            <Clock size={15} className="text-primary" />
            <span>{t("patientPresentation.requestedAt", { date: formatCareChatDateTime(item.requestedAt, locale) })}</span>
          </div>

          {item.relatedSessionId ? (
            <div className="flex items-center gap-2 text-text-secondary">
              <Calendar size={15} className="text-primary" />
              <span>{t("patientPresentation.relatedSessionLabel", { id: item.relatedSessionId })}</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
