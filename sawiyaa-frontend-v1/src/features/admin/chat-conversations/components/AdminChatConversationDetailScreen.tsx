"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import {
  ArrowDownToLine,
  ArrowLeft,
  CalendarDays,
  Clock3,
  FileText,
  MessageSquareText,
  ShieldCheck,
  ShieldX,
} from "lucide-react";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import TextArea from "@/components/form/input/TextArea";
import { FormModal } from "@/components/ui/modal";
import {
  ListStateSkeleton,
  StateCard,
} from "@/components/shared/ContentStates";
import {
  AdminPageHeader,
  AdminSectionCard,
  AdminStatusBadge,
} from "@/components/shared/admin/AdminDashboardKit";
import {
  AdminSummaryCard,
  AdminSummaryCardsRow,
} from "@/components/shared/admin/AdminOperationalListShell";
import { cn } from "@/lib/utils";
import { PermissionKey } from "@/lib/auth/permissions";
import { useCurrentUserPermissions } from "@/features/users/hooks/use-users";
import { useMySettings } from "@/features/settings/hooks/use-settings";
import { Link } from "@/i18n/navigation";
import {
  useAdminChatConversation,
  useAdminChatConversationMessages,
  useDisableAdminChatConversation,
  useEnableAdminChatConversation,
} from "../hooks/use-admin-chat-conversations";
import {
  formatChatConversationDate,
  formatChatConversationDateTime,
  formatChatConversationFileSize,
  formatChatConversationTime,
  getChatConversationClosedByTone,
  getChatConversationPreviewTypeTone,
  getChatConversationStatusTone,
} from "../lib/admin-chat-conversations";
import type {
  AdminChatConversationAttachment,
  AdminChatConversationDetailItem,
  AdminChatConversationMessage,
  AdminChatConversationSenderRole,
} from "../types/admin-chat-conversations.types";

const MESSAGE_PAGE_SIZE = 50;

type MessageRun = {
  key: string;
  senderRole: AdminChatConversationSenderRole;
  senderName: string | null;
  items: AdminChatConversationMessage[];
};

type DayGroup = {
  dateKey: string;
  label: string;
  runs: MessageRun[];
};

function getStatusLabel(
  t: ReturnType<typeof useTranslations>,
  item: AdminChatConversationDetailItem,
) {
  if (item.status === "SENDING_DISABLED") {
    if (item.moderationState.closedBy === "ADMIN") {
      return t("status.SENDING_DISABLED");
    }
    if (item.moderationState.closedBy === "PRACTITIONER") {
      return t("status.CLOSED_BY_PRACTITIONER");
    }
    return t("status.SENDING_DISABLED");
  }

  return t(`status.${item.status}` as Parameters<typeof t>[0]);
}

function getPreviewTypeLabel(
  t: ReturnType<typeof useTranslations>,
  item: AdminChatConversationDetailItem,
) {
  return t(
    `previewType.${item.lastMessagePreviewType}` as Parameters<typeof t>[0],
  );
}

function getSenderRoleLabel(
  t: ReturnType<typeof useTranslations>,
  senderRole: AdminChatConversationMessage["senderRole"],
) {
  return t(`senderRole.${senderRole}` as Parameters<typeof t>[0]);
}

function getAttachmentLabel(
  attachment: AdminChatConversationAttachment,
  locale: string,
  fallbackName: string,
) {
  const name = attachment.originalName?.trim() || fallbackName;
  const size = formatChatConversationFileSize(attachment.fileSize, locale);
  return { name, size };
}

function getAttachmentTypeLabel(attachment: AdminChatConversationAttachment) {
  const filename = attachment.originalName?.trim();
  if (filename && filename.includes(".")) {
    return filename.split(".").pop()?.toUpperCase() || null;
  }

  const subtype = attachment.mimeType?.split("/")[1]?.trim();
  return subtype ? subtype.toUpperCase() : null;
}

function groupMessagesByDay(
  messages: AdminChatConversationMessage[],
  locale: string,
  timeZone?: string | null,
): DayGroup[] {
  const ordered = [...messages].sort(
    (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime(),
  );
  const groups = new Map<string, DayGroup>();

  for (const message of ordered) {
    const dateKey = formatChatConversationDate(
      message.sentAt,
      locale,
      timeZone,
    );
    let dayGroup = groups.get(dateKey);

    if (!dayGroup) {
      dayGroup = {
        dateKey,
        label: dateKey,
        runs: [],
      };
      groups.set(dateKey, dayGroup);
    }

    const senderKey =
      message.senderRole === "SYSTEM"
        ? "SYSTEM"
        : `${message.senderRole}:${message.senderName ?? ""}`;

    const lastRun = dayGroup.runs[dayGroup.runs.length - 1];
    if (lastRun && lastRun.key === senderKey) {
      lastRun.items.push(message);
      continue;
    }

    dayGroup.runs.push({
      key: senderKey,
      senderRole: message.senderRole,
      senderName: message.senderName,
      items: [message],
    });
  }

  return Array.from(groups.values());
}

function AttachmentPill({
  attachment,
  canReadAttachments,
  fallbackName,
  locale,
  t,
}: {
  attachment: AdminChatConversationAttachment;
  canReadAttachments: boolean;
  fallbackName: string;
  locale: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const { name, size } = getAttachmentLabel(attachment, locale, fallbackName);
  const typeLabel = getAttachmentTypeLabel(attachment);

  if (!canReadAttachments) {
    return (
      <div className="border-border-light bg-surface-secondary/80 flex items-center gap-3 rounded-2xl border px-3 py-2.5">
        <div className="bg-surface-tertiary text-text-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
          <FileText className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-text-primary truncate text-sm font-medium">
            {t("detail.attachment.restricted")}
          </p>
          <p className="text-text-muted mt-1 text-xs">
            {t("detail.attachment.restrictedHint")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <a
      href={attachment.fileUrl}
      target="_blank"
      rel="noreferrer"
      className="group border-border-light hover:border-primary/30 hover:bg-primary-light/20 flex items-center gap-3 rounded-2xl border bg-white px-3 py-2.5 transition"
    >
      <div className="bg-primary-light text-text-brand group-hover:bg-primary-light-hover flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition">
        <FileText className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-text-primary truncate text-sm font-semibold">
            {name}
          </p>
          {typeLabel ? (
            <span className="border-border-light bg-surface-secondary text-text-muted rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-[0.16em] uppercase">
              {typeLabel}
            </span>
          ) : null}
        </div>
        <p className="text-text-muted mt-1 text-xs">{size}</p>
      </div>
      <ArrowDownToLine className="text-text-muted group-hover:text-primary h-4 w-4 shrink-0 transition" />
    </a>
  );
}

function MessageBubble({
  t,
  locale,
  timeZone,
  canReadAttachments,
  message,
}: {
  t: ReturnType<typeof useTranslations>;
  locale: string;
  timeZone?: string | null;
  canReadAttachments: boolean;
  message: AdminChatConversationMessage;
}) {
  const isSystem = message.senderRole === "SYSTEM";
  const isPatient = message.senderRole === "PATIENT";
  const body =
    message.body.trim().length > 0 ? message.body : t("detail.noText");

  const alignClass = isSystem
    ? "items-center"
    : isPatient
      ? "items-end"
      : "items-start";
  const bubbleClass = isSystem
    ? "w-full max-w-[52rem] border-dashed border-border-light bg-surface-tertiary text-text-secondary"
    : isPatient
      ? "w-fit min-w-[9rem] max-w-[min(36rem,82%)] border-primary/20 bg-primary-light/80 text-text-primary shadow-[0_14px_28px_-24px_rgba(68,161,148,0.22)]"
      : "w-fit min-w-[9rem] max-w-[min(36rem,82%)] border-border-light bg-white text-text-primary shadow-[0_14px_28px_-24px_rgba(34,52,56,0.14)]";

  return (
    <article className={cn("flex flex-col gap-2", alignClass)}>
      {isSystem ? (
        <div className="flex w-full justify-center">
          <div
            className={cn(
              "w-full rounded-[22px] border px-4 py-3 sm:px-5 sm:py-4",
              bubbleClass,
            )}
          >
            <div className="text-text-muted flex items-center justify-center gap-2 text-xs font-semibold tracking-[0.18em] uppercase">
              <span className="bg-border-light h-px w-8" />
              {t("senderRole.SYSTEM")}
              <span className="bg-border-light h-px w-8" />
            </div>
            <p className="text-text-secondary mt-3 text-center text-sm leading-7 whitespace-pre-wrap">
              {body}
            </p>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "w-fit rounded-[22px] border px-4 py-3.5 sm:px-5 sm:py-4",
            bubbleClass,
          )}
        >
          <p className="text-sm leading-7 break-words whitespace-pre-wrap">
            {body}
          </p>

          {message.attachments.length > 0 ? (
            <div className="mt-3 space-y-2">
              <p className="text-text-muted text-[11px] font-semibold tracking-[0.18em] uppercase">
                {t("detail.attachment.heading")}
              </p>
              <div className="space-y-2">
                {message.attachments.map((attachment) => (
                  <AttachmentPill
                    key={attachment.fileId}
                    attachment={attachment}
                    canReadAttachments={canReadAttachments}
                    fallbackName={t("detail.attachment.fallbackName")}
                    locale={locale}
                    t={t}
                  />
                ))}
              </div>
            </div>
          ) : null}

          <div
            className={cn(
              "text-text-muted mt-3 flex items-center gap-1.5 text-[11px]",
              isPatient ? "justify-end" : "justify-start",
            )}
          >
            <Clock3 className="h-3.5 w-3.5" />
            {formatChatConversationTime(message.sentAt, locale, timeZone)}
          </div>
        </div>
      )}
    </article>
  );
}

function MessageRunBlock({
  t,
  locale,
  timeZone,
  canReadAttachments,
  run,
}: {
  t: ReturnType<typeof useTranslations>;
  locale: string;
  timeZone?: string | null;
  canReadAttachments: boolean;
  run: MessageRun;
}) {
  const isSystem = run.senderRole === "SYSTEM";
  const label =
    run.senderRole === "PATIENT"
      ? t("summary.patient")
      : run.senderRole === "PRACTITIONER"
        ? t("summary.practitioner")
        : t("senderRole.SYSTEM");

  return (
    <div
      className={cn(
        "flex flex-col gap-2",
        isSystem
          ? "items-center"
          : run.senderRole === "PATIENT"
            ? "items-end"
            : "items-start",
      )}
    >
      {!isSystem ? (
        <div
          className={cn(
            "text-text-muted flex items-center gap-2 text-[11px]",
            run.senderRole === "PATIENT" ? "justify-end" : "justify-start",
          )}
        >
          <span className="border-border-light text-text-muted rounded-full border bg-white px-2.5 py-1 font-semibold tracking-[0.16em] uppercase">
            {label}
          </span>
          {run.senderName ? (
            <span className="truncate font-medium">{run.senderName}</span>
          ) : null}
        </div>
      ) : null}

      <div
        className={cn(
          "flex w-full flex-col gap-2",
          isSystem
            ? "items-center"
            : run.senderRole === "PATIENT"
              ? "items-end"
              : "items-start",
        )}
      >
        {run.items.map((message, index) => (
          <MessageBubble
            key={message.messageId}
            t={t}
            locale={locale}
            timeZone={timeZone}
            canReadAttachments={canReadAttachments}
            message={message}
          />
        ))}
      </div>
    </div>
  );
}

function TranscriptDayGroup({
  t,
  locale,
  timeZone,
  canReadAttachments,
  group,
}: {
  t: ReturnType<typeof useTranslations>;
  locale: string;
  timeZone?: string | null;
  canReadAttachments: boolean;
  group: DayGroup;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="bg-border-light h-px flex-1" />
        <p className="border-border-light text-text-muted rounded-full border bg-white px-3 py-1 text-[11px] font-semibold tracking-[0.18em] uppercase shadow-[0_8px_18px_-18px_rgba(34,52,56,0.18)]">
          {group.label}
        </p>
        <span className="bg-border-light h-px flex-1" />
      </div>

      <div className="space-y-3">
        {group.runs.map((run) => (
          <MessageRunBlock
            key={run.key + run.items[0]?.messageId}
            t={t}
            locale={locale}
            timeZone={timeZone}
            canReadAttachments={canReadAttachments}
            run={run}
          />
        ))}
      </div>
    </section>
  );
}

export default function AdminChatConversationDetailScreen({
  conversationId,
}: {
  conversationId: string;
}) {
  const t = useTranslations("admin-chat-conversations");
  const locale = useLocale();
  const settingsQuery = useMySettings();
  const viewerTimeZone = settingsQuery.data?.item.preferences.timezone;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: permissionData } = useCurrentUserPermissions(true);
  const permissions = useMemo(
    () => new Set(permissionData?.permissions ?? []),
    [permissionData?.permissions],
  );
  const canModerate = permissions.has(
    PermissionKey.CHAT_CONVERSATIONS_MODERATE,
  );
  const canReadAttachments = permissions.has(
    PermissionKey.CHAT_ATTACHMENTS_READ,
  );

  const conversationQuery = useAdminChatConversation(conversationId);
  const messagesQuery = useAdminChatConversationMessages(conversationId, {
    page: 1,
    limit: MESSAGE_PAGE_SIZE,
  });
  const disableMutation = useDisableAdminChatConversation(conversationId);
  const enableMutation = useEnableAdminChatConversation(conversationId);

  const [isDisableOpen, setIsDisableOpen] = useState(false);
  const [isEnableOpen, setIsEnableOpen] = useState(false);
  const [disableReason, setDisableReason] = useState("");
  const [disableNote, setDisableNote] = useState("");
  const [enableNote, setEnableNote] = useState("");

  const action = searchParams.get("action");
  const conversation = conversationQuery.data?.item ?? null;
  const adminLockActive = conversation?.adminLockState.isActive ?? false;
  const conversationStatus = conversation?.status ?? null;
  const messagesPagination = messagesQuery.data?.pagination ?? null;

  const clearActionQuery = useCallback(() => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("action");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }, [pathname, router, searchParams]);

  useEffect(() => {
    if (action === "disable") {
      if (canModerate && conversationStatus === "ACTIVE") {
        const timeout = window.setTimeout(() => {
          setDisableReason("");
          setDisableNote("");
          setIsDisableOpen(true);
        }, 0);

        clearActionQuery();
        return () => window.clearTimeout(timeout);
      }
      clearActionQuery();
      return;
    }

    if (action === "enable") {
      if (canModerate && adminLockActive) {
        const timeout = window.setTimeout(() => {
          setEnableNote("");
          setIsEnableOpen(true);
        }, 0);

        clearActionQuery();
        return () => window.clearTimeout(timeout);
      }
      clearActionQuery();
    }
  }, [
    action,
    adminLockActive,
    canModerate,
    clearActionQuery,
    conversationStatus,
  ]);

  const messages = useMemo(
    () => messagesQuery.data?.items ?? [],
    [messagesQuery.data?.items],
  );
  const groupedMessages = useMemo(
    () => groupMessagesByDay(messages, locale, viewerTimeZone),
    [locale, messages, viewerTimeZone],
  );

  const conversationStatusBadge = conversation ? (
    <AdminStatusBadge tone={getChatConversationStatusTone(conversation.status)}>
      {getStatusLabel(t, conversation)}
    </AdminStatusBadge>
  ) : null;

  const openDisableModal = () => {
    setDisableReason("");
    setDisableNote("");
    setIsDisableOpen(true);
  };

  const openEnableModal = () => {
    setEnableNote("");
    setIsEnableOpen(true);
  };

  const handleDisable = async () => {
    if (!disableReason.trim()) {
      return;
    }

    await disableMutation.mutateAsync({
      reason: disableReason.trim(),
      note: disableNote.trim() || undefined,
    });
    setIsDisableOpen(false);
    clearActionQuery();
  };

  const handleEnable = async () => {
    await enableMutation.mutateAsync({
      note: enableNote.trim() || undefined,
    });
    setIsEnableOpen(false);
    clearActionQuery();
  };

  if (conversationQuery.isLoading) {
    return <ListStateSkeleton items={3} heightClass="h-40" />;
  }

  if (conversationQuery.isError || !conversation) {
    return (
      <StateCard
        centered
        title={t("errors.detail.title")}
        note={t("errors.detail.description")}
        action={{
          label: t("errors.retry"),
          onClick: () => void conversationQuery.refetch(),
        }}
      />
    );
  }

  const canDisableSending = canModerate && conversation.status === "ACTIVE";
  const canEnableSending = canModerate && conversation.adminLockState.isActive;
  const practitionerLockActive = conversation.practitionerLockState.isActive;
  const sendingTone = conversation.canSendMessage ? "success" : "warning";

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow={t("page.eyebrow")}
        title={t("detail.title")}
        description={t("detail.description")}
        meta={conversationStatusBadge}
        actions={
          <>
            <Link
              href="/admin/chat-conversations"
              className="border-border-light text-text-primary hover:border-primary/30 hover:text-primary inline-flex items-center gap-2 rounded-2xl border bg-white px-4 py-2.5 text-sm font-medium transition"
            >
              <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
              {t("actions.back")}
            </Link>

            {canDisableSending ? (
              <Button
                variant="danger"
                startIcon={<ShieldX className="h-4 w-4" />}
                onClick={openDisableModal}
                data-admin-chat-disable
              >
                {t("actions.disableSending")}
              </Button>
            ) : null}

            {canEnableSending ? (
              <Button
                variant="primary"
                startIcon={<ShieldCheck className="h-4 w-4" />}
                onClick={openEnableModal}
                data-admin-chat-enable
              >
                {t("actions.enableSending")}
              </Button>
            ) : null}
          </>
        }
      />

      <AdminSummaryCardsRow>
        <AdminSummaryCard
          label={t("summary.patient")}
          value={conversation.patient.displayName ?? t("common.unknownPatient")}
          hint={conversation.patient.email ?? t("common.noEmail")}
          tone="neutral"
        />
        <AdminSummaryCard
          label={t("summary.practitioner")}
          value={
            conversation.practitioner.displayName ??
            t("common.unknownPractitioner")
          }
          hint={conversation.practitioner.email ?? t("common.noEmail")}
          tone="neutral"
        />
        <AdminSummaryCard
          label={t("summary.session")}
          value={conversation.session.sessionCode}
          hint={`${formatChatConversationDateTime(conversation.session.sessionDateTime, locale, viewerTimeZone)} · ${t(
            `status.${conversation.status}` as Parameters<typeof t>[0],
          )}`}
          tone="primary"
        />
        <AdminSummaryCard
          label={t("summary.sending")}
          value={
            conversation.canSendMessage
              ? t("summary.sendingAllowed")
              : t("summary.sendingBlocked")
          }
          hint={getPreviewTypeLabel(t, conversation)}
          tone={sendingTone}
        />
      </AdminSummaryCardsRow>

      <div className="grid gap-5 xl:grid-cols-[minmax(300px,320px)_minmax(0,2.25fr)] xl:items-start">
        <aside className="space-y-5 xl:sticky xl:top-6">
          <AdminSectionCard
            eyebrow={t("detail.sections.moderation")}
            title={t("detail.moderation.title")}
            description={t("detail.moderation.description")}
          >
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <dl className="bg-surface-secondary/70 rounded-[22px] p-4">
                <dt className="text-text-muted text-xs font-semibold tracking-[0.18em] uppercase">
                  {t("detail.moderation.canSend")}
                </dt>
                <dd className="mt-3">
                  <AdminStatusBadge
                    tone={conversation.canSendMessage ? "success" : "warning"}
                  >
                    {conversation.canSendMessage
                      ? t("common.yes")
                      : t("common.no")}
                  </AdminStatusBadge>
                </dd>
              </dl>

              <dl className="bg-surface-secondary/70 rounded-[22px] p-4">
                <dt className="text-text-muted text-xs font-semibold tracking-[0.18em] uppercase">
                  {t("detail.moderation.adminLock")}
                </dt>
                <dd className="mt-3 space-y-2">
                  <AdminStatusBadge
                    tone={
                      conversation.adminLockState.isActive
                        ? "warning"
                        : "neutral"
                    }
                  >
                    {conversation.adminLockState.isActive
                      ? t("common.yes")
                      : t("common.no")}
                  </AdminStatusBadge>
                  {conversation.adminLockState.disabledReason ? (
                    <p className="text-text-secondary text-sm leading-6">
                      {conversation.adminLockState.disabledReason}
                    </p>
                  ) : null}
                  {conversation.adminLockState.disabledAt ? (
                    <p className="text-text-muted text-xs">
                      {t("detail.moderation.disabledAt", {
                        value: formatChatConversationDateTime(
                          conversation.adminLockState.disabledAt,
                          locale,
                          viewerTimeZone,
                        ),
                      })}
                    </p>
                  ) : null}
                  {conversation.adminLockState.disabledByUserId ? (
                    <p className="text-text-muted font-mono text-xs">
                      {t("detail.moderation.disabledBy", {
                        value: conversation.adminLockState.disabledByUserId,
                      })}
                    </p>
                  ) : null}
                </dd>
              </dl>

              <dl className="bg-surface-secondary/70 rounded-[22px] p-4">
                <dt className="text-text-muted text-xs font-semibold tracking-[0.18em] uppercase">
                  {t("detail.moderation.practitionerLock")}
                </dt>
                <dd className="mt-3 space-y-2">
                  <AdminStatusBadge
                    tone={
                      conversation.practitionerLockState.isActive
                        ? "danger"
                        : "neutral"
                    }
                  >
                    {conversation.practitionerLockState.isActive
                      ? t("common.yes")
                      : t("common.no")}
                  </AdminStatusBadge>
                  {conversation.practitionerLockState.disabledReason ? (
                    <p className="text-text-secondary text-sm leading-6">
                      {conversation.practitionerLockState.disabledReason}
                    </p>
                  ) : null}
                  {conversation.practitionerLockState.disabledAt ? (
                    <p className="text-text-muted text-xs">
                      {t("detail.moderation.disabledAt", {
                        value: formatChatConversationDateTime(
                          conversation.practitionerLockState.disabledAt,
                          locale,
                          viewerTimeZone,
                        ),
                      })}
                    </p>
                  ) : null}
                  {conversation.practitionerLockState.disabledByUserId ? (
                    <p className="text-text-muted font-mono text-xs">
                      {t("detail.moderation.disabledBy", {
                        value:
                          conversation.practitionerLockState.disabledByUserId,
                      })}
                    </p>
                  ) : null}
                </dd>
              </dl>

              <dl className="bg-surface-secondary/70 rounded-[22px] p-4 sm:col-span-2 xl:col-span-1">
                <dt className="text-text-muted text-xs font-semibold tracking-[0.18em] uppercase">
                  {t("detail.moderation.closedBy")}
                </dt>
                <dd className="mt-3">
                  <AdminStatusBadge
                    tone={getChatConversationClosedByTone(
                      conversation.moderationState.closedBy,
                    )}
                  >
                    {conversation.moderationState.closedBy
                      ? t(
                          `closedBy.${conversation.moderationState.closedBy}` as Parameters<
                            typeof t
                          >[0],
                        )
                      : t("common.notApplicable")}
                  </AdminStatusBadge>
                </dd>
              </dl>
            </div>

            {practitionerLockActive ? (
              <div className="border-warning-200 bg-warning-50 text-warning-800 mt-4 rounded-[22px] border px-4 py-3 text-sm leading-6">
                {t("detail.moderation.practitionerLockNote")}
              </div>
            ) : null}
          </AdminSectionCard>

          <AdminSectionCard
            eyebrow={t("detail.sections.history")}
            title={t("detail.history.title")}
            description={t("detail.history.description")}
          >
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <dl className="bg-surface-secondary/70 rounded-[22px] p-4">
                <dt className="text-text-muted inline-flex items-center gap-2 text-xs font-semibold tracking-[0.18em] uppercase">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {t("detail.history.lastMessageAt")}
                </dt>
                <dd className="text-text-primary mt-3 text-sm font-medium">
                  {formatChatConversationDateTime(
                    conversation.lastMessageAt,
                    locale,
                    viewerTimeZone,
                  )}
                </dd>
              </dl>
              <dl className="bg-surface-secondary/70 rounded-[22px] p-4">
                <dt className="text-text-muted inline-flex items-center gap-2 text-xs font-semibold tracking-[0.18em] uppercase">
                  <Clock3 className="h-3.5 w-3.5" />
                  {t("detail.history.createdAt")}
                </dt>
                <dd className="text-text-primary mt-3 text-sm font-medium">
                  {formatChatConversationDateTime(
                    conversation.createdAt,
                    locale,
                    viewerTimeZone,
                  )}
                </dd>
              </dl>
              <dl className="bg-surface-secondary/70 rounded-[22px] p-4">
                <dt className="text-text-muted inline-flex items-center gap-2 text-xs font-semibold tracking-[0.18em] uppercase">
                  <Clock3 className="h-3.5 w-3.5" />
                  {t("detail.history.updatedAt")}
                </dt>
                <dd className="text-text-primary mt-3 text-sm font-medium">
                  {formatChatConversationDateTime(
                    conversation.updatedAt,
                    locale,
                    viewerTimeZone,
                  )}
                </dd>
              </dl>
              <dl className="bg-surface-secondary/70 rounded-[22px] p-4">
                <dt className="text-text-muted inline-flex items-center gap-2 text-xs font-semibold tracking-[0.18em] uppercase">
                  <MessageSquareText className="h-3.5 w-3.5" />
                  {t("detail.history.preview")}
                </dt>
                <dd className="mt-3">
                  <AdminStatusBadge
                    tone={getChatConversationPreviewTypeTone(
                      conversation.lastMessagePreviewType,
                    )}
                  >
                    {getPreviewTypeLabel(t, conversation)}
                  </AdminStatusBadge>
                </dd>
              </dl>
            </div>
          </AdminSectionCard>
        </aside>

        <section
          data-admin-chat-transcript
          className="border-border-light flex min-h-0 flex-col overflow-hidden rounded-[28px] border bg-white shadow-[0_18px_42px_-32px_rgba(34,52,56,0.24)] xl:sticky xl:top-6 xl:h-[calc(100dvh-12rem)]"
        >
          <div className="border-border-light border-b px-4 py-4 sm:px-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-primary text-xs font-semibold tracking-[0.18em] uppercase">
                  {t("detail.sections.transcript")}
                </p>
                <h2 className="text-text-primary mt-1 text-[1.45rem] font-semibold tracking-[-0.02em]">
                  {t("detail.transcript.title")}
                </h2>
                <p className="text-text-secondary mt-2 max-w-3xl text-sm leading-6">
                  {t("detail.transcript.description", {
                    value: messagesPagination?.totalItems ?? messages.length,
                  })}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <AdminStatusBadge tone="primary">
                  {t("columns.messages")}: {conversation.messagesCount}
                </AdminStatusBadge>
                <AdminStatusBadge tone="neutral">
                  {t("columns.attachments")}: {conversation.attachmentsCount}
                </AdminStatusBadge>
                <AdminStatusBadge
                  tone={getChatConversationPreviewTypeTone(
                    conversation.lastMessagePreviewType,
                  )}
                >
                  {getPreviewTypeLabel(t, conversation)}
                </AdminStatusBadge>
              </div>
            </div>
          </div>

          <div
            data-admin-chat-transcript-scroll
            className="custom-scrollbar min-h-0 flex-1 overflow-y-auto bg-[linear-gradient(180deg,rgba(247,249,251,0.9)_0%,rgba(255,255,255,1)_42%,rgba(255,255,255,1)_100%)] px-3 py-4 sm:px-5 sm:py-6"
          >
            <div
              dir="ltr"
              className="mx-auto flex w-full max-w-[68rem] flex-col space-y-6 px-2 sm:px-4"
            >
              {messagesQuery.isLoading ? (
                <ListStateSkeleton items={4} heightClass="h-32" />
              ) : messagesQuery.isError ? (
                <StateCard
                  centered
                  title={t("errors.messages.title")}
                  note={t("errors.messages.description")}
                  action={{
                    label: t("errors.retry"),
                    onClick: () => void messagesQuery.refetch(),
                  }}
                />
              ) : groupedMessages.length > 0 ? (
                groupedMessages.map((group) => (
                  <TranscriptDayGroup
                    key={group.dateKey}
                    t={t}
                    locale={locale}
                    timeZone={viewerTimeZone}
                    canReadAttachments={canReadAttachments}
                    group={group}
                  />
                ))
              ) : (
                <div className="border-border-light flex min-h-[18rem] items-center justify-center rounded-[24px] border border-dashed bg-white px-6 py-12 text-center">
                  <div className="max-w-md space-y-3">
                    <div className="bg-primary-light text-text-brand mx-auto flex h-12 w-12 items-center justify-center rounded-full">
                      <MessageSquareText className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-text-primary text-sm font-semibold">
                        {t("detail.empty.title")}
                      </p>
                      <p className="text-text-secondary mt-2 text-sm leading-6">
                        {t("detail.empty.description")}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {messagesPagination && messagesPagination.totalPages > 1 ? (
              <p className="text-text-muted mt-5 text-xs">
                {t("detail.pagination.note", {
                  value: messagesPagination.totalItems,
                })}
              </p>
            ) : null}
          </div>
        </section>
      </div>

      <FormModal
        isOpen={isDisableOpen}
        onClose={() => {
          setIsDisableOpen(false);
          clearActionQuery();
        }}
        title={t("modals.disable.title")}
        description={t("modals.disable.description")}
        loading={disableMutation.isPending}
        submitDisabled={!disableReason.trim()}
        submitLabel={t("modals.disable.submit")}
        cancelLabel={t("modals.common.cancel")}
        onSubmit={() => void handleDisable()}
      >
        <div className="space-y-4">
          <p className="border-warning-200 bg-warning-50 text-warning-800 rounded-2xl border px-4 py-3 text-sm leading-6">
            {t("modals.disable.warning")}
          </p>
          <div>
            <Label
              htmlFor="disable-reason"
              className="text-text-muted mb-2 block text-xs font-semibold tracking-[0.18em] uppercase"
            >
              {t("modals.disable.reason")}
            </Label>
            <TextArea
              id="disable-reason"
              rows={4}
              value={disableReason}
              onChange={setDisableReason}
              placeholder={t("modals.disable.reasonPlaceholder")}
            />
          </div>
          <div>
            <Label
              htmlFor="disable-note"
              className="text-text-muted mb-2 block text-xs font-semibold tracking-[0.18em] uppercase"
            >
              {t("modals.disable.note")}
            </Label>
            <TextArea
              id="disable-note"
              rows={3}
              value={disableNote}
              onChange={setDisableNote}
              placeholder={t("modals.disable.notePlaceholder")}
            />
          </div>
        </div>
      </FormModal>

      <FormModal
        isOpen={isEnableOpen}
        onClose={() => {
          setIsEnableOpen(false);
          clearActionQuery();
        }}
        title={t("modals.enable.title")}
        description={t("modals.enable.description")}
        loading={enableMutation.isPending}
        submitLabel={t("modals.enable.submit")}
        cancelLabel={t("modals.common.cancel")}
        onSubmit={() => void handleEnable()}
      >
        <div className="space-y-4">
          {practitionerLockActive ? (
            <p className="border-warning-200 bg-warning-50 text-warning-800 rounded-2xl border px-4 py-3 text-sm leading-6">
              {t("modals.enable.practitionerLockNote")}
            </p>
          ) : null}
          <div>
            <Label
              htmlFor="enable-note"
              className="text-text-muted mb-2 block text-xs font-semibold tracking-[0.18em] uppercase"
            >
              {t("modals.enable.note")}
            </Label>
            <TextArea
              id="enable-note"
              rows={4}
              value={enableNote}
              onChange={setEnableNote}
              placeholder={t("modals.enable.notePlaceholder")}
            />
          </div>
        </div>
      </FormModal>
    </div>
  );
}
