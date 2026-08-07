"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Edit3,
  Plus,
  Trash2,
  Info,
  ShieldCheck,
} from "lucide-react";
import type { AdminReviewDecisionReason } from "../utils/admin-review-decision";

type DecisionDisplayItem = Partial<AdminReviewDecisionReason> & {
  id?: string;
  label: string;
  helper?: string;
};

type ReviewSection = {
  key?: string;
  title: string;
  tone: "warning" | "info" | "danger" | "success";
  items: DecisionDisplayItem[];
  emptyLabel?: string;
};

type DecisionReasonDraft = {
  id: string;
  value: string;
};

type Props = {
  debugData?: unknown;
  statusLabel?: string;
  statusDescription?: string;
  statusTone?: "success" | "warning" | "danger" | "info" | "neutral";
  sections: ReviewSection[];
  approveBlockedReasons?: string[];
  approveDisabledReasons?: Array<AdminReviewDecisionReason | string>;
  decisionNotice?: string;
  cannotApproveHint?: string;
  approveAttemptedBlocked: boolean;
  canBeReviewed: boolean;
  canBeApproved: boolean;
  canRequestChanges: boolean;
  approveNote: string;
  setApproveNote: (value: string) => void;
  requestChangeReasons: DecisionReasonDraft[];
  setRequestChangeReasons: (reasons: DecisionReasonDraft[]) => void;
  requestChangesNote: string;
  setRequestChangesNote: (value: string) => void;
  rejectReasons: DecisionReasonDraft[];
  setRejectReasons: (reasons: DecisionReasonDraft[]) => void;
  rejectNote: string;
  setRejectNote: (value: string) => void;
  requestChangesReasonError: boolean;
  rejectReasonError: boolean;
  setRequestChangesReasonError: (value: boolean) => void;
  setRejectReasonError: (value: boolean) => void;
  isApproving: boolean;
  isRequestingChanges: boolean;
  isRejecting: boolean;
  onApprove: () => void;
  onRequestChanges: () => void;
  onReject: () => void;
  approveLabel: string;
  approveSubmittingLabel: string;
  requestChangesLabel: string;
  requestChangesSubmittingLabel: string;
  rejectLabel: string;
  rejectSubmittingLabel: string;
  approveNoteLabel: string;
  approveNotePlaceholder: string;
  requestReasonLabel: string;
  requestReasonPlaceholder: string;
  requestReasonRequired: string;
  requestReasonsHelper: string;
  addReasonLabel: string;
  removeReasonLabel: string;
  requestNotePlaceholder: string;
  rejectReasonLabel: string;
  rejectReasonPlaceholder: string;
  rejectReasonRequired: string;
  rejectReasonsHelper: string;
  rejectNotePlaceholder: string;
};

type DecisionMode = "approve" | "request_changes" | "reject";

function sectionToneBadge(tone: ReviewSection["tone"]) {
  switch (tone) {
    case "success":
      return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300";
    case "warning":
      return "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300";
    case "danger":
      return "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300";
    default:
      return "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900/40 dark:bg-sky-950/20 dark:text-sky-300";
  }
}

export default function AdminApplicationStepDecision(props: Props) {
  // Determine initial decision tab mode (default to request_changes if blocked, or approve if ready)
  const [activeMode, setActiveMode] = useState<DecisionMode>(
    props.canBeApproved ? "approve" : "request_changes"
  );

  const nonSuccessSections = props.sections.filter(
    (s) => s.tone !== "success" && s.items.length > 0
  );
  const successSections = props.sections.filter(
    (s) => s.tone === "success" && s.items.length > 0
  );

  // Quick suggestion labels derived from non-success sections
  const quickSuggestions = nonSuccessSections.flatMap((s) => s.items.map((i) => i.label));

  const addQuickSuggestionToRequestChanges = (label: string) => {
    // If the first input is empty, fill it; otherwise append
    if (
      props.requestChangeReasons.length === 1 &&
      !props.requestChangeReasons[0].value.trim()
    ) {
      props.setRequestChangeReasons([{ ...props.requestChangeReasons[0], value: label }]);
    } else {
      // Check if not already added
      const exists = props.requestChangeReasons.some((r) => r.value === label);
      if (!exists) {
        props.setRequestChangeReasons([
          ...props.requestChangeReasons,
          { id: crypto.randomUUID(), value: label },
        ]);
      }
    }
    if (props.requestChangesReasonError) {
      props.setRequestChangesReasonError(false);
    }
  };

  const updateReasonItem = (
    list: DecisionReasonDraft[],
    setList: (items: DecisionReasonDraft[]) => void,
    id: string,
    val: string
  ) => {
    setList(list.map((item) => (item.id === id ? { ...item, value: val } : item)));
  };

  const removeReasonItem = (
    list: DecisionReasonDraft[],
    setList: (items: DecisionReasonDraft[]) => void,
    id: string
  ) => {
    if (list.length === 1) {
      setList([{ ...list[0], value: "" }]);
      return;
    }
    setList(list.filter((item) => item.id !== id));
  };

  const addReasonItem = (
    list: DecisionReasonDraft[],
    setList: (items: DecisionReasonDraft[]) => void
  ) => {
    setList([...list, { id: crypto.randomUUID(), value: "" }]);
  };

  return (
    <div className="space-y-6">
      {/* 1. Readiness Overview Banner */}
      <div
        className={cn(
          "rounded-3xl border p-5 transition-all shadow-xs",
          props.canBeApproved
            ? "border-emerald-200 bg-emerald-50/70 text-emerald-950 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-100"
            : "border-amber-200 bg-amber-50/70 text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-100"
        )}
      >
        <div className="flex items-start gap-3.5">
          <div className="mt-0.5 shrink-0">
            {props.canBeApproved ? (
              <ShieldCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <h3 className="text-base font-bold">
              {props.statusLabel ?? (props.canBeApproved ? "الطلب مكتمل وجاهز للاعتماد" : "الطلب يتطلب استكمال بيانات قبل الاعتماد")}
            </h3>
            {props.statusDescription ? (
              <p className="text-xs leading-relaxed opacity-90">
                {props.statusDescription}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {/* 2. Structured Application Checks (Categorized Summary) */}
      {nonSuccessSections.length > 0 ? (
        <div className="rounded-3xl border border-border-light bg-surface-secondary/40 p-5 dark:border-white/8 dark:bg-white/[0.02] space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">
            ملخص ملاحظات واشتراطات الملف
          </h4>
          <div className="grid gap-3 md:grid-cols-2">
            {nonSuccessSections.map((section) => (
              <div
                key={section.key ?? section.title}
                className={cn("rounded-2xl border p-4 space-y-2.5", sectionToneBadge(section.tone))}
              >
                <p className="text-xs font-bold uppercase tracking-wide">{section.title}</p>
                <ul className="space-y-1.5">
                  {section.items.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs font-medium">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-current shrink-0" />
                      <span>{item.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* 3. Decision Action Mode Switcher (Tabs) */}
      <div className="space-y-4 pt-2">
        <h4 className="text-sm font-bold text-text-primary dark:text-white">
          اختر القرار النهائي للطلب:
        </h4>
        <div className="grid gap-3 sm:grid-cols-3">
          {/* Approve Tab */}
          <button
            type="button"
            onClick={() => setActiveMode("approve")}
            className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-2xl border p-4 text-center transition-all cursor-pointer",
              activeMode === "approve"
                ? "border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/30 dark:bg-emerald-950/30 dark:text-emerald-100"
                : "border-border-light bg-white text-text-secondary hover:border-emerald-300 dark:border-white/10 dark:bg-white/5 dark:text-white/80",
              !props.canBeApproved && "opacity-75"
            )}
          >
            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-bold">قبول واعتماد الطلب</span>
          </button>

          {/* Request Changes Tab */}
          <button
            type="button"
            onClick={() => setActiveMode("request_changes")}
            className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-2xl border p-4 text-center transition-all cursor-pointer",
              activeMode === "request_changes"
                ? "border-amber-500 bg-amber-50 text-amber-900 ring-2 ring-amber-500/30 dark:bg-amber-950/30 dark:text-amber-100"
                : "border-border-light bg-white text-text-secondary hover:border-amber-300 dark:border-white/10 dark:bg-white/5 dark:text-white/80"
            )}
          >
            <Edit3 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <span className="text-xs font-bold">طلب تعديل / استكمال بيانات</span>
          </button>

          {/* Reject Tab */}
          <button
            type="button"
            onClick={() => setActiveMode("reject")}
            className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-2xl border p-4 text-center transition-all cursor-pointer",
              activeMode === "reject"
                ? "border-rose-500 bg-rose-50 text-rose-900 ring-2 ring-rose-500/30 dark:bg-rose-950/30 dark:text-rose-100"
                : "border-border-light bg-white text-text-secondary hover:border-rose-300 dark:border-white/10 dark:bg-white/5 dark:text-white/80"
            )}
          >
            <XCircle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
            <span className="text-xs font-bold">رفض الطلب</span>
          </button>
        </div>
      </div>

      {/* 4. Active Decision Panel */}
      <div className="rounded-3xl border border-border-light bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.02]">
        {/* APPROVE MODE */}
        {activeMode === "approve" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <h4 className="text-sm font-bold text-text-primary dark:text-white">
                اعتماد وتفعيل حساب الممارس
              </h4>
            </div>

            {!props.canBeApproved ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-medium text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>
                  تنبيه: يمكنك اعتماد الطلب كاستثناء إداري، لكن يفضّل استكمال البيانات الناقصة أو طلب تعديلها أولاً.
                </span>
              </div>
            ) : null}

            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1.5">
                {props.approveNoteLabel} (اختياري)
              </label>
              <textarea
                rows={3}
                value={props.approveNote}
                onChange={(e) => props.setApproveNote(e.target.value)}
                placeholder={props.approveNotePlaceholder}
                className="w-full rounded-2xl border border-border-light bg-surface-secondary/50 px-4 py-3 text-sm text-text-primary dark:border-white/10 dark:bg-white/5 dark:text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                disabled={props.isApproving}
                onClick={props.onApprove}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 className="h-4 w-4" />
                {props.isApproving ? props.approveSubmittingLabel : props.approveLabel}
              </button>
            </div>
          </div>
        )}

        {/* REQUEST CHANGES MODE */}
        {activeMode === "request_changes" && (
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <Edit3 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <h4 className="text-sm font-bold text-text-primary dark:text-white">
                تحديد أسباب طلب التعديل واستكمال البيانات
              </h4>
            </div>

            {/* Quick Suggestion Chips */}
            {quickSuggestions.length > 0 ? (
              <div className="space-y-2 rounded-2xl border border-amber-200/60 bg-amber-50/40 p-4 dark:border-amber-900/30 dark:bg-amber-950/10">
                <p className="text-xs font-bold text-amber-900 dark:text-amber-300">
                  اضغط على الأسباب الناقصة لإضافتها بنقرة واحدة:
                </p>
                <div className="flex flex-wrap gap-2">
                  {quickSuggestions.map((label) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => addQuickSuggestionToRequestChanges(label)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 transition hover:bg-amber-100 dark:border-amber-800 dark:bg-white/5 dark:text-amber-200 dark:hover:bg-white/10 cursor-pointer"
                    >
                      <Plus className="h-3 w-3" />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Dynamic Reason List Inputs */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-text-muted">
                  {props.requestReasonLabel}
                </label>
                <button
                  type="button"
                  onClick={() => addReasonItem(props.requestChangeReasons, props.setRequestChangeReasons)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {props.addReasonLabel}
                </button>
              </div>

              {props.requestChangeReasons.map((item, index) => (
                <div key={item.id} className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-surface-secondary font-mono text-xs font-bold text-text-muted dark:bg-white/5 shrink-0">
                    #{index + 1}
                  </span>
                  <input
                    type="text"
                    value={item.value}
                    onChange={(e) =>
                      updateReasonItem(
                        props.requestChangeReasons,
                        props.setRequestChangeReasons,
                        item.id,
                        e.target.value
                      )
                    }
                    placeholder={props.requestReasonPlaceholder}
                    className={cn(
                      "flex-1 rounded-2xl border bg-surface-secondary/50 px-4 py-2.5 text-sm text-text-primary dark:border-white/10 dark:bg-white/5 dark:text-white focus:border-amber-500 focus:outline-none",
                      props.requestChangesReasonError && !item.value.trim() && "border-rose-500"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      removeReasonItem(
                        props.requestChangeReasons,
                        props.setRequestChangeReasons,
                        item.id
                      )
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-border-light text-text-muted transition hover:bg-rose-50 hover:text-rose-600 dark:border-white/10 dark:hover:bg-rose-950/20 cursor-pointer shrink-0"
                    title={props.removeReasonLabel}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}

              {props.requestChangesReasonError ? (
                <p className="text-xs font-semibold text-rose-500">{props.requestReasonRequired}</p>
              ) : null}
            </div>

            {/* Note to Practitioner */}
            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1.5">
                توجيهات وملاحظات إضافية للمعارض (اختياري)
              </label>
              <textarea
                rows={3}
                value={props.requestChangesNote}
                onChange={(e) => props.setRequestChangesNote(e.target.value)}
                placeholder={props.requestNotePlaceholder}
                className="w-full rounded-2xl border border-border-light bg-surface-secondary/50 px-4 py-3 text-sm text-text-primary dark:border-white/10 dark:bg-white/5 dark:text-white focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                disabled={props.isRequestingChanges}
                onClick={props.onRequestChanges}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-600 px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-amber-700 disabled:opacity-50 cursor-pointer"
              >
                <Edit3 className="h-4 w-4" />
                {props.isRequestingChanges ? props.requestChangesSubmittingLabel : props.requestChangesLabel}
              </button>
            </div>
          </div>
        )}

        {/* REJECT MODE */}
        {activeMode === "reject" && (
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
              <h4 className="text-sm font-bold text-text-primary dark:text-white">
                تحديد أسباب رفض طلب الانضمام
              </h4>
            </div>

            {/* Dynamic Reason List Inputs */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-text-muted">
                  {props.rejectReasonLabel}
                </label>
                <button
                  type="button"
                  onClick={() => addReasonItem(props.rejectReasons, props.setRejectReasons)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {props.addReasonLabel}
                </button>
              </div>

              {props.rejectReasons.map((item, index) => (
                <div key={item.id} className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-surface-secondary font-mono text-xs font-bold text-text-muted dark:bg-white/5 shrink-0">
                    #{index + 1}
                  </span>
                  <input
                    type="text"
                    value={item.value}
                    onChange={(e) =>
                      updateReasonItem(
                        props.rejectReasons,
                        props.setRejectReasons,
                        item.id,
                        e.target.value
                      )
                    }
                    placeholder={props.rejectReasonPlaceholder}
                    className={cn(
                      "flex-1 rounded-2xl border bg-surface-secondary/50 px-4 py-2.5 text-sm text-text-primary dark:border-white/10 dark:bg-white/5 dark:text-white focus:border-rose-500 focus:outline-none",
                      props.rejectReasonError && !item.value.trim() && "border-rose-500"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      removeReasonItem(
                        props.rejectReasons,
                        props.setRejectReasons,
                        item.id
                      )
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-border-light text-text-muted transition hover:bg-rose-50 hover:text-rose-600 dark:border-white/10 dark:hover:bg-rose-950/20 cursor-pointer shrink-0"
                    title={props.removeReasonLabel}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}

              {props.rejectReasonError ? (
                <p className="text-xs font-semibold text-rose-500">{props.rejectReasonRequired}</p>
              ) : null}
            </div>

            {/* Internal Reject Note */}
            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1.5">
                ملاحظات مراجعة وتوثيق الرفض للإدارة (اختياري)
              </label>
              <textarea
                rows={3}
                value={props.rejectNote}
                onChange={(e) => props.setRejectNote(e.target.value)}
                placeholder={props.rejectNotePlaceholder}
                className="w-full rounded-2xl border border-border-light bg-surface-secondary/50 px-4 py-3 text-sm text-text-primary dark:border-white/10 dark:bg-white/5 dark:text-white focus:border-rose-500 focus:outline-none"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                disabled={props.isRejecting}
                onClick={props.onReject}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-600 px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
              >
                <XCircle className="h-4 w-4" />
                {props.isRejecting ? props.rejectSubmittingLabel : props.rejectLabel}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
