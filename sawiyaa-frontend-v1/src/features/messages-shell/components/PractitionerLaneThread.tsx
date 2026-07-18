"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCanonicalConversation } from "@/features/messages-shell/api/messages-shell.api";
import UnifiedConversationThread from "@/components/shared/chat/messages-workspace/UnifiedConversationThread";
import type { UnifiedMessagingRole } from "../types/messages-shell.types";

type Props = {
  role: UnifiedMessagingRole;
  requestId: string | null;
  conversationId: string | null;
  requestStatus?: string;
  fullViewHref: string;
  locale: string;
  copy: any;
  onOpenFull: () => void;
  onThreadActive?: () => void;
};

export default function PractitionerLaneThread({
  role,
  conversationId,
  locale,
  onOpenFull,
  onThreadActive,
}: Props) {
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
          onOpenFullChat={onOpenFull}
        />
      ) : (
        <div className="flex h-full items-center justify-center p-8 text-center text-text-muted">
          <span>{locale.startsWith("ar") ? "اختر محادثة للمتابعة..." : "Select a conversation to follow up..."}</span>
        </div>
      )}
    </div>
  );
}
