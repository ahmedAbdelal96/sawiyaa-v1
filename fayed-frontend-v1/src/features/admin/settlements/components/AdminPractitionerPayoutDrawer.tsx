"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { BadgeDollarSign, CheckCircle2 } from "lucide-react";
import Button from "@/components/ui/button/Button";
import DateTimeField from "@/components/form/input/DateTimeField";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import {
  useAdminPractitionerPayoutDues,
  useRecordAdminPractitionerPayout,
  useUploadAdminPractitionerPayoutProof,
} from "../hooks/use-admin-settlements";
import type { PractitionerPayoutDueItem, SettlementPayoutMethod } from "../types/admin-settlements.types";
import {
  formatSettlementDateTime,
  formatSettlementMoney,
  toDateTimeLocalInputValue,
} from "../lib/settlement-formatters";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  practitioner: {
    id: string;
    slug: string;
    displayName: string | null;
    practitionerType: string;
    countryCode: string | null;
    isVerified: boolean;
  } | null;
};

const PAYOUT_METHODS: SettlementPayoutMethod[] = [
  "MANUAL_BANK_TRANSFER",
  "WALLET_TRANSFER",
  "CASH",
  "OTHER",
];

const ELIGIBLE_STATUSES = new Set(["READY", "PROCESSING"]);

function renderPractitionerName(item: { displayName: string | null; slug: string }) {
  return item.displayName ?? item.slug;
}

function normalizeAmount(value: string) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toFixed(2) : "";
}

function dueLabel(due: PractitionerPayoutDueItem) {
  return due.externalPayoutRef ?? due.id.slice(0, 8);
}

function payoutMethodLabel(
  t: ReturnType<typeof useTranslations>,
  method: SettlementPayoutMethod,
) {
  return t(`actions.payoutMethods.${method}` as Parameters<typeof t>[0]);
}

function SectionTitle({
  title,
  note,
  trailing,
}: {
  title: string;
  note?: string;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h3 className="text-sm font-semibold text-text-primary dark:text-white/95">{title}</h3>
        {note ? <p className="mt-1 text-xs text-text-muted">{note}</p> : null}
      </div>
      {trailing}
    </div>
  );
}

export default function AdminPractitionerPayoutDrawer({ isOpen, onClose, practitioner }: Props) {
  const t = useTranslations("admin-settlements");
  const locale = useLocale();
  const [selectedCurrency, setSelectedCurrency] = useState("");
  const [selectedDueId, setSelectedDueId] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [payoutMethod, setPayoutMethod] = useState<SettlementPayoutMethod>("MANUAL_BANK_TRANSFER");
  const [payoutDate, setPayoutDate] = useState(toDateTimeLocalInputValue());
  const [externalReference, setExternalReference] = useState("");
  const [notes, setNotes] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(
    null,
  );
  const [duePage, setDuePage] = useState(1);

  const duesQuery = useAdminPractitionerPayoutDues(practitioner?.id, {
    page: duePage,
    limit: 5,
    currencyCode: selectedCurrency || undefined,
  });
  const recordMutation = useRecordAdminPractitionerPayout();
  const uploadMutation = useUploadAdminPractitionerPayoutProof();

  const availableCurrencies = useMemo(() => {
    const values = new Set<string>();
    duesQuery.data?.summaries.forEach((summary) => {
      if (summary.currency) values.add(summary.currency);
    });
    duesQuery.data?.items.forEach((item) => {
      if (item.currency) values.add(item.currency);
    });
    return Array.from(values);
  }, [duesQuery.data]);

  const defaultDue = useMemo(() => {
    const items = duesQuery.data?.items ?? [];
    return items.find((item) => ELIGIBLE_STATUSES.has(item.status)) ?? items[0] ?? null;
  }, [duesQuery.data]);

  const selectedDue = duesQuery.data?.items.find((item) => item.id === selectedDueId) ?? defaultDue;
  const displayedAmountPaid =
    amountPaid || selectedDue?.amountRemaining || selectedDue?.amountNet || "";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    if (!practitioner?.id || !selectedDue) {
      setFeedback({ tone: "error", message: t("modal.validation.chooseDue") });
      return;
    }

    const amountToSave = displayedAmountPaid;
    const normalizedAmount = normalizeAmount(amountToSave);
    const maxAmount = normalizeAmount(selectedDue.amountRemaining ?? selectedDue.amountNet);
    const normalizedValue = Number(normalizedAmount);
    const maxValue = Number(maxAmount);

    if (!normalizedAmount || !Number.isFinite(normalizedValue) || normalizedValue <= 0) {
      setFeedback({ tone: "error", message: t("modal.validation.amountInvalid") });
      return;
    }

    if (!Number.isFinite(maxValue) || normalizedValue > maxValue) {
      setFeedback({ tone: "error", message: t("modal.validation.amountExceedsDue") });
      return;
    }

    try {
      const result = await recordMutation.mutateAsync({
        practitionerId: practitioner.id,
        data: {
          settlementId: selectedDue.id,
          amountPaid: normalizedAmount,
          payoutMethod,
          payoutDate: payoutDate || undefined,
          externalReference: externalReference.trim() || undefined,
          notes: notes.trim() || undefined,
        },
      });

      if (proofFile) {
        try {
          await uploadMutation.mutateAsync({
            practitionerId: practitioner.id,
            payoutId: result.item.id,
            file: proofFile,
          });
          setFeedback({ tone: "success", message: t("modal.successWithProof") });
        } catch {
          setFeedback({ tone: "success", message: t("modal.successWithoutProof") });
        }
      } else {
        setFeedback({ tone: "success", message: t("modal.successWithoutProof") });
      }

      await duesQuery.refetch();
      setSelectedDueId("");
      setAmountPaid("");
      setPayoutDate(toDateTimeLocalInputValue());
      setExternalReference("");
      setNotes("");
      setProofFile(null);
      onClose();
    } catch {
      setFeedback({ tone: "error", message: t("errors.generic") });
    }
  };

  const canSubmit = Boolean(practitioner?.id && selectedDue && !recordMutation.isPending);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" className="max-h-[92vh]">
      <div className="flex max-h-[92vh] flex-col">
        <ModalHeader
          eyebrow={t("modal.eyebrow")}
          title={t("modal.title")}
          description={t("modal.description")}
          className="px-6 pb-4 pt-6 sm:px-7"
        />

        <ModalBody className="space-y-4">
          {practitioner ? (
            <div className="space-y-4">
              <section className="rounded-[20px] border border-border-light bg-surface-secondary/50 px-4 py-3 dark:border-white/8 dark:bg-white/[0.03]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                      {t("modal.selectedPractitioner")}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-text-primary dark:text-white/95">
                      {renderPractitionerName(practitioner)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {practitioner.isVerified ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {t("modal.verified")}
                      </span>
                    ) : null}
                    <span className="rounded-full bg-surface-tertiary px-3 py-1 text-xs font-semibold text-text-secondary dark:bg-white/8 dark:text-white/70">
                      {practitioner.practitionerType}
                    </span>
                    {practitioner.countryCode ? (
                      <span className="rounded-full bg-surface-tertiary px-3 py-1 text-xs font-semibold text-text-secondary dark:bg-white/8 dark:text-white/70">
                        {practitioner.countryCode}
                      </span>
                    ) : null}
                  </div>
                </div>
              </section>

              <section className="rounded-[22px] border border-border-light p-4 dark:border-white/8">
                <SectionTitle
                    title={t("modal.dueTitle")}
                    note={t("modal.dueNote")}
                    trailing={
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={duePage <= 1}
                          onClick={() => setDuePage((value) => Math.max(1, value - 1))}
                        >
                          {t("practitionerPayout.previous")}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={!duesQuery.data || duePage >= duesQuery.data.pagination.totalPages}
                          onClick={() => setDuePage((value) => value + 1)}
                        >
                          {t("practitionerPayout.next")}
                        </Button>
                      </div>
                    }
                  />

                <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                        {t("modal.currencyFilter")}
                      </span>
                      <select
                        value={selectedCurrency}
                        onChange={(event) => {
                          setSelectedCurrency(event.target.value);
                          setSelectedDueId("");
                          setAmountPaid("");
                          setDuePage(1);
                          setFeedback(null);
                        }}
                        className="app-control w-full px-4 py-3"
                      >
                        <option value="">{t("modal.allCurrencies")}</option>
                        {availableCurrencies.map((currency) => (
                          <option key={currency} value={currency}>
                            {currency}
                          </option>
                        ))}
                      </select>
                    </label>
                </div>

                  <div className="mt-4 space-y-2">
                    {duesQuery.isLoading ? (
                      <p className="text-sm text-text-secondary">{t("practitionerPayout.loadingDues")}</p>
                    ) : duesQuery.isError ? (
                      <div className="rounded-2xl border border-dashed border-border-light bg-surface-secondary/60 p-4 text-sm text-text-secondary dark:border-white/10 dark:bg-white/[0.02]">
                        <p>{t("errors.generic")}</p>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="mt-3"
                          onClick={() => duesQuery.refetch()}
                        >
                          {t("list.retry")}
                        </Button>
                      </div>
                    ) : duesQuery.data?.items.length ? (
                      duesQuery.data.items.map((due) => {
                        const isSelected = due.id === selectedDue?.id;
                        const isEligible = ELIGIBLE_STATUSES.has(due.status);
                        const remaining = due.amountRemaining ?? due.amountNet;

                        return (
                          <button
                            key={due.id}
                            type="button"
                            disabled={!isEligible}
                            onClick={() => {
                              if (!isEligible) return;
                              setSelectedDueId(due.id);
                              setAmountPaid(remaining);
                              setFeedback(null);
                            }}
                            className={`w-full rounded-2xl border px-4 py-3 text-start transition ${
                              isSelected
                                ? "border-primary/30 bg-primary/5"
                                : isEligible
                                  ? "border-border-light bg-surface-secondary/70 hover:border-primary/25 hover:bg-surface-secondary dark:border-white/8 dark:bg-white/[0.03]"
                                  : "border-border-light bg-surface-tertiary/50 opacity-80 dark:border-white/8 dark:bg-white/[0.03]"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="rounded-full bg-surface-tertiary px-2.5 py-1 text-xs font-semibold text-text-secondary dark:bg-white/8 dark:text-white/60">
                                    {due.currency}
                                  </span>
                                  <span className="rounded-full bg-surface-tertiary px-2.5 py-1 text-xs font-semibold text-text-secondary dark:bg-white/8 dark:text-white/60">
                                    {t(`itemStatuses.${due.status}` as Parameters<typeof t>[0])}
                                  </span>
                                </div>
                                <p className="mt-2 text-sm font-semibold text-text-primary dark:text-white/95">
                                  {formatSettlementMoney(locale, remaining, due.currency)}
                                </p>
                                <p className="mt-1 text-xs text-text-muted">
                                  {dueLabel(due)} - {formatSettlementDateTime(locale, due.createdAt)}
                                </p>
                              </div>
                              <span className="mt-1 text-xs font-semibold text-primary">
                                {isSelected
                                  ? t("modal.selectedDueLabel")
                                  : isEligible
                                    ? t("practitionerPayout.choose")
                                    : t("practitionerPayout.notEligible")}
                              </span>
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div className="rounded-2xl border border-dashed border-border-light bg-surface-secondary/60 p-4 text-sm text-text-secondary dark:border-white/10 dark:bg-white/[0.02]">
                        {t("modal.noDueRows")}
                      </div>
                    )}
                  </div>
              </section>

              <section className="rounded-[22px] border border-primary/12 bg-primary/5 p-4 dark:border-primary/20 dark:bg-primary/10">
                <SectionTitle
                    title={t("modal.formTitle")}
                    note={t("practitionerPayout.recordNote")}
                  />

                <form
                  id="practitioner-payout-form"
                  noValidate
                  onSubmit={handleSubmit}
                  className="mt-4 space-y-4"
                >
                  <div className="rounded-2xl border border-border-light bg-surface-secondary/50 px-4 py-2.5 text-sm text-text-secondary dark:border-white/8 dark:bg-white/[0.03]">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                        {t("modal.selectedDueLabel")}
                      </p>
                    <p className="mt-1.5 text-sm font-semibold text-text-primary dark:text-white/95">
                        {selectedDue ? dueLabel(selectedDue) : t("practitionerPayout.noSelection")}
                      </p>
                      {selectedDue ? (
                        <p className="mt-1 text-xs text-text-muted">
                          {t(`itemStatuses.${selectedDue.status}` as Parameters<typeof t>[0])}
                        </p>
                      ) : null}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-2 flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                          <span>{t("modal.fields.amountPaid")}</span>
                          {selectedDue ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setAmountPaid(selectedDue.amountRemaining ?? selectedDue.amountNet)
                              }
                            >
                              {t("modal.max")}
                            </Button>
                          ) : null}
                        </span>
                        <input
                          value={displayedAmountPaid}
                          onChange={(event) => setAmountPaid(event.target.value)}
                          placeholder={t("modal.fields.amountPaidPlaceholder")}
                          className="app-control w-full px-4 py-3"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                          {t("modal.fields.payoutMethod")}
                        </span>
                        <select
                          value={payoutMethod}
                          onChange={(event) =>
                            setPayoutMethod(event.target.value as SettlementPayoutMethod)
                          }
                          className="app-control w-full px-4 py-3"
                        >
                          {PAYOUT_METHODS.map((method) => (
                            <option key={method} value={method}>
                              {payoutMethodLabel(t, method)}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <DateTimeField
                      label={t("modal.fields.payoutDate")}
                      value={payoutDate}
                      onChange={setPayoutDate}
                      placeholder={t("modal.fields.payoutDatePlaceholder")}
                    />

                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                          {t("modal.fields.externalReference")}
                        </span>
                        <input
                          value={externalReference}
                          onChange={(event) => setExternalReference(event.target.value)}
                          placeholder={t("modal.fields.externalReferencePlaceholder")}
                          className="app-control w-full px-4 py-3"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                          {t("modal.fields.notes")}
                        </span>
                        <textarea
                          rows={3}
                          value={notes}
                          onChange={(event) => setNotes(event.target.value)}
                          placeholder={t("modal.fields.notesPlaceholder")}
                          className="app-control w-full px-4 py-3"
                        />
                      </label>
                    </div>

                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                        {t("modal.fields.proof")}
                      </span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(event) => setProofFile(event.target.files?.[0] ?? null)}
                        className="block w-full text-sm text-text-secondary file:mr-3 file:rounded-full file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-primary-hover"
                      />
                      <p className="mt-2 text-xs text-text-muted">{t("modal.proofHint")}</p>
                      {proofFile ? (
                        <div className="mt-3 rounded-2xl border border-border-light bg-surface-secondary/70 px-4 py-3 text-sm text-text-secondary dark:border-white/8 dark:bg-white/[0.03]">
                          {proofFile.name}
                        </div>
                      ) : null}
                    </label>

                  {feedback ? (
                    <p
                      className={`text-sm ${
                        feedback.tone === "success"
                            ? "text-text-brand dark:text-primary-light"
                            : "text-error-600 dark:text-error-400"
                        }`}
                      >
                        {feedback.message}
                      </p>
                    ) : null}
                  </form>
              </section>
            </div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-border-light bg-surface-secondary/60 p-5 text-sm text-text-secondary dark:border-white/10 dark:bg-white/[0.02]">
              {t("modal.emptyState")}
            </div>
          )}
        </ModalBody>

        <ModalFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={recordMutation.isPending}>
            {t("modal.cancel")}
          </Button>
          <Button
            type="submit"
            form="practitioner-payout-form"
            startIcon={<BadgeDollarSign className="h-4 w-4" />}
            disabled={!canSubmit}
          >
            {recordMutation.isPending ? t("modal.submitting") : t("modal.submit")}
          </Button>
        </ModalFooter>
      </div>
    </Modal>
  );
}
