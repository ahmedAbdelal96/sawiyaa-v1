"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type FormEvent,
} from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Info,
  Loader2,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";
import Button from "@/components/ui/button/Button";
import Avatar from "@/components/ui/avatar/Avatar";
import AvatarText from "@/components/ui/avatar/AvatarText";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { formatSettlementDateTime, formatSettlementMoney, toDateTimeLocalInputValue } from "@/features/admin/settlements/lib/settlement-formatters";
import type { SettlementPayoutMethod } from "@/features/admin/settlements/types/admin-settlements.types";
import { useAdminPractitionerPayoutSummaries, useRecordAdminPractitionerManualPayout } from "../hooks/use-admin-practitioner-payouts";
import { getAdminPractitionerPayoutErrorKey } from "../lib/admin-practitioner-payouts-errors";
import type {
  AdminPractitionerPayoutBalance,
  AdminPractitionerPayoutSummary,
} from "../types/admin-practitioner-payouts.types";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";

type CurrencyCode = "EGP" | "USD";

export type AdminPractitionerPayoutDrawerTarget = AdminPractitionerPayoutSummary;

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

function useDebouncedValue<T>(value: T, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => window.clearTimeout(timer);
  }, [delay, value]);

  return debouncedValue;
}

function getDestinationMethodLabel(
  t: ReturnType<typeof useTranslations>,
  methodType: string | null | undefined,
) {
  switch (methodType) {
    case "BANK_ACCOUNT":
      return t("drawer.destination.methods.bank");
    case "IBAN":
      return t("drawer.destination.methods.iban");
    case "WALLET":
      return t("drawer.destination.methods.wallet");
    case "OTHER":
      return t("drawer.destination.methods.other");
    default:
      return t("drawer.destination.methods.unknown");
  }
}

function getBalanceHighlight(balance: AdminPractitionerPayoutBalance) {
  const total = Number(balance.totalPayableAmount ?? 0);
  const held = Number(balance.packageHeldAmount ?? 0);
  if (total > 0) return { tone: "success" as const, label: "payable" };
  if (held > 0) return { tone: "warning" as const, label: "packageHeld" };
  return { tone: "neutral" as const, label: "empty" };
}

function pickDefaultCurrency(summary: AdminPractitionerPayoutSummary, fallback: CurrencyCode) {
  if (Number(summary.egp.totalPayableAmount ?? 0) > 0) return "EGP" as const;
  if (Number(summary.usd.totalPayableAmount ?? 0) > 0) return "USD" as const;
  if (Number(summary.egp.packageHeldAmount ?? 0) > 0) return "EGP" as const;
  if (Number(summary.usd.packageHeldAmount ?? 0) > 0) return "USD" as const;
  return fallback;
}

function destinationSnapshot(summary: AdminPractitionerPayoutSummary) {
  return summary.egp.payoutDestinationSnapshot ?? summary.usd.payoutDestinationSnapshot ?? null;
}

function balanceForCurrency(summary: AdminPractitionerPayoutSummary, currency: CurrencyCode) {
  return currency === "EGP" ? summary.egp : summary.usd;
}

function getPractitionerDisplayName(summary: AdminPractitionerPayoutSummary) {
  return summary.practitionerName ?? summary.practitionerSlug ?? summary.practitionerId;
}

function getPractitionerCode(summary: AdminPractitionerPayoutSummary) {
  return summary.safeDisplayCode ?? summary.practitionerSlug ?? summary.practitionerId;
}

function hasDestinationSnapshot(summary: AdminPractitionerPayoutSummary) {
  return Boolean(destinationSnapshot(summary));
}

function getPractitionerSpecialty(summary: AdminPractitionerPayoutSummary) {
  return summary.primarySpecialtyName?.trim() ?? null;
}

function getPractitionerPayoutSummary(summary: AdminPractitionerPayoutSummary) {
  return summary.payoutDestinationSummaryMasked?.trim() || null;
}

function PractitionerAvatarBadge({
  avatarUrl,
  name,
}: {
  avatarUrl: string | null | undefined;
  name: string;
}) {
  return avatarUrl?.trim() ? (
    <Avatar
      src={avatarUrl}
      name={name}
      size="large"
      className="h-12 w-12 shrink-0 rounded-full"
      imgClassName="rounded-full"
    />
  ) : (
    <AvatarText name={name} className="h-12 w-12 shrink-0" />
  );
}

function formatPractitionerSearchSummary(
  locale: string,
  summary: AdminPractitionerPayoutSummary,
) {
  return [
    `EGP ${formatSettlementMoney(locale, summary.egp.totalPayableAmount, "EGP")}`,
    `USD ${formatSettlementMoney(locale, summary.usd.totalPayableAmount, "USD")}`,
  ].join(" · ");
}

function SummaryPill({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border-light bg-white px-4 py-3 shadow-sm dark:border-white/8 dark:bg-white/[0.04]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold text-text-primary dark:text-white/95">{value}</p>
    </div>
  );
}

function DestinationRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl bg-surface-secondary/60 px-4 py-3 dark:bg-white/[0.03]">
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">{label}</span>
      <span className="text-sm font-medium text-text-primary dark:text-white/90">{value}</span>
    </div>
  );
}

function PractitionerPicker({
  locale,
  t,
  searchTerm,
  onSearchTermChange,
  onSelect,
}: {
  locale: string;
  t: ReturnType<typeof useTranslations>;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  onSelect: (summary: AdminPractitionerPayoutSummary) => void;
}) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listboxId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [activeOptionIndex, setActiveOptionIndex] = useState(0);
  const trimmedSearch = searchTerm.trim();
  const deferredSearch = useDebouncedValue(trimmedSearch, 250);
  const searchQuery = useAdminPractitionerPayoutSummaries({
    search: deferredSearch.length > 0 ? deferredSearch : undefined,
    page: 1,
    limit: 30,
  });

  const items = searchQuery.data?.items ?? [];
  const showDropdown = isOpen;
  const activeIndex = items.length === 0 ? 0 : Math.min(activeOptionIndex, items.length - 1);
  const selectedItem = items[activeIndex] ?? null;

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!wrapperRef.current) return;
      if (wrapperRef.current.contains(event.target as Node)) return;
      setIsOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const handleSelect = (summary: AdminPractitionerPayoutSummary) => {
    onSelect(summary);
    onSearchTermChange("");
    setIsOpen(false);
    setActiveOptionIndex(0);
    inputRef.current?.blur();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown) {
      if (event.key === "ArrowDown" && items.length > 0) {
        event.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveOptionIndex((current) => (current + 1) % Math.max(items.length, 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveOptionIndex((current) => (current - 1 + items.length) % Math.max(items.length, 1));
      return;
    }

    if (event.key === "Enter") {
      if (selectedItem) {
        event.preventDefault();
        handleSelect(selectedItem);
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setIsOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className="space-y-3">
      <div className="space-y-2">
        <div className="flex items-center gap-2 rounded-2xl border border-primary/15 bg-brand-25 px-4 py-3 text-sm text-text-secondary dark:border-primary/20 dark:bg-primary/10">
          <Search className="h-4 w-4 shrink-0 text-primary" />
          <span>{t("drawer.searchHint")}</span>
        </div>

        <div className="space-y-2">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("drawer.comboboxLabel")}
            </span>
            <div className="relative">
              <Search className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input
                ref={inputRef}
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={showDropdown}
                aria-controls={listboxId}
                aria-activedescendant={showDropdown ? `${listboxId}-option-${activeIndex}` : undefined}
                value={searchTerm}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  onSearchTermChange(nextValue);
                  setIsOpen(true);
                  setActiveOptionIndex(0);
                }}
                onFocus={() => setIsOpen(true)}
                onKeyDown={handleKeyDown}
                placeholder={t("drawer.searchPlaceholder")}
                className="app-control w-full py-3 ps-11 pe-11"
              />
              <div className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-text-muted">
                {showDropdown ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
              {searchTerm ? (
                <button
                  type="button"
                  onClick={() => {
                    onSearchTermChange("");
                    setIsOpen(true);
                    setActiveOptionIndex(0);
                    inputRef.current?.focus();
                  }}
                  className="absolute end-10 top-1/2 -translate-y-1/2 rounded-full p-1 text-text-muted transition hover:bg-surface-secondary hover:text-text-primary"
                  aria-label={t("drawer.clearSearch")}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          </label>
        </div>
      </div>

      {showDropdown ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label={t("drawer.comboboxLabel")}
          className="max-h-96 overflow-y-auto rounded-3xl border border-border-light bg-white shadow-soft dark:border-white/8 dark:bg-surface-secondary"
        >
          {searchQuery.isLoading && !searchQuery.data ? (
            <div className="space-y-2 p-3">
              {[0, 1, 2].map((index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 rounded-2xl border border-border-light bg-surface-secondary/40 px-4 py-3 dark:border-white/8 dark:bg-white/[0.03]"
                >
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <div className="space-y-2">
                    <div className="h-4 w-36 animate-pulse rounded-full bg-surface-tertiary" />
                    <div className="h-3 w-24 animate-pulse rounded-full bg-surface-tertiary" />
                  </div>
                </div>
              ))}
            </div>
          ) : searchQuery.isError ? (
            <div className="px-4 py-6 text-sm leading-6 text-text-secondary">
              {t("drawer.searchError")}
            </div>
          ) : items.length === 0 ? (
            <div className="px-4 py-6 text-sm leading-6 text-text-secondary">
              {trimmedSearch.length > 0 ? (
                <>
                  <p className="font-semibold text-text-primary dark:text-white/95">
                    {t("drawer.searchEmptyTitle")}
                  </p>
                  <p className="mt-1">{t("drawer.searchEmptyDescription")}</p>
                </>
              ) : (
                <p className="font-semibold text-text-primary dark:text-white/95">
                  {t("drawer.initialEmptyMessage")}
                </p>
              )}
            </div>
          ) : (
            <div className="p-2">
              {items.map((summary, index) => {
                const snapshot = destinationSnapshot(summary);
                const active = index === activeIndex;

                return (
                  <button
                    key={summary.practitionerId}
                    id={`${listboxId}-option-${index}`}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onMouseEnter={() => setActiveOptionIndex(index)}
                    onClick={() => handleSelect(summary)}
                    className={cn(
                      "flex w-full items-start justify-between gap-4 rounded-2xl px-4 py-3 text-start transition",
                      active
                        ? "bg-brand-25 ring-1 ring-primary/20 dark:bg-primary/10"
                        : "hover:bg-surface-secondary/70 dark:hover:bg-white/[0.04]",
                    )}
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <PractitionerAvatarBadge
                        avatarUrl={summary.avatarUrl}
                        name={getPractitionerDisplayName(summary)}
                      />

                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-text-primary dark:text-white/95">
                            {getPractitionerDisplayName(summary)}
                          </p>
                          <span className="rounded-full bg-surface-secondary px-2.5 py-1 text-[11px] font-semibold text-text-secondary dark:bg-white/5">
                            {t("drawer.selectPractitioner")}
                          </span>
                        </div>
                        <p className="truncate text-xs text-text-secondary">{getPractitionerCode(summary)}</p>
                        {getPractitionerSpecialty(summary) ? (
                          <p className="truncate text-xs text-text-secondary">
                            {getPractitionerSpecialty(summary)}
                          </p>
                        ) : null}
                        <p className="text-xs leading-5 text-text-secondary">
                          {getPractitionerPayoutSummary(summary) ??
                            t("drawer.destinationMissingShort")}
                        </p>
                        <p className="text-xs leading-5 text-text-secondary">
                          {formatPractitionerSearchSummary(locale, summary)}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-2 text-right">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                          hasDestinationSnapshot(summary)
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                            : "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-300",
                        )}
                      >
                        {hasDestinationSnapshot(summary)
                          ? t("drawer.destinationAvailable")
                          : t("drawer.destinationMissingShort")}
                      </span>
                      {summary.lastPayoutAt ? (
                        <span className="text-[11px] text-text-muted">
                          {formatSettlementDateTime(locale, summary.lastPayoutAt)}
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function SelectedBalanceTiles({
  locale,
  t,
  summary,
  currencyCode,
  onCurrencyChange,
}: {
  locale: string;
  t: ReturnType<typeof useTranslations>;
  summary: AdminPractitionerPayoutSummary;
  currencyCode: CurrencyCode;
  onCurrencyChange: (currency: CurrencyCode) => void;
}) {
  const egp = summary.egp;
  const usd = summary.usd;
  const egpTone = getBalanceHighlight(egp);
  const usdTone = getBalanceHighlight(usd);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <SummaryPill
          label={t("currencies.EGP")}
          value={formatSettlementMoney(locale, egp.totalPayableAmount, "EGP")}
        />
        <SummaryPill
          label={t("currencies.USD")}
          value={formatSettlementMoney(locale, usd.totalPayableAmount, "USD")}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {([
          ["EGP", egp, egpTone] as const,
          ["USD", usd, usdTone] as const,
        ]).map(([currency, balance, tone]) => {
          const active = currencyCode === currency;
          return (
            <button
              key={currency}
              type="button"
              onClick={() => onCurrencyChange(currency)}
              className={cn(
                "rounded-3xl border px-4 py-4 text-start transition",
                active
                  ? "border-primary/30 bg-primary-light/20 shadow-sm"
                  : "border-border-light bg-white hover:border-primary/25 dark:border-white/8 dark:bg-surface-secondary dark:hover:bg-white/[0.04]",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-text-primary dark:text-white/95">
                  {t(`currencies.${currency}` as Parameters<typeof t>[0])}
                </span>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                    tone.tone === "success"
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                      : tone.tone === "warning"
                        ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
                        : "bg-surface-secondary text-text-secondary dark:bg-white/5 dark:text-white/70",
                  )}
                >
                  {active ? t("drawer.currencyActive") : t("drawer.currencySwitch")}
                </span>
              </div>
              <p className="mt-2 text-lg font-semibold text-text-primary dark:text-white/95">
                {formatSettlementMoney(locale, balance.totalPayableAmount, currency)}
              </p>
              <p className="mt-1 text-xs text-text-secondary">
                {t("drawer.balanceBreakdown", {
                  normal: formatSettlementMoney(locale, balance.normalSessionPayableAmount, currency),
                  packages: formatSettlementMoney(locale, balance.packageReleasedPayableAmount, currency),
                  held: formatSettlementMoney(locale, balance.packageHeldAmount, currency),
                })}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SelectedDestinationCard({
  locale,
  t,
  summary,
}: {
  locale: string;
  t: ReturnType<typeof useTranslations>;
  summary: AdminPractitionerPayoutSummary;
}) {
  const snapshot = destinationSnapshot(summary);
  const destinationSummary = getPractitionerPayoutSummary(summary);
  const destinationType =
    summary.payoutDestinationType ?? snapshot?.methodType ?? null;

  if (!snapshot && !destinationSummary) {
    return (
      <div className="flex items-start gap-3 rounded-3xl border border-dashed border-border-light bg-surface-secondary/50 px-4 py-4 text-sm leading-6 text-text-secondary dark:border-white/10 dark:bg-white/[0.03]">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" />
        <div>{t("drawer.destinationMissing")}</div>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-3xl border border-border-light bg-surface-secondary/50 px-4 py-4 dark:border-white/8 dark:bg-white/[0.03]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
            {t("drawer.destinationTitle")}
          </p>
          <p className="mt-1 text-sm font-semibold text-text-primary dark:text-white/95">
            {getDestinationMethodLabel(t, destinationType)}
          </p>
        </div>
        <div className="rounded-full bg-brand-25 px-3 py-1 text-xs font-semibold text-primary dark:bg-primary/10">
          {t("drawer.destinationReadOnly")}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <DestinationRow
          label={t("drawer.destination.accountHolder")}
          value={snapshot?.accountHolderName ?? "-"}
        />
        <DestinationRow
          label={t("drawer.destinationSummary")}
          value={destinationSummary ?? "-"}
        />
      </div>
    </div>
  );
}

function SelectedPractitionerCard({
  locale,
  t,
  summary,
  onChangePractitioner,
}: {
  locale: string;
  t: ReturnType<typeof useTranslations>;
  summary: AdminPractitionerPayoutSummary;
  onChangePractitioner: () => void;
}) {
  const snapshot = destinationSnapshot(summary);
  const destinationSummary = getPractitionerPayoutSummary(summary);
  const destinationType = summary.payoutDestinationType ?? snapshot?.methodType ?? null;
  const practitionerName = getPractitionerDisplayName(summary);
  const practitionerCode = getPractitionerCode(summary);
  const practitionerSpecialty = getPractitionerSpecialty(summary);

  return (
    <section className="space-y-4 rounded-[28px] border border-border-light bg-white p-5 shadow-sm dark:border-white/8 dark:bg-surface-secondary">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <PractitionerAvatarBadge avatarUrl={summary.avatarUrl} name={practitionerName} />

          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-lg font-semibold text-text-primary dark:text-white/95">
                {practitionerName}
              </p>
              <span className="rounded-full bg-brand-25 px-2.5 py-1 text-[11px] font-semibold text-primary dark:bg-primary/10">
                {t("drawer.selectedPractitioner")}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm text-text-secondary">
              <span>{practitionerCode}</span>
              {summary.practitionerSlug ? <span>· {summary.practitionerSlug}</span> : null}
            </div>

            {practitionerSpecialty ? (
              <p className="text-sm text-text-secondary">{practitionerSpecialty}</p>
            ) : null}

            <p className="text-xs leading-6 text-text-secondary">{t("drawer.identityConfirmation")}</p>
            <p className="text-xs leading-6 text-text-secondary">
              {destinationSummary ?? t("drawer.destinationMissing")}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onChangePractitioner}>
            {t("drawer.changePractitioner")}
          </Button>
          <Link
            href={`/admin/practitioner-payouts/${summary.practitionerId}`}
            className="inline-flex items-center justify-center rounded-2xl border border-border-light bg-white px-4 py-2 text-sm font-semibold text-text-primary transition hover:border-primary/30 hover:bg-brand-25 dark:bg-white/[0.03] dark:text-white/95 dark:hover:bg-white/[0.06]"
          >
            {t("drawer.viewHistory")}
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <SummaryPill
          label={t("drawer.currentCurrencyLabel")}
          value={t(`currencies.${pickDefaultCurrency(summary, "EGP")}` as Parameters<typeof t>[0])}
        />
        <SummaryPill
          label={t("drawer.destinationTitle")}
          value={getDestinationMethodLabel(t, destinationType)}
        />
      </div>
    </section>
  );
}

export default function AdminPractitionerSettlementDrawer({
  isOpen,
  practitioner,
  defaultCurrency = "EGP",
  onClose,
  onSuccess,
}: Props) {
  const t = useTranslations("admin-practitioner-payouts");
  const locale = useLocale();
  const recordMutation = useRecordAdminPractitionerManualPayout();
  const formRef = useRef<HTMLFormElement | null>(null);

  const [selection, setSelection] = useState<AdminPractitionerPayoutDrawerTarget | null>(practitioner);
  const [searchTerm, setSearchTerm] = useState("");
  const [currencyCode, setCurrencyCode] = useState<CurrencyCode>(defaultCurrency);
  const [amountPaid, setAmountPaid] = useState("");
  const [paidAt, setPaidAt] = useState(toDateTimeLocalInputValue());
  const [paymentMethod, setPaymentMethod] = useState<SettlementPayoutMethod>("MANUAL_BANK_TRANSFER");
  const [transferReference, setTransferReference] = useState("");
  const [notes, setNotes] = useState("");
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const currentBalance = selection ? balanceForCurrency(selection, currencyCode) : null;
  const totalPayableNumber = Number(currentBalance?.totalPayableAmount ?? 0);
  const normalizedAmount = normalizeAmount(amountPaid);
  const amountValue = normalizedAmount ? Number(normalizedAmount) : NaN;

  const amountInvalid = !normalizedAmount || !Number.isFinite(amountValue) || amountValue <= 0;
  const amountTooHigh =
    Boolean(normalizedAmount) &&
    Number.isFinite(totalPayableNumber) &&
    amountValue > totalPayableNumber;
  const noPayableAmount = !selection || totalPayableNumber <= 0;
  const remainingAfterPayment =
    Number.isFinite(totalPayableNumber) && Number.isFinite(amountValue)
      ? totalPayableNumber - amountValue
      : null;
  const searchMode = !selection;

  const canSubmit =
    Boolean(selection?.practitionerId) &&
    Boolean(currentBalance) &&
    !noPayableAmount &&
    !amountInvalid &&
    !amountTooHigh &&
    isConfirmed &&
    !recordMutation.isPending;

  const handleSelectPractitioner = (summary: AdminPractitionerPayoutSummary) => {
    setSelection(summary);
    setSearchTerm("");
    setCurrencyCode(pickDefaultCurrency(summary, defaultCurrency));
    setAmountPaid("");
    setPaidAt(toDateTimeLocalInputValue());
    setPaymentMethod("MANUAL_BANK_TRANSFER");
    setTransferReference("");
    setNotes("");
    setIsConfirmed(false);
    setFeedback(null);
  };

  const handleBackToSearch = () => {
    setSelection(null);
    setSearchTerm("");
    setAmountPaid("");
    setPaidAt(toDateTimeLocalInputValue());
    setPaymentMethod("MANUAL_BANK_TRANSFER");
    setTransferReference("");
    setNotes("");
    setIsConfirmed(false);
    setFeedback(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    if (!selection) {
      setFeedback(t("drawer.errors.pickPractitioner"));
      return;
    }

    if (!currentBalance) {
      setFeedback(t("drawer.errors.balanceUnavailable"));
      return;
    }

    if (noPayableAmount) {
      setFeedback(t("drawer.errors.noPayableAmount"));
      return;
    }

    if (amountInvalid) {
      setFeedback(t("drawer.errors.amountInvalid"));
      return;
    }

    if (amountTooHigh) {
      setFeedback(t("drawer.errors.amountExceedsDue"));
      return;
    }

    try {
      await recordMutation.mutateAsync({
        practitionerId: selection.practitionerId,
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      ariaLabel={selection ? t("drawer.title") : t("drawer.searchTitle")}
      className="!w-[min(calc(100vw-48px),1040px)] !max-w-[min(calc(100vw-48px),1040px)] !max-h-[90vh]"
    >
      <div className="flex h-full max-h-[90vh] flex-col">
        <ModalHeader
          eyebrow={selection ? t("drawer.eyebrow") : t("drawer.searchEyebrow")}
          title={selection ? t("drawer.title") : t("drawer.searchTitle")}
          description={selection ? t("drawer.description") : t("drawer.searchDescription")}
        >
          <div className="mt-4 rounded-2xl border border-border-light bg-surface-secondary/50 px-4 py-3 text-sm leading-6 text-text-secondary dark:border-white/8 dark:bg-white/[0.03]">
            {t("drawer.manualNotice")}
          </div>
        </ModalHeader>

        <ModalBody className="min-h-0 flex-1 space-y-5">
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

          {searchMode ? (
            <section className="space-y-4 rounded-3xl border border-border-light bg-white p-4 dark:border-white/8 dark:bg-surface-secondary">
              <PractitionerPicker
                locale={locale}
                t={t}
                searchTerm={searchTerm}
                onSearchTermChange={setSearchTerm}
                onSelect={handleSelectPractitioner}
              />
            </section>
          ) : selection ? (
            <>
              <section className="space-y-4 rounded-3xl border border-border-light bg-white p-4 dark:border-white/8 dark:bg-surface-secondary">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex min-w-0 items-start gap-4">
                    <PractitionerAvatarBadge
                      avatarUrl={selection.avatarUrl}
                      name={selection.practitionerName ?? selection.practitionerSlug ?? selection.practitionerId}
                    />

                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-lg font-semibold text-text-primary dark:text-white/95">
                          {selection.practitionerName ?? selection.practitionerSlug ?? selection.practitionerId}
                        </p>
                        <span className="rounded-full bg-brand-25 px-2.5 py-1 text-[11px] font-semibold text-primary dark:bg-primary/10">
                          {t("drawer.selectedPractitioner")}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-sm text-text-secondary">
                        <span>{selection.safeDisplayCode}</span>
                        {selection.practitionerSlug ? <span>· {selection.practitionerSlug}</span> : null}
                      </div>

                      {selection.primarySpecialtyName ? (
                        <p className="text-sm text-text-secondary">{selection.primarySpecialtyName}</p>
                      ) : null}

                      <p className="text-xs leading-6 text-text-secondary">
                        {t("drawer.identityConfirmation")}
                      </p>
                      <p className="text-xs leading-6 text-text-secondary">
                        {getPractitionerPayoutSummary(selection) ?? t("drawer.destinationMissing")}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={handleBackToSearch}>
                      {t("drawer.changePractitioner")}
                    </Button>
                    <Link
                      href={`/admin/practitioner-payouts/${selection.practitionerId}`}
                      className="inline-flex items-center justify-center rounded-2xl border border-border-light bg-white px-4 py-2 text-sm font-semibold text-text-primary transition hover:border-primary/30 hover:bg-brand-25 dark:bg-white/[0.03] dark:text-white/95 dark:hover:bg-white/[0.06]"
                    >
                      {t("drawer.viewHistory")}
                    </Link>
                  </div>
                </div>

                <SelectedBalanceTiles
                  locale={locale}
                  t={t}
                  summary={selection}
                  currencyCode={currencyCode}
                  onCurrencyChange={setCurrencyCode}
                />
              </section>

              <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                <SelectedDestinationCard locale={locale} t={t} summary={selection} />

                <div className="space-y-3 rounded-3xl border border-border-light bg-surface-secondary/50 p-4 dark:border-white/8 dark:bg-white/[0.03]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                        {t("drawer.currentCurrencyLabel")}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-text-primary dark:text-white/95">
                        {t(`currencies.${currencyCode}` as Parameters<typeof t>[0])}
                      </p>
                    </div>
                    <div className="rounded-full bg-brand-25 px-3 py-1 text-xs font-semibold text-primary dark:bg-primary/10">
                      {currentBalance ? formatSettlementMoney(locale, currentBalance.totalPayableAmount, currencyCode) : "-"}
                    </div>
                  </div>

                  <form ref={formRef} className="space-y-4" onSubmit={handleSubmit}>
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

                    <div className="grid gap-4 sm:grid-cols-2">
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

                    <label className="flex items-start gap-3 rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm leading-6 text-text-secondary dark:border-primary/20 dark:bg-primary/10">
                      <input
                        type="checkbox"
                        checked={isConfirmed}
                        onChange={(event) => setIsConfirmed(event.target.checked)}
                        className="mt-1 h-4 w-4 shrink-0 rounded border-border-strong text-primary focus:ring-primary"
                      />
                      <span className="min-w-0">
                        <span className="block font-semibold text-text-primary dark:text-white/95">
                          {t("drawer.confirmationCheckboxLabel")}
                        </span>
                        <span className="block text-xs leading-6 text-text-secondary">
                          {t("drawer.confirmationHint")}
                        </span>
                      </span>
                    </label>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-border-light bg-white px-4 py-3 dark:border-white/8 dark:bg-white/[0.03]">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                          {t("drawer.remainingLabel")}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-text-primary dark:text-white/95">
                          {remainingAfterPayment !== null ? (
                            formatSettlementMoney(
                              locale,
                              remainingAfterPayment > 0 ? remainingAfterPayment.toFixed(2) : "0.00",
                              currencyCode,
                            )
                          ) : (
                            "-"
                          )}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-border-light bg-white px-4 py-3 dark:border-white/8 dark:bg-white/[0.03]">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                          {t("drawer.packageHeldLabel")}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-text-primary dark:text-white/95">
                          {formatSettlementMoney(locale, currentBalance?.packageHeldAmount ?? "0.00", currencyCode)}
                        </p>
                      </div>
                    </div>

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

                    {noPayableAmount ? (
                      <div className="flex items-start gap-3 rounded-2xl border border-surface-tertiary bg-surface-secondary/60 px-4 py-3 text-sm leading-6 text-text-secondary dark:border-white/8 dark:bg-white/[0.03]">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <div>{t("drawer.noPayableAmount")}</div>
                      </div>
                    ) : null}

                    <div className="flex items-start gap-3 rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm leading-6 text-text-secondary dark:border-primary/20 dark:bg-primary/10">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <div>{t("drawer.confirmationHint")}</div>
                    </div>
                  </form>
                </div>
              </section>
            </>
          ) : null}
        </ModalBody>

        <ModalFooter className="sticky bottom-0 z-20">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-text-secondary">{t("drawer.footerNote")}</div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={onClose} disabled={recordMutation.isPending}>
                {t("drawer.cancel")}
              </Button>
              {selection ? (
                <Button
                  variant="primary"
                  onClick={() => formRef.current?.requestSubmit()}
                  disabled={!canSubmit}
                >
                  {recordMutation.isPending ? t("actions.saving") : t("actions.record")}
                </Button>
              ) : null}
            </div>
          </div>
        </ModalFooter>
      </div>
    </Modal>
  );
}
