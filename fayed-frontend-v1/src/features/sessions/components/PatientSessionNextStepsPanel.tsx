"use client";

import { useMemo, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  CalendarPlus,
  LifeBuoy,
  MessageSquareText,
  MessagesSquare,
} from "lucide-react";
import { usePatientCareChatRequests } from "@/features/care-chat/hooks/use-care-chat";
import { usePatientReviews } from "@/features/reviews";
import PatientSessionReviewCard from "./PatientSessionReviewCard";
import SessionStatusBadge from "./SessionStatusBadge";
import type { SessionItem } from "../types/sessions.types";

type Props = {
  session: SessionItem;
};

type ActionTileProps = {
  icon: ReactNode;
  title: string;
  note: string;
  href: string;
  ctaLabel: string;
  tone?: "primary" | "secondary";
};

function ActionTile({
  icon,
  title,
  note,
  href,
  ctaLabel,
  tone = "secondary",
}: ActionTileProps) {
  return (
    <div className="rounded-[28px] border border-border-light bg-surface-primary p-4 dark:bg-white/5">
      <div className="flex items-start gap-3">
        <span
          className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
            tone === "primary"
              ? "bg-primary-light text-primary dark:bg-primary/15 dark:text-primary-light"
              : "bg-white text-text-secondary dark:bg-white/8 dark:text-white/75"
          }`}
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-text-primary dark:text-white/95">
            {title}
          </h3>
          <p className="mt-1 text-sm leading-6 text-text-secondary">{note}</p>
          <Link
            href={href as never}
            className={`mt-3 inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
              tone === "primary"
                ? "bg-primary text-white hover:bg-primary-hover"
                : "border border-border-light bg-white text-text-primary hover:border-primary/30 hover:text-primary dark:bg-white/5 dark:text-white/90"
            }`}
          >
            {ctaLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PatientSessionNextStepsPanel({ session }: Props) {
  const t = useTranslations("sessions");
  const isCompleted = session.status === "COMPLETED";
  const canOpenSessionChat = ["READY_TO_JOIN", "IN_PROGRESS", "COMPLETED"].includes(
    session.status,
  );

  const reviewsQuery = usePatientReviews(
    { page: 1, limit: 100 },
    isCompleted,
  );
  const careChatRequestsQuery = usePatientCareChatRequests(
    { page: 1, limit: 100 },
    isCompleted,
  );

  const existingReview = useMemo(
    () => reviewsQuery.data?.items.find((item) => item.sessionId === session.id) ?? null,
    [reviewsQuery.data?.items, session.id],
  );

  const approvedCareChatConversation = useMemo(
    () =>
      careChatRequestsQuery.data?.items.find(
        (item) =>
          item.relatedSessionId === session.id &&
          item.status === "APPROVED" &&
          Boolean(item.linkedConversationId),
      ) ?? null,
    [careChatRequestsQuery.data?.items, session.id],
  );

  if (!isCompleted) {
    return null;
  }

  return (
    <section className="rounded-[32px] border border-border-light bg-white p-5 shadow-[0_18px_38px_-30px_rgba(34,52,56,0.22)] dark:border-border-light dark:bg-surface-secondary">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            {t("detail.nextSteps.eyebrow")}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-text-primary dark:text-white/95">
            {t("detail.nextSteps.heading")}
          </h2>
          <p className="mt-2 text-sm leading-6 text-text-secondary">
            {t("detail.nextSteps.note")}
          </p>
        </div>

        <SessionStatusBadge status="COMPLETED" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.9fr)]">
        <div className="space-y-4">
          <div className="rounded-[28px] border border-border-light bg-surface-primary p-4 dark:bg-white/5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-text-primary dark:text-white/95">
                  {t("detail.nextSteps.reviewHeading")}
                </p>
                <p className="mt-1 text-sm leading-6 text-text-secondary">
                  {t("detail.nextSteps.reviewNote")}
                </p>
              </div>
              <span className="rounded-full bg-primary-light px-3 py-1 text-xs font-medium text-text-brand dark:bg-primary/15 dark:text-primary-light">
                {t("detail.nextSteps.reviewBadge")}
              </span>
            </div>

            <div className="mt-4">
              <PatientSessionReviewCard
                sessionId={session.id}
                practitionerName={session.practitioner.displayName ?? session.practitioner.slug}
                completedAt={session.completedAt}
              />
            </div>
          </div>
        </div>

        <aside className="space-y-3">
          <ActionTile
            tone="primary"
            icon={<CalendarPlus className="h-4 w-4" />}
            title={t("detail.nextSteps.rebook.title")}
            note={t("detail.nextSteps.rebook.note")}
            href="/practitioners"
            ctaLabel={t("detail.nextSteps.rebook.cta")}
          />

          {canOpenSessionChat ? (
            <ActionTile
              icon={<MessageSquareText className="h-4 w-4" />}
              title={t("detail.nextSteps.sessionChat.title")}
              note={t("detail.nextSteps.sessionChat.note")}
              href={`/patient/sessions/${session.id}/chat`}
              ctaLabel={t("detail.nextSteps.sessionChat.cta")}
            />
          ) : null}

          {approvedCareChatConversation?.linkedConversationId ? (
            <ActionTile
              icon={<MessagesSquare className="h-4 w-4" />}
              title={t("detail.nextSteps.careChat.title")}
              note={t("detail.nextSteps.careChat.note")}
              href={`/patient/care-chat/conversations/${approvedCareChatConversation.linkedConversationId}`}
              ctaLabel={t("detail.nextSteps.careChat.cta")}
            />
          ) : null}

          <ActionTile
            icon={<LifeBuoy className="h-4 w-4" />}
            title={t("detail.nextSteps.support.title")}
            note={t("detail.nextSteps.support.note")}
            href="/patient/support"
            ctaLabel={t("detail.nextSteps.support.cta")}
          />
        </aside>
      </div>

      <p className="mt-4 text-xs leading-6 text-text-muted">
        {reviewsQuery.isLoading || careChatRequestsQuery.isLoading
          ? t("detail.nextSteps.loadingNote")
          : t("detail.nextSteps.closureNote")}
      </p>
    </section>
  );
}
