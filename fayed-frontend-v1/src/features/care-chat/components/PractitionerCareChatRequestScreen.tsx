"use client";

import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, MessageSquareText } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import { toAppError } from "@/lib/api/errors";
import { usePractitionerCareChatRequest } from "../hooks/use-care-chat";
import { CareChatRequestStatusChip } from "./CareChatStatusChip";
import {
  formatCareChatDateTime,
  getCareChatRequestStateKey,
} from "../lib/care-chat-ui";

type Props = {
  requestId: string;
};

export default function PractitionerCareChatRequestScreen({ requestId }: Props) {
  const t = useTranslations("care-chat");
  const locale = useLocale();
  const request = usePractitionerCareChatRequest(requestId);

  if (request.isLoading) {
    return <ListStateSkeleton items={3} heightClass="h-32" />;
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
          href: "/practitioner/care-chat",
        }}
      />
    );
  }

  const item = request.data.item;
  const patientName = item.patient.displayName ?? t("common.fallbacks.patient");

  return (
    <div className="mx-auto max-w-4xl space-y-5 sm:space-y-6">
      <section className="app-panel rounded-[32px] p-5 sm:p-7">
        <Link
          href="/practitioner/care-chat"
          className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          {t("common.actions.backToRequests")}
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              {t("practitioner.detail.eyebrow")}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary dark:text-white/95 sm:text-3xl">
              {t("practitioner.detail.title", { name: patientName })}
            </h1>
            <p className="mt-2 text-sm leading-6 text-text-secondary">
              {t(
                `common.requestStateNotes.${getCareChatRequestStateKey(item.status)}` as Parameters<typeof t>[0],
              )}
            </p>
          </div>
          <CareChatRequestStatusChip status={item.status} />
        </div>
      </section>

      <section className="app-panel rounded-[32px] p-5 sm:p-7">
        <h2 className="text-lg font-semibold text-text-primary dark:text-white/95">
          {t("practitioner.detail.requestHeading")}
        </h2>
        <div className="mt-4 space-y-3 text-sm text-text-secondary">
          <p>
            <span className="font-medium text-text-primary dark:text-white/90">
              {t("practitioner.detail.requestedAtLabel")}:
            </span>{" "}
            {formatCareChatDateTime(item.requestedAt, locale)}
          </p>
          {item.reviewedAt ? (
            <p>
              <span className="font-medium text-text-primary dark:text-white/90">
                {t("practitioner.detail.reviewedAtLabel")}:
              </span>{" "}
              {formatCareChatDateTime(item.reviewedAt, locale)}
            </p>
          ) : null}
          {item.expiresAt ? (
            <p>
              <span className="font-medium text-text-primary dark:text-white/90">
                {t("practitioner.detail.expiresAtLabel")}:
              </span>{" "}
              {formatCareChatDateTime(item.expiresAt, locale)}
            </p>
          ) : null}
          {item.reason ? (
            <p>
              <span className="font-medium text-text-primary dark:text-white/90">
                {t("practitioner.detail.reasonLabel")}:
              </span>{" "}
              {item.reason}
            </p>
          ) : null}
        </div>
      </section>

      {item.linkedConversationId ? (
        <section className="app-panel-soft rounded-[32px] p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-light text-primary dark:bg-primary/15 dark:text-primary-light">
              <MessageSquareText className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-text-primary dark:text-white/95">
                {t("practitioner.detail.conversationHeading")}
              </h2>
              <p className="mt-1 text-sm leading-6 text-text-secondary">
                {t("practitioner.detail.conversationNote")}
              </p>
              <Link
                href={
                  `/practitioner/care-chat/conversations/${item.linkedConversationId}` as never
                }
                className="mt-3 inline-flex text-sm font-medium text-primary hover:underline"
              >
                {t("practitioner.detail.openConversation")}
              </Link>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
