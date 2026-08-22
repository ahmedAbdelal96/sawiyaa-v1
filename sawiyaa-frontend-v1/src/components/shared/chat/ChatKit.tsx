import React from "react";
import {
  Search,
  Paperclip,
  Smile,
  Send,
  Loader2,
  Check,
  CheckCheck,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Avatar from "@/components/ui/avatar/Avatar";

export type ChatThreadViewModel = {
  id: string;
  title: string;
  subtitle?: string;
  avatarUrl?: string | null;
  fallbackName?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount?: number;
  isUnread?: boolean;
  readPending?: boolean;
  lane?: "support" | "session" | "care" | "followup";
  statusLabel?: string;
  priorityLabel?: string;
  isActive?: boolean;
  online?: boolean;
};

export type ChatMessageViewModel = {
  id: string;
  body: string;
  sentAt?: string;
  direction: "incoming" | "outgoing";
  senderName?: string;
  avatarUrl?: string | null;
  status?: "SENDING" | "SENT" | "DELIVERED" | "READ" | "FAILED";
  attachments?: Array<{
    id: string;
    originalName?: string | null;
    mimeType: string;
  }>;
};

export function ChatWorkspaceShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 w-full flex-col items-stretch gap-4 overflow-hidden lg:flex-row lg:gap-5">
      {children}
    </div>
  );
}

export function ChatThreadList({
  children,
  searchPlaceholder = "Search...",
  searchValue,
  onSearchChange,
  header,
}: {
  children: React.ReactNode;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  header?: React.ReactNode;
}) {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:border-white/10 dark:bg-slate-900">
      {header && <div className="shrink-0 px-4 pt-4">{header}</div>}
      {onSearchChange && (
        <div className="shrink-0 border-b border-slate-100 p-4 dark:border-white/5">
          <div className="relative">
            <input
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="text-text-primary h-12 w-full rounded-2xl border border-slate-200 bg-slate-50/50 pr-4 pl-11 text-xs font-medium shadow-sm transition-all duration-200 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 md:text-sm dark:border-white/10 dark:bg-slate-950/30 dark:text-white"
            />
            <Search className="text-text-muted absolute top-4 left-4 h-4 w-4" />
          </div>
        </div>
      )}
      <div className="custom-scrollbar flex-1 space-y-1 overflow-y-auto bg-white p-2 dark:bg-slate-900">
        {children}
      </div>
    </div>
  );
}

export function ChatThreadListItem({
  thread,
  onClick,
}: {
  thread: ChatThreadViewModel;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "focus-visible:ring-primary/20 my-1 flex w-full cursor-pointer items-center gap-3.5 rounded-2xl border border-transparent p-3.5 text-left transition-all duration-200 outline-none select-none focus-visible:ring-2 rtl:text-right",
        thread.isActive
          ? "border-s-4 border-teal-200/50 border-s-teal-600 bg-teal-50/60 pl-2.5 shadow-sm rtl:pr-2.5 dark:border-teal-900/40 dark:bg-teal-950/35"
          : thread.isUnread && !thread.readPending
            ? "border-s-2 border-s-rose-500/70 bg-rose-50/20 pl-3 rtl:pr-3 dark:bg-rose-950/5"
            : "hover:bg-slate-50/80 dark:hover:bg-white/[0.02]",
      )}
    >
      <div className="relative shrink-0">
        <Avatar
          src={thread.avatarUrl || null}
          name={thread.fallbackName || thread.title}
          size="medium"
        />
        {thread.online && (
          <span className="absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-900" />
        )}
      </div>

      <div className="min-w-0 flex-1 text-left rtl:text-right">
        <div className="flex items-center justify-between gap-2">
          <h4
            className={cn(
              "truncate text-sm",
              thread.isActive
                ? "text-text-primary font-extrabold dark:text-white"
                : thread.isUnread && !thread.readPending
                  ? "text-text-primary font-bold dark:text-white"
                  : "text-text-secondary font-semibold dark:text-slate-300",
            )}
          >
            {thread.title}
          </h4>
          {thread.lastMessageAt && (
            <span className="text-text-muted shrink-0 text-[11px] font-medium">
              {thread.lastMessageAt}
            </span>
          )}
        </div>

        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="text-text-secondary truncate text-xs font-semibold dark:text-slate-400">
            {thread.subtitle}
          </p>
          <div className="flex shrink-0 items-center gap-1">
            {thread.statusLabel && (
              <span className="rounded-full border border-teal-100/30 bg-teal-50 px-2.5 py-0.5 text-[10px] font-bold text-teal-700 dark:bg-teal-950/40 dark:text-teal-400">
                {thread.statusLabel}
              </span>
            )}
            {thread.priorityLabel && (
              <span
                className={cn(
                  "shrink-0 rounded-full border border-transparent px-2.5 py-0.5 text-[10px] font-bold",
                  thread.priorityLabel.includes("Urgent") ||
                    thread.priorityLabel.includes("عاجلة") ||
                    thread.priorityLabel.includes("High") ||
                    thread.priorityLabel.includes("عالية")
                    ? "border-rose-100/20 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
                    : "text-text-secondary bg-slate-100 dark:bg-white/10 dark:text-white",
                )}
              >
                {thread.priorityLabel}
              </span>
            )}
          </div>
        </div>

        {thread.lastMessage && (
          <p className="text-text-muted mt-1.5 truncate text-xs font-medium dark:text-slate-500">
            {thread.lastMessage}
          </p>
        )}
      </div>

      {!thread.readPending && thread.unreadCount && thread.unreadCount > 0 ? (
        <div className="flex shrink-0 items-center justify-center">
          <span className="flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-sm">
            {thread.unreadCount}
          </span>
        </div>
      ) : !thread.readPending && thread.isUnread ? (
        <div className="flex shrink-0 items-center justify-center px-1">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-rose-500 shadow-sm" />
        </div>
      ) : null}
    </button>
  );
}

export function ChatConversationPanel({
  header,
  children,
  composer,
}: {
  header: React.ReactNode;
  children: React.ReactNode;
  composer?: React.ReactNode;
}) {
  const scrollRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [children]);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:border-white/10 dark:bg-slate-900">
      {header}

      <div
        ref={scrollRef}
        className="custom-scrollbar min-h-0 flex-1 overflow-y-auto bg-[#f8fafc]/90 p-5 dark:bg-slate-950/10"
      >
        <div className="flex min-h-full flex-col justify-end space-y-4">
          {children}
        </div>
      </div>

      {composer}
    </div>
  );
}

export function ChatConversationHeader({
  title,
  subtitle,
  avatarUrl,
  online,
  actions,
}: {
  title: string;
  subtitle?: React.ReactNode;
  avatarUrl?: string | null;
  fallbackName?: string;
  online?: boolean;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[76px] shrink-0 items-center justify-between gap-3 border-b border-slate-100 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="relative shrink-0">
          <Avatar src={avatarUrl || null} name={title} size="medium" />
          {online && (
            <span className="absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-900" />
          )}
        </div>

        <div className="min-w-0 flex-1 text-left rtl:text-right">
          <h3 className="text-text-primary truncate text-base font-bold dark:text-white">
            {title}
          </h3>
          {subtitle && (
            <div className="text-text-muted mt-1 truncate text-xs">
              {subtitle}
            </div>
          )}
        </div>
      </div>

      {actions && (
        <div className="flex shrink-0 items-center gap-1.5">{actions}</div>
      )}
    </div>
  );
}

export function ChatMessageBubble({
  message,
  onReport,
}: {
  message: ChatMessageViewModel;
  onReport?: React.ReactNode;
}) {
  const isMine = message.direction === "outgoing";

  return (
    <div
      dir="ltr"
      className={cn(
        "mb-1.5 flex w-full",
        isMine ? "justify-end" : "justify-start",
      )}
    >
      <div
        dir="auto"
        className={cn(
          "max-w-[65%] border px-4 py-2.5 text-xs leading-normal shadow-sm transition-colors select-text",
          isMine
            ? "rounded-2xl rounded-br-md border-teal-600/10 bg-gradient-to-br from-teal-600 to-teal-700 text-white shadow-[0_2px_8px_rgba(13,148,136,0.15)]"
            : "text-text-primary rounded-2xl rounded-bl-md border-slate-200/80 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.02)] dark:border-slate-700/50 dark:bg-slate-800/95 dark:text-white/95",
        )}
      >
        <p className="break-words whitespace-pre-wrap">{message.body}</p>
        {message.attachments?.length ? (
          <div className="mt-2 space-y-1.5">
            {message.attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center gap-2 rounded-xl border border-current/15 bg-black/5 px-2.5 py-2 text-[11px]"
              >
                <Paperclip className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 truncate">
                  {attachment.originalName || attachment.mimeType}
                </span>
              </div>
            ))}
          </div>
        ) : null}

        <div className="mt-1.5 flex items-center justify-end gap-1 text-[9px] font-medium opacity-75 select-none">
          <span>{message.sentAt}</span>
          {isMine && message.status && (
            <span className="shrink-0">
              {message.status === "SENDING" && (
                <Loader2 className="h-2.5 w-2.5 animate-spin" />
              )}
              {message.status === "SENT" && <Check className="h-2.5 w-2.5" />}
              {(message.status === "DELIVERED" ||
                message.status === "READ") && (
                <CheckCheck
                  className={cn(
                    "h-2.5 w-2.5",
                    message.status === "READ" ? "text-teal-200" : "",
                  )}
                />
              )}
            </span>
          )}
          {onReport ? (
            <span className="ms-1 inline-flex">{onReport}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function ChatComposer({
  placeholder = "Write a message...",
  value,
  onChange,
  onSubmit,
  isSubmitting,
  disabled,
}: {
  placeholder?: string;
  value: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
  disabled?: boolean;
}) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim().length > 0 && !disabled && !isSubmitting) {
        onSubmit();
      }
    }
  };

  return (
    <div className="shrink-0 border-t border-slate-100 bg-white p-4 dark:border-white/10 dark:bg-slate-900">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim().length > 0) onSubmit();
        }}
        className="flex items-center gap-3"
      >
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            className="text-text-muted hover:text-text-primary flex items-center justify-center rounded-xl border border-transparent p-2.5 transition hover:border-slate-100 hover:bg-slate-50 dark:hover:border-white/10 dark:hover:bg-white/5 dark:hover:text-white"
          >
            <Paperclip className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="text-text-muted hover:text-text-primary flex items-center justify-center rounded-xl border border-transparent p-2.5 transition hover:border-slate-100 hover:bg-slate-50 dark:hover:border-white/10 dark:hover:bg-white/5 dark:hover:text-white"
          >
            <Smile className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1">
          <textarea
            rows={1}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="text-text-primary placeholder:text-text-muted custom-scrollbar h-12 max-h-[120px] w-full resize-none rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-3 text-[13px] leading-normal shadow-sm transition-all duration-200 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 disabled:cursor-not-allowed dark:border-white/10 dark:bg-slate-950/20 dark:text-white"
            style={{ height: "48px" }}
          />
        </div>

        <button
          type="submit"
          disabled={disabled || isSubmitting || value.trim().length === 0}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-teal-600 p-3 font-semibold text-white shadow-[0_4px_12px_rgba(13,148,136,0.25)] transition hover:bg-teal-700 hover:shadow-[0_6px_16px_rgba(13,148,136,0.35)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isSubmitting ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </button>
      </form>
    </div>
  );
}

export function ChatEmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-full min-h-[350px] flex-1 flex-col items-center justify-center rounded-3xl border border-slate-200/70 bg-white p-6 text-center shadow-sm dark:border-white/5 dark:bg-white/[0.03]">
      <MessageSquare className="mb-3 h-12 w-12 animate-pulse text-teal-600/30" />
      <h3 className="text-text-primary text-sm font-bold dark:text-white/90">
        {message}
      </h3>
    </div>
  );
}

export function ChatLoadingState() {
  return (
    <div className="flex h-full min-h-[400px] flex-1 items-center justify-center rounded-3xl border border-slate-200/70 bg-[#f8fafc]/90 p-6 shadow-sm dark:border-white/5 dark:bg-slate-950/10">
      <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
    </div>
  );
}

export function ChatErrorState({
  title = "Error loading chat",
  note,
  actionLabel = "Retry",
  onAction,
}: {
  title?: string;
  note?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex h-full min-h-[400px] flex-1 flex-col items-center justify-center rounded-3xl border border-slate-200/80 bg-white p-6 text-center shadow-sm dark:border-white/10 dark:bg-slate-900">
      <p className="mb-2 text-sm font-semibold text-rose-500">{title}</p>
      {note && <p className="text-text-secondary mb-4 text-xs">{note}</p>}
      {onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-teal-600 px-5 py-2 text-xs font-semibold text-white transition hover:bg-teal-700"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
