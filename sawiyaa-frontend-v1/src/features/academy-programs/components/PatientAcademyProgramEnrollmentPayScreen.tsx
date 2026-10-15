"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  CreditCard,
  ExternalLink,
  Globe,
  Landmark,
  Loader2,
  ReceiptText,
  ShieldCheck,
  Smartphone,
  Upload,
  Wallet,
} from "lucide-react";
import { StateCard } from "@/components/shared/ContentStates";
import {
  usePatientAcademyProgramEnrollment,
  usePublicAcademyProgramEnrollment,
} from "../hooks/use-academy-programs";
import {
  buildPatientAcademyProgramPaymentRedirectUrl,
  buildPatientAcademyProgramPaymentReturnUrl,
  buildPublicAcademyProgramPaymentRedirectUrl,
} from "../lib/academy-program-navigation";
import { resolveAcademyProgramLocalizedValue } from "../lib/academy-program-localization";
import {
  getManualPaymentMethods,
  getManualPaymentSubmissions,
  submitManualPaymentProof,
} from "../api/manual-payments.api";
import type {
  AcademyProgramEnrollmentItem,
  ManualPaymentMethod,
  ManualPaymentSubmission,
} from "../types/academy-programs.types";

const CARD_METHOD_KEY = "__card__";

function formatMoney(amount: string | null | undefined, currency: string | null | undefined, locale: string) {
  if (!amount || !currency) {
    return null;
  }

  const numeric = Number(amount);
  if (Number.isNaN(numeric)) {
    return `${amount} ${currency}`;
  }

  try {
    return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(numeric);
  } catch {
    return `${amount} ${currency}`;
  }
}

function getMethodIcon(type: string) {
  switch (type.toUpperCase()) {
    case "INSTAPAY":
      return <Smartphone className="h-5 w-5" />;
    case "PAYPAL":
      return <Globe className="h-5 w-5" />;
    case "ELECTRONIC_WALLET":
      return <Wallet className="h-5 w-5" />;
    default:
      return <Landmark className="h-5 w-5" />;
  }
}

export default function PatientAcademyProgramEnrollmentPayScreen({
  enrollmentId,
  token,
  initialEnrollment = null,
}: {
  enrollmentId: string;
  token?: string;
  initialEnrollment?: AcademyProgramEnrollmentItem | null;
}) {
  const t = useTranslations("academy");
  const locale = useLocale();
  const fileInputId = useId();
  const normalizedToken = token?.trim() ?? "";
  const usePublicQuery = Boolean(normalizedToken);

  const patientEnrollmentQuery = usePatientAcademyProgramEnrollment(
    !usePublicQuery && !initialEnrollment ? enrollmentId : null,
  );
  const publicEnrollmentQuery = usePublicAcademyProgramEnrollment(
    usePublicQuery && !initialEnrollment ? enrollmentId : null,
    usePublicQuery && !initialEnrollment ? normalizedToken : null,
  );

  const enrollment =
    initialEnrollment ??
    (usePublicQuery
      ? (publicEnrollmentQuery.data ?? null)
      : (patientEnrollmentQuery.data?.item ?? null));
  const isLoading =
    !initialEnrollment &&
    (usePublicQuery ? publicEnrollmentQuery.isLoading : patientEnrollmentQuery.isLoading);
  const isError =
    !initialEnrollment &&
    (usePublicQuery ? publicEnrollmentQuery.isError : patientEnrollmentQuery.isError);
  const refetch = usePublicQuery ? publicEnrollmentQuery.refetch : patientEnrollmentQuery.refetch;

  const [isRedirecting, setIsRedirecting] = useState(false);
  const [methodsLoading, setMethodsLoading] = useState(true);
  const [manualMethods, setManualMethods] = useState<ManualPaymentMethod[]>([]);
  const [manualMethodsError, setManualMethodsError] = useState(false);
  const [manualSubmissions, setManualSubmissions] = useState<ManualPaymentSubmission[]>([]);
  const [manualSubmissionsError, setManualSubmissionsError] = useState(false);
  const [selectedMethodKey, setSelectedMethodKey] = useState<string>("");
  const [senderAccountName, setSenderAccountName] = useState("");
  const [manualNotes, setManualNotes] = useState("");
  const [manualProof, setManualProof] = useState<File | null>(null);
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualFeedback, setManualFeedback] = useState<{
    tone: "error" | "success";
    message: string;
  } | null>(null);
  const [copiedIdentifier, setCopiedIdentifier] = useState(false);

  const effectiveToken = normalizedToken || enrollment?.publicAccessToken || "";

  useEffect(() => {
    let active = true;

    getManualPaymentMethods()
      .then((methods) => {
        if (!active) return;
        const enabled = Array.isArray(methods)
          ? methods.filter((method) => method.isEnabled !== false)
          : [];
        setManualMethods(enabled);
        setManualMethodsError(false);
      })
      .catch(() => {
        if (!active) return;
        setManualMethods([]);
        setManualMethodsError(true);
      })
      .finally(() => {
        if (active) {
          setMethodsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!enrollment?.id) return;
    let active = true;

    getManualPaymentSubmissions(enrollment.id, effectiveToken || undefined)
      .then((items) => {
        if (!active) return;
        setManualSubmissions(Array.isArray(items) ? items : []);
        setManualSubmissionsError(false);
      })
      .catch(() => {
        if (!active) return;
        setManualSubmissions([]);
        setManualSubmissionsError(true);
      });

    return () => {
      active = false;
    };
  }, [effectiveToken, enrollment?.id]);

  const gatewayAvailable = useMemo(() => {
    if (typeof enrollment?.gatewayAvailable === "boolean") {
      return enrollment.gatewayAvailable;
    }
    if (typeof enrollment?.payment?.gatewayAvailable === "boolean") {
      return enrollment.payment.gatewayAvailable;
    }
    if (!enrollment?.payment) {
      return false;
    }
    return Boolean(
      enrollment.payment.checkoutUrl || enrollment.payment.provider !== "MANUAL",
    );
  }, [enrollment?.gatewayAvailable, enrollment?.payment]);

  const latestManualSubmission = manualSubmissions[0] ?? null;
  const isReviewPending = latestManualSubmission?.status === "UNDER_REVIEW";
  const isRejectedSubmission = latestManualSubmission?.status === "REJECTED";

  const activeMethodKey = useMemo(() => {
    const validKeys = new Set<string>();
    if (gatewayAvailable) {
      validKeys.add(CARD_METHOD_KEY);
    }
    for (const method of manualMethods) {
      validKeys.add(method.id);
    }

    if (selectedMethodKey && validKeys.has(selectedMethodKey)) {
      return selectedMethodKey;
    }

    const rejectedMethodId =
      latestManualSubmission?.methodId ?? latestManualSubmission?.method?.id;
    if (isRejectedSubmission && rejectedMethodId && validKeys.has(rejectedMethodId)) {
      return rejectedMethodId;
    }

    if (gatewayAvailable) {
      return CARD_METHOD_KEY;
    }

    if (manualMethods.length > 0) {
      return manualMethods[0].id;
    }

    return "";
  }, [
    gatewayAvailable,
    isRejectedSubmission,
    latestManualSubmission?.method?.id,
    latestManualSubmission?.methodId,
    manualMethods,
    selectedMethodKey,
  ]);

  const returnUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return "";
    }

    return buildPatientAcademyProgramPaymentReturnUrl({
      locale,
      enrollmentId,
      origin: window.location.origin,
      token: effectiveToken || undefined,
    });
  }, [effectiveToken, enrollmentId, locale]);

  const redirectUrl = useMemo(() => {
    if (!returnUrl) {
      return "";
    }

    if (effectiveToken) {
      return buildPublicAcademyProgramPaymentRedirectUrl({
        enrollmentId,
        token: effectiveToken,
        returnUrl,
      });
    }

    return buildPatientAcademyProgramPaymentRedirectUrl({
      enrollmentId,
      returnUrl,
    });
  }, [effectiveToken, enrollmentId, returnUrl]);

  const title = enrollment
    ? resolveAcademyProgramLocalizedValue({
        locale,
        primary: enrollment.program.titleAr,
        secondary: enrollment.program.titleEn,
        fallback: enrollment.program.title ?? enrollment.program.slug,
      })
    : "";

  const amountLabel = enrollment
    ? formatMoney(
        enrollment.payment?.amountTotal ?? enrollment.selectedAmountSnapshot,
        enrollment.payment?.currencyCode ?? enrollment.selectedCurrencyCode,
        locale,
      ) ?? t("public.detail.free")
    : t("public.detail.free");

  const isConfirmed =
    enrollment?.status === "CONFIRMED" ||
    enrollment?.paymentStatus === "CAPTURED" ||
    manualSubmissions[0]?.status === "APPROVED";
  const isCancelledOrExpired =
    enrollment?.status === "CANCELLED" || enrollment?.status === "EXPIRED";

  const selectedManualMethod = useMemo(
    () => manualMethods.find((method) => method.id === activeMethodKey) ?? null,
    [activeMethodKey, manualMethods],
  );

  const hasAnyPaymentMethod = gatewayAvailable || manualMethods.length > 0;
  const programHref = enrollment?.program?.slug
    ? `/${locale}/academy/${enrollment.program.slug}`
    : `/${locale}/academy`;

  const handleCopyIdentifier = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedIdentifier(true);
      setTimeout(() => setCopiedIdentifier(false), 2000);
    } catch {
      // Clipboard API may be unavailable in some environments
    }
  };

  const handleCardCheckout = () => {
    const directCheckoutUrl = enrollment?.payment?.checkoutUrl?.trim() ?? "";
    const targetUrl = directCheckoutUrl || redirectUrl;
    if (!targetUrl) {
      return;
    }

    setIsRedirecting(true);
    window.location.assign(targetUrl);
  };

  const handleManualSubmit = async () => {
    if (!enrollment || !selectedManualMethod || !senderAccountName.trim() || !manualProof) {
      setManualFeedback({
        tone: "error",
        message: t("patient.pay.manual.required"),
      });
      return;
    }

    if (
      manualProof.size > 5 * 1024 * 1024 ||
      !["image/jpeg", "image/png", "image/webp"].includes(manualProof.type)
    ) {
      setManualFeedback({
        tone: "error",
        message: t("patient.pay.manual.invalidFile"),
      });
      return;
    }

    setManualSubmitting(true);
    setManualFeedback(null);

    try {
      const response = await submitManualPaymentProof({
        enrollmentId: enrollment.id,
        token: effectiveToken || undefined,
        methodId: selectedManualMethod.id,
        senderAccountName: senderAccountName.trim(),
        notes: manualNotes.trim() || undefined,
        proof: manualProof,
      });

      const refreshed = await getManualPaymentSubmissions(
        enrollment.id,
        effectiveToken || undefined,
      ).catch(() => [response]);

      setManualSubmissions(
        Array.isArray(refreshed) && refreshed.length > 0 ? refreshed : [response],
      );
      setManualFeedback({
        tone: "success",
        message: t("patient.pay.manual.success"),
      });
    } catch {
      setManualFeedback({
        tone: "error",
        message: t("patient.pay.manual.failed"),
      });
    } finally {
      setManualSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
        <div className="h-80 animate-pulse rounded-2xl border border-border-light bg-surface-tertiary" />
      </div>
    );
  }

  if (isError || !enrollment) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
        <StateCard
          icon={<AlertCircle size={40} className="text-primary" />}
          title={t("patient.pay.error.title")}
          note={t("patient.pay.error.note")}
          action={{
            label: t("patient.pay.error.retry"),
            onClick: () => refetch(),
          }}
          className="rounded-2xl"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={programHref}
          className="inline-flex items-center gap-2 rounded-full border border-border-light bg-white px-4 py-2 text-sm font-medium text-text-secondary transition hover:border-primary/30 hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          <span>{t("return.backToProgram")}</span>
        </Link>
      </div>

      {/* Top Header & Registration Summary */}
      <section className="app-panel rounded-2xl border border-border-light bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-light/40 px-3 py-1 text-xs font-semibold text-primary">
              <BadgeCheck className="h-3.5 w-3.5" />
              <span>{t("patient.pay.badge")}</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-text-primary sm:text-2xl">
              {isConfirmed
                ? t("patient.pay.state.confirmed.title")
                : isReviewPending
                  ? t("patient.pay.manual.reviewPending")
                  : t("patient.pay.title")}
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-text-secondary">
              {isConfirmed
                ? t("patient.pay.state.confirmed.note")
                : isReviewPending
                  ? t("patient.pay.manual.reviewPendingNote")
                  : t("patient.pay.note")}
            </p>
          </div>

          <div className="flex flex-wrap items-stretch gap-3 sm:flex-nowrap">
            <div className="min-w-[180px] flex-1 rounded-xl border border-border-light bg-surface-tertiary px-4 py-3">
              <div className="flex items-center gap-1.5 text-xs font-medium text-text-muted">
                <ReceiptText className="h-3.5 w-3.5 text-primary" />
                <span>{t("patient.pay.summary.program")}</span>
              </div>
              <div className="mt-1 text-sm font-bold text-text-primary">{title}</div>
            </div>

            <div className="min-w-[140px] rounded-xl border border-primary/20 bg-primary-light/20 px-4 py-3">
              <div className="text-xs font-medium text-text-secondary">
                {t("patient.pay.summary.amount")}
              </div>
              <div className="mt-1 text-base font-bold text-primary" dir="ltr">
                {amountLabel}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Confirmed State */}
      {isConfirmed ? (
        <section className="app-panel rounded-2xl border border-success/25 bg-white p-6 text-center sm:p-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-light text-success">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-text-primary sm:text-xl">
            {t("patient.pay.state.confirmed.title")}
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-text-secondary">
            {t("patient.pay.state.confirmed.note")}
          </p>
          <div className="mt-6 flex justify-center">
            <Link
              href={programHref}
              className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover"
            >
              {t("patient.pay.state.confirmed.cta")}
            </Link>
          </div>
        </section>
      ) : isCancelledOrExpired ? (
        <section className="app-panel rounded-2xl border border-border-light bg-white p-6 text-center sm:p-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface-tertiary text-text-muted">
            <Clock3 className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-text-primary sm:text-xl">
            {t("patient.pay.state.cancelled.title")}
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-text-secondary">
            {t("patient.pay.state.cancelled.note")}
          </p>
          <div className="mt-6 flex justify-center">
            <Link
              href={programHref}
              className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover"
            >
              {t("patient.pay.state.cancelled.cta")}
            </Link>
          </div>
        </section>
      ) : isReviewPending ? (
        /* Proof Received & Under Review State */
        <section className="app-panel rounded-2xl border border-primary/25 bg-white p-6 sm:p-8">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-light/40 text-primary">
              <Clock3 className="h-6 w-6" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-lg font-bold text-text-primary">
                {t("patient.pay.manual.reviewPending")}
              </h2>
              <p className="text-sm leading-relaxed text-text-secondary">
                {t("patient.pay.manual.reviewPendingNote")}
              </p>
            </div>
          </div>
        </section>
      ) : (
        /* Active Payment Method Selection Workspace */
        <>
          {manualSubmissionsError ? (
            <div
              role="alert"
              className="rounded-2xl border border-error-500/30 bg-error-50 px-5 py-4 text-sm font-medium text-error-700"
            >
              {t("patient.pay.manual.submissionsLoadFailed")}
            </div>
          ) : null}

          {manualMethodsError ? (
            <div
              role="alert"
              className="rounded-2xl border border-error-500/30 bg-error-50 px-5 py-4 text-sm font-medium text-error-700"
            >
              {t("patient.pay.manual.loadFailed")}
            </div>
          ) : null}

          {isRejectedSubmission ? (
            <div className="rounded-2xl border border-error-500/30 bg-error-50 px-5 py-4 text-sm font-medium text-error-700">
              {t("patient.pay.manual.rejected", {
                reason: latestManualSubmission?.rejectionReason ?? "",
              })}
            </div>
          ) : null}

          {methodsLoading ? (
            <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
              <div className="h-64 animate-pulse rounded-2xl border border-border-light bg-surface-tertiary" />
              <div className="h-80 animate-pulse rounded-2xl border border-border-light bg-surface-tertiary" />
            </div>
          ) : !hasAnyPaymentMethod ? (
            <section className="app-panel rounded-2xl border border-border-light bg-white p-6 text-center sm:p-8">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface-tertiary text-text-muted">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-lg font-bold text-text-primary">
                {t("patient.pay.state.unavailable.title")}
              </h2>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-text-secondary">
                {t("patient.pay.manual.unavailable")}
              </p>
            </section>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[300px_1fr] lg:items-start">
              {/* Payment Method Cards Area (Right side in RTL, Left side in LTR, Top on Mobile) */}
              <aside className="app-panel rounded-2xl border border-border-light bg-white p-4 sm:p-5">
                <div className="mb-3.5 space-y-1">
                  <h2 className="text-base font-bold text-text-primary">
                    {t("patient.pay.methods.title")}
                  </h2>
                  <p className="text-xs text-text-secondary">
                    {t("patient.pay.methods.subtitle")}
                  </p>
                </div>

                <div
                  role="radiogroup"
                  aria-label={t("patient.pay.methods.title")}
                  className="space-y-2.5"
                >
                  {gatewayAvailable ? (
                    <button
                      type="button"
                      role="radio"
                      aria-checked={activeMethodKey === CARD_METHOD_KEY}
                      onClick={() => {
                        setSelectedMethodKey(CARD_METHOD_KEY);
                        setManualFeedback(null);
                      }}
                      className={`flex w-full items-center justify-between gap-3 rounded-xl border p-3.5 text-start transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                        activeMethodKey === CARD_METHOD_KEY
                          ? "border-2 border-primary bg-primary-light/25 shadow-sm"
                          : "border-border-light bg-white hover:border-primary/40 hover:bg-surface-tertiary/60"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                            activeMethodKey === CARD_METHOD_KEY
                              ? "bg-primary text-white"
                              : "bg-surface-tertiary text-text-secondary"
                          }`}
                        >
                          <CreditCard className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-text-primary">
                            {t("patient.pay.methods.cardTitle")}
                          </div>
                          <div className="mt-0.5 text-xs text-text-secondary">
                            {t("patient.pay.methods.cardSubtitle")}
                          </div>
                        </div>
                      </div>
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                          activeMethodKey === CARD_METHOD_KEY
                            ? "border-primary bg-primary text-white"
                            : "border-border-light bg-white"
                        }`}
                      >
                        {activeMethodKey === CARD_METHOD_KEY ? (
                          <Check className="h-3 w-3" />
                        ) : null}
                      </span>
                    </button>
                  ) : null}

                  {manualMethods.map((method) => {
                    const methodName =
                      locale === "ar" ? method.displayNameAr : method.displayNameEn;
                    const isSelected = activeMethodKey === method.id;

                    return (
                      <button
                        key={method.id}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => {
                          setSelectedMethodKey(method.id);
                          setManualFeedback(null);
                        }}
                        className={`flex w-full items-center justify-between gap-3 rounded-xl border p-3.5 text-start transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                          isSelected
                            ? "border-2 border-primary bg-primary-light/25 shadow-sm"
                            : "border-border-light bg-white hover:border-primary/40 hover:bg-surface-tertiary/60"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                              isSelected
                                ? "bg-primary text-white"
                                : "bg-surface-tertiary text-text-secondary"
                            }`}
                          >
                            {getMethodIcon(method.type)}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-text-primary">
                              {methodName}
                            </div>
                            <div className="mt-0.5 text-xs text-text-secondary">
                              {t("patient.pay.methods.transferSubtitle")}
                            </div>
                          </div>
                        </div>
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                            isSelected
                              ? "border-primary bg-primary text-white"
                              : "border-border-light bg-white"
                          }`}
                        >
                          {isSelected ? <Check className="h-3 w-3" /> : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </aside>

              {/* Selected Payment Method Details Panel (Left/Main side in RTL, Right side in LTR, Bottom on Mobile) */}
              <div className="app-panel rounded-2xl border border-border-light bg-white p-5 sm:p-6">
                {activeMethodKey === CARD_METHOD_KEY && gatewayAvailable ? (
                  <div className="space-y-6">
                    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border-light pb-5">
                      <div className="flex items-center gap-3.5">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-light/40 text-primary">
                          <CreditCard className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-text-primary">
                            {t("patient.pay.methods.cardTitle")}
                          </h3>
                          <p className="mt-0.5 text-xs text-text-secondary">
                            {t("patient.pay.methods.cardSubtitle")}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-xl border border-primary/20 bg-primary-light/20 px-4 py-2.5 text-end">
                        <div className="text-[11px] font-medium text-text-secondary">
                          {t("patient.pay.amount")}
                        </div>
                        <div className="text-lg font-bold text-primary" dir="ltr">
                          {amountLabel}
                        </div>
                      </div>
                    </div>

                    <p className="text-sm leading-relaxed text-text-secondary">
                      {t("patient.pay.methods.cardDescription")}
                    </p>

                    <div className="flex items-start gap-3 rounded-xl border border-border-light bg-surface-tertiary p-4">
                      <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                      <p className="text-xs leading-relaxed text-text-secondary">
                        {t("patient.pay.methods.cardTrust")}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleCardCheckout}
                      disabled={isRedirecting}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isRedirecting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ExternalLink className="h-4 w-4" />
                      )}
                      <span>{t("patient.pay.methods.cardCta")}</span>
                    </button>
                  </div>
                ) : selectedManualMethod ? (
                  <div className="space-y-6">
                    {(() => {
                      const methodDisplayName =
                        locale === "ar"
                          ? selectedManualMethod.displayNameAr
                          : selectedManualMethod.displayNameEn;
                      const methodInstructions =
                        locale === "ar"
                          ? selectedManualMethod.instructionsAr
                          : selectedManualMethod.instructionsEn;

                      return (
                        <>
                          {/* Method Header & Amount */}
                          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border-light pb-5">
                            <div className="flex items-center gap-3.5">
                              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-light/40 text-primary">
                                {getMethodIcon(selectedManualMethod.type)}
                              </div>
                              <div>
                                <h3 className="text-lg font-bold text-text-primary">
                                  {methodDisplayName}
                                </h3>
                                <p className="mt-0.5 text-xs text-text-secondary">
                                  {t("patient.pay.manual.title")}
                                </p>
                              </div>
                            </div>

                            <div className="rounded-xl border border-primary/20 bg-primary-light/20 px-4 py-2.5 text-end">
                              <div className="text-[11px] font-medium text-text-secondary">
                                {t("patient.pay.amount")}
                              </div>
                              <div className="text-lg font-bold text-primary" dir="ltr">
                                {amountLabel}
                              </div>
                            </div>
                          </div>

                          {/* Destination Account Info */}
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-xl border border-primary/20 bg-primary-light/15 p-4">
                              <div className="text-xs font-medium text-text-secondary">
                                {t("patient.pay.manual.accountIdentifier")}
                              </div>
                              <div className="mt-1.5 flex items-center justify-between gap-2">
                                <span
                                  className="break-all font-mono text-base font-bold text-text-primary"
                                  dir="ltr"
                                >
                                  {selectedManualMethod.accountIdentifier}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleCopyIdentifier(
                                      selectedManualMethod.accountIdentifier,
                                    )
                                  }
                                  className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border-light bg-white px-2.5 py-1 text-xs font-semibold text-text-secondary transition hover:border-primary/30 hover:text-primary"
                                >
                                  {copiedIdentifier ? (
                                    <>
                                      <Check className="h-3.5 w-3.5 text-success" />
                                      <span>{t("patient.pay.methods.copied")}</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="h-3.5 w-3.5" />
                                      <span>{t("patient.pay.methods.copy")}</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>

                            <div className="rounded-xl border border-border-light bg-surface-tertiary p-4">
                              <div className="text-xs font-medium text-text-secondary">
                                {t("patient.pay.manual.accountHolder")}
                              </div>
                              <div className="mt-1.5 text-base font-bold text-text-primary">
                                {selectedManualMethod.accountHolderName}
                              </div>
                            </div>
                          </div>

                          {methodInstructions ? (
                            <div className="rounded-xl border border-border-light bg-surface-tertiary p-4 text-sm leading-relaxed text-text-secondary whitespace-pre-wrap">
                              {methodInstructions}
                            </div>
                          ) : null}

                          {/* Clear Next Steps */}
                          <div className="rounded-xl border border-border-light bg-surface-tertiary/70 p-4">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                              {t("patient.pay.manual.stepsTitle")}
                            </h4>
                            <ol className="mt-3 space-y-2 text-sm text-text-secondary">
                              <li className="flex items-start gap-2.5">
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                                  1
                                </span>
                                <span>
                                  {t("patient.pay.manual.step1", {
                                    method: methodDisplayName,
                                  })}
                                </span>
                              </li>
                              <li className="flex items-start gap-2.5">
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                                  2
                                </span>
                                <span>{t("patient.pay.manual.step2")}</span>
                              </li>
                              <li className="flex items-start gap-2.5">
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                                  3
                                </span>
                                <span>{t("patient.pay.manual.step3")}</span>
                              </li>
                              <li className="flex items-start gap-2.5">
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                                  4
                                </span>
                                <span>{t("patient.pay.manual.step4")}</span>
                              </li>
                            </ol>
                          </div>

                          {/* Proof Upload Form */}
                          <div className="space-y-4 border-t border-border-light pt-5">
                            <div>
                              <label className="mb-1.5 block text-xs font-semibold text-text-primary">
                                {t("patient.pay.manual.senderName")}
                              </label>
                              <input
                                value={senderAccountName}
                                onChange={(event) => setSenderAccountName(event.target.value)}
                                placeholder={t("patient.pay.manual.senderName")}
                                className="h-11 w-full rounded-xl border border-border-light bg-white px-3.5 text-sm text-text-primary focus:border-primary focus:outline-none"
                              />
                            </div>

                            <div>
                              <label
                                htmlFor={fileInputId}
                                className="mb-1.5 block text-xs font-semibold text-text-primary"
                              >
                                {t("patient.pay.manual.proofLabel")}
                              </label>
                              <label
                                htmlFor={fileInputId}
                                className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed border-border-light bg-surface-tertiary/60 px-4 py-3.5 text-sm transition hover:border-primary/40 hover:bg-primary-light/10"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <Upload className="h-4 w-4 shrink-0 text-primary" />
                                  <span className="truncate font-medium text-text-primary">
                                    {manualProof
                                      ? manualProof.name
                                      : t("patient.pay.manual.chooseFile")}
                                  </span>
                                </div>
                                <span className="shrink-0 rounded-lg border border-border-light bg-white px-3 py-1 text-xs font-semibold text-primary">
                                  {manualProof
                                    ? t("patient.pay.manual.changeFile")
                                    : t("patient.pay.manual.chooseFile")}
                                </span>
                              </label>
                              <input
                                id={fileInputId}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={(event) =>
                                  setManualProof(event.target.files?.[0] ?? null)
                                }
                                className="sr-only"
                              />
                              <p className="mt-1 text-xs text-text-muted">
                                {t("patient.pay.manual.proofHint")}
                              </p>
                            </div>

                            <div>
                              <label className="mb-1.5 block text-xs font-semibold text-text-primary">
                                {t("patient.pay.manual.notes")}
                              </label>
                              <textarea
                                value={manualNotes}
                                onChange={(event) => setManualNotes(event.target.value)}
                                placeholder={t("patient.pay.manual.notes")}
                                className="min-h-20 w-full rounded-xl border border-border-light bg-white px-3.5 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none"
                              />
                            </div>

                            {manualFeedback ? (
                              <div
                                className={`rounded-xl border px-4 py-3 text-xs font-semibold ${
                                  manualFeedback.tone === "error"
                                    ? "border-error-500/30 bg-error-50 text-error-700"
                                    : "border-success/30 bg-success-light text-success"
                                }`}
                              >
                                {manualFeedback.message}
                              </div>
                            ) : null}

                            <button
                              type="button"
                              disabled={manualSubmitting}
                              onClick={() => void handleManualSubmit()}
                              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {manualSubmitting ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  <span>{t("patient.pay.manual.submitting")}</span>
                                </>
                              ) : (
                                <span>{t("patient.pay.manual.submit")}</span>
                              )}
                            </button>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
