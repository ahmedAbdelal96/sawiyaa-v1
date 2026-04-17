"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, Loader2, MessageSquareText } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import { SurfaceCard } from "@/components/shared/SurfaceShell";
import { toAppError } from "@/lib/api/errors";
import {
  useAdminCareChatRequest,
  useDecideAdminCareChatRequest,
  useRevokeAdminCareChatRequest,
} from "../hooks/use-care-chat";
import { CareChatRequestStatusChip } from "./CareChatStatusChip";
import {
  formatCareChatDateTime,
  getCareChatErrorKey,
  getCareChatRequestStateKey,
} from "../lib/care-chat-ui";

type Props = {
  requestId: string;
};

export default function AdminCareChatRequestScreen({ requestId }: Props) {
  const t = useTranslations("care-chat");
  const locale = useLocale();
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
        title={
          isNotFound
            ? t("common.states.requestNotFound.heading")
            : t("common.states.requestError.heading")
        }
        note={
          isNotFound
            ? t("common.states.requestNotFound.note")
            : t("common.states.requestError.note")
        }
        action={{
          label: t("common.actions.backToRequests"),
          href: "/admin/care-chat",
        }}
      />
    );
  }

  const item = request.data.item;
  const patientName = item.patient.displayName ?? t("common.fallbacks.patient");
  const practitionerName =
    item.practitioner.displayName ?? t("common.fallbacks.practitioner");
  const canDecide = item.status === "PENDING";
  const canRevoke = item.status === "APPROVED";
  const actionError = decide.isError ? decide.error : revoke.isError ? revoke.error : null;

  return (
    <div className="space-y-5">
      <SurfaceCard as="section" variant="section">
        <Link
          href="/admin/care-chat"
          className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          {t("common.actions.backToRequests")}
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-4xl">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              {t("admin.detail.eyebrow")}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary dark:text-white/95 sm:text-3xl">
              {t("admin.detail.title", {
                patient: patientName,
                practitioner: practitionerName,
              })}
            </h1>
            <p className="mt-2 text-sm leading-6 text-text-secondary">
              {t(
                `common.requestStateNotes.${getCareChatRequestStateKey(item.status)}` as Parameters<typeof t>[0],
              )}
            </p>
          </div>
          <CareChatRequestStatusChip status={item.status} />
        </div>
      </SurfaceCard>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.95fr)]">
        <div className="space-y-5">
          <SurfaceCard as="section" variant="section">
            <h2 className="text-lg font-semibold text-text-primary dark:text-white/95">
              {t("admin.detail.requestHeading")}
            </h2>
            <div className="mt-4 space-y-3 text-sm text-text-secondary">
              <p>
                <span className="font-medium text-text-primary dark:text-white/90">
                  {t("admin.detail.patientLabel")}:
                </span>{" "}
                {patientName}
              </p>
              <p>
                <span className="font-medium text-text-primary dark:text-white/90">
                  {t("admin.detail.practitionerLabel")}:
                </span>{" "}
                {practitionerName}
              </p>
              <p>
                <span className="font-medium text-text-primary dark:text-white/90">
                  {t("admin.detail.requestedAtLabel")}:
                </span>{" "}
                {formatCareChatDateTime(item.requestedAt, locale)}
              </p>
              {item.reviewedAt ? (
                <p>
                  <span className="font-medium text-text-primary dark:text-white/90">
                    {t("admin.detail.reviewedAtLabel")}:
                  </span>{" "}
                  {formatCareChatDateTime(item.reviewedAt, locale)}
                </p>
              ) : null}
              {item.expiresAt ? (
                <p>
                  <span className="font-medium text-text-primary dark:text-white/90">
                    {t("admin.detail.expiresAtLabel")}:
                  </span>{" "}
                  {formatCareChatDateTime(item.expiresAt, locale)}
                </p>
              ) : null}
              {item.reason ? (
                <p>
                  <span className="font-medium text-text-primary dark:text-white/90">
                    {t("admin.detail.reasonLabel")}:
                  </span>{" "}
                  {item.reason}
                </p>
              ) : null}
              {item.internalReviewNote ? (
                <p>
                  <span className="font-medium text-text-primary dark:text-white/90">
                    {t("admin.detail.internalReviewNoteLabel")}:
                  </span>{" "}
                  {item.internalReviewNote}
                </p>
              ) : null}
            </div>

            {item.linkedConversationId ? (
              <div className="mt-5 rounded-[24px] border border-border-light bg-surface-secondary/50 p-4 dark:border-white/8 dark:bg-white/[0.03]">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-light text-primary dark:bg-primary/15 dark:text-primary-light">
                    <MessageSquareText className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary dark:text-white/95">
                      {t("admin.detail.conversationHeading")}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-text-secondary">
                      {t("admin.detail.conversationNote")}
                    </p>
                    <Link
                      href={`/admin/care-chat/conversations/${item.linkedConversationId}` as never}
                      className="mt-3 inline-flex text-sm font-medium text-primary hover:underline"
                    >
                      {t("admin.detail.openConversation")}
                    </Link>
                  </div>
                </div>
              </div>
            ) : null}
          </SurfaceCard>
        </div>

        <div className="space-y-5">
          {canDecide ? (
            <>
              <SurfaceCard as="section" variant="section">
                <h2 className="text-base font-semibold text-text-primary dark:text-white/95">
                  {t("admin.actions.approve.heading")}
                </h2>
                <p className="mt-1 text-sm text-text-secondary">
                  {t("admin.actions.approve.note")}
                </p>
                <textarea
                  rows={3}
                  value={approveNote}
                  onChange={(event) => setApproveNote(event.target.value)}
                  placeholder={t("admin.actions.approve.notePlaceholder")}
                  className="mt-4 w-full rounded-[20px] border border-border-light bg-white px-4 py-3 text-sm leading-6 text-text-primary outline-none placeholder:text-text-muted focus:border-primary/35 dark:bg-white/5 dark:text-white"
                />
                <button
                  type="button"
                  disabled={decide.isPending}
                  onClick={() =>
                    decide.mutate({
                      decision: "APPROVE",
                      note: approveNote.trim() || undefined,
                    })
                  }
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {decide.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("admin.actions.approve.submitting")}
                    </>
                  ) : (
                    t("admin.actions.approve.submit")
                  )}
                </button>
              </SurfaceCard>

              <SurfaceCard as="section" variant="section">
                <h2 className="text-base font-semibold text-text-primary dark:text-white/95">
                  {t("admin.actions.reject.heading")}
                </h2>
                <p className="mt-1 text-sm text-text-secondary">
                  {t("admin.actions.reject.note")}
                </p>
                <textarea
                  rows={3}
                  value={rejectNote}
                  onChange={(event) => setRejectNote(event.target.value)}
                  placeholder={t("admin.actions.reject.notePlaceholder")}
                  className="mt-4 w-full rounded-[20px] border border-border-light bg-white px-4 py-3 text-sm leading-6 text-text-primary outline-none placeholder:text-text-muted focus:border-primary/35 dark:bg-white/5 dark:text-white"
                />
                <button
                  type="button"
                  disabled={decide.isPending}
                  onClick={() =>
                    decide.mutate({
                      decision: "REJECT",
                      note: rejectNote.trim() || undefined,
                    })
                  }
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {decide.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("admin.actions.reject.submitting")}
                    </>
                  ) : (
                    t("admin.actions.reject.submit")
                  )}
                </button>
              </SurfaceCard>
            </>
          ) : null}

          {canRevoke ? (
            <SurfaceCard as="section" variant="section">
              <h2 className="text-base font-semibold text-text-primary dark:text-white/95">
                {t("admin.actions.revoke.heading")}
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                {t("admin.actions.revoke.note")}
              </p>
              <textarea
                rows={3}
                value={revokeNote}
                onChange={(event) => setRevokeNote(event.target.value)}
                placeholder={t("admin.actions.revoke.notePlaceholder")}
                className="mt-4 w-full rounded-[20px] border border-border-light bg-white px-4 py-3 text-sm leading-6 text-text-primary outline-none placeholder:text-text-muted focus:border-primary/35 dark:bg-white/5 dark:text-white"
              />
              <button
                type="button"
                disabled={revoke.isPending}
                onClick={() => revoke.mutate({ note: revokeNote.trim() || undefined })}
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-border-light px-5 py-2.5 text-sm font-semibold text-text-primary transition hover:border-rose-300 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-60 dark:text-white/90"
              >
                {revoke.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("admin.actions.revoke.submitting")}
                  </>
                ) : (
                  t("admin.actions.revoke.submit")
                )}
              </button>
            </SurfaceCard>
          ) : null}

          {!canDecide && !canRevoke ? (
            <SurfaceCard as="section" variant="section">
              <h2 className="text-base font-semibold text-text-primary dark:text-white/95">
                {t("admin.actions.readOnly.heading")}
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                {t("admin.actions.readOnly.note")}
              </p>
            </SurfaceCard>
          ) : null}

          {actionError ? (
            <p className="text-sm text-rose-600 dark:text-rose-400">
              {t(getCareChatErrorKey(actionError) as Parameters<typeof t>[0])}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
