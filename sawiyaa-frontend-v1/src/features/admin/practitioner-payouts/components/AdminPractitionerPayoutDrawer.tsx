"use client";

import { useRef, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AlertCircle, Info } from "lucide-react";
import { toast } from "sonner";
import Button from "@/components/ui/button/Button";
import { Drawer, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { formatSettlementDateTime, formatSettlementMoney, toDateTimeLocalInputValue } from "@/features/admin/settlements/lib/settlement-formatters";
import type { SettlementPayoutMethod } from "@/features/admin/settlements/types/admin-settlements.types";
import { useAdminPractitionerPayoutBalance, useRecordAdminPractitionerManualPayout } from "../hooks/use-admin-practitioner-payouts";
import { getAdminPractitionerPayoutErrorKey } from "../lib/admin-practitioner-payouts-errors";

type CurrencyCode = "EGP" | "USD";

export type AdminPractitionerPayoutDrawerTarget = {
  practitionerId: string;
  practitionerName: string | null;
  practitionerSlug: string | null;
};

type Props = {
  isOpen: boolean;
  practitioner: AdminPractitionerPayoutDrawerTarget | null;
  defaultCurrency?: CurrencyCode;
  onClose: () => void;
  onSuccess?: () => void;
};

const PAYMENT_METHOD_OPTIONS: SettlementPayoutMethod[] = [
  "MANUAL_BANK_TRANSFER",
  "WALLET_TRANSFER",
  "CASH",
  "OTHER",
];

function normalizeAmount(value: string) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return numeric.toFixed(2);
}

export default function AdminPractitionerPayoutDrawer({
  isOpen,
  practitioner,
  defaultCurrency = "EGP",
  onClose,
  onSuccess,
}: Props) {
  const t = useTranslations("admin-practitioner-payouts");
  const locale = useLocale();
  const [currencyCode, setCurrencyCode] = useState<CurrencyCode>(defaultCurrency);
  const [amountPaid, setAmountPaid] = useState("");
  const [paidAt, setPaidAt] = useState(toDateTimeLocalInputValue());
  const [paymentMethod, setPaymentMethod] = useState<SettlementPayoutMethod>(
    "MANUAL_BANK_TRANSFER",
  );
  const [transferReference, setTransferReference] = useState("");
  const [notes, setNotes] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  const recordMutation = useRecordAdminPractitionerManualPayout();

  const balanceQuery = useAdminPractitionerPayoutBalance(
    practitioner?.practitionerId,
    currencyCode,
  );

  const balance = balanceQuery.data?.item ?? null;

  const drawerKey = isOpen
    ? `${practitioner?.practitionerId ?? "none"}-${defaultCurrency}`
    : "closed";

  const normalizedAmount = normalizeAmount(amountPaid);
  const amountValue = normalizedAmount ? Number(normalizedAmount) : NaN;
  const totalPayableNumber = Number(balance?.totalPayableAmount ?? 0);
  const remainingAfterPayment =
    Number.isFinite(totalPayableNumber) && Number.isFinite(amountValue)
      ? totalPayableNumber - amountValue
      : null;

  const amountInvalid =
    !normalizedAmount || !Number.isFinite(amountValue) || amountValue <= 0;
  const amountTooHigh =
    Boolean(normalizedAmount) &&
    Number.isFinite(totalPayableNumber) &&
    amountValue > totalPayableNumber;
  const noPayableAmount =
    !balance || Number(balance.totalPayableAmount ?? 0) <= 0;

  const canSubmit =
    Boolean(practitioner?.practitionerId) &&
    Boolean(balance) &&
    !noPayableAmount &&
    !amountInvalid &&
    !amountTooHigh &&
    !recordMutation.isPending;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    if (!practitioner) {
      setFeedback(t("errors.pickPractitioner"));
      return;
    }

    if (!balance) {
      setFeedback(t("errors.balanceUnavailable"));
      return;
    }

    if (noPayableAmount) {
      setFeedback(t("errors.noPayableAmount"));
      return;
    }

    if (amountInvalid) {
      setFeedback(t("errors.amountInvalid"));
      return;
    }

    if (amountTooHigh) {
      setFeedback(t("errors.amountExceedsDue"));
      return;
    }

    try {
      await recordMutation.mutateAsync({
        practitionerId: practitioner.practitionerId,
        currencyCode,
        amountPaid: normalizedAmount as string,
        paidAt: new Date(paidAt).toISOString(),
        paymentMethod,
        transferReference: transferReference.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      toast.success(t("messages.success"));
      setFeedback(t("messages.success"));
      onSuccess?.();
      onClose();
    } catch (error) {
      const key = getAdminPractitionerPayoutErrorKey(error);
      const safeMessage = t(key as Parameters<typeof t>[0]);
      setFeedback(safeMessage);
      toast.error(safeMessage);
    }
  };

  const heldAmount = balance?.packageHeldAmount ?? "0.00";
  const packageHeldPositive = Number(heldAmount) > 0;

  return (
    <Drawer
      key={drawerKey}
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel={t("drawer.title")}
      side="right"
      inset={false}
    >
      <div className="flex h-full max-h-[inherit] flex-col">
        <ModalHeader
          eyebrow={t("drawer.eyebrow")}
          title={t("drawer.title")}
          description={t("drawer.description")}
        >
          <div className="mt-4 rounded-2xl border border-border-light bg-surface-secondary/50 px-4 py-3 text-sm leading-6 text-text-secondary dark:border-white/8 dark:bg-white/[0.03]">
            {t("drawer.manualNotice")}
          </div>
        </ModalHeader>

        <ModalBody className="space-y-5">
          {feedback ? (
            <div
              className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${
                feedback === t("messages.success")
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-700/30 dark:bg-emerald-900/10 dark:text-emerald-300"
                  : "border-red-200 bg-red-50 text-red-700 dark:border-red-700/30 dark:bg-red-900/10 dark:text-red-300"
              }`}
            >
              {feedback}
            </div>
          ) : null}

          <div className="grid gap-4 rounded-3xl border border-border-light bg-surface-secondary/50 p-4 dark:border-white/8 dark:bg-white/[0.03] sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("drawer.practitioner")}
              </p>
              <p className="mt-1 text-sm font-semibold text-text-primary dark:text-white/95">
                {practitioner?.practitionerName ?? "-"}
              </p>
              <p className="mt-1 text-xs text-text-secondary">
                {practitioner?.practitionerSlug ?? practitioner?.practitionerId ?? "-"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("drawer.selectedCurrency")}
              </p>
              <p className="mt-1 text-sm font-semibold text-text-primary dark:text-white/95">
                {t(`currencies.${currencyCode}` as Parameters<typeof t>[0])}
              </p>
              <p className="mt-1 text-xs text-text-secondary">
                {t("drawer.currencyHelp")}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl bg-surface-secondary/60 px-4 py-3 dark:bg-white/[0.03]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                {t("drawer.summary.normal")}
              </p>
              <p className="mt-1 text-sm font-semibold text-text-primary dark:text-white/95">
                {balance
                  ? formatSettlementMoney(locale, balance.normalSessionPayableAmount, balance.currencyCode)
                  : "-"}
              </p>
            </div>
            <div className="rounded-2xl bg-surface-secondary/60 px-4 py-3 dark:bg-white/[0.03]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                {t("drawer.summary.packageReleased")}
              </p>
              <p className="mt-1 text-sm font-semibold text-text-primary dark:text-white/95">
                {balance
                  ? formatSettlementMoney(locale, balance.packageReleasedPayableAmount, balance.currencyCode)
                  : "-"}
              </p>
            </div>
            <div className="rounded-2xl bg-surface-secondary/60 px-4 py-3 dark:bg-white/[0.03]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                {t("drawer.summary.packageHeld")}
              </p>
              <p className="mt-1 text-sm font-semibold text-text-primary dark:text-white/95">
                {balance
                  ? formatSettlementMoney(locale, balance.packageHeldAmount, balance.currencyCode)
                  : "-"}
              </p>
            </div>
            <div className="rounded-2xl bg-white/70 px-4 py-3 dark:bg-white/[0.04]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                {t("drawer.summary.totalPayable")}
              </p>
              <p className="mt-1 text-sm font-semibold text-text-primary dark:text-white/95">
                {balance
                  ? formatSettlementMoney(locale, balance.totalPayableAmount, balance.currencyCode)
                  : "-"}
              </p>
            </div>
          </div>

          {balance?.lastPayoutAt ? (
            <div className="rounded-2xl border border-border-light bg-surface-secondary/50 px-4 py-3 text-sm text-text-secondary dark:border-white/8 dark:bg-white/[0.03]">
              {t("drawer.lastPayout")}{" "}
              <span className="font-semibold text-text-primary dark:text-white/95">
                {formatSettlementDateTime(locale, balance.lastPayoutAt)}
              </span>
            </div>
          ) : null}

          {packageHeldPositive ? (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <div>{t("drawer.packageHeldNote")}</div>
            </div>
          ) : null}

          {noPayableAmount ? (
            <div className="flex items-start gap-3 rounded-2xl border border-surface-tertiary bg-surface-secondary/60 px-4 py-3 text-sm leading-6 text-text-secondary dark:border-white/8 dark:bg-white/[0.03]">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>{t("drawer.noPayableAmount")}</div>
            </div>
          ) : null}

          <form ref={formRef} className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                  {t("drawer.currencyLabel")}
                </span>
                <select
                  value={currencyCode}
                  onChange={(event) => {
                    setCurrencyCode(event.target.value as CurrencyCode);
                    setAmountPaid("");
                    setFeedback(null);
                  }}
                  className="app-control w-full py-3"
                >
                  <option value="EGP">{t("currencies.EGP")}</option>
                  <option value="USD">{t("currencies.USD")}</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                  {t("drawer.amountPaidLabel")}
                </span>
                <input
                  value={amountPaid}
                  onChange={(event) => setAmountPaid(event.target.value)}
                  inputMode="decimal"
                  placeholder="0.00"
                  className="app-control w-full px-4 py-3"
                />
                <p className="mt-2 text-xs text-text-secondary">
                  {t("drawer.amountCurrencyNote", {
                    currency: t(`currencies.${currencyCode}` as Parameters<typeof t>[0]),
                  })}
                </p>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                  {t("drawer.paidAtLabel")}
                </span>
                <input
                  type="datetime-local"
                  value={paidAt}
                  onChange={(event) => setPaidAt(event.target.value)}
                  className="app-control w-full px-4 py-3"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                  {t("drawer.paymentMethodLabel")}
                </span>
                <select
                  value={paymentMethod}
                  onChange={(event) =>
                    setPaymentMethod(event.target.value as SettlementPayoutMethod)
                  }
                  className="app-control w-full py-3"
                >
                  {PAYMENT_METHOD_OPTIONS.map((method) => (
                    <option key={method} value={method}>
                      {t(`paymentMethods.${method}` as Parameters<typeof t>[0])}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                  {t("drawer.transferReferenceLabel")}
                </span>
                <input
                  value={transferReference}
                  onChange={(event) => setTransferReference(event.target.value)}
                  placeholder={t("drawer.transferReferencePlaceholder")}
                  className="app-control w-full px-4 py-3"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                  {t("drawer.remainingLabel")}
                </span>
                <div className="app-control flex h-12 items-center px-4 text-sm font-semibold text-text-primary dark:text-white/95">
                  {remainingAfterPayment !== null ? (
                    formatSettlementMoney(
                      locale,
                      remainingAfterPayment > 0 ? remainingAfterPayment.toFixed(2) : "0.00",
                      currencyCode,
                    )
                  ) : (
                    "-"
                  )}
                </div>
              </label>
            </div>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("drawer.notesLabel")}
              </span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                placeholder={t("drawer.notesPlaceholder")}
                className="app-control w-full px-4 py-3"
              />
            </label>

            {amountPaid.trim() && amountInvalid ? (
              <div className="rounded-2xl border border-border-light bg-surface-secondary/50 px-4 py-3 text-sm text-text-secondary dark:border-white/8 dark:bg-white/[0.03]">
                {t("drawer.validation.amountInvalid")}
              </div>
            ) : null}

            {amountPaid.trim() && amountTooHigh ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                {t("drawer.validation.amountTooHigh")}
              </div>
            ) : null}
          </form>
        </ModalBody>

        <ModalFooter className="sticky bottom-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-text-secondary">
              {t("drawer.footerNote")}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={onClose} disabled={recordMutation.isPending}>
                {t("drawer.cancel")}
              </Button>
              <Button
                variant="primary"
                onClick={() => formRef.current?.requestSubmit()}
                disabled={!canSubmit}
              >
                {recordMutation.isPending ? t("actions.saving") : t("actions.record")}
              </Button>
            </div>
          </div>
        </ModalFooter>
      </div>
    </Drawer>
  );
}
