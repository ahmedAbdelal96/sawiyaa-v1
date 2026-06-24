"use client";

import { useEffect, useRef } from "react";
import { Check, CheckCheck, Loader2, SendHorizonal } from "lucide-react";

type MessageStatus = "SENDING" | "SENT" | "DELIVERED" | "READ" | "FAILED";

export type SupportThreadMessageVM = {
  id: string;
  mine: boolean;
  message: string;
  createdAt: string;
  localStatus?: MessageStatus;
};

type Props = {
  locale: string;
  title: string;
  note?: string;
  countLabel?: string;
  messages: SupportThreadMessageVM[];
  isPeerTyping?: boolean;

  emptyHeading: string;
  emptyNote: string;

  composer: null | {
    placeholder: string;
    helperNote?: string;
    errorNote?: string | null;
    value: string;
    onChange: (next: string) => void;
    onSubmit: () => Promise<void> | void;
    isSubmitting?: boolean;
    disabled?: boolean;
    submitLabel: string;
  };
};

function formatDateTime(iso: string | null, locale: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: !locale.startsWith("ar"),
  });
}

function SupportMessageBubble({
  message,
  createdAt,
  locale,
  mine,
  localStatus,
}: {
  message: string;
  createdAt: string;
  locale: string;
  mine: boolean;
  localStatus?: MessageStatus;
}) {
  const numLocale = locale === "ar" ? "ar-SA" : "en-US";

  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[92%] rounded-[16px] border px-3 py-2 shadow-[0_10px_20px_-18px_rgba(34,52,56,0.2)] sm:max-w-[78%] ${
          mine
            ? "border-primary/45 bg-gradient-to-br from-primary to-primary-active text-white shadow-[0_14px_26px_-18px_rgba(68,161,148,0.7)]"
            : "border-border-light/80 bg-white text-text-primary dark:border-white/10 dark:bg-white/10 dark:text-white/90"
        }`}
      >
        <p
          className={`break-words text-sm leading-6 ${
            mine ? "text-white" : "text-text-primary dark:text-white/90"
          }`}
        >
          {message}
        </p>
        <p
          className={`mt-1.5 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] ${
            mine
              ? "bg-white/14 text-white/80"
              : "bg-primary-light text-text-muted dark:bg-white/10 dark:text-white/55"
          }`}
        >
          {mine && localStatus === "SENDING" ? (
            <Loader2 className="me-1 h-3 w-3 animate-spin" />
          ) : null}
          {mine && localStatus === "SENT" ? <Check className="me-1 h-3 w-3" /> : null}
          {mine && localStatus === "DELIVERED" ? (
            <CheckCheck className="me-1 h-3 w-3" />
          ) : null}
          {mine && localStatus === "READ" ? (
            <CheckCheck className="me-1 h-3 w-3 text-primary-light" />
          ) : null}
          {formatDateTime(createdAt, numLocale)}
        </p>
      </div>
    </div>
  );
}

export default function SupportThreadPanel({
  locale,
  title,
  note,
  countLabel,
  messages,
  isPeerTyping,
  emptyHeading,
  emptyNote,
  composer,
}: Props) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const didInitialScrollRef = useRef(false);

  const scrollToBottom = () => {
    // Keep it simple and deterministic: always snap to bottom when opening,
    // and keep following new messages if the user was already at the bottom.
    endRef.current?.scrollIntoView({ block: "end" });
  };

  const wasAtBottom = () => {
    const el = listRef.current;
    if (!el) return true;
    const threshold = 28;
    return el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
  };

  useEffect(() => {
    if (didInitialScrollRef.current) return;
    didInitialScrollRef.current = true;
    // Always open a conversation on the last message (WhatsApp-like).
    scrollToBottom();
  }, []);

  const lastMessageId = messages.length ? messages[messages.length - 1]?.id : null;
  const shouldFollow = useRef(true);

  useEffect(() => {
    // Recompute whether we should follow based on the user's scroll position.
    shouldFollow.current = wasAtBottom();
  });

  useEffect(() => {
    if (!lastMessageId) return;
    if (!shouldFollow.current) return;
    scrollToBottom();
  }, [lastMessageId]);

  const handleComposerSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!composer || composer.disabled) return;
    await composer.onSubmit();
    // After local submit, keep the viewport pinned to the bottom.
    scrollToBottom();
  };

  return (
    <section className="app-panel flex min-h-0 flex-1 flex-col rounded-[28px] p-3 sm:p-4">
      <div className="mb-2 flex items-center justify-between gap-3 border-b border-border-light/70 pb-2 dark:border-white/10">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-text-primary dark:text-white/95">
            {title}
          </h2>
          {note ? <p className="mt-1 text-xs text-text-secondary">{note}</p> : null}
        </div>
        {countLabel ? (
          <span className="app-chip shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium">
            {countLabel}
          </span>
        ) : null}
      </div>

      {messages.length > 0 ? (
        <div
          ref={listRef}
          className="custom-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto rounded-2xl border border-border-light/70 bg-white/70 p-2 dark:border-white/10 dark:bg-white/5"
        >
          {messages.map((msg) => (
            <SupportMessageBubble
              key={msg.id}
              message={msg.message}
              createdAt={msg.createdAt}
              locale={locale}
              mine={msg.mine}
              localStatus={msg.mine ? msg.localStatus : undefined}
            />
          ))}
          {isPeerTyping ? (
            <div className="flex justify-start">
              <div className="inline-flex items-center gap-1 rounded-full border border-border-light/80 bg-white px-2.5 py-1 text-[11px] text-text-muted dark:border-white/10 dark:bg-white/10 dark:text-white/60">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current [animation-delay:120ms]" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current [animation-delay:240ms]" />
              </div>
            </div>
          ) : null}
          <div ref={endRef} />
        </div>
      ) : (
        <div className="app-panel-soft rounded-[20px] p-4">
          <p className="text-sm font-semibold text-text-primary dark:text-white/95">{emptyHeading}</p>
          <p className="mt-1 text-sm text-text-secondary">{emptyNote}</p>
        </div>
      )}

      {composer ? (
        <div className="mt-3 shrink-0 border-t border-border-light/70 pt-3 dark:border-white/10">
          <form className="space-y-3" onSubmit={handleComposerSubmit}>
            <textarea
              rows={2}
              maxLength={4000}
              value={composer.value}
              onChange={(e) => composer.onChange(e.target.value)}
              placeholder={composer.placeholder}
              className="w-full resize-none rounded-[16px] border border-border-light bg-white px-3 py-2.5 text-sm leading-6 text-text-primary outline-none placeholder:text-text-muted shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_10px_18px_-16px_rgba(68,161,148,0.3)] focus:border-primary/35 dark:bg-white/5 dark:text-white"
            />

          {composer.helperNote ? (
            <p className="text-xs text-text-muted">{composer.helperNote}</p>
          ) : null}

          {composer.errorNote ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
              {composer.errorNote}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-2">
            <button
              type="submit"
                disabled={
                  Boolean(composer.disabled) ||
                  Boolean(composer.isSubmitting) ||
                  composer.value.trim().length === 0
                }
                className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                {composer.isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <SendHorizonal className="h-4 w-4" />
                )}
                {composer.submitLabel}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}
