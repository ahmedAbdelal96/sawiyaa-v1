"use client";

import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AlertCircle, Clock3, ShieldCheck, Tag, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { toAppError } from "@/lib/api/errors";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import { usePatientSession } from "@/features/sessions/hooks/use-sessions";
import { useSessionFinancialBreakdown } from "@/features/sessions/hooks/use-session-financial";
import Button from "@/components/ui/button/Button";
import DirectionalArrowIcon from "@/components/ui/navigation/DirectionalArrowIcon";
import { useInitiateSessionPayment, usePatientWalletSummary } from "../hooks/use-payments";
import StripePaymentForm from "./StripePaymentForm";
import type { FinancialBreakdown } from "@/features/sessions/types/financial.types";

type Phase = "pricing" | "checkout";

function formatAmount(amount: string, currency: string, numLocale: string): string {
  return new Intl.NumberFormat(numLocale, {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
  }).format(Number(amount));
}

function formatDatetime(isoString: string | null, numLocale: string): string {
  if (!isoString) return "";
  return new Date(isoString).toLocaleString(numLocale, {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: !numLocale.startsWith("ar"),
  });
}

function normalizeAmount(amount: string): number {
  const parsed = Number(amount);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isSessionExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() <= Date.now();
}

function resolveWalletSplit(input: {
  totalAmount: string;
  walletBalance: string;
  useWalletBalance: boolean;
}) {
  const total = normalizeAmount(input.totalAmount);
  const wallet = input.useWalletBalance ? normalizeAmount(input.walletBalance) : 0;
  const walletUsed = Math.min(wallet, total);
  const gatewayRemaining = Math.max(total - walletUsed, 0);

  return {
    walletUsed: walletUsed.toFixed(2),
    gatewayRemaining: gatewayRemaining.toFixed(2),
  };
}

type PriceBreakdownProps = {
  breakdown: FinancialBreakdown;
  numLocale: string;
  t: ReturnType<typeof useTranslations<"payments">>;
};

function PriceBreakdown({ breakdown, numLocale, t }: PriceBreakdownProps) {
  const hasDiscount = Number(breakdown.discountAmount) > 0;

  return (
    <div className="rounded-2xl border border-border-light bg-white p-4 shadow-sm dark:border-border-light dark:bg-surface-secondary">
      <p className="mb-4 text-sm font-semibold text-text-primary dark:text-white/90">
        {t("breakdown.heading")}
      </p>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-secondary">{t("breakdown.grossAmount")}</span>
          <span className="font-medium text-text-primary dark:text-white/85">
            {formatAmount(breakdown.grossAmount, breakdown.currency, numLocale)}
          </span>
        </div>

        {hasDiscount && (
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1 text-text-brand dark:text-primary-light">
              <Tag size={12} />
              {breakdown.coupon ? breakdown.coupon.code : t("breakdown.discount")}
            </span>
            <span className="font-medium text-text-brand dark:text-primary-light">
              -{formatAmount(breakdown.discountAmount, breakdown.currency, numLocale)}
            </span>
          </div>
        )}

        <div className="mt-2 border-t border-border-light pt-3 dark:border-border-light">
          <div className="flex items-center justify-between rounded-xl bg-surface-tertiary px-3 py-2 dark:bg-white/5">
            <span className="text-sm font-semibold text-text-primary dark:text-white/90">
              {t("breakdown.netPaid")}
            </span>
            <span className="text-base font-bold text-primary">
              {formatAmount(breakdown.netPaidAmount, breakdown.currency, numLocale)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

type WalletUsagePreviewProps = {
  t: ReturnType<typeof useTranslations<"payments">>;
  numLocale: string;
  currency: string;
  totalAmount: string;
  walletBalance: string;
  useWalletBalance: boolean;
};

function WalletUsagePreview({
  t,
  numLocale,
  currency,
  totalAmount,
  walletBalance,
  useWalletBalance,
}: WalletUsagePreviewProps) {
  const walletSplit = resolveWalletSplit({
    totalAmount,
    walletBalance,
    useWalletBalance,
  });

  return (
    <div className="rounded-2xl border border-border-light bg-white p-4 shadow-sm dark:border-border-light dark:bg-surface-secondary">
      <p className="mb-3 text-sm font-semibold text-text-primary dark:text-white/90">
        {t("walletCheckout.heading")}
      </p>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-secondary">{t("walletCheckout.totalLabel")}</span>
          <span className="font-medium text-text-primary dark:text-white/90">
            {formatAmount(totalAmount, currency, numLocale)}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-secondary">{t("walletCheckout.walletDeductionLabel")}</span>
          <span className="font-medium text-text-brand dark:text-primary-light">
            {formatAmount(walletSplit.walletUsed, currency, numLocale)}
          </span>
        </div>
        <div className="flex items-center justify-between rounded-xl bg-surface-tertiary px-3 py-2 text-sm dark:bg-white/5">
          <span className="font-semibold text-text-primary dark:text-white/90">
            {t("walletCheckout.gatewayRemainderLabel")}
          </span>
          <span className="text-base font-bold text-primary">
            {formatAmount(walletSplit.gatewayRemaining, currency, numLocale)}
          </span>
        </div>
      </div>
    </div>
  );
}

type Props = {
  sessionId: string;
};

export default function PaySessionPanel({ sessionId }: Props) {
  const t = useTranslations("payments");
  const locale = useLocale();
  const numLocale = locale === "ar" ? "ar-SA" : "en-US";

  const [phase, setPhase] = useState<Phase>("pricing");
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [useWalletBalance, setUseWalletBalance] = useState(true);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [initiateError, setInitiateError] = useState<string | null>(null);
  const [redirectingToHostedCheckout, setRedirectingToHostedCheckout] = useState(false);

  const couponInputRef = useRef<HTMLInputElement>(null);

  const {
    data: session,
    isLoading: sessionLoading,
    isError: sessionError,
    refetch: refetchSession,
  } = usePatientSession(sessionId);

  const isPayableSession =
    session?.status === "PENDING_PAYMENT" && !isSessionExpired(session?.expiresAt ?? null);

  const {
    data: breakdown,
    isLoading: breakdownLoading,
    isError: breakdownError,
    refetch: refetchBreakdown,
  } = useSessionFinancialBreakdown(sessionId, appliedCoupon, {
    enabled: Boolean(isPayableSession),
  });

  const { data: walletSummaryData, isLoading: walletSummaryLoading } = usePatientWalletSummary();
  const walletSummary = walletSummaryData?.item ?? null;
  const walletCurrencyMatchesBreakdown = walletSummary && breakdown
    ? walletSummary.currencyCode === breakdown.currency
    : true;
  const availableWalletBalance =
    walletSummary && walletCurrencyMatchesBreakdown ? walletSummary.availableBalance : "0";
  const walletSplit = breakdown
    ? resolveWalletSplit({
        totalAmount: breakdown.netPaidAmount,
        walletBalance: availableWalletBalance,
        useWalletBalance,
      })
    : null;

  const initiate = useInitiateSessionPayment();

  const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/${locale}/patient/sessions/${sessionId}/payment-return`;

  const handleApplyCoupon = () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setAppliedCoupon(code);
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
    couponInputRef.current?.focus();
  };

  const isCouponInvalid = Boolean(appliedCoupon) && breakdownError;

  const handleProceedToCheckout = () => {
    setInitiateError(null);
    setRedirectingToHostedCheckout(false);

    initiate.mutate(
      {
        sessionId,
        input: {
          couponCode: appliedCoupon ?? undefined,
          useWalletBalance,
        },
      },
      {
        onSuccess: (data) => {
          if (data.item.clientSecret) {
            setClientSecret(data.item.clientSecret);
            setPhase("checkout");
            return;
          }

          if (data.item.checkoutUrl) {
            setRedirectingToHostedCheckout(true);
            window.location.assign(data.item.checkoutUrl);
            return;
          }

          if (
            data.item.provider === "INTERNAL_WALLET" &&
            (data.item.status === "CAPTURED" || data.item.status === "AUTHORIZED")
          ) {
            window.location.assign(`${returnUrl}?redirect_status=succeeded`);
            return;
          }

          setInitiateError(t("page.initiateError"));
        },
        onError: (err) => {
          const appErr = toAppError(err);
          if (appErr.statusCode === 409) {
            setInitiateError(t("page.initiateConflict"));
            return;
          }
          setInitiateError(t("page.initiateError"));
        },
      },
    );
  };

  if (sessionLoading) {
    return (
      <div className="space-y-3">
        <ListStateSkeleton items={1} heightClass="h-24" />
        <ListStateSkeleton items={1} heightClass="h-28" />
        <ListStateSkeleton items={1} heightClass="h-12" />
      </div>
    );
  }

  if (sessionError || !session) {
    return (
      <StateCard
        title={t("page.loadError")}
        note={t("page.sessionBlockedByPayment")}
        action={{ label: t("page.retry"), onClick: () => refetchSession() }}
      />
    );
  }

  if (isSessionExpired(session.expiresAt) || session.status !== "PENDING_PAYMENT") {
    const isAlreadyPaid =
      session.status === "CONFIRMED" ||
      session.status === "UPCOMING" ||
      session.status === "READY_TO_JOIN" ||
      session.status === "IN_PROGRESS" ||
      session.status === "COMPLETED";

    if (isAlreadyPaid) {
      return (
        <div className="rounded-2xl border border-border-light bg-white p-5 text-center dark:border-border-light dark:bg-surface-secondary">
          <p className="mb-1 text-sm font-semibold text-text-brand dark:text-primary-light">
            {t("page.alreadyPaid")}
          </p>
          <p className="text-xs text-text-secondary dark:text-primary-light/80">
            {t("page.alreadyPaidNote")}
          </p>
          <Link
            href="/patient/sessions"
            className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
          >
            {t("page.viewSessions")}
          </Link>
        </div>
      );
    }

    if (session.status === "REFUND_PENDING" || session.status === "REFUNDED") {
      return (
        <div className="rounded-2xl border border-border-light bg-white p-5 text-center dark:border-border-light dark:bg-surface-secondary">
          <p className="mb-1 text-sm font-semibold text-warning-700 dark:text-warning-300">
            {t(`page.${session.status}.heading` as Parameters<typeof t>[0])}
          </p>
          <p className="mb-3 text-xs text-warning-700/80 dark:text-warning-300/80">
            {t(`page.${session.status}.note` as Parameters<typeof t>[0])}
          </p>
          <Link
            href="/patient/sessions"
            className="text-sm font-medium text-primary hover:underline"
          >
            {t("page.viewSessions")}
          </Link>
        </div>
      );
    }

    return (
        <div className="rounded-2xl border border-border-light bg-white p-5 text-center dark:border-border-light dark:bg-surface-secondary">
        <p className="mb-1 text-sm font-semibold text-warning-700 dark:text-warning-300">
          {t("page.sessionExpired")}
        </p>
        <p className="mb-3 text-xs text-warning-700/80 dark:text-warning-300/80">
          {t("page.sessionExpiredNote")}
        </p>
        <Link
          href="/practitioners"
          className="text-sm font-medium text-primary hover:underline"
        >
          {t("page.bookAgain")}
        </Link>
      </div>
    );
  }

  if (phase === "checkout" && clientSecret && breakdown) {
    return (
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
        <button
          type="button"
          onClick={() => setPhase("pricing")}
          className="mb-4 inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-primary"
        >
          <DirectionalArrowIcon direction="back" className="h-[13px] w-[13px]" />
          {t("page.backToSummary")}
        </button>

        <div className="mb-4">
          <PriceBreakdown breakdown={breakdown} numLocale={numLocale} t={t} />
        </div>

        <StripePaymentForm
          clientSecret={clientSecret}
          netPaidAmount={breakdown.netPaidAmount}
          currency={breakdown.currency}
          returnUrl={returnUrl}
        />
        </div>

        <aside className="h-fit rounded-2xl border border-border-light bg-white p-4 shadow-sm dark:border-border-light dark:bg-surface-secondary lg:sticky lg:top-24">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
            {t("page.sessionSummaryHeading")}
          </p>
          <p className="text-sm font-semibold text-text-primary dark:text-white/90">
            {t("page.with")} {session.practitioner.displayName ?? session.practitioner.slug}
          </p>
          {session.scheduledStartAt ? (
            <p className="mt-1 text-xs text-text-secondary">
              {formatDatetime(session.scheduledStartAt, numLocale)}
            </p>
          ) : null}
          <p className="mt-1 text-xs text-text-muted">
            {session.durationMinutes} {t("page.minutes")}
          </p>
          <p className="mt-3 rounded-lg border border-border-light bg-surface-tertiary px-3 py-2 text-xs text-text-secondary dark:bg-white/5">
            {t("checkout.note")}
          </p>
        </aside>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4">
      <div className="rounded-2xl border border-border-light bg-white px-4 py-3 dark:border-border-light dark:bg-surface-secondary">
        <div className="flex items-start gap-2">
          <ShieldCheck size={16} className="mt-0.5 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-semibold text-text-primary dark:text-white/90">
              {t("page.paymentRequiredHeading")}
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              {t("page.paymentRequiredNote")}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border-light bg-white p-4 shadow-sm dark:border-border-light dark:bg-surface-secondary">
        <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-text-muted">
          {t("page.sessionSummaryHeading")}
        </p>
        <p className="text-sm font-semibold text-text-primary dark:text-white/90">
          {t("page.with")} {session.practitioner.displayName ?? session.practitioner.slug}
        </p>
        {session.scheduledStartAt && (
          <p className="mt-1 text-xs text-text-secondary">
            {formatDatetime(session.scheduledStartAt, numLocale)}
          </p>
        )}
        <p className="mt-1 text-xs text-text-muted">
          {session.durationMinutes} {t("page.minutes")}
        </p>
        <p className="mt-2 font-mono text-[11px] text-text-muted">{session.sessionCode}</p>
        <p className="mt-3 rounded-lg border border-border-light bg-surface-tertiary px-3 py-2 text-xs text-text-secondary dark:bg-white/5">
          {t("page.sessionBlockedByPayment")}
        </p>
      </div>

      {breakdownLoading && !breakdown && (
        <ListStateSkeleton items={1} heightClass="h-28" />
      )}

      {breakdownError && !isCouponInvalid && (
        <StateCard
          title={t("breakdown.error")}
          note={t("page.sessionBlockedByPayment")}
          action={{ label: t("page.retry"), onClick: () => refetchBreakdown() }}
        />
      )}

      {breakdown && (
        <PriceBreakdown breakdown={breakdown} numLocale={numLocale} t={t} />
      )}

      {breakdown && (
        <div className="rounded-2xl border border-border-light bg-white p-4 shadow-sm dark:border-border-light dark:bg-surface-secondary">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-text-primary dark:text-white/90">
                {t("walletCheckout.useWalletTitle")}
              </p>
              <p className="mt-1 text-xs text-text-secondary">
                {t("walletCheckout.useWalletNote")}
              </p>
              <p className="mt-2 text-xs text-text-muted">
                {walletSummaryLoading
                  ? t("walletCheckout.balanceLoading")
                  : formatAmount(
                      availableWalletBalance,
                      breakdown.currency,
                      numLocale,
                    )}
              </p>
            </div>
            <label className="inline-flex items-center gap-2 text-xs font-medium text-text-secondary">
              <input
                type="checkbox"
                checked={useWalletBalance}
                onChange={(event) => setUseWalletBalance(event.target.checked)}
                disabled={walletSummaryLoading || !walletSummary || Number(availableWalletBalance) <= 0}
                className="h-4 w-4 rounded border-border-light text-primary focus:ring-primary"
              />
              {t("walletCheckout.useWalletToggle")}
            </label>
          </div>

          {!walletCurrencyMatchesBreakdown && walletSummary ? (
            <p className="mt-2 text-xs text-warning-700 dark:text-warning-300">
              {t("walletCheckout.currencyMismatch")}
            </p>
          ) : null}
        </div>
      )}

      {breakdown && (
        <WalletUsagePreview
          t={t}
          numLocale={numLocale}
          currency={breakdown.currency}
          totalAmount={breakdown.netPaidAmount}
          walletBalance={availableWalletBalance}
          useWalletBalance={useWalletBalance}
        />
      )}

      {!appliedCoupon ? (
        <div>
          <div className="flex flex-col items-stretch gap-2 sm:flex-row">
            <input
              ref={couponInputRef}
              type="text"
              value={couponInput}
              onChange={(e) => {
                setCouponInput(e.target.value.toUpperCase());
                if (appliedCoupon) setAppliedCoupon(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleApplyCoupon();
              }}
              placeholder={t("breakdown.couponPlaceholder")}
              maxLength={64}
              className="app-control flex-1 px-4 py-2.5"
            />
            <button
              type="button"
              onClick={handleApplyCoupon}
              disabled={!couponInput.trim() || breakdownLoading}
              className="w-full shrink-0 rounded-2xl border border-border-light bg-surface-tertiary px-4 py-2.5 text-sm font-medium text-text-secondary transition hover:bg-primary-light hover:text-text-brand disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/5 dark:hover:bg-primary/15 sm:w-auto"
            >
              {breakdownLoading && appliedCoupon
                ? t("breakdown.couponApplying")
                : t("breakdown.couponApply")}
            </button>
          </div>
          {isCouponInvalid && (
            <p className="mt-1.5 text-xs text-error-500">{t("breakdown.couponInvalid")}</p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-2xl border border-border-light bg-white px-4 py-2.5 dark:border-border-light dark:bg-surface-secondary sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-center gap-1.5 text-xs font-medium text-text-brand dark:text-primary-light">
            <Tag size={12} />
            {t("breakdown.couponApplied")}: <span className="font-mono">{appliedCoupon}</span>
          </span>
          <button
            type="button"
            onClick={handleRemoveCoupon}
            className="text-text-brand transition hover:text-primary dark:text-primary-light dark:hover:text-white"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {initiateError && (
        <p className="rounded-xl bg-error-50 px-3 py-2 text-xs text-error-600 dark:bg-error-500/12 dark:text-error-400">
          {initiateError}
        </p>
      )}

      {redirectingToHostedCheckout && (
        <div className="rounded-2xl border border-border-light bg-surface-tertiary px-4 py-3 dark:bg-white/5">
          <div className="flex items-start gap-2">
            <Clock3 size={16} className="mt-0.5 shrink-0 text-text-muted" />
            <p className="text-sm text-text-secondary">{t("page.redirectingToCheckout")}</p>
          </div>
        </div>
      )}
      </div>

      <aside className="h-fit rounded-2xl border border-border-light bg-white p-4 shadow-sm dark:border-border-light dark:bg-surface-secondary lg:sticky lg:top-24">
        <p className="mb-3 text-sm font-semibold text-text-primary dark:text-white/90">
          {t("page.paymentRequiredHeading")}
        </p>
        {breakdown ? (
          <>
            <p className="mb-1 text-lg font-bold text-primary">
              {formatAmount(
                walletSplit?.gatewayRemaining ?? "0",
                breakdown.currency,
                numLocale,
              )}
            </p>
            <p className="mb-4 text-xs text-text-muted">
              {t("walletCheckout.gatewayChargeHint")}
            </p>
          </>
        ) : null}

        <Button
        onClick={handleProceedToCheckout}
        disabled={
          initiate.isPending ||
          breakdownLoading ||
          !breakdown ||
          redirectingToHostedCheckout
        }
        className="w-full"
        >
          {initiate.isPending
            ? t("page.initiating")
            : redirectingToHostedCheckout
              ? t("page.redirecting")
              : breakdown
                ? Number(
                    walletSplit?.gatewayRemaining ?? "0",
                  ) <= 0
                  ? t("walletCheckout.confirmWalletOnly")
                  : t("page.payWithAmount", {
                      amount: formatAmount(
                        walletSplit?.gatewayRemaining ?? "0",
                        breakdown.currency,
                        numLocale,
                      ),
                    })
                : t("page.proceedToPay")}
        </Button>

      <div className="mt-3 rounded-2xl border border-border-light bg-surface-tertiary px-4 py-3 dark:bg-white/5">
        <div className="flex items-start gap-2">
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-text-muted" />
          <p className="text-[11px] text-text-muted">{t("checkout.note")}</p>
        </div>
      </div>
      </aside>
    </div>
  );
}
