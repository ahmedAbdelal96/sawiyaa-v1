"use client";

import { type RefObject, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AlertCircle, Clock3, FileText, ShieldCheck, Tag, X } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { toAppError } from "@/lib/api/errors";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import { SurfaceCard } from "@/components/shared/SurfaceShell";
import { PatientSectionCard } from "@/components/patient/PatientChrome";
import Badge from "@/components/ui/badge/Badge";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { usePatientSession } from "@/features/sessions/hooks/use-sessions";
import { formatViewerDateTime } from "@/lib/time-formatting";
import { useSessionFinancialBreakdown } from "@/features/sessions/hooks/use-session-financial";
import { resolvePatientCurrencyCode } from "@/features/payments/lib/patient-currency";
import { formatMoney as formatFinanceMoney } from "@/lib/finance-format";
import { REFUND_POLICY_ERROR_CODES } from "@/features/refund-policies/lib/refund-policy-errors";
import { useRefundPolicy } from "@/features/refund-policies/hooks/use-refund-policies";
import type { RefundPolicy } from "@/features/refund-policies/types/refund-policies.types";
import Button from "@/components/ui/button/Button";
import Avatar from "@/components/ui/avatar/Avatar";
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

function formatDatetime(isoString: string | null, numLocale: string): string {
  return formatViewerDateTime(isoString, { locale: numLocale });
}

function normalizeAmount(amount: string): number {
  const parsed = Number(amount);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isSessionExpired(expiresAt: string | null, now: number = Date.now()): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() <= now;
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

function RefundPolicyCompactCard({
  policy,
  isLoading,
  error,
  isAccepted,
  onReviewClick,
  locale,
  t,
  tRefundPolicy,
}: {
  policy: RefundPolicy | null;
  isLoading: boolean;
  error: unknown;
  isAccepted: boolean;
  onReviewClick: () => void;
  locale: string;
  t: ReturnType<typeof useTranslations<"payments">>;
  tRefundPolicy: ReturnType<typeof useTranslations<"refund-policies">>;
}) {
  const appError = error ? toAppError(error) : null;
  const errorCode = appError?.code ?? null;

  if (isLoading && !policy) {
    return (
      <div className="rounded-2xl border border-border-light bg-white p-4 shadow-sm dark:bg-surface-secondary">
        <div className="h-4 w-32 rounded bg-surface-tertiary animate-pulse" />
        <div className="mt-2 h-3 w-full rounded bg-surface-tertiary animate-pulse" />
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
          onClick: onReviewClick,
        }}
      />
    );
  }

  return (
    <PatientSectionCard
      className="shadow-[0_18px_38px_-30px_rgba(34,52,56,0.22)] border-border-light bg-white"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-text-primary dark:text-white/95">
            {t("page.policyCardTitle")}
          </h3>
          <p className="text-xs text-text-muted leading-relaxed max-w-md">
            {t("page.policyCardShortCopy")}
          </p>
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[11px] font-medium text-text-secondary">
              {locale === "ar" ? "الحالة:" : "Status:"}
            </span>
            <Badge
              variant="light"
              color={isAccepted ? "success" : "warning"}
              size="sm"
            >
              {isAccepted
                ? t("page.policyStatusAccepted")
                : t("page.policyStatusNotAccepted")}
            </Badge>
          </div>
          {!isAccepted && (
            <p className="text-[11px] text-warning-700 dark:text-warning-300 font-medium mt-1">
              {t("page.policyMandatory")}
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onReviewClick}
          className="self-start sm:self-auto"
        >
          {t("page.policyCardReviewAction")}
        </Button>
      </div>
    </PatientSectionCard>
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
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [modalCheckboxChecked, setModalCheckboxChecked] = useState(false);

  const couponInputRef = useRef<HTMLInputElement>(null);

  const {
    data: session,
    isLoading: sessionLoading,
    isError: sessionError,
    error: sessionQueryError,
    refetch: refetchSession,
  } = usePatientSession(sessionId);

  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!session || session.status !== "PENDING_PAYMENT") {
      return;
    }
    const deadline = session.expiresAt;
    if (!deadline) {
      return;
    }

    const intervalId = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [session]);

  const sessionAppError = sessionQueryError ? toAppError(sessionQueryError) : null;
  const shouldTreatMissingSessionAsExpired =
    sessionAppError?.statusCode === 404 || sessionAppError?.statusCode === 410;
  const practitionerProfileHref = session?.practitioner.slug
    ? (`/patient/practitioners/${session.practitioner.slug}` as const)
    : "/patient/practitioners";

  const isReservationExpired = isSessionExpired(session?.expiresAt ?? null, now);

  const isPayableSession =
    session?.status === "PENDING_PAYMENT" && !isReservationExpired;

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

  const breakdownCurrency = breakdown
    ? resolvePatientCurrencyCode({
        currencyCode: breakdown.currency,
        regionalPricingMode: breakdown.regionalPricingMode,
        resolvedCountryIsoCode: breakdown.resolvedCountryIsoCode,
      })
    : null;
  const isPaymobPaymentFlow = Boolean(breakdown && breakdownCurrency === "EGP");
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
  const walletCurrency = walletSummary
    ? resolvePatientCurrencyCode({
        currencyCode: walletSummary.currencyCode,
        countryCode: walletSummary.currencyCode === "EGP" ? "EG" : null,
      })
    : null;
  const displayCurrency = breakdownCurrency ?? walletCurrency ?? null;
  const isCurrencySupported =
    (!breakdown || breakdown.currency === "EGP" || breakdown.currency === "USD") &&
    (!walletSummary || walletSummary.currencyCode === "EGP" || walletSummary.currencyCode === "USD");
  const paymentCurrency = displayCurrency ?? "USD";
  const walletCurrencyMatchesBreakdown = walletSummary && breakdown
    ? walletCurrency === breakdownCurrency
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

  const returnUrl =
    typeof window !== "undefined" && window.location?.origin
      ? `${window.location.origin}/${locale}/patient/sessions/${sessionId}/payment-return`
      : "";
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

  const handleReviewPolicyClick = () => {
    if (!refundPolicy) return;
    setModalCheckboxChecked(acceptedRefundPolicyId === refundPolicy.id);
    setIsPolicyModalOpen(true);
  };

  const handleConfirmPolicyInModal = () => {
    if (!refundPolicy || !modalCheckboxChecked) return;
    setAcceptedRefundPolicyId(refundPolicy.id);
    setIsPolicyModalOpen(false);
    handleProceedToCheckout(refundPolicy.id);
  };

  const handleCheckoutButtonClick = () => {
    if (!refundPolicy || refundPolicyAppError?.code === REFUND_POLICY_ERROR_CODES.activeNotFound) {
      handleProceedToCheckout();
      return;
    }

    if (acceptedRefundPolicyId !== refundPolicy.id) {
      setModalCheckboxChecked(false);
      setIsPolicyModalOpen(true);
      return;
    }

    handleProceedToCheckout();
  };

  const handleProceedToCheckout = (policyIdOverride?: string | null) => {
    setInitiateError(null);
    setRedirectingToHostedCheckout(false);

    if (isReservationExpired) {
      setInitiateError(locale === "ar" ? "انتهت صلاحية حجز الجلسة" : "Session reservation window has expired");
      return;
    }

    if (!isCurrencySupported) {
      setInitiateError(locale === "ar" ? "عملة غير مدعومة" : "Unsupported currency");
      return;
    }

    if (!isPayableSession) {
      setInitiateError(locale === "ar" ? "هذه الجلسة غير قابلة للدفع حالياً" : "This session is not payable right now");
      return;
    }

    if (!refundPolicy || refundPolicyAppError?.code === REFUND_POLICY_ERROR_CODES.activeNotFound) {
      setInitiateError(
        tRefundPolicy("card.blockedNote", { type: tRefundPolicy("types.session") }),
      );
      return;
    }

    const effectivePolicyId = policyIdOverride !== undefined ? policyIdOverride : acceptedRefundPolicyId;

    if (effectivePolicyId !== refundPolicy.id) {
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
          returnUrl:
            isPaymobPaymentFlow && isHostedCheckoutExpected
              ? returnUrl ?? undefined
              : undefined,
          acceptedRefundPolicyId: effectivePolicyId ?? "",
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
            if (returnUrl) {
              window.location.assign(`${returnUrl}?redirect_status=succeeded`);
              return;
            }
            setInitiateError(t("page.initiateError"));
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

  if (!isCurrencySupported) {
    return (
      <div className="rounded-2xl border border-error-200 bg-error-50 p-5 text-center dark:border-error-800 dark:bg-error-950/20">
        <p className="mb-2 text-sm font-semibold text-error-700 dark:text-error-400">
          {locale === "ar" ? "عملة غير مدعومة" : "Unsupported Currency"}
        </p>
        <p className="mb-4 text-xs text-error-600/90 dark:text-error-400/80">
          {locale === "ar"
            ? "نحن ندعم الدفع بالجنيه المصري (EGP) أو الدولار الأمريكي (USD) فقط. يرجى التواصل مع الدعم الفني."
            : "We only support payments in EGP or USD. Please contact support."}
        </p>
        <div className="flex flex-col items-center justify-center gap-2 sm:flex-row">
          <Link
            href="/patient/sessions"
            className="inline-flex min-w-40 items-center justify-center rounded-2xl bg-primary px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            {t("page.viewSessions")}
          </Link>
        </div>
      </div>
    );
  }

  const sessionSummaryCard = (
    <PatientSectionCard
      className="shadow-[0_8px_24px_rgba(36,86,79,0.08)] border-border-soft bg-white p-4.5"
    >
      {session.status === "PENDING_PAYMENT" && session.expiresAt && (
        <div className="mb-3.5 flex items-center gap-2 rounded-xl border border-warning-200/80 bg-warning-50/40 px-3.5 py-2 text-xs text-warning-800 dark:border-warning-400/30 dark:bg-warning-500/10 dark:text-warning-200">
          <Clock3 size={14} className="shrink-0 animate-pulse text-warning-700" />
          <div className="flex flex-wrap gap-x-1.5 items-center">
            <span className="font-semibold text-[11px]">
              {locale === "ar" ? "المتبقي لإتمام الحجز:" : "Time remaining for booking:"}
            </span>
            <span className="font-mono font-bold text-xs bg-warning-100/70 dark:bg-warning-900/40 px-1.5 py-0.5 rounded">
              {Math.max(0, Math.floor((new Date(session.expiresAt).getTime() - now) / 1000 / 60))} {locale === "ar" ? "دقائق" : "minutes"}
            </span>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Practitioner Details */}
        <div className="flex items-center gap-3">
          <Avatar
            src={null}
            alt={session.practitioner.displayName ?? session.practitioner.slug}
            name={undefined}
            fallbackInitials={undefined}
            size="large"
            className="ring-2 ring-primary/10"
          />
          <div className="min-w-0 space-y-0.5">
            <h3 className="text-sm font-bold text-text-primary dark:text-white/95">
              {session.practitioner.displayName ?? session.practitioner.slug}
            </h3>
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-text-secondary">
              <span className="inline-flex items-center rounded-md bg-primary-light/40 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                {formatSessionModeLabel(session.sessionMode, t)}
              </span>
              <span className="text-[11px] text-text-muted">•</span>
              <span className="text-[11px] text-text-muted">
                {session.durationMinutes} {t("page.minutes")}
              </span>
              <span className="text-[11px] text-text-muted">•</span>
              <span className="inline-flex items-center rounded-md bg-[#F9F7F2] border border-[#C8A979]/20 px-1.5 py-0.5 text-[10px] font-medium text-[#C8A979]">
                {t(`sessionState.${session.status}.label` as Parameters<typeof t>[0])}
              </span>
            </div>
          </div>
        </div>

        {/* Session Meta (Date/Time, Code) */}
        <div className="flex flex-wrap items-center gap-4 sm:self-center">
          <div className="flex flex-col items-start sm:items-end text-xs">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              {t("page.scheduledLabel")}
            </span>
            <span className="font-semibold text-text-primary dark:text-white/90">
              {session.scheduledStartAt ? formatDatetime(session.scheduledStartAt, numLocale) : t("page.unscheduledLabel")}
            </span>
          </div>

          <div className="h-6 w-px bg-border-light/60 hidden sm:block" />

          <div className="flex flex-col items-start sm:items-end text-xs">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              {t("page.sessionCodeLabel")}
            </span>
            <span className="font-mono font-bold text-xs text-text-primary dark:text-white/90">
              {session.sessionCode}
            </span>
          </div>
        </div>
      </div>
    </PatientSectionCard>
  );

  const renderPaymentOptions = (isMobile: boolean) => {
    if (!breakdown) return null;
    return (
      <div className={`space-y-4 ${isMobile ? "block lg:hidden" : "block"}`}>
        {/* Wallet Toggle Box */}
        <div className="rounded-xl border border-border-light bg-surface-tertiary/40 p-3.5 dark:bg-white/5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-text-primary dark:text-white/90">
                {t("walletCheckout.useWalletTitle")}
              </p>
              <p className="mt-0.5 text-[10px] text-text-secondary leading-normal">
                {t("walletCheckout.useWalletNote")}
              </p>
              <p className="mt-1 text-xs font-bold text-text-brand dark:text-primary-light">
                {walletSummaryLoading
                  ? t("walletCheckout.balanceLoading")
                  : formatFinanceMoney(numLocale, availableWalletBalance, displayCurrency, {
                      fallbackText: "-",
                    })}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
              <input
                type="checkbox"
                checked={useWalletBalance}
                onChange={(event) => setUseWalletBalance(event.target.checked)}
                disabled={walletSummaryLoading || !walletSummary || Number(availableWalletBalance) <= 0}
                className="h-4.5 w-4.5 rounded border-border-light text-primary focus:ring-primary cursor-pointer transition disabled:opacity-50"
              />
            </label>
          </div>
          {!walletCurrencyMatchesBreakdown && walletSummary && (
            <p className="mt-2 text-[10px] text-warning-700 dark:text-warning-300">
               {t("walletCheckout.currencyMismatch")}
            </p>
          )}
        </div>

        {/* Coupon Input Box */}
        <div className="rounded-xl border border-border-light bg-surface-tertiary/40 p-3.5 dark:bg-white/5">
          <p className="text-xs font-semibold text-text-primary dark:text-white/90 mb-2">
            {t("breakdown.couponLabel")}
          </p>
          {!appliedCoupon ? (
            <div className="flex items-stretch gap-2">
              <input
                ref={isMobile ? undefined : couponInputRef}
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
                className="app-control flex-1 px-3 py-1.5 text-xs rounded-xl bg-white border border-border-light focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              />
              <button
                type="button"
                onClick={handleApplyCoupon}
                disabled={!couponInput.trim() || breakdownLoading}
                className="shrink-0 rounded-xl border border-border-light bg-white px-3 py-1.5 text-xs font-bold text-text-secondary transition hover:bg-primary-light hover:text-text-brand disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/5"
              >
                {breakdownLoading && appliedCoupon
                  ? t("breakdown.couponApplying")
                  : t("breakdown.couponApply")}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-xl border border-border-light bg-white px-3 py-1.5 dark:bg-surface-secondary">
              <span className="flex items-center gap-1.5 text-xs font-medium text-text-brand dark:text-primary-light">
                <Tag size={12} />
                {t("breakdown.couponApplied")}: <span className="font-mono font-bold">{appliedCoupon}</span>
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
          {isCouponInvalid && (
            <p className="mt-1 text-[10px] text-error-500">{t("breakdown.couponInvalid")}</p>
          )}
        </div>
      </div>
    );
  };

  const mobilePricingCTA = breakdown ? (
    <div className="block lg:hidden rounded-2xl border border-border-light bg-white p-4.5 shadow-[0_8px_24px_rgba(36,86,79,0.08)] space-y-3">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <span className="text-xs font-bold text-text-primary">{t("page.amountDueHeading")}</span>
          <p className="text-[9px] text-text-muted leading-tight">{t("page.amountDueNote")}</p>
        </div>
        <span className="text-xl font-black text-primary">
          {formatFinanceMoney(numLocale, walletSplit?.gatewayRemaining ?? "0", displayCurrency, {
            fallbackText: "—",
          })}
        </span>
      </div>

      {isHostedCheckoutExpected &&
      paymobCheckoutFlow === "legacy" &&
      supportedPaymobMethods.length > 1 ? (
        <div className="mt-1">
          <PaymobMethodSelector
            t={t}
            selectedMethod={selectedPaymobMethod}
            supportedMethods={supportedPaymobMethods}
            onChange={setPaymobMethod}
          />
        </div>
      ) : isHostedCheckoutExpected && paymobCheckoutFlow === "intention" ? (
        <div className="rounded-xl border border-primary/15 bg-primary-light px-3 py-1.5 text-xs leading-normal text-text-secondary dark:border-primary/20 dark:bg-primary/10">
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
          !refundPolicy
        }
        className="w-full py-3.5 text-sm font-bold rounded-xl"
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
    </div>
  ) : null;

  const pricingSidebar = breakdown ? (
    <div className="hidden lg:flex lg:flex-col lg:gap-5">
      {/* Reusable payment options (wallet toggle + coupon) grouped inside sidebar */}
      {renderPaymentOptions(false)}

      {/* Pricing Breakdown details */}
      <div className="border-t border-border-light/60 pt-4 space-y-3">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted">
          {t("breakdown.heading")}
        </h3>
        
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-text-secondary">{t("breakdown.grossAmount")}</span>
            <span className="font-medium text-text-primary dark:text-white/85">
              {formatFinanceMoney(numLocale, breakdown.grossAmount, displayCurrency, {
                fallbackText: "—",
              })}
            </span>
          </div>

          {Number(walletSplit?.walletUsed ?? "0") > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">{t("walletCheckout.walletDeductionLabel")}</span>
              <span className="font-semibold text-text-brand dark:text-primary-light">
                -{formatFinanceMoney(numLocale, walletSplit?.walletUsed ?? "0", displayCurrency, {
                  fallbackText: "—",
                })}
              </span>
            </div>
          )}

          {Number(breakdown.discountAmount) > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-text-brand dark:text-primary-light">
                {breakdown.coupon ? breakdown.coupon.code : t("breakdown.discount")}
              </span>
              <span className="font-semibold text-text-brand dark:text-primary-light">
                -{formatFinanceMoney(numLocale, breakdown.discountAmount, displayCurrency, {
                  fallbackText: "—",
                })}
              </span>
            </div>
          )}

          {/* Amount Due Container (strongest visual focus) */}
          <div className="border-t border-border-light pt-3 mt-3">
            <div className="flex items-end justify-between bg-primary/5 rounded-2xl p-4 border border-primary/10">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-text-primary dark:text-white/90">
                  {t("page.amountDueHeading")}
                </span>
                <p className="text-[9px] text-text-muted leading-tight">
                  {t("page.amountDueNote")}
                </p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-primary leading-none block">
                  {formatFinanceMoney(numLocale, walletSplit?.gatewayRemaining ?? "0", displayCurrency, {
                    fallbackText: "—",
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Paymob checkout methods if applicable */}
      {isHostedCheckoutExpected &&
      paymobCheckoutFlow === "legacy" &&
      supportedPaymobMethods.length > 1 ? (
        <div className="mt-1">
          <PaymobMethodSelector
            t={t}
            selectedMethod={selectedPaymobMethod}
            supportedMethods={supportedPaymobMethods}
            onChange={setPaymobMethod}
          />
        </div>
      ) : isHostedCheckoutExpected && paymobCheckoutFlow === "intention" ? (
        <div className="rounded-xl border border-primary/15 bg-primary-light px-3 py-2 text-xs leading-normal text-text-secondary dark:border-primary/20 dark:bg-primary/10">
          {t("checkout.note")}
        </div>
      ) : null}

      {/* Desktop primary Pay button */}
      <Button
        onClick={handleCheckoutButtonClick}
        disabled={
          initiate.isPending ||
          breakdownLoading ||
          !breakdown ||
          redirectingToHostedCheckout ||
          refundPolicyLoading ||
          !refundPolicy
        }
        className="w-full py-3.5 text-sm font-bold rounded-2xl shadow-[0_8px_24px_rgba(36,86,79,0.12)] hover:shadow-[0_8px_28px_rgba(36,86,79,0.2)] transition duration-200"
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

      {/* Trust & security info */}
      <div className="flex flex-col gap-2.5 pt-3.5 border-t border-border-light mt-2">
        <div className="flex items-start gap-1.5">
          <ShieldCheck size={14} className="mt-0.5 shrink-0 text-text-muted" />
          <p className="text-[10px] leading-relaxed text-text-muted">
            {t("page.securityNote")}
          </p>
        </div>
        {refundPolicy && (
          <button
            type="button"
            onClick={handleReviewPolicyClick}
            className="text-start text-[11px] font-semibold text-primary hover:underline cursor-pointer"
          >
            {locale === "ar" ? "معاينة سياسة الاسترداد" : "Review Refund Policy"}
          </button>
        )}
      </div>
    </div>
  ) : null;

  if (isSessionExpired(session.expiresAt, now) || session.status !== "PENDING_PAYMENT") {
    const isAlreadyPaid =
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
        title={t("page.heading")}
        description={t("page.subheading")}
        summary={
          <div className="space-y-4">
            {sessionSummaryCard}
            <div className="rounded-xl border border-border-light bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-primary">{t("page.amountDueHeading")}</span>
                <span className="text-lg font-black text-primary">
                  {formatFinanceMoney(numLocale, walletSplit?.gatewayRemaining ?? "0", displayCurrency, {
                    fallbackText: "—",
                  })}
                </span>
              </div>
            </div>
          </div>
        }
        sidebar={
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t("breakdown.heading")}
            </h3>
            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span>{t("breakdown.grossAmount")}</span>
                <span>{formatFinanceMoney(numLocale, breakdown.grossAmount, displayCurrency)}</span>
              </div>
              {Number(walletSplit?.walletUsed ?? "0") > 0 && (
                <div className="flex justify-between text-text-brand">
                  <span>{t("walletCheckout.walletDeductionLabel")}</span>
                  <span>-{formatFinanceMoney(numLocale, walletSplit?.walletUsed ?? "0", displayCurrency)}</span>
                </div>
              )}
              {Number(breakdown.discountAmount) > 0 && (
                <div className="flex justify-between text-text-brand">
                  <span>{t("breakdown.discount")}</span>
                  <span>-{formatFinanceMoney(numLocale, breakdown.discountAmount, displayCurrency)}</span>
                </div>
              )}
            </div>
          </div>
        }
      >
        <div className="rounded-[32px] border border-border-light bg-white p-5 shadow-[0_18px_38px_-30px_rgba(34,52,56,0.22)] dark:border-border-light dark:bg-surface-secondary">
          <StripePaymentForm
            clientSecret={clientSecret}
            netPaidAmount={breakdown.netPaidAmount}
            currency={paymentCurrency}
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
      title={t("page.heading")}
      description={t("page.subheading")}
      summary={
        <div className="space-y-4">
          {/* Mobile-only CTA appears first at the top */}
          {mobilePricingCTA}
          {/* Session details summary card */}
          {sessionSummaryCard}
        </div>
      }
      sidebar={pricingSidebar}
    >
      <div className="space-y-4">
        {breakdownLoading && !breakdown && <ListStateSkeleton items={1} heightClass="h-28" />}

        {breakdownError && !isCouponInvalid && (
          <StateCard
            title={t("breakdown.error")}
            note={t("page.sessionBlockedByPayment")}
            action={{ label: t("page.retry"), onClick: () => refetchBreakdown() }}
          />
        )}

        {/* Mobile-only wallet and coupon controls */}
        {renderPaymentOptions(true)}

        {/* Compact refund policy acceptance card */}
        <RefundPolicyCompactCard
          policy={refundPolicy}
          isLoading={refundPolicyLoading}
          error={refundPolicyError}
          isAccepted={isRefundPolicyAccepted}
          onReviewClick={handleReviewPolicyClick}
          locale={locale}
          t={t}
          tRefundPolicy={tRefundPolicy}
        />

        {policyNotice && (
          <p className="rounded-xl border border-warning-200 bg-warning-50 px-4 py-2.5 text-xs text-warning-855 dark:border-warning-400/30 dark:bg-warning-500/10 dark:text-warning-200">
            {policyNotice}
          </p>
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

      <Modal
        isOpen={isPolicyModalOpen}
        onClose={() => setIsPolicyModalOpen(false)}
        size="2xl"
        className="w-full max-w-[900px]"
      >
        <div className="flex max-h-[calc(100vh-2rem)] flex-col">
          <ModalHeader
            eyebrow={tRefundPolicy("card.readerEyebrow")}
            title={t("page.policyModalTitle")}
            description={t("page.policySectionIntro")}
          />
          <ModalBody className="space-y-4 overflow-y-auto max-h-[50vh] pr-1">
            {refundPolicy && refundPolicy.clauses.length ? (
              <div className="space-y-3.5">
                {refundPolicy.clauses.map((clause, index) => {
                  const clauseTitle = locale === "ar"
                    ? clause.titleAr || clause.titleEn
                    : clause.titleEn || clause.titleAr;
                  const clauseBody = locale === "ar" ? clause.bodyAr : clause.bodyEn;

                  return (
                    <div key={clause.id} className="pb-3 border-b border-border-light/40 last:border-0 last:pb-0">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-[11px] font-bold text-primary shrink-0">
                          {locale === "ar" ? `البند ${index + 1}:` : `Clause ${index + 1}:`}
                        </span>
                        {clauseTitle && (
                          <h4 className="text-[11px] font-bold text-text-primary dark:text-white/95">
                            {clauseTitle}
                          </h4>
                        )}
                      </div>
                      <p className="mt-1 text-[11px] leading-relaxed text-text-secondary dark:text-white/80">
                        {clauseBody}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-text-muted text-center py-4">
                {locale === "ar" ? "لا توجد بنود لسياسة الاسترداد حالياً." : "No refund policy clauses available."}
              </p>
            )}
          </ModalBody>
          <ModalFooter className="flex flex-col gap-4 border-t border-border-light pt-4">
            <div className="w-full rounded-xl border border-border-light bg-surface-tertiary px-4 py-3 dark:bg-white/5">
              <label className="flex cursor-pointer items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={modalCheckboxChecked}
                  onChange={(event) => setModalCheckboxChecked(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-border-light text-primary focus:ring-primary"
                />
                <span className="space-y-1">
                  <span className="block font-semibold text-text-primary dark:text-white/90">
                    {t("page.policyModalCheckbox")}
                  </span>
                  <span className="block text-xs text-text-secondary">
                    {t("page.policyCheckboxNote")}
                  </span>
                </span>
              </label>
            </div>
            <div className="flex w-full items-center justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsPolicyModalOpen(false)}
              >
                {t("page.policyModalCancel")}
              </Button>
              <Button
                onClick={handleConfirmPolicyInModal}
                disabled={!modalCheckboxChecked}
              >
                {t("page.policyModalConfirm")}
              </Button>
            </div>
          </ModalFooter>
        </div>
      </Modal>
    </PaymentCheckoutShell>
  );
}
