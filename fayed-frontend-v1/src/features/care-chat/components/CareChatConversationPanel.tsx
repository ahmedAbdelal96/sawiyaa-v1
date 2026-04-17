"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, Loader2, MessageSquareText, SendHorizonal } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import { toAppError } from "@/lib/api/errors";
import { CareChatActivityChip } from "./CareChatStatusChip";
import {
  formatCareChatDateTime,
  getCareChatConversationStateKey,
  getCareChatErrorKey,
  getCareChatSenderAlignment,
} from "../lib/care-chat-ui";
import {
  useAdminCareChatConversation,
  usePatientCareChatConversation,
  usePractitionerCareChatConversation,
  useSendPatientCareChatMessage,
  useSendPractitionerCareChatMessage,
} from "../hooks/use-care-chat";

type Props = {
  conversationId: string;
  scope: "patient" | "practitioner" | "admin";
  backHref: string;
};

export default function CareChatConversationPanel({
  conversationId,
  scope,
  backHref,
}: Props) {
  const t = useTranslations("care-chat");
  const locale = useLocale();
  const [message, setMessage] = useState("");

  const query =
    scope === "patient"
      ? usePatientCareChatConversation(conversationId)
      : scope === "practitioner"
        ? usePractitionerCareChatConversation(conversationId)
        : useAdminCareChatConversation(conversationId);

  const patientSend = useSendPatientCareChatMessage(conversationId);
  const practitionerSend = useSendPractitionerCareChatMessage(conversationId);
  const sendMutation = scope === "patient" ? patientSend : practitionerSend;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (scope === "admin") return;
    await sendMutation.mutateAsync({ message: message.trim() });
    setMessage("");
  };

  if (query.isLoading) {
    return (
      <div className="space-y-4">
        <ListStateSkeleton items={1} heightClass="h-28" />
        <ListStateSkeleton items={4} heightClass="h-24" />
      </div>
    );
  }

  if (query.isError || !query.data) {
    const error = query.error ? toAppError(query.error) : null;
    const isNotFound = error?.statusCode === 404 || error?.code === "conversationNotFound";
    return (
      <StateCard
        title={
          isNotFound
            ? t("common.states.conversationNotFound.heading")
            : t("common.states.conversationError.heading")
        }
        note={
          isNotFound
            ? t("common.states.conversationNotFound.note")
            : t("common.states.conversationError.note")
        }
        action={{
          label: t("common.actions.goBack"),
          href: backHref,
        }}
      />
    );
  }

  const conversation = query.data.item;
  const counterpartName =
    scope === "patient"
      ? conversation.practitioner.displayName ?? t("common.fallbacks.practitioner")
      : conversation.patient.displayName ?? t("common.fallbacks.patient");

  return (
    <div className="space-y-5">
      <section className="app-panel rounded-[28px] p-5 sm:p-6">
        <Link
          href={backHref as never}
          className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          {t("common.actions.goBack")}
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              {t(`common.scopeEyebrows.${scope}` as Parameters<typeof t>[0])}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary dark:text-white/95 sm:text-3xl">
              {t(`common.conversationTitles.${scope}` as Parameters<typeof t>[0], {
                name: counterpartName,
              })}
            </h1>
            <p className="mt-2 text-sm leading-6 text-text-secondary">
              {t(
                `common.conversationStateNotes.${getCareChatConversationStateKey(conversation.status)}` as Parameters<typeof t>[0],
              )}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <CareChatActivityChip activityState={conversation.activityState} />
            <span className="app-chip rounded-full px-3 py-1 text-xs font-medium">
              {t(`common.conversationStatuses.${conversation.status}` as Parameters<typeof t>[0])}
            </span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3 text-xs text-text-muted">
          {conversation.relatedSessionId ? (
            <span className="font-mono">
              {t("common.relatedSessionShort", { id: conversation.relatedSessionId })}
            </span>
          ) : null}
          {conversation.expiresAt ? (
            <span>
              {t("common.expiresAt", {
                date: formatCareChatDateTime(conversation.expiresAt, locale),
              })}
            </span>
          ) : null}
          {conversation.closedAt ? (
            <span>
              {t("common.closedAt", {
                date: formatCareChatDateTime(conversation.closedAt, locale),
              })}
            </span>
          ) : null}
        </div>
      </section>

      <section className="app-panel rounded-[28px] p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-text-primary dark:text-white/95">
              {t("common.thread.heading")}
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              {scope === "admin"
                ? t("admin.conversation.readOnlyNote")
                : t("common.thread.note")}
            </p>
          </div>
          <span className="app-chip rounded-full px-3 py-1 text-xs font-medium">
            {t("common.thread.count", { value: conversation.messages.length })}
          </span>
        </div>

        {conversation.messages.length > 0 ? (
          <div className="mt-5 space-y-3">
            {conversation.messages.map((entry) => {
              const fromCurrentActor = getCareChatSenderAlignment(entry.senderRole, scope);
              return (
                <div
                  key={entry.id}
                  className={`flex ${fromCurrentActor ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[90%] rounded-[24px] px-4 py-3 sm:max-w-[78%] ${
                      fromCurrentActor
                        ? "bg-primary text-white"
                        : "app-panel-soft text-text-primary dark:text-white/90"
                    }`}
                  >
                    <p
                      className={`text-xs font-semibold ${
                        fromCurrentActor ? "text-white/80" : "text-primary"
                      }`}
                    >
                      {t(`common.senderRoles.${entry.senderRole}` as Parameters<typeof t>[0])}
                    </p>
                    <p
                      className={`mt-2 text-sm leading-6 ${
                        fromCurrentActor
                          ? "text-white"
                          : "text-text-primary dark:text-white/90"
                      }`}
                    >
                      {entry.message}
                    </p>
                    <p
                      className={`mt-2 text-[11px] ${
                        fromCurrentActor ? "text-white/75" : "text-text-muted"
                      }`}
                    >
                      {formatCareChatDateTime(entry.createdAt, locale)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-5">
            <StateCard
              icon={<MessageSquareText className="h-5 w-5 text-primary" />}
              title={t("common.thread.empty.heading")}
              note={t("common.thread.empty.note")}
              centered={false}
              className="rounded-[24px] p-5"
            />
          </div>
        )}
      </section>

      {scope !== "admin" ? (
        <section className="app-panel rounded-[28px] p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-text-primary dark:text-white/95">
            {t("common.compose.heading")}
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            {conversation.canSendMessage
              ? t("common.compose.note")
              : t("common.compose.blockedNote")}
          </p>

          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <textarea
              rows={5}
              maxLength={4000}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={t("common.compose.placeholder")}
              disabled={!conversation.canSendMessage}
              className="w-full rounded-[24px] border border-border-light bg-white px-4 py-3 text-sm leading-6 text-text-primary outline-none ring-0 transition placeholder:text-text-muted focus:border-primary/35 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white/5 dark:text-white"
            />

            {sendMutation.isError ? (
              <p className="text-sm text-rose-600 dark:text-rose-400">
                {t(
                  getCareChatErrorKey(sendMutation.error) as Parameters<typeof t>[0],
                )}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={
                sendMutation.isPending ||
                message.trim().length === 0 ||
                !conversation.canSendMessage
              }
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sendMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("common.compose.submitting")}
                </>
              ) : (
                <>
                  <SendHorizonal className="h-4 w-4" />
                  {t("common.compose.submit")}
                </>
              )}
            </button>
          </form>
        </section>
      ) : null}
    </div>
  );
}
