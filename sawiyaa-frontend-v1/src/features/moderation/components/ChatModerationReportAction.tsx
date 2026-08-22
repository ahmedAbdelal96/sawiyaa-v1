"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Flag, Loader2 } from "lucide-react";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import { useCreateModerationReport } from "../hooks/use-moderation";
import type { ModerationReportReason, ModerationReportTargetType } from "../types/moderation.types";

const reasons: ModerationReportReason[] = ["ABUSE", "HARASSMENT", "SPAM", "SCAM", "INAPPROPRIATE_CONTENT", "PRIVACY_BREACH", "OTHER"];
type Props = {
  targetType: Extract<ModerationReportTargetType, "CARE_CHAT_CONVERSATION" | "CARE_CHAT_MESSAGE" | "GENERAL_CHAT_CONVERSATION" | "GENERAL_CHAT_MESSAGE">;
  targetId: string | null;
  targetLabel?: string;
  compact?: boolean;
};

export default function ChatModerationReportAction({ targetType, targetId, targetLabel, compact = false }: Props) {
  const t = useTranslations("moderation");
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ModerationReportReason>("INAPPROPRIATE_CONTENT");
  const [note, setNote] = useState("");
  const mutation = useCreateModerationReport();
  const close = () => { if (!mutation.isPending) { setOpen(false); mutation.reset(); } };
  const submit = async () => { if (!targetId) return; await mutation.mutateAsync({ targetType, targetId, reason, note: note.trim() || undefined }); setOpen(false); };

  return <>
    <button type="button" disabled={!targetId} onClick={() => setOpen(true)} className={compact ? "inline-flex h-7 w-7 items-center justify-center rounded-full text-text-muted transition hover:bg-amber-50 hover:text-amber-700 disabled:opacity-50" : "inline-flex items-center gap-1.5 rounded-full border border-border-light px-3 py-1.5 text-xs font-semibold text-text-secondary transition hover:border-amber-300 hover:text-amber-700 disabled:opacity-50"} aria-label={t("report")} title={t("report")}>
      <Flag className="h-3.5 w-3.5" />{compact ? null : t("report")}
    </button>
    <Modal isOpen={open} onClose={close} size="md">
      <ModalHeader eyebrow={t("eyebrow")} title={t("reportContent")} description={targetLabel ?? t("hint")} />
      <ModalBody>
        <label className="block text-sm font-medium text-text-primary">{t("fields.reason")}<select value={reason} onChange={(e) => setReason(e.target.value as ModerationReportReason)} className="app-control mt-2 w-full rounded-xl">{reasons.map((item) => <option key={item} value={item}>{t(`reasons.${item}` as Parameters<typeof t>[0])}</option>)}</select></label>
        <label className="mt-4 block text-sm font-medium text-text-primary">{t("fields.note")}<textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} rows={4} className="app-control mt-2 w-full resize-none rounded-xl" /></label>
        {mutation.isError ? <p className="mt-3 text-sm text-danger-600">{t("error")}</p> : null}
      </ModalBody>
      <ModalFooter><Button variant="outline" onClick={close} disabled={mutation.isPending}>{t("actions.cancel")}</Button><Button onClick={() => submit().catch(() => undefined)} disabled={mutation.isPending || !targetId}>{mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{t("actions.submit")}</Button></ModalFooter>
    </Modal>
  </>;
}
