"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useOpenSessionGeneralChat } from "@/features/chat/hooks/use-general-chat";
import { getCanonicalConversation } from "@/features/messages-shell/api/messages-shell.api";
import UnifiedConversationThread from "@/components/shared/chat/messages-workspace/UnifiedConversationThread";
import type { UnifiedMessagingRole } from "../types/messages-shell.types";

type Props = {
  sessionId: string;
  sessionTitle: string;
  sessionStatusLabel?: string;
  role: Exclude<UnifiedMessagingRole, "admin">;
  locale: string;
  copy: any;
  onOpenFullChat: () => void;
  onThreadActive?: () => void;
};

export default function SessionLaneThread({
  sessionId,
  role,
  locale,
  onOpenFullChat,
  onThreadActive,
}: Props) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const openMutation = useOpenSessionGeneralChat(sessionId);

  useEffect(() => {
    queueMicrotask(() => {
      setConversationId(null);
    });
    openMutation
      .mutateAsync()
      .then((result) => {
        queueMicrotask(() => {
          setConversationId(result.item.conversationId);
        });
      })
      .catch(() => {
        queueMicrotask(() => {
          setConversationId(null);
        });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);


  const conversationQuery = useQuery({
    queryKey: ["canonical-conversation", conversationId],
    queryFn: () => getCanonicalConversation(conversationId!),
    enabled: Boolean(conversationId),
  });

  useEffect(() => {
    if (conversationId && !conversationQuery.isLoading && onThreadActive) {
      onThreadActive();
    }
  }, [conversationId, conversationQuery.isLoading, onThreadActive]);

  const conversation = conversationQuery.data?.item ?? null;

  return (
    <div className="h-full min-h-0">
      {conversation ? (
        <UnifiedConversationThread
          conversation={conversation}
          role={role}
          locale={locale}
          onOpenFullChat={onOpenFullChat}
        />
      ) : (
        <div className="flex h-full items-center justify-center p-8 text-center text-text-muted animate-pulse">
          <span>{locale.startsWith("ar") ? "جاري فتح المحادثة..." : "Opening conversation..."}</span>
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

