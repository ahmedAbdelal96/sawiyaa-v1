"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import {
  listCanonicalConversations,
  createPatientSupportTicket,
  createPractitionerSupportTicket,
} from "@/features/messages-shell/api/messages-shell.api";
import UnifiedConversationThread from "@/components/shared/chat/messages-workspace/UnifiedConversationThread";
import type { UnifiedMessagingRole } from "../types/messages-shell.types";

type Props = {
  role: UnifiedMessagingRole;
  ticketId: string | null;
  fullViewHref: string;
  locale: string;
  prefillRelatedSessionId?: string | null;
  copy: any;
  onOpenFull: () => void;
  onCreatedTicket?: (ticketId: string) => void;
  onThreadActive?: () => void;
};

export default function SupportLaneThread({
  role,
  ticketId,
  locale,
  onOpenFull,
  onCreatedTicket,
  onThreadActive,
}: Props) {
  const queryClient = useQueryClient();
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all conversations to match ticketId with the conversation
  const listQuery = useQuery({
    queryKey: ["canonical-conversations", role],
    queryFn: () => listCanonicalConversations({ page: 1, limit: 50 }),
  });

  const conversation = listQuery.data?.items?.find(
    (c) => c.supportTicketId === ticketId || c.conversationId === ticketId,
  ) || null;

  useEffect(() => {
    if (conversation && onThreadActive) {
      onThreadActive();
    }
  }, [conversation, onThreadActive]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      setError(null);

      let res;
      if (role === "patient") {
        res = await createPatientSupportTicket({ description: description.trim() });
      } else {
        res = await createPractitionerSupportTicket({ description: description.trim() });
      }

      if (res?.item?.conversationId) {
        setDescription("");
        void queryClient.invalidateQueries({ queryKey: ["canonical-conversations"] });
        if (onCreatedTicket) {
          onCreatedTicket(res.item.conversationId);
        }
      } else {
        setError(locale.startsWith("ar") ? "حدث خطأ أثناء إرسال الطلب" : "Failed to send request");
      }
    } catch (err) {
      console.error(err);
      setError(locale.startsWith("ar") ? "فشل الاتصال بالخادر. حاول مجدداً." : "Server connection failed. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isAr = locale.startsWith("ar");

  if (ticketId) {
    if (listQuery.isLoading) {
      return (
        <div className="flex h-full items-center justify-center p-8 text-center text-text-muted animate-pulse">
          <span>{isAr ? "جاري تحميل الدعم..." : "Loading support..."}</span>
        </div>
      );
    }

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
            <span>{isAr ? "المحادثة غير متوفرة." : "Conversation not available."}</span>
          </div>
        )}
      </div>
    );
  }

  // Create ticket view
  return (
    <div className="flex h-full flex-col rounded-2xl border border-border-light/80 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/40">
      <h3 className="text-base font-bold text-text-primary dark:text-white">
        {isAr ? "تواصل مع فريق الدعم" : "Contact Support Team"}
      </h3>
      <p className="mt-1 text-xs text-text-secondary dark:text-white/60">
        {isAr
          ? "اطرح مشكلتك أو استفسارك هنا وسيرد عليك أحد ممثلي الدعم الفني في أقرب وقت."
          : "Write your inquiry or problem below, and a support agent will get back to you shortly."}
      </p>

      {error && (
        <div className="mt-3 rounded-lg bg-rose-500/10 p-2.5 text-center text-xs font-semibold text-rose-600">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-4 flex-1 flex flex-col justify-between">
        <div className="space-y-1">
          <label htmlFor="support-desc" className="block text-xs font-bold text-text-primary dark:text-white/80">
            {isAr ? "كيف يمكننا مساعدتك؟ *" : "How can we help you? *"}
          </label>
          <textarea
            id="support-desc"
            required
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={
              isAr
                ? "اكتب تفاصيل المشكلة أو طلبك بوضوح..."
                : "Explain the issue or your request clearly..."
            }
            className="custom-scrollbar block w-full rounded-xl border border-border-light bg-transparent px-3 py-2 text-sm text-text-primary outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 dark:border-white/10 dark:text-white"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !description.trim()}
          className="mt-4 w-full h-11 rounded-full bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{isAr ? "جاري الإرسال..." : "Sending..."}</span>
            </>
          ) : (
            <span>{isAr ? "إرسال طلب الدعم" : "Submit Request"}</span>
          )}
        </button>
      </form>
    </div>
  );
}
