"use client";

import { type RefObject, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AlertCircle, Clock3, FileText, ShieldCheck, Tag, X } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { toAppError } from "@/lib/api/errors";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import Badge from "@/components/ui/badge/Badge";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { usePatientSession } from "@/features/sessions/hooks/use-sessions";
import { useSessionFinancialBreakdown } from "@/features/sessions/hooks/use-session-financial";
import PublicRefundPolicyDocument from "@/features/refund-policies/components/PublicRefundPolicyDocument";
import { REFUND_POLICY_ERROR_CODES } from "@/features/refund-policies/lib/refund-policy-errors";
import { useRefundPolicy } from "@/features/refund-policies/hooks/use-refund-policies";
import type { RefundPolicy } from "@/features/refund-policies/types/refund-policies.types";
import Button from "@/components/ui/button/Button";
import {
  useInitiateSessionPayment,
  usePatientSessionPaymentCapabilities,
  usePatientWalletSummary,
} from "../hooks/use-payments";
import StripePaymentForm from "./StripePaymentForm";
import PaymentCheckoutShell from "./PaymentCheckoutShell";
import type { FinancialBreakdown } from "@/features/sessions/types/financial.types";
import type { PaymobCheckoutMethod } from "../types/payments.types";

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

function formatSessionModeLabel(sessionMode: string, t: ReturnType<typeof useTranslations<"payments">>) {
  return sessionMode === "VIDEO" ? t("page.sessionModeVideo") : sessionMode;
}

type PriceBreakdownProps = {
  breakdown: FinancialBreakdown;
  walletSplit?: {
    walletUsed: string;
    gatewayRemaining: string;
  };
  numLocale: string;
  t: ReturnType<typeof useTranslations<"payments">>;
};

function PriceBreakdown({ breakdown, walletSplit, numLocale, t }: PriceBreakdownProps) {
  const hasDiscount = Number(breakdown.discountAmount) > 0;
  const walletUsed = walletSplit?.walletUsed ?? "0";
  const gatewayRemaining = walletSplit?.gatewayRemaining ?? breakdown.netPaidAmount;
  const hasWalletUsage = Number(walletUsed) > 0;

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

        <div className="flex items-center justify-between text-sm">
          <span className="text-text-secondary">{t("walletCheckout.walletDeductionLabel")}</span>
          <span className={`font-medium ${hasWalletUsage ? "text-text-brand dark:text-primary-light" : "text-text-primary dark:text-white/85"}`}>
            {formatAmount(walletUsed, breakdown.currency, numLocale)}
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

        <div className="flex items-center justify-between text-sm">
          <span className="text-text-secondary">{t("breakdown.netPaid")}</span>
          <span className="font-medium text-text-primary dark:text-white/85">
            {formatAmount(breakdown.netPaidAmount, breakdown.currency, numLocale)}
          </span>
        </div>

        <div className="mt-2 border-t border-border-light pt-3 dark:border-border-light">
          <div className="flex items-center justify-between rounded-xl bg-surface-tertiary px-3 py-2 dark:bg-white/5">
            <span className="text-sm font-semibold text-text-primary dark:text-white/90">
              {t("walletCheckout.gatewayRemainderLabel")}
            </span>
            <span className="text-base font-bold text-primary">
              {formatAmount(gatewayRemaining, breakdown.currency, numLocale)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function RefundPolicyInlineReview({
  policy,
  isLoading,
  error,
  acceptedPolicyId,
  onAcceptedPolicyIdChange,
  onRetry,
  acceptanceRef,
  locale,
  t,
  tRefundPolicy,
  className = "",
}: {
  policy: RefundPolicy | null;
  isLoading: boolean;
  error: unknown;
  acceptedPolicyId: string | null;
  onAcceptedPolicyIdChange: (value: string | null) => void;
  onRetry: () => void;
  acceptanceRef?: RefObject<HTMLInputElement | null>;
  locale: string;
  t: ReturnType<typeof useTranslations<"payments">>;
  tRefundPolicy: ReturnType<typeof useTranslations<"refund-policies">>;
  className?: string;
}) {
  const isArabic = locale === "ar";
  const [isReaderOpen, setIsReaderOpen] = useState(false);
  const appError = useMemo(() => (error ? toAppError(error) : null), [error]);
  const errorCode = appError?.code ?? null;
  const selectedPolicyId = policy?.id ?? null;
  const isAccepted = Boolean(policy && acceptedPolicyId === selectedPolicyId);
  const displayTitle = isArabic ? policy?.titleAr || policy?.titleEn : policy?.titleEn || policy?.titleAr;
  const policyNote = t("page.policySectionIntro");

  if (isLoading && !policy) {
    return (
      <div className={`rounded-[28px] border border-border-light bg-white p-5 shadow-sm dark:bg-surface-secondary ${className}`}>
        <p className="mb-2 text-sm font-semibold text-text-primary dark:text-white/90">
          {t("page.policySectionHeading")}
        </p>
        <p className="mb-4 text-xs leading-6 text-text-secondary">{t("page.policyLoadingNote")}</p>
        <div className="space-y-3">
          <div className="h-6 w-40 rounded-full bg-surface-tertiary" />
          <div className="h-4 w-full rounded-full bg-surface-tertiary" />
          <div className="h-4 w-5/6 rounded-full bg-surface-tertiary" />
          <div className="h-24 rounded-2xl bg-surface-tertiary" />
          <div className="h-16 rounded-2xl bg-surface-tertiary" />
        </div>
      </div>
    );
  }

  if (!policy || !policy.isActive || errorCode === REFUND_POLICY_ERROR_CODES.activeNotFound) {
    return (
      <StateCard
        title={t("page.policyUnavailable")}
        note={t("page.policyUnavailableNote")}
        action={{
          label: t("page.retry"),
          onClick: onRetry,
        }}
      />
    );
  }

  if (errorCode === REFUND_POLICY_ERROR_CODES.wrongType) {
    return (
      <StateCard
        title={t("page.policyValidationTitle")}
        note={t("page.policyValidationNote")}
        action={{
          label: t("page.retry"),
          onClick: onRetry,
        }}
      />
    );
  }

  if (errorCode === REFUND_POLICY_ERROR_CODES.staleAcceptance) {
    return (
      <StateCard
        title={t("page.policyUpdatedTitle")}
        note={t("page.policyUpdatedNote")}
        action={{
          label: t("page.retry"),
          onClick: onRetry,
        }}
      />
    );
  }

  return (
    <>
      <section
        className={`rounded-[32px] border border-border-light bg-white p-6 shadow-[0_18px_38px_-30px_rgba(34,52,56,0.22)] dark:border-border-light dark:bg-surface-secondary ${className}`}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              {t("page.policySectionEyebrow")}
            </p>
            <h2 className="text-lg font-semibold text-text-primary dark:text-white/95">
              {displayTitle || t("page.policySectionHeading")}
            </h2>
            <p className="max-w-3xl text-sm leading-7 text-text-secondary">
              {policyNote}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant="solid" color={policy.isActive ? "success" : "warning"} size="sm">
              {policy.isActive ? tRefundPolicy("card.activeBadge") : tRefundPolicy("card.inactiveBadge")}
            </Badge>
            <span className="inline-flex rounded-full border border-border-light bg-surface-tertiary px-3 py-1 text-xs font-semibold text-text-primary dark:bg-white/5 dark:text-white/90">
              {tRefundPolicy("card.clauseCount", { count: policy.clauses.length })}
            </span>
          </div>
        </div>

        <div className="mt-6 space-y-5">
          <PublicRefundPolicyDocument policy={policy} showEnglishSecondary={false} showHeader={false} className="space-y-6" />

          <div className="rounded-2xl border border-border-light bg-surface-tertiary px-4 py-4 dark:bg-white/5">
            <label className="flex cursor-pointer items-start gap-3 text-sm">
              <input
                ref={acceptanceRef}
                type="checkbox"
                checked={isAccepted}
                onChange={(event) =>
                  onAcceptedPolicyIdChange(event.target.checked ? (selectedPolicyId ?? null) : null)
                }
                className="mt-1 h-4 w-4 rounded border-border-light text-primary focus:ring-primary"
              />
              <span className="space-y-1">
                <span className="block font-semibold text-text-primary dark:text-white/90">
                  {t("page.policyCheckboxLabel")}
                </span>
                <span className="block text-xs leading-6 text-text-secondary">
                  {t("page.policyCheckboxNote")}
                </span>
              </span>
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs leading-6 text-text-muted">{t("page.policyMandatory")}</p>
            <Button type="button" variant="outline" size="sm" onClick={() => setIsReaderOpen(true)}>
              <span className="inline-flex items-center gap-2">
                <FileText size={14} />
                {t("page.viewFullPolicy")}
              </span>
            </Button>
          </div>
        </div>
      </section>

      <Modal
        isOpen={isReaderOpen}
        onClose={() => setIsReaderOpen(false)}
        size="2xl"
        className="w-full max-w-[900px]"
      >
        <div className="flex max-h-[calc(100vh-2rem)] flex-col">
          <ModalHeader
            eyebrow={tRefundPolicy("card.readerEyebrow")}
            title={displayTitle || t("page.policySectionHeading")}
            description={policyNote}
          />
          <ModalBody className="space-y-5">
            <PublicRefundPolicyDocument
              policy={policy}
              showEnglishSecondary={false}
              showHeader
              className="space-y-5"
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setIsReaderOpen(false)}>
              {tRefundPolicy("card.close")}
            </Button>
          </ModalFooter>
        </div>
      </Modal>
    </>
  );
}

type PaymobMethodSelectorProps = {
  t: ReturnType<typeof useTranslations<"payments">>;
  selectedMethod: PaymobCheckoutMethod;
  supportedMethods: string[];
  onChange: (method: PaymobCheckoutMethod) => void;
};

function PaymobMethodSelector({
  t,
  selectedMethod,
  supportedMethods,
  onChange,
}: PaymobMethodSelectorProps) {
  if (supportedMethods.length <= 1) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-border-light bg-white p-4 shadow-sm dark:border-border-light dark:bg-surface-secondary">
      <p className="text-sm font-semibold text-text-primary dark:text-white/90">
        {t("page.paymobMethod.heading")}
      </p>
      <p className="mt-1 text-xs text-text-secondary">
        {t("page.paymobMethod.note")}
      </p>
      <div className="mt-3 grid gap-2">
        {supportedMethods.includes("CARD") && (
          <button
            type="button"
            onClick={() => onChange("CARD")}
            className={`rounded-xl border px-4 py-3 text-start text-sm transition ${
              selectedMethod === "CARD"
                ? "border-primary bg-primary-light text-primary"
                : "border-border-light bg-white text-text-primary hover:bg-surface-tertiary dark:bg-surface-secondary dark:text-white/90"
            }`}
          >
            <span className="block font-semibold">
              {t("page.paymobMethod.card.title")}
            </span>
            <span className="mt-1 block text-xs text-text-secondary">
              {t("page.paymobMethod.card.note")}
            </span>
          </button>
        )}
        {supportedMethods.includes("WALLET") && (
          <button
            type="button"
            onClick={() => onChange("WALLET")}
            className={`rounded-xl border px-4 py-3 text-start text-sm transition ${
              selectedMethod === "WALLET"
                ? "border-primary bg-primary-light text-primary"
                : "border-border-light bg-white text-text-primary hover:bg-surface-tertiary dark:bg-surface-secondary dark:text-white/90"
            }`}
          >
            <span className="block font-semibold">
              {t("page.paymobMethod.wallet.title")}
            </span>
            <span className="mt-1 block text-xs text-text-secondary">
              {t("page.paymobMethod.wallet.note")}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

type Props = {
  sessionId: string;
};

export default function PaySessionPanel({ sessionId }: Props) {
  const t = useTranslations("payments");
  const tRefundPolicy = useTranslations("refund-policies");
  const locale = useLocale();
  const numLocale = locale === "ar" ? "ar-SA" : "en-US";
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("pricing");
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [useWalletBalance, setUseWalletBalance] = useState(true);
  const [paymobMethod, setPaymobMethod] = useState<PaymobCheckoutMethod | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [initiateError, setInitiateError] = useState<string | null>(null);
  const [policyNotice, setPolicyNotice] = useState<string | null>(null);
  const [acceptedRefundPolicyId, setAcceptedRefundPolicyId] = useState<string | null>(null);
  const [redirectingToHostedCheckout, setRedirectingToHostedCheckout] = useState(false);

  const couponInputRef = useRef<HTMLInputElement>(null);
  const policyAcceptanceRef = useRef<HTMLInputElement>(null);

  const {
    data: session,
    isLoading: sessionLoading,
    isError: sessionError,
    error: sessionQueryError,
    refetch: refetchSession,
  } = usePatientSession(sessionId);

  const sessionAppError = sessionQueryError ? toAppError(sessionQueryError) : null;
  const shouldTreatMissingSessionAsExpired =
    sessionAppError?.statusCode === 404 || sessionAppError?.statusCode === 410;
  const practitionerProfileHref = session?.practitioner.slug
    ? (`/patient/practitioners/${session.practitioner.slug}` as const)
    : "/patient/practitioners";

  const isPayableSession =
    session?.status === "PENDING_PAYMENT" && !isSessionExpired(session?.expiresAt ?? null);

  const {
    data: refundPolicyData,
    isLoading: refundPolicyLoading,
    error: refundPolicyError,
    refetch: refetchRefundPolicy,
  } = useRefundPolicy("SESSION", {
    enabled: Boolean(isPayableSession),
  });
  const refundPolicy = refundPolicyData?.item ?? null;
  const refundPolicyAppError = refundPolicyError ? toAppError(refundPolicyError) : null;

  const {
    data: breakdown,
    isLoading: breakdownLoading,
    isError: breakdownError,
    refetch: refetchBreakdown,
  } = useSessionFinancialBreakdown(sessionId, appliedCoupon, {
    enabled: Boolean(isPayableSession),
  });

  const isPaymobPaymentFlow = Boolean(breakdown && breakdown.currency === "EGP");
  const { data: paymobCapabilitiesData } = usePatientSessionPaymentCapabilities(
    isPaymobPaymentFlow ? sessionId : null,
  );
  const paymobCapabilities = paymobCapabilitiesData?.item ?? null;
  const paymobCheckoutFlow = paymobCapabilities?.checkoutFlow ?? "legacy";
  const supportedPaymobMethods = useMemo(
    () => paymobCapabilities?.supportedMethods ?? [],
    [paymobCapabilities?.supportedMethods],
  );

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
  const isRefundPolicyAccepted = Boolean(refundPolicy && acceptedRefundPolicyId === refundPolicy.id);

  const initiate = useInitiateSessionPayment();

  const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/${locale}/patient/sessions/${sessionId}/payment-return`;
  const gatewayRemainingAmount = Number(walletSplit?.gatewayRemaining ?? "0");
  const isHostedCheckoutExpected = Boolean(breakdown && gatewayRemainingAmount > 0);

  const selectedPaymobMethod = useMemo<PaymobCheckoutMethod>(() => {
    if (paymobMethod && supportedPaymobMethods.includes(paymobMethod)) {
      return paymobMethod;
    }

    if (
      paymobCapabilities?.defaultMethod === "CARD" ||
      paymobCapabilities?.defaultMethod === "WALLET"
    ) {
      if (supportedPaymobMethods.includes(paymobCapabilities.defaultMethod)) {
        return paymobCapabilities.defaultMethod;
      }
    }

    return supportedPaymobMethods.includes("CARD") ? "CARD" : "WALLET";
  }, [paymobCapabilities?.defaultMethod, paymobMethod, supportedPaymobMethods]);

  useEffect(() => {
    if (!session) {
      return;
    }

    const isExpiredSession =
      isSessionExpired(session.expiresAt) || session.status === "EXPIRED";

    if (!isExpiredSession) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      router.replace(practitionerProfileHref);
    }, 5000);

    return () => window.clearTimeout(timeoutId);
  }, [practitionerProfileHref, router, session]);

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

  const focusPolicyAcceptance = () => {
    window.requestAnimationFrame(() => {
      policyAcceptanceRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      policyAcceptanceRef.current?.focus();
    });
  };

  const handleCheckoutButtonClick = () => {
    if (!refundPolicy || refundPolicyAppError?.code === REFUND_POLICY_ERROR_CODES.activeNotFound) {
      handleProceedToCheckout();
      return;
    }

    if (acceptedRefundPolicyId !== refundPolicy.id) {
      setInitiateError(t("page.policyRequiredForPayment"));
      focusPolicyAcceptance();
      return;
    }

    handleProceedToCheckout();
  };

  const handleProceedToCheckout = () => {
    setInitiateError(null);
    setRedirectingToHostedCheckout(false);

    if (!refundPolicy || refundPolicyAppError?.code === REFUND_POLICY_ERROR_CODES.activeNotFound) {
      setInitiateError(
        tRefundPolicy("card.blockedNote", { type: tRefundPolicy("types.session") }),
      );
      return;
    }

    if (acceptedRefundPolicyId !== refundPolicy.id) {
      setInitiateError(tRefundPolicy("card.checkboxHint"));
      return;
    }

    initiate.mutate(
      {
        sessionId,
        input: {
          couponCode: appliedCoupon ?? undefined,
          useWalletBalance,
          paymobMethod:
            isPaymobPaymentFlow &&
            paymobCheckoutFlow === "legacy" &&
            supportedPaymobMethods.includes(selectedPaymobMethod)
              ? selectedPaymobMethod
              : undefined,
          acceptedRefundPolicyId: acceptedRefundPolicyId ?? "",
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
          if (appErr.code === REFUND_POLICY_ERROR_CODES.staleAcceptance) {
            setPolicyNotice(
              tRefundPolicy("card.staleNote", { type: tRefundPolicy("types.session") }),
            );
            setAcceptedRefundPolicyId(null);
            void refetchRefundPolicy();
            return;
          }
          if (appErr.code === REFUND_POLICY_ERROR_CODES.wrongType) {
            setPolicyNotice(tRefundPolicy("card.validationNote"));
            setAcceptedRefundPolicyId(null);
            return;
          }
          if (appErr.code === REFUND_POLICY_ERROR_CODES.activeNotFound) {
            setPolicyNotice(
              tRefundPolicy("card.blockedNote", { type: tRefundPolicy("types.session") }),
            );
            setAcceptedRefundPolicyId(null);
            return;
          }
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
    if (shouldTreatMissingSessionAsExpired) {
      return (
        <div className="rounded-2xl border border-border-light bg-white p-5 text-center dark:border-border-light dark:bg-surface-secondary">
          <p className="mb-1 text-sm font-semibold text-warning-700 dark:text-warning-300">
            {t("page.sessionExpired")}
          </p>
          <p className="mb-2 text-xs text-warning-700/80 dark:text-warning-300/80">
            {t("page.sessionExpiredUnavailableNote")}
          </p>
          <p className="mb-4 text-[11px] text-text-muted">
            {t("page.sessionExpiredRedirectNote")}
          </p>
          <div className="flex flex-col items-center justify-center gap-2 sm:flex-row">
            <Link
              href="/patient/practitioners"
              className="inline-flex min-w-40 items-center justify-center rounded-2xl bg-primary px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
            >
              {t("page.returnToPractitioner")}
            </Link>
            <Link
              href="/patient/sessions"
              className="inline-flex min-w-40 items-center justify-center rounded-2xl border border-border-light px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary-light"
            >
              {t("page.viewSessions")}
            </Link>
          </div>
        </div>
      );
    }

    return (
      <StateCard
        title={t("page.loadError")}
        note={t("page.sessionBlockedByPayment")}
        action={{ label: t("page.retry"), onClick: () => refetchSession() }}
      />
    );
  }

  const paymentRequiredBanner = (
    <div className="rounded-[32px] border border-primary/15 bg-primary-light px-5 py-4 dark:border-primary/20 dark:bg-primary/10">
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
  );

  const sessionSummaryCard = (
    <section className="rounded-[32px] border border-border-light bg-white p-5 shadow-[0_18px_38px_-30px_rgba(34,52,56,0.22)] dark:border-border-light dark:bg-surface-secondary">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            {t("page.sessionSummaryHeading")}
          </p>
          <h2 className="text-lg font-semibold text-text-primary dark:text-white/95">
            {session.practitioner.displayName ?? session.practitioner.slug}
          </h2>
          <p className="text-sm text-text-secondary">{t("page.sessionSummaryIntro")}</p>
        </div>
        <Badge variant="light" color="primary" size="sm">
          {formatSessionModeLabel(session.sessionMode, t)}
        </Badge>
      </div>

      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border-light bg-surface-tertiary px-4 py-3 dark:bg-white/5">
          <dt className="text-xs font-medium text-text-muted">{t("page.practitionerLabel")}</dt>
          <dd className="mt-1 text-sm font-semibold text-text-primary dark:text-white/90">
            {session.practitioner.displayName ?? session.practitioner.slug}
          </dd>
        </div>
        <div className="rounded-2xl border border-border-light bg-surface-tertiary px-4 py-3 dark:bg-white/5">
          <dt className="text-xs font-medium text-text-muted">{t("page.scheduledLabel")}</dt>
          <dd className="mt-1 text-sm font-semibold text-text-primary dark:text-white/90">
            {session.scheduledStartAt ? formatDatetime(session.scheduledStartAt, numLocale) : t("page.unscheduledLabel")}
          </dd>
        </div>
        <div className="rounded-2xl border border-border-light bg-surface-tertiary px-4 py-3 dark:bg-white/5">
          <dt className="text-xs font-medium text-text-muted">{t("page.durationLabel")}</dt>
          <dd className="mt-1 text-sm font-semibold text-text-primary dark:text-white/90">
            {session.durationMinutes} {t("page.minutes")}
          </dd>
        </div>
        <div className="rounded-2xl border border-border-light bg-surface-tertiary px-4 py-3 dark:bg-white/5">
          <dt className="text-xs font-medium text-text-muted">{t("page.sessionCodeLabel")}</dt>
          <dd className="mt-1 font-mono text-sm font-semibold text-text-primary dark:text-white/90">
            {session.sessionCode}
          </dd>
        </div>
      </dl>

      <p className="mt-4 rounded-2xl border border-border-light bg-surface-tertiary px-4 py-3 text-xs leading-6 text-text-secondary dark:bg-white/5">
        {t("page.sessionBlockedByPayment")}
      </p>
    </section>
  );

  const paymentSidebarCore = breakdown ? (
    <>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
        {t("page.amountDueHeading")}
      </p>
      <p className="mt-1 text-2xl font-bold text-primary">
        {formatAmount(walletSplit?.gatewayRemaining ?? "0", breakdown.currency, numLocale)}
      </p>
      <p className="mt-1 text-xs leading-6 text-text-muted">{t("page.amountDueNote")}</p>
    </>
  ) : null;

  const pricingSidebar = breakdown ? (
    <>
      {paymentSidebarCore}
      {isHostedCheckoutExpected &&
      paymobCheckoutFlow === "legacy" &&
      supportedPaymobMethods.length > 1 ? (
        <div className="mb-4 mt-4">
          <PaymobMethodSelector
            t={t}
            selectedMethod={selectedPaymobMethod}
            supportedMethods={supportedPaymobMethods}
            onChange={setPaymobMethod}
          />
        </div>
      ) : isHostedCheckoutExpected && paymobCheckoutFlow === "intention" ? (
        <div className="mb-4 mt-4 rounded-2xl border border-primary/15 bg-primary-light px-4 py-3 text-xs leading-6 text-text-secondary dark:border-primary/20 dark:bg-primary/10">
          {t("checkout.note")}
        </div>
      ) : null}
      <Button
        onClick={handleCheckoutButtonClick}
        disabled={
          initiate.isPending ||
          breakdownLoading ||
          !breakdown ||
          redirectingToHostedCheckout ||
          refundPolicyLoading ||
          !refundPolicy ||
          !isRefundPolicyAccepted
        }
        className="mt-4 w-full"
      >
        {initiate.isPending
          ? t("page.initiating")
          : redirectingToHostedCheckout
            ? t("page.redirecting")
            : breakdown
              ? Number(walletSplit?.gatewayRemaining ?? "0") <= 0
                ? t("walletCheckout.confirmWalletOnly")
                : t("page.payNow")
              : t("page.proceedToPay")}
      </Button>

      {!isRefundPolicyAccepted ? (
        <p className="mt-2 text-xs leading-6 text-text-muted">{t("page.policyRequiredForPayment")}</p>
      ) : null}

      <div className="mt-3 rounded-2xl border border-border-light bg-surface-tertiary px-4 py-3 dark:bg-white/5">
        <div className="flex items-start gap-2">
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-text-muted" />
          <p className="text-[11px] leading-6 text-text-muted">{t("page.securityNote")}</p>
        </div>
      </div>
    </>
  ) : null;

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
        <p className="mb-2 text-xs text-warning-700/80 dark:text-warning-300/80">
          {t("page.sessionExpiredNote")}
        </p>
        <p className="mb-4 text-[11px] text-text-muted">
          {t("page.sessionExpiredRedirectNote")}
        </p>
        <div className="flex flex-col items-center justify-center gap-2 sm:flex-row">
          <Link
            href={practitionerProfileHref}
            className="inline-flex min-w-40 items-center justify-center rounded-2xl bg-primary px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            {t("page.returnToPractitioner")}
          </Link>
          <Link
            href="/patient/sessions"
            className="inline-flex min-w-40 items-center justify-center rounded-2xl border border-border-light px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary-light"
          >
            {t("page.viewSessions")}
          </Link>
        </div>
      </div>
    );
  }

  if (phase === "checkout" && clientSecret && breakdown) {
    return (
      <PaymentCheckoutShell
        backHref="/patient/sessions"
        backLabel={t("page.backToSessions")}
        eyebrow={t("page.heading")}
        title={t("page.heading")}
        description={t("page.subheading")}
        summary={
          <div className="space-y-5">
            {paymentRequiredBanner}
            {sessionSummaryCard}
            {breakdown ? <PriceBreakdown breakdown={breakdown} numLocale={numLocale} t={t} /> : null}
          </div>
        }
        sidebar={paymentSidebarCore}
      >
        <div className="rounded-[32px] border border-border-light bg-white p-5 shadow-[0_18px_38px_-30px_rgba(34,52,56,0.22)] dark:border-border-light dark:bg-surface-secondary">
          <StripePaymentForm
            clientSecret={clientSecret}
            netPaidAmount={breakdown.netPaidAmount}
            currency={breakdown.currency}
            returnUrl={returnUrl}
          />
        </div>
      </PaymentCheckoutShell>
    );
  }

  return (
    <PaymentCheckoutShell
      backHref="/patient/sessions"
      backLabel={t("page.backToSessions")}
      eyebrow={t("page.heading")}
      title={t("page.heading")}
      description={t("page.subheading")}
      summary={
        <div className="space-y-5">
          {paymentRequiredBanner}
          {sessionSummaryCard}
          {breakdown ? <PriceBreakdown breakdown={breakdown} numLocale={numLocale} t={t} /> : null}
        </div>
      }
      sidebar={pricingSidebar}
    >
      {breakdownLoading && !breakdown && <ListStateSkeleton items={1} heightClass="h-28" />}

      {breakdownError && !isCouponInvalid && (
        <StateCard
          title={t("breakdown.error")}
          note={t("page.sessionBlockedByPayment")}
          action={{ label: t("page.retry"), onClick: () => refetchBreakdown() }}
        />
      )}

      <RefundPolicyInlineReview
        policy={refundPolicy}
        isLoading={refundPolicyLoading}
        error={refundPolicyError}
        acceptedPolicyId={acceptedRefundPolicyId}
        onAcceptedPolicyIdChange={setAcceptedRefundPolicyId}
        onRetry={() => void refetchRefundPolicy()}
        acceptanceRef={policyAcceptanceRef}
        locale={locale}
        t={t}
        tRefundPolicy={tRefundPolicy}
        className="border-primary/15 shadow-[0_18px_38px_-30px_rgba(34,52,56,0.22)]"
      />

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

      {policyNotice ? (
        <p className="rounded-2xl border border-warning-200 bg-warning-50 px-4 py-3 text-xs leading-6 text-warning-800 dark:border-warning-400/30 dark:bg-warning-500/10 dark:text-warning-200">
          {policyNotice}
        </p>
      ) : null}

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
    </PaymentCheckoutShell>
  );
}
