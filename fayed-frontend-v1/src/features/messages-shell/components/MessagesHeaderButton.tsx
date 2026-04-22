"use client";

import { useRef } from "react";
import { MessageCircle } from "lucide-react";
import type { UnifiedMessagingRole } from "../types/messages-shell.types";
import { useUnifiedUnreadBadge } from "../hooks/use-unified-unread-badge";
import { dispatchToggleMessagesShell } from "../lib/messages-shell-events";

type Props = {
  role: UnifiedMessagingRole;
};

export default function MessagesHeaderButton({ role }: Props) {
  const unreadLikeCount = useUnifiedUnreadBadge(role);
  const badgeValue = unreadLikeCount > 99 ? "99+" : String(unreadLikeCount);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  return (
    <button
      type="button"
      ref={buttonRef}
      className="messages-header-toggle relative flex h-11 w-11 items-center justify-center rounded-full border border-border-light bg-surface-secondary text-text-secondary transition-colors hover:bg-primary-light hover:text-text-brand dark:border-border-light dark:bg-surface-secondary dark:text-text-secondary dark:hover:bg-surface-tertiary dark:hover:text-text-primary"
      onClick={() =>
        dispatchToggleMessagesShell({
          anchorRect: buttonRef.current?.getBoundingClientRect(),
        })
      }
      aria-label="Messages"
      title="Messages"
    >
      <MessageCircle className="h-5 w-5" />
      {unreadLikeCount > 0 ? (
        <span className="absolute -end-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
          {badgeValue}
        </span>
      ) : null}
    </button>
  );
}
