import React from "react";
import { Search, Paperclip, Smile, Send, Loader2, Check, CheckCheck, MessageSquare } from "lucide-react";
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
};

export function ChatWorkspaceShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-5 h-full min-h-0 items-stretch w-full overflow-hidden">
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
    <div className="w-full h-full flex flex-col bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-3xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      {header && <div className="px-4 pt-4 shrink-0">{header}</div>}
      {onSearchChange && (
        <div className="p-4 shrink-0 border-b border-slate-100 dark:border-white/5">
          <div className="relative">
            <input
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-11 pr-4 h-12 text-xs md:text-sm rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-slate-950/30 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 text-text-primary dark:text-white transition-all duration-200 shadow-sm font-medium"
            />
            <Search className="absolute left-4 top-4 h-4 w-4 text-text-muted" />
          </div>
        </div>
      )}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1 bg-white dark:bg-slate-900">
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
        "w-full flex items-center gap-3.5 p-3.5 rounded-2xl transition-all duration-200 border border-transparent select-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary/20 my-1 text-left rtl:text-right",
        thread.isActive
          ? "bg-teal-50/60 border-teal-200/50 dark:bg-teal-950/35 dark:border-teal-900/40 border-s-4 border-s-teal-600 pl-2.5 rtl:pr-2.5 shadow-sm"
          : thread.isUnread && !thread.readPending
          ? "bg-rose-50/20 dark:bg-rose-950/5 border-s-2 border-s-rose-500/70 pl-3 rtl:pr-3"
          : "hover:bg-slate-50/80 dark:hover:bg-white/[0.02]"
      )}
    >
      <div className="relative shrink-0">
        <Avatar
          src={thread.avatarUrl || null}
          name={thread.fallbackName || thread.title}
          size="medium"
        />
        {thread.online && (
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
        )}
      </div>

      <div className="flex-1 min-w-0 text-left rtl:text-right">
        <div className="flex items-center justify-between gap-2">
          <h4 className={cn(
            "text-sm truncate",
            thread.isActive
              ? "font-extrabold text-text-primary dark:text-white"
              : thread.isUnread && !thread.readPending
              ? "font-bold text-text-primary dark:text-white"
              : "font-semibold text-text-secondary dark:text-slate-300"
          )}>
            {thread.title}
          </h4>
          {thread.lastMessageAt && (
            <span className="text-[11px] text-text-muted shrink-0 font-medium">
              {thread.lastMessageAt}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between mt-1 gap-2">
          <p className="text-xs text-text-secondary dark:text-slate-400 truncate font-semibold">
            {thread.subtitle}
          </p>
          <div className="flex items-center gap-1 shrink-0">
            {thread.statusLabel && (
              <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-[10px] font-bold text-teal-700 dark:bg-teal-950/40 dark:text-teal-400 border border-teal-100/30">
                {thread.statusLabel}
              </span>
            )}
            {thread.priorityLabel && (
              <span className={cn(
                "rounded-full px-2.5 py-0.5 text-[10px] font-bold shrink-0 border border-transparent",
                thread.priorityLabel.includes("Urgent") || thread.priorityLabel.includes("عاجلة") || thread.priorityLabel.includes("High") || thread.priorityLabel.includes("عالية")
                  ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-100/20"
                  : "bg-slate-100 text-text-secondary dark:bg-white/10 dark:text-white"
              )}>
                {thread.priorityLabel}
              </span>
            )}
          </div>
        </div>

        {thread.lastMessage && (
          <p className="text-xs text-text-muted dark:text-slate-500 mt-1.5 truncate font-medium">
            {thread.lastMessage}
          </p>
        )}
      </div>

      {!thread.readPending && thread.unreadCount && thread.unreadCount > 0 ? (
        <div className="shrink-0 flex items-center justify-center">
          <span className="h-4.5 min-w-[18px] px-1 flex items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm">
            {thread.unreadCount}
          </span>
        </div>
      ) : !thread.readPending && thread.isUnread ? (
        <div className="shrink-0 flex items-center justify-center px-1">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-500 shadow-sm animate-pulse" />
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
    <div className="flex-1 flex flex-col h-full min-h-0 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-3xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      {header}
      
      <div 
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-5 bg-[#f8fafc]/90 dark:bg-slate-950/10"
      >
        <div className="min-h-full flex flex-col justify-end space-y-4">
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
    <div className="p-4 border-b border-slate-100 dark:border-white/10 flex items-center justify-between gap-3 shrink-0 bg-white dark:bg-slate-900 shadow-sm min-h-[76px]">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="relative shrink-0">
          <Avatar
            src={avatarUrl || null}
            name={title}
            size="medium"
          />
          {online && (
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
          )}
        </div>

        <div className="min-w-0 text-left rtl:text-right flex-1">
          <h3 className="text-base font-bold text-text-primary dark:text-white truncate">
            {title}
          </h3>
          {subtitle && (
            <div className="text-xs text-text-muted mt-1 truncate">
              {subtitle}
            </div>
          )}
        </div>
      </div>

      {actions && <div className="flex items-center gap-1.5 shrink-0">{actions}</div>}
    </div>
  );
}

export function ChatMessageBubble({
  message,
}: {
  message: ChatMessageViewModel;
}) {
  const isMine = message.direction === "outgoing";
  
  return (
    <div dir="ltr" className={cn("flex w-full mb-1.5", isMine ? "justify-end" : "justify-start")}>
      <div
        dir="auto"
        className={cn(
          "max-w-[65%] px-4 py-2.5 text-xs leading-normal select-text border shadow-sm transition-colors",
          isMine
            ? "bg-gradient-to-br from-teal-600 to-teal-700 border-teal-600/10 text-white rounded-2xl rounded-br-md shadow-[0_2px_8px_rgba(13,148,136,0.15)]"
            : "bg-white dark:bg-slate-800/95 border-slate-200/80 dark:border-slate-700/50 text-text-primary dark:text-white/95 rounded-2xl rounded-bl-md shadow-[0_2px_8px_rgba(0,0,0,0.02)]"
        )}
      >
        <p className="break-words whitespace-pre-wrap">{message.body}</p>
        
        <div className="mt-1.5 flex items-center justify-end gap-1 text-[9px] opacity-75 font-medium select-none">
          <span>{message.sentAt}</span>
          {isMine && message.status && (
            <span className="shrink-0">
              {message.status === "SENDING" && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
              {message.status === "SENT" && <Check className="h-2.5 w-2.5" />}
              {(message.status === "DELIVERED" || message.status === "READ") && (
                <CheckCheck className={cn("h-2.5 w-2.5", message.status === "READ" ? "text-teal-200" : "")} />
              )}
            </span>
          )}
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
    <div className="p-4 border-t border-slate-100 dark:border-white/10 bg-white dark:bg-slate-900 shrink-0">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim().length > 0) onSubmit();
        }}
        className="flex items-center gap-3"
      >
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            className="p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 text-text-muted hover:text-text-primary dark:hover:text-white transition flex items-center justify-center border border-transparent hover:border-slate-100 dark:hover:border-white/10"
          >
            <Paperclip className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 text-text-muted hover:text-text-primary dark:hover:text-white transition flex items-center justify-center border border-transparent hover:border-slate-100 dark:hover:border-white/10"
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
            className="w-full resize-none rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-slate-950/20 px-4 py-3 h-12 text-[13px] leading-normal outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 text-text-primary dark:text-white placeholder:text-text-muted disabled:cursor-not-allowed max-h-[120px] custom-scrollbar transition-all duration-200 shadow-sm"
            style={{ height: "48px" }}
          />
        </div>

        <button
          type="submit"
          disabled={disabled || isSubmitting || value.trim().length === 0}
          className="p-3 rounded-full bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed shrink-0 flex items-center justify-center h-12 w-12 shadow-[0_4px_12px_rgba(13,148,136,0.25)] hover:shadow-[0_6px_16px_rgba(13,148,136,0.35)]"
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
    <div className="flex-1 flex flex-col items-center justify-center h-full bg-white dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/5 rounded-3xl p-6 text-center shadow-sm min-h-[350px]">
      <MessageSquare className="h-12 w-12 text-teal-600/30 mb-3 animate-pulse" />
      <h3 className="text-sm font-bold text-text-primary dark:text-white/90">
        {message}
      </h3>
    </div>
  );
}

export function ChatLoadingState() {
  return (
    <div className="flex-1 flex items-center justify-center h-full bg-[#f8fafc]/90 dark:bg-slate-950/10 border border-slate-200/70 dark:border-white/5 rounded-3xl p-6 shadow-sm min-h-[400px]">
      <Loader2 className="h-8 w-8 text-teal-600 animate-spin" />
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
    <div className="flex-1 flex flex-col items-center justify-center h-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 text-center shadow-sm min-h-[400px]">
      <p className="text-sm font-semibold text-rose-500 mb-2">{title}</p>
      {note && <p className="text-xs text-text-secondary mb-4">{note}</p>}
      {onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-teal-600 px-5 py-2 text-xs font-semibold text-white hover:bg-teal-700 transition"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
