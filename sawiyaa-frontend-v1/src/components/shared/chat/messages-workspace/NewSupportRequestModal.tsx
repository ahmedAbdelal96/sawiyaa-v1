"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import {
  createPatientSupportTicket,
  createPractitionerSupportTicket,
} from "@/features/messages-shell/api/messages-shell.api";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  role: "patient" | "practitioner";
  locale: string;
  onSuccess: (conversationId: string) => void;
}

export default function NewSupportRequestModal({ isOpen, onClose, role, locale, onSuccess }: Props) {
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        onSuccess(res.item.conversationId);
        setDescription("");
        onClose();
      } else {
        setError(locale.startsWith("ar") ? "حدث خطأ أثناء إنشاء التذكرة" : "Failed to create support ticket");
      }
    } catch (err) {
      console.error(err);
      setError(locale.startsWith("ar") ? "فشل الاتصال بالخادم. حاول مجدداً." : "Server connection failed. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const isAr = locale.startsWith("ar");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 border dark:border-white/10">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 end-4 text-text-muted hover:text-text-primary"
          aria-label={isAr ? "إغلاق" : "Close"}
        >
          <X className="h-5 w-5" />
        </button>

        <h3 className="text-base font-bold text-text-primary dark:text-white">
          {isAr ? "طلب دعم جديد" : "New Support Ticket"}
        </h3>
        <p className="mt-1 text-xs text-text-secondary dark:text-white/60">
          {isAr ? "سيتم توجيه طلبك مباشرة إلى فريق دعم سويّة." : "Your request will be routed to Sawiyaa support."}
        </p>

        {error && (
          <div className="mt-3 rounded-lg bg-rose-500/10 p-2.5 text-center text-xs font-semibold text-rose-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="space-y-1">
            <label htmlFor="description" className="block text-xs font-bold text-text-primary dark:text-white/80">
              {isAr ? "كيف يمكننا مساعدتك؟ *" : "How can we help you? *"}
            </label>
            <textarea
              id="description"
              required
              rows={4}
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

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border-light px-4 py-2 text-xs font-bold text-text-secondary hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5"
            >
              {isAr ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !description.trim()}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-teal-700 disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-4.5 w-4.5 animate-spin" />}
              {isAr ? "إرسال الطلب" : "Send Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
