"use client";

import { MessageCircle } from "lucide-react";
import type { UnifiedMessagingRole } from "../types/messages-shell.types";
import { useUnifiedUnreadBadge } from "../hooks/use-unified-unread-badge";
import { dispatchToggleMessagesShell } from "../lib/messages-shell-events";

type Props = {
  role: UnifiedMessagingRole;
};

export default function MessagesHeaderButton({ role }: Props) {
  const unreadLikeCount = useUnifiedUnreadBadge(role);
  const badgeValue = unreadLikeCount > 9 ? "9+" : String(unreadLikeCount);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    dispatchToggleMessagesShell({
      anchorRect: {
        top: rect.top,
        left: rect.left,
        right: rect.right,
        bottom: rect.bottom,
      },
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="messages-header-toggle relative flex h-11 w-11 items-center justify-center rounded-2xl border border-border-light bg-surface-secondary text-teal-600 dark:text-teal-400 shadow-sm transition-all duration-200 hover:-translate-y-[1px] hover:shadow-md hover:bg-surface-tertiary hover:text-teal-700 dark:hover:text-teal-300 focus:outline-none overflow-visible"
      aria-label="Messages"
      title="Messages"
    >
      <MessageCircle className="h-5 w-5" />
      {unreadLikeCount > 0 ? (
        <span className="absolute -top-1 -end-1 z-10 flex min-w-[20px] h-5 px-1.5 items-center justify-center rounded-full bg-rose-500 text-white text-[11px] font-bold ring-2 ring-white dark:ring-surface-secondary">
          {badgeValue}
        </span>
      ) : null}
    </button>
  );
}

