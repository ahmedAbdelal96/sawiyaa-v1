"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Clock3,
  CreditCard,
  FileText,
  Lock,
  MessageSquare,
  Shield,
  ShieldCheck,
  Sparkles,
  Tag,
  Video,
  Wallet,
  X,
} from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { toAppError } from "@/lib/api/errors";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { usePatientSession } from "@/features/sessions/hooks/use-sessions";
import { formatViewerDateTime } from "@/lib/time-formatting";
import { useSessionFinancialBreakdown } from "@/features/sessions/hooks/use-session-financial";
import { getSessionFinancialBreakdown } from "@/features/sessions/api/financial.api";
import type { FinancialBreakdown } from "@/features/sessions/types/financial.types";
import { formatMoney as formatFinanceMoney } from "@/lib/finance-format";
import { REFUND_POLICY_ERROR_CODES } from "@/features/refund-policies/lib/refund-policy-errors";
import { useRefundPolicy } from "@/features/refund-policies/hooks/use-refund-policies";
import Button from "@/components/ui/button/Button";
import SessionCodeReference from "@/components/shared/SessionCodeReference";
import PractitionerAvatar from "@/components/shared/PractitionerAvatar";
import {
  useInitiateSessionPayment,
  usePatientSessionPaymentCapabilities,
  usePatientWalletSummary,
} from "../hooks/use-payments";
import StripePaymentForm from "./StripePaymentForm";
import PaymentCheckoutShell from "./PaymentCheckoutShell";
import type { PaymobCheckoutMethod } from "../types/payments.types";
import { resolveCheckoutFunding } from "../lib/checkout-funding";

function formatDatetime(isoString: string | null, numLocale: string): string {
  return formatViewerDateTime(isoString, { locale: numLocale });
}

function isSessionExpired(expiresAt: string | null, now: number = Date.now()): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() <= now;
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

  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [appliedBreakdown, setAppliedBreakdown] = useState<FinancialBreakdown | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [couponErrorMessage, setCouponErrorMessage] = useState<string | null>(null);
  const [useWalletBalance, setUseWalletBalance] = useState(true);
  const [paymobMethod, setPaymobMethod] = useState<PaymobCheckoutMethod | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [initiateError, setInitiateError] = useState<string | null>(null);
  const [policyConsentError, setPolicyConsentError] = useState<string | null>(null);
  const [acceptedRefundPolicyId, setAcceptedRefundPolicyId] = useState<string | null>(null);
  const [redirectingToHostedCheckout, setRedirectingToHostedCheckout] = useState(false);
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);

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
    if (!session) return;
    const deadline = session.expiresAt;
    if (!deadline) return;

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

  const isReservationExpired = isSessionExpired(session?.expiresAt ?? null, now);
  const isPayableSession = Boolean(
    session &&
      (session.status === "PENDING_PAYMENT" ||
        session.actions?.canPay === true ||
        session.operational?.actions?.canPay === true) &&
      !isReservationExpired,
  );

  const {
    data: refundPolicyData,
    isLoading: refundPolicyLoading,
    error: refundPolicyError,
    refetch: refetchRefundPolicy,
  } = useRefundPolicy("SESSION", {
    enabled: Boolean(session && !isReservationExpired),
  });
  const refundPolicy = refundPolicyData?.item ?? null;
  const refundPolicyAppError = refundPolicyError ? toAppError(refundPolicyError) : null;

  // Stable Base Breakdown Query (Always fetches the regular price without coupon, immune to coupon failures)
  const {
    data: baseBreakdown,
    isLoading: baseBreakdownLoading,
    isError: baseBreakdownError,
    refetch: refetchBreakdown,
  } = useSessionFinancialBreakdown(sessionId, null, {
    enabled: Boolean(session && !isReservationExpired),
  });

  const breakdown = appliedBreakdown ?? baseBreakdown ?? null;
  const breakdownLoading = baseBreakdownLoading;
  const breakdownError = baseBreakdownError;

  const breakdownCurrency =
    breakdown?.currency === "EGP" || breakdown?.currency === "USD"
      ? breakdown.currency
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

  const { data: walletSummaryData, isLoading: walletSummaryLoading } =
    usePatientWalletSummary();
  const walletSummary = walletSummaryData?.item ?? null;
  const walletCurrency =
    walletSummary?.currencyCode === "EGP" || walletSummary?.currencyCode === "USD"
      ? walletSummary.currencyCode
      : null;
  const displayCurrency = breakdownCurrency ?? walletCurrency ?? null;
  const isCurrencySupported =
    (!breakdown || breakdown.currency === "EGP" || breakdown.currency === "USD") &&
    (!walletSummary ||
      walletSummary.currencyCode === "EGP" ||
      walletSummary.currencyCode === "USD");
  const walletCurrencyMatchesBreakdown =
    walletSummary && breakdown
      ? walletCurrency === breakdownCurrency
      : true;
  const availableWalletBalance =
    walletSummary && walletCurrencyMatchesBreakdown
      ? walletSummary.availableBalance
      : "0";
  const fundingPreview = breakdown?.fundingPreview;
  const walletSplit = resolveCheckoutFunding(fundingPreview, useWalletBalance);

  const isRefundPolicyAccepted = Boolean(
    refundPolicy && acceptedRefundPolicyId === refundPolicy.id,
  );

  const initiate = useInitiateSessionPayment();

  const returnUrl =
    typeof window !== "undefined" && window.location?.origin
      ? `${window.location.origin}/${locale}/patient/sessions/${sessionId}/payment-return`
      : "";
  const gatewayRemainingAmount = Number(walletSplit?.gatewayRemaining ?? "0");
  const isHostedCheckoutExpected = Boolean(
    breakdown && gatewayRemainingAmount > 0,
  );

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

  const handleApplyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code || isApplyingCoupon) return;

    setIsApplyingCoupon(true);
    setCouponErrorMessage(null);

    try {
      const result = await getSessionFinancialBreakdown(sessionId, code);
      setAppliedBreakdown(result);
      setAppliedCoupon(code);
      setCouponErrorMessage(null);
    } catch {
      setCouponErrorMessage(t("breakdown.couponInvalid"));
      setAppliedCoupon(null);
      setAppliedBreakdown(null);
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setAppliedBreakdown(null);
    setCouponInput("");
    setCouponErrorMessage(null);
    couponInputRef.current?.focus();
  };

  const handleProceedToPayment = () => {
    setInitiateError(null);
    setPolicyConsentError(null);
    setRedirectingToHostedCheckout(false);

    if (isReservationExpired) {
      setInitiateError(
        locale === "ar"
          ? "انتهت صلاحية حجز الجلسة"
          : "Session reservation window has expired",
      );
      return;
    }

    if (!isCurrencySupported) {
      setInitiateError(
        locale === "ar" ? "عملة غير مدعومة" : "Unsupported currency",
      );
      return;
    }

    if (!isPayableSession) {
      setInitiateError(
        locale === "ar"
          ? "هذه الجلسة غير قابلة للدفع حالياً"
          : "This session is not payable right now",
      );
      return;
    }

    if (
      !refundPolicy ||
      refundPolicyAppError?.code === REFUND_POLICY_ERROR_CODES.activeNotFound
    ) {
      setInitiateError(
        tRefundPolicy("card.blockedNote", {
          type: tRefundPolicy("types.session"),
        }),
      );
      return;
    }

    if (!isRefundPolicyAccepted) {
      setPolicyConsentError(
        locale === "ar"
          ? "يرجى الموافقة على شروط الاستخدام وسياسة الإلغاء والاسترداد الخاصة بالجلسات للمتابعة."
          : "Please agree to the Terms of Service and Cancellation Policy to proceed.",
      );
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
          acceptedRefundPolicyId: refundPolicy.id,
        },
      },
      {
        onSuccess: (data) => {
          if (data.item.clientSecret) {
            setClientSecret(data.item.clientSecret);
            return;
          }

          if (data.item.checkoutUrl) {
            setRedirectingToHostedCheckout(true);
            window.location.assign(data.item.checkoutUrl);
            return;
          }

          if (
            data.item.provider === "INTERNAL_WALLET" &&
            data.item.status === "CAPTURED"
          ) {
            router.push(
              `/patient/sessions/${sessionId}/payment-return?redirect_status=succeeded`,
            );
            return;
          }

          setInitiateError(t("page.initiateError"));
        },
        onError: (err) => {
          const appErr = toAppError(err);
          if (appErr.code === REFUND_POLICY_ERROR_CODES.staleAcceptance) {
            setInitiateError(
              tRefundPolicy("card.staleNote", {
                type: tRefundPolicy("types.session"),
              }),
            );
            setAcceptedRefundPolicyId(null);
            void refetchRefundPolicy();
            return;
          }
          if (appErr.code === REFUND_POLICY_ERROR_CODES.wrongType) {
            setInitiateError(tRefundPolicy("card.validationNote"));
            setAcceptedRefundPolicyId(null);
            return;
          }
          if (appErr.code === REFUND_POLICY_ERROR_CODES.activeNotFound) {
            setInitiateError(
              tRefundPolicy("card.blockedNote", {
                type: tRefundPolicy("types.session"),
              }),
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

  // --- Loading State ---
  if (sessionLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-5 py-8 px-4">
        <ListStateSkeleton items={1} heightClass="h-28" />
        <div className="grid gap-5 lg:grid-cols-12">
          <div className="lg:col-span-7 space-y-4">
            <ListStateSkeleton items={1} heightClass="h-40" />
            <ListStateSkeleton items={1} heightClass="h-32" />
          </div>
          <div className="lg:col-span-5 space-y-4">
            <ListStateSkeleton items={1} heightClass="h-72" />
          </div>
        </div>
      </div>
    );
  }

  // --- Expired / Error State ---
  if (sessionError || !session) {
    if (shouldTreatMissingSessionAsExpired) {
      return (
        <div className="mx-auto max-w-md rounded-2xl border border-border-light bg-white p-6 text-center shadow-sm dark:bg-surface-secondary">
          <Clock className="mx-auto h-10 w-10 text-amber-600 mb-3" />
          <h2 className="text-base font-bold text-text-primary dark:text-white">
            {t("page.sessionExpired")}
          </h2>
          <p className="mt-1 text-xs text-text-secondary">
            {t("page.sessionExpiredNote")}
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <Link
              href="/patient/practitioners"
              className="flex w-full items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-primary-hover"
            >
              {t("page.returnToPractitioner")}
            </Link>
            <Link
              href="/patient/sessions"
              className="flex w-full items-center justify-center rounded-xl border border-border-light px-4 py-2.5 text-xs font-semibold text-text-secondary hover:bg-surface-tertiary"
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
      <div className="mx-auto max-w-md rounded-2xl border border-border-light bg-white p-6 text-center shadow-sm dark:bg-surface-secondary">
        <p className="text-sm font-bold text-danger">
          {locale === "ar" ? "عملة غير مدعومة" : "Unsupported Currency"}
        </p>
        <p className="mt-2 text-xs text-text-secondary">
          {locale === "ar"
            ? "نحن ندعم الدفع بالجنيه المصري (EGP) أو الدولار الأمريكي (USD) فقط."
            : "We only support payments in EGP or USD."}
        </p>
        <Link
          href="/patient/sessions"
          className="mt-4 inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white"
        >
          {t("page.viewSessions")}
        </Link>
      </div>
    );
  }

  // --- Embedded Stripe Checkout Phase (USD) ---
  if (clientSecret && breakdown && breakdownCurrency) {
    return (
      <PaymentCheckoutShell
        backHref="/patient/sessions"
        backLabel={t("page.backToSessions")}
        title={t("page.heading")}
        description={t("page.subheading")}
        sidebar={
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
              {t("breakdown.heading")}
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-text-secondary">
                <span>{t("breakdown.grossAmount")}</span>
                <span className="font-bold text-text-primary">
                  {formatFinanceMoney(
                    numLocale,
                    breakdown.grossAmount,
                    displayCurrency,
                  )}
                </span>
              </div>
              {Number(walletSplit?.walletUsed ?? "0") > 0 && (
                <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-semibold">
                  <span>{t("walletCheckout.walletDeductionLabel")}</span>
                  <span>
                    -
                    {formatFinanceMoney(
                      numLocale,
                      walletSplit?.walletUsed ?? "0",
                      displayCurrency,
                    )}
                  </span>
                </div>
              )}
              {Number(breakdown.discountAmount) > 0 && (
                <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-semibold">
                  <span>{t("breakdown.discount")}</span>
                  <span>
                    -
                    {formatFinanceMoney(
                      numLocale,
                      breakdown.discountAmount,
                      displayCurrency,
                    )}
                  </span>
                </div>
              )}
              <div className="border-t border-border-light pt-2 flex justify-between font-bold text-sm text-primary">
                <span>{t("page.amountDueHeading")}</span>
                <span>
                  {formatFinanceMoney(
                    numLocale,
                    breakdown.netPaidAmount,
                    displayCurrency,
                  )}
                </span>
              </div>
            </div>
          </div>
        }
      >
        <div className="rounded-2xl border border-border-light bg-white p-5 shadow-xs dark:bg-surface-secondary">
          <StripePaymentForm
            clientSecret={clientSecret}
            netPaidAmount={breakdown.netPaidAmount}
            currency={breakdownCurrency}
            returnUrl={returnUrl}
          />
        </div>
      </PaymentCheckoutShell>
    );
  }

  // --- UNIFIED SINGLE CHECKOUT SURFACE ---
  const remainingSeconds = session.expiresAt
    ? Math.max(0, Math.floor((new Date(session.expiresAt).getTime() - now) / 1000))
    : null;
  const remainingMinutes = remainingSeconds !== null ? Math.floor(remainingSeconds / 60) : null;
  const remainingSecs = remainingSeconds !== null ? remainingSeconds % 60 : null;

  const isWalletOnlyPayment =
    walletSplit && Number(walletSplit.gatewayRemaining) <= 0;
  const finalPayableFormatted = breakdown && walletSplit
    ? formatFinanceMoney(
        numLocale,
        walletSplit?.gatewayRemaining ?? "0",
        displayCurrency,
        { fallbackText: "—" },
      )
    : "—";

  const walletBalanceNumber = Number(availableWalletBalance) || 0;
  const hasUsableWalletBalance =
    walletSummary &&
    walletCurrencyMatchesBreakdown &&
    walletBalanceNumber > 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8 space-y-6">
      {/* Top Header & Back Navigation */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border-light/60 pb-4">
        <div>
          <Link
            href="/patient/sessions"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-primary mb-1 transition group"
          >
            <ArrowLeft size={13} className="rtl:rotate-180 transition group-hover:-translate-x-0.5 rtl:group-hover:translate-x-0.5" />
            <span>{t("page.backToSessions")}</span>
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary dark:text-white">
            {t("page.heading")}
          </h1>
          <p className="text-xs text-text-secondary">
            {t("page.subheading")}
          </p>
        </div>

        {/* Reservation Countdown Timer */}
        {session.expiresAt && !isReservationExpired && (
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-50/70 px-3.5 py-1.5 text-xs font-bold text-amber-800 dark:bg-amber-500/10 dark:text-amber-300 self-start sm:self-auto">
            <Clock3 size={14} className="text-amber-600 animate-pulse" />
            <span>
              {locale === "ar" ? "المتبقي لإتمام الحجز:" : "Time remaining:"}{" "}
              <span className="font-mono">
                {remainingMinutes}:{String(remainingSecs).padStart(2, "0")}
              </span>
            </span>
          </div>
        )}
      </div>

      {/* Main 2-Column Responsive Layout */}
      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* Main Column: Details, Wallet & Policies (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* 1. Practitioner & Appointment Confirmation Box */}
          <div className="rounded-2xl border border-border-light/80 bg-white p-4.5 sm:p-5 shadow-xs dark:bg-surface-secondary dark:border-white/10 space-y-4">
            <div className="flex items-center gap-3.5">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-primary/20 bg-surface-secondary dark:bg-white/5">
                <PractitionerAvatar
                  src={null}
                  alt={session.practitioner.displayName ?? session.practitioner.slug}
                  initials={session.practitioner.displayName?.slice(0, 2) ?? "DR"}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-bold text-text-primary dark:text-white truncate">
                  {session.practitioner.displayName ?? session.practitioner.slug}
                </h2>
                <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary mt-0.5">
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary-light px-2 py-0.5 text-[11px] font-semibold text-text-brand dark:bg-primary/15">
                    <Video size={12} className="text-primary" />
                    <span>{locale === "ar" ? "جلسة فيديو مباشرة" : "Live Video Session"}</span>
                  </span>
                  <span>•</span>
                  <span className="font-medium text-text-primary">
                    {session.durationMinutes} {t("page.minutes")}
                  </span>
                </div>
              </div>
            </div>

            {/* Appointment Time & Code Details */}
            <div className="rounded-xl bg-[#FCFAF6] border border-border-light/60 p-3.5 text-xs dark:bg-white/5 dark:border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-text-secondary">
                  <Calendar size={14} className="text-primary" />
                  <span className="font-semibold">{t("page.scheduledLabel")}</span>
                </div>
                <span className="font-bold text-text-primary dark:text-white">
                  {session.scheduledStartAt
                    ? formatDatetime(session.scheduledStartAt, numLocale)
                    : t("page.unscheduledLabel")}
                </span>
              </div>

              <div className="flex items-center justify-between border-t border-border-light/40 pt-2 text-[11px]">
                <span className="text-text-muted">{t("page.sessionCodeLabel")}</span>
                <SessionCodeReference sessionId={session.id} sessionCode={session.sessionCode} copyable />
              </div>
            </div>
          </div>

          {/* 2. DEDICATED CUSTOMER WALLET SECTION */}
          <div className="rounded-2xl border border-border-light/80 bg-white p-4.5 sm:p-5 shadow-xs dark:bg-surface-secondary dark:border-white/10 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-light text-primary dark:bg-primary/20">
                  <Wallet size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary dark:text-white">
                    {locale === "ar" ? "رصيد المحفظة" : "Customer Wallet"}
                  </h3>
                  <p className="text-[11px] text-text-secondary">
                    {walletSummaryLoading
                      ? (locale === "ar" ? "جارٍ التحقق من رصيد المحفظة..." : "Checking wallet balance...")
                      : locale === "ar"
                        ? `الرصيد المتاح: ${formatFinanceMoney(numLocale, availableWalletBalance, displayCurrency)}`
                        : `Available Balance: ${formatFinanceMoney(numLocale, availableWalletBalance, displayCurrency)}`}
                  </p>
                </div>
              </div>

              {hasUsableWalletBalance && (
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={useWalletBalance}
                    onChange={(e) => setUseWalletBalance(e.target.checked)}
                    className="h-4.5 w-4.5 rounded border-border-light text-primary focus:ring-primary cursor-pointer transition"
                  />
                  <span className="ms-2 text-xs font-bold text-text-brand dark:text-primary-light">
                    {locale === "ar" ? "استخدام الرصيد" : "Use Wallet"}
                  </span>
                </label>
              )}
            </div>

            {/* Wallet Behavior Explanation Box */}
            {hasUsableWalletBalance ? (
              useWalletBalance ? (
                <div className="rounded-xl border border-emerald-300 bg-emerald-50/70 p-3 text-xs text-emerald-900 dark:border-emerald-800/40 dark:bg-emerald-950/20 dark:text-emerald-300 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" />
                    <span>
                      {isWalletOnlyPayment
                        ? (locale === "ar"
                            ? "رصيد المحفظة يغطي كامل تكلفة الجلسة."
                            : "Wallet covers the full session cost.")
                        : (locale === "ar"
                            ? `سيتم خصم ${formatFinanceMoney(numLocale, walletSplit?.walletUsed ?? "0", displayCurrency)} من المحفظة.`
                            : `Deducting ${formatFinanceMoney(numLocale, walletSplit?.walletUsed ?? "0", displayCurrency)} from wallet.`)}
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-800/90 dark:text-emerald-400/90 leading-relaxed">
                    {isWalletOnlyPayment
                      ? (locale === "ar"
                          ? "لا توجد أي مبالغ إضافية مطلوبة عبر بطاقتك الائتمانية. يمكنك التأكيد مباشرة."
                          : "No external payment required. You can confirm directly.")
                      : (locale === "ar"
                          ? `المتبقي للدفع عبر وسيلة الدفع الإلكترونية: ${formatFinanceMoney(numLocale, walletSplit?.gatewayRemaining ?? "0", displayCurrency)}.`
                          : `Remaining to pay via external payment: ${formatFinanceMoney(numLocale, walletSplit?.gatewayRemaining ?? "0", displayCurrency)}.`)}
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-border-light/60 bg-[#FCFAF6] p-3 text-xs text-text-secondary dark:bg-white/5">
                  <p className="text-[11px]">
                    {locale === "ar"
                      ? "تم إلغاء استخدام رصيد المحفظة. سيتم سداد كامل قيمة الجلسة عبر وسيلة الدفع الإلكترونية."
                      : "Wallet balance not applied. Full amount will be paid via external payment."}
                  </p>
                </div>
              )
            ) : !walletCurrencyMatchesBreakdown && walletSummary ? (
              <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-3 text-xs text-amber-900 dark:border-amber-800/40 dark:bg-amber-950/20 dark:text-amber-300">
                <p className="text-[11px]">
                  {t("walletCheckout.currencyMismatch")}
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-border-light/60 bg-[#FCFAF6] p-3 text-xs text-text-secondary dark:bg-white/5">
                <p className="text-[11px]">
                  {locale === "ar"
                    ? "لا يتوفر رصيد متاح في محفظتك حالياً. سيتم سداد قيمة الجلسة عبر وسيلة الدفع الإلكترونية."
                    : "No available wallet balance. Full amount will be paid via external payment."}
                </p>
              </div>
            )}
          </div>

          {/* 3. Mandatory Policy Acceptance Card (Inline & Clear) */}
          <div className={`rounded-2xl border p-4.5 sm:p-5 transition-colors ${
            policyConsentError
              ? "border-danger bg-danger/5"
              : "border-border-light/80 bg-white shadow-xs dark:bg-surface-secondary dark:border-white/10"
          }`}>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-primary" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary dark:text-white">
                    {locale === "ar" ? "شروط الحجز وسياسة الاسترداد" : "Booking Terms & Refund Policy"}
                  </h3>
                </div>
                {refundPolicy && (
                  <button
                    type="button"
                    onClick={() => setIsPolicyModalOpen(true)}
                    className="text-xs font-bold text-primary hover:underline cursor-pointer"
                  >
                    {locale === "ar" ? "قراءة البنود كاملة" : "Read full clauses"}
                  </button>
                )}
              </div>

              {/* Explicit Mandatory Checkbox */}
              <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-border-light/60 bg-[#FCFAF6] p-3.5 text-xs transition hover:bg-surface-secondary dark:bg-white/5 dark:border-white/10 select-none">
                <input
                  type="checkbox"
                  checked={isRefundPolicyAccepted}
                  onChange={(e) => {
                    setPolicyConsentError(null);
                    if (e.target.checked && refundPolicy) {
                      setAcceptedRefundPolicyId(refundPolicy.id);
                    } else {
                      setAcceptedRefundPolicyId(null);
                    }
                  }}
                  disabled={!refundPolicy || refundPolicyLoading}
                  className="mt-0.5 h-4 w-4 rounded border-border-light text-primary focus:ring-primary cursor-pointer"
                />
                <div className="space-y-1 min-w-0">
                  <span className="font-bold text-text-primary dark:text-white block text-xs">
                    {locale === "ar"
                      ? "أوافق على شروط الاستخدام وسياسة الإلغاء والاسترداد الخاصة بالجلسات."
                      : "I agree to the Terms of Service and Session Cancellation & Refund Policy."}
                  </span>
                  <span className="text-[11px] text-text-secondary block leading-relaxed">
                    {locale === "ar"
                      ? "تتيح لك السياسة الاسترداد أو إعادة الجدولة وفق القواعد المعتمدة في منصة سويّة."
                      : "The policy allows refunds or rescheduling according to Sawiyaa rules."}
                  </span>
                </div>
              </label>

              {policyConsentError && (
                <div className="flex items-center gap-1.5 text-xs font-bold text-danger pt-1">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{policyConsentError}</span>
                </div>
              )}
            </div>
          </div>

          {/* 4. Confidentiality & Trust Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex items-center gap-2.5 rounded-xl border border-border-light/60 bg-white p-3 text-xs dark:bg-surface-secondary dark:border-white/10">
              <Lock size={15} className="text-primary shrink-0" />
              <span className="font-medium text-text-secondary">
                {locale === "ar" ? "خصوصية وسرية تامة" : "Complete Privacy"}
              </span>
            </div>
            <div className="flex items-center gap-2.5 rounded-xl border border-border-light/60 bg-white p-3 text-xs dark:bg-surface-secondary dark:border-white/10">
              <ShieldCheck size={15} className="text-primary shrink-0" />
              <span className="font-medium text-text-secondary">
                {locale === "ar" ? "مختص معتمد وموثوق" : "Certified Specialist"}
              </span>
            </div>
            <div className="flex items-center gap-2.5 rounded-xl border border-border-light/60 bg-white p-3 text-xs dark:bg-surface-secondary dark:border-white/10">
              <Sparkles size={15} className="text-primary shrink-0" />
              <span className="font-medium text-text-secondary">
                {locale === "ar" ? "دفع آمن ومحمي" : "Secure Payment"}
              </span>
            </div>
          </div>
        </div>

        {/* Sidebar Column: Financial Breakdown & Final Payment CTA (5 cols) */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-20">
          <div className="rounded-2xl border border-border-light/80 bg-white p-5 shadow-sm dark:bg-surface-secondary dark:border-white/10 space-y-5">
            <div className="flex items-center justify-between border-b border-border-light/60 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary dark:text-white">
                {t("breakdown.heading")}
              </h3>
              {breakdownLoading && (
                <span className="text-[11px] text-text-muted animate-pulse">
                  {t("breakdown.loading")}
                </span>
              )}
            </div>

            {/* Coupon Code Input */}
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1.5">
                {t("breakdown.couponLabel")}
              </label>
              {!appliedCoupon ? (
                <div className="flex items-stretch gap-2">
                  <input
                    ref={couponInputRef}
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleApplyCoupon();
                    }}
                    placeholder={t("breakdown.couponPlaceholder")}
                    maxLength={32}
                    className="app-control flex-1 px-3 py-2 text-xs rounded-xl bg-[#FCFAF6] border border-border-light/80 focus:border-primary focus:bg-white focus:outline-none dark:bg-white/5 dark:border-white/10 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={!couponInput.trim() || isApplyingCoupon}
                    className="shrink-0 rounded-xl border border-border-light bg-[#FCFAF6] px-3.5 py-2 text-xs font-bold text-text-secondary hover:bg-primary-light hover:text-text-brand disabled:opacity-50 dark:bg-white/5 dark:border-white/10 cursor-pointer"
                  >
                    {isApplyingCoupon
                      ? t("breakdown.couponApplying")
                      : t("breakdown.couponApply")}
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between rounded-xl border border-border-light bg-[#FCFAF6] px-3 py-2 text-xs dark:bg-white/5">
                  <span className="flex items-center gap-1.5 font-bold text-text-brand dark:text-primary-light">
                    <Tag size={13} />
                    <span>{appliedCoupon}</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="text-text-muted hover:text-danger cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
              {couponErrorMessage && (
                <p className="mt-1.5 text-[11px] font-semibold text-danger">{couponErrorMessage}</p>
              )}
            </div>

            {/* Price Breakdown Details */}
            {breakdown ? (
              <div className="space-y-2.5 border-t border-border-light/60 pt-4 text-xs">
                <div className="flex justify-between text-text-secondary">
                  <span>{t("breakdown.grossAmount")}</span>
                  <span className="font-semibold text-text-primary dark:text-white">
                    {formatFinanceMoney(numLocale, breakdown.grossAmount, displayCurrency)}
                  </span>
                </div>

                {Number(walletSplit?.walletUsed ?? "0") > 0 && (
                  <div className="flex justify-between font-semibold text-emerald-700 dark:text-emerald-400">
                    <span>{t("walletCheckout.walletDeductionLabel")}</span>
                    <span>
                      -{formatFinanceMoney(numLocale, walletSplit?.walletUsed ?? "0", displayCurrency)}
                    </span>
                  </div>
                )}

                {Number(breakdown.discountAmount) > 0 && (
                  <div className="flex justify-between font-semibold text-emerald-700 dark:text-emerald-400">
                    <span>{breakdown.coupon ? breakdown.coupon.code : t("breakdown.discount")}</span>
                    <span>
                      -{formatFinanceMoney(numLocale, breakdown.discountAmount, displayCurrency)}
                    </span>
                  </div>
                )}

                {/* Final Amount Due Box */}
                <div className="rounded-xl bg-[#EEF4EF] p-4 text-[#1C2F2B] dark:bg-white/5 dark:text-white border border-[#24564F]/15 mt-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">
                      {t("page.amountDueHeading")}
                    </span>
                    <span className="text-xl font-black text-[#24564F] dark:text-[#A7BFAE]">
                      {finalPayableFormatted}
                    </span>
                  </div>
                  <p className="text-[10px] text-text-secondary leading-tight">
                    {isWalletOnlyPayment
                      ? (locale === "ar"
                          ? "مغطى بالكامل برصيد المحفظة."
                          : "Fully covered by wallet balance.")
                      : t("page.amountDueNote")}
                  </p>
                </div>
              </div>
            ) : breakdownLoading ? (
              <div className="space-y-2 border-t border-border-light/60 pt-4">
                <div className="h-4 w-full bg-surface-tertiary animate-pulse rounded" />
                <div className="h-4 w-3/4 bg-surface-tertiary animate-pulse rounded" />
                <div className="h-14 w-full bg-surface-tertiary animate-pulse rounded-xl mt-2" />
              </div>
            ) : (
              <div className="border-t border-border-light/60 pt-4 text-xs text-text-muted">
                <p>{t("breakdown.error")}</p>
                <button
                  type="button"
                  onClick={() => refetchBreakdown()}
                  className="mt-1 text-xs font-bold text-primary underline cursor-pointer"
                >
                  {t("page.retry")}
                </button>
              </div>
            )}

            {/* Paymob method selector if multiple methods available */}
            {isHostedCheckoutExpected &&
            paymobCheckoutFlow === "legacy" &&
            supportedPaymobMethods.length > 1 && (
              <div className="space-y-2 border-t border-border-light/60 pt-3">
                <label className="block text-xs font-bold text-text-secondary">
                  {t("page.paymobMethod.heading")}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {supportedPaymobMethods.includes("CARD") && (
                    <button
                      type="button"
                      onClick={() => setPaymobMethod("CARD")}
                      className={`rounded-xl border p-2.5 text-center text-xs font-bold transition cursor-pointer ${
                        selectedPaymobMethod === "CARD"
                          ? "border-primary bg-primary-light text-primary shadow-xs"
                          : "border-border-light bg-[#FCFAF6] text-text-secondary hover:border-primary/40 dark:bg-white/5"
                      }`}
                    >
                      {t("page.paymobMethod.card.title")}
                    </button>
                  )}
                  {supportedPaymobMethods.includes("WALLET") && (
                    <button
                      type="button"
                      onClick={() => setPaymobMethod("WALLET")}
                      className={`rounded-xl border p-2.5 text-center text-xs font-bold transition cursor-pointer ${
                        selectedPaymobMethod === "WALLET"
                          ? "border-primary bg-primary-light text-primary shadow-xs"
                          : "border-border-light bg-[#FCFAF6] text-text-secondary hover:border-primary/40 dark:bg-white/5"
                      }`}
                    >
                      {t("page.paymobMethod.wallet.title")}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Errors */}
            {initiateError && (
              <div className="flex items-start gap-2 rounded-xl bg-danger/10 p-3 text-xs font-bold text-danger">
                <AlertCircle size={15} className="mt-0.5 shrink-0" />
                <span>{initiateError}</span>
              </div>
            )}

            {/* PRIMARY ACTION CTA BUTTON */}
            <Button
              onClick={handleProceedToPayment}
              disabled={
                initiate.isPending ||
                breakdownLoading ||
                !breakdown ||
                !fundingPreview ||
                redirectingToHostedCheckout ||
                refundPolicyLoading ||
                !refundPolicy
              }
              className="w-full py-3.5 text-sm font-bold rounded-xl bg-primary text-white shadow-sm transition hover:bg-primary-hover active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
            >
              {initiate.isPending
                ? t("page.initiating")
                : redirectingToHostedCheckout
                  ? t("page.redirecting")
                  : breakdownLoading
                    ? (locale === "ar" ? "جارٍ حساب السعر..." : "Calculating price...")
                    : isWalletOnlyPayment
                      ? (locale === "ar" ? "تأكيد الحجز برصيد المحفظة" : "Confirm Booking with Wallet")
                      : locale === "ar"
                        ? `ادفع ${finalPayableFormatted} وأكد الحجز`
                        : `Pay ${finalPayableFormatted} & Confirm`}
            </Button>
          </div>
        </div>
      </div>

      {/* Refund Policy Clauses Modal */}
      <Modal
        isOpen={isPolicyModalOpen}
        onClose={() => setIsPolicyModalOpen(false)}
        size="2xl"
        className="w-full max-w-[800px]"
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
                  const clauseTitle =
                    locale === "ar"
                      ? clause.titleAr || clause.titleEn
                      : clause.titleEn || clause.titleAr;
                  const clauseBody =
                    locale === "ar" ? clause.bodyAr : clause.bodyEn;

                  return (
                    <div
                      key={clause.id}
                      className="pb-3 border-b border-border-light/40 last:border-0 last:pb-0"
                    >
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-[11px] font-bold text-primary shrink-0">
                          {locale === "ar"
                            ? `البند ${index + 1}:`
                            : `Clause ${index + 1}:`}
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
                {locale === "ar"
                  ? "لا توجد بنود لسياسة الاسترداد حالياً."
                  : "No refund policy clauses available."}
              </p>
            )}
          </ModalBody>
          <ModalFooter className="flex items-center justify-end gap-2 border-t border-border-light pt-4">
            <Button
              variant="outline"
              onClick={() => setIsPolicyModalOpen(false)}
            >
              {locale === "ar" ? "إغلاق" : "Close"}
            </Button>
            <Button
              onClick={() => {
                if (refundPolicy) {
                  setAcceptedRefundPolicyId(refundPolicy.id);
                  setPolicyConsentError(null);
                }
                setIsPolicyModalOpen(false);
              }}
            >
              {locale === "ar" ? "أوافق على البنود" : "Agree to clauses"}
            </Button>
          </ModalFooter>
        </div>
      </Modal>
    </div>
  );
}
