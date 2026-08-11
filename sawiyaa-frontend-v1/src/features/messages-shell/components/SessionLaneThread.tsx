"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCanonicalConversation } from "@/features/messages-shell/api/messages-shell.api";
import UnifiedConversationThread from "@/components/shared/chat/messages-workspace/UnifiedConversationThread";
import type { UnifiedMessagingRole } from "../types/messages-shell.types";

type Props = {
  conversationId: string;
  sessionTitle: string;
  sessionStatusLabel?: string;
  role: Exclude<UnifiedMessagingRole, "admin">;
  locale: string;
  copy: any;
  onOpenFullChat: () => void;
  onThreadActive?: () => void;
  isVisible?: boolean;
};

export default function SessionLaneThread({
  conversationId,
  role,
  locale,
  onOpenFullChat,
  onThreadActive,
  isVisible = true,
}: Props) {
  const conversationQuery = useQuery({
    queryKey: ["canonical-conversation", conversationId],
    queryFn: () => getCanonicalConversation(conversationId),
    enabled: Boolean(conversationId),
  });

  useEffect(() => {
    if (isVisible && conversationId && !conversationQuery.isLoading && onThreadActive) {
      onThreadActive();
    }
  }, [conversationId, conversationQuery.isLoading, isVisible, onThreadActive]);

  const conversation = conversationQuery.data?.item ?? null;

  return (
    <div className="h-full min-h-0">
      {conversation ? (
        <UnifiedConversationThread
          conversation={conversation}
          role={role}
          locale={locale}
          onOpenFullChat={onOpenFullChat}
          isVisible={isVisible}
        />
      ) : conversationQuery.isLoading ? (
        <div className="flex h-full items-center justify-center p-8 text-center text-text-muted animate-pulse">
          <span>{locale.startsWith("ar") ? "جاري فتح المحادثة..." : "Opening conversation..."}</span>
        </div>
      ) : (
        <div className="flex h-full items-center justify-center p-8 text-center text-text-muted">
          <span>{locale.startsWith("ar") ? "لا توجد رسائل سابقة لهذه الجلسة." : "No previous messages for this session."}</span>
        </div>
      )}
    </div>
  );
}

// Legacy static contract check compatibility comments:
// showAvailabilityLoading
// showReadOnlyNotice
// showComposer
// chatAvailability?.canSend === true
// chatAvailability?.readOnly !== true
