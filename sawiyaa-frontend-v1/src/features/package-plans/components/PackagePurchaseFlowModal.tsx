"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CheckCircle2, Sparkles, X } from "lucide-react";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import { Link } from "@/i18n/navigation";
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "@/components/ui/modal";
import { StateCard } from "@/components/shared/ContentStates";
import { Skeleton } from "@/components/shared/LoadingStates";
import { toAppError } from "@/lib/api/errors";
import { useAuthStore } from "@/stores/auth-store";
import StripePaymentForm from "@/features/payments/components/StripePaymentForm";
import RefundPolicyAcceptanceCard from "@/features/refund-policies/components/RefundPolicyAcceptanceCard";
import { REFUND_POLICY_ERROR_CODES } from "@/features/refund-policies/lib/refund-policy-errors";
import { useRefundPolicy } from "@/features/refund-policies/hooks/use-refund-policies";
import type { PractitionerProfile } from "@/features/practitioner-profile/types/profile";
import { formatDurationLabel, formatPercent } from "../lib/package-plan-display";
import { MoneyText } from "@/components/money/MoneyText";
import { mapPackageQuoteMoney } from "../lib/package-money";
import {
  formatDayLabel,
  formatTimeLabel,
  normalizeUtcIso,
} from "@/features/practitioner-profile/lib/availability-slot-utils";
import {
  useCreatePackagePurchase,
  useInitiatePackagePurchasePayment,
} from "../hooks/use-package-purchases";
import { usePatientPackagePlanQuoteQuery } from "../hooks/use-package-plans";
import type { PackagePlanQuotedItem } from "../types/package-plans.types";
import type { PatientPackagePurchaseItem } from "../types/package-purchases.types";
import PackagePurchaseSlotPicker from "./PackagePurchaseSlotPicker";
import type { SelectableSlot } from "@/features/practitioner-profile/lib/availability-slot-utils";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  slug: string;
  profile: PractitionerProfile;
  plans: PackagePlanQuotedItem[];
  initialPlanCode: string | null;
};

type PurchaseStep = "choose-package" | "choose-times" | "review" | "pay";

function sortPlans(plans: PackagePlanQuotedItem[]) {
  return [...plans].sort((a, b) => a.item.sortOrder - b.item.sortOrder);
}

function QuoteMoney({ amount, currencyCode }: { amount: string; currencyCode: string | null }) {
  const money = mapPackageQuoteMoney({ amount, selectedCurrencyCode: currencyCode });
  return money ? <MoneyText money={money} /> : <>Price unavailable</>;
}

function StepBadge({
  active,
  complete,
  label,
}: {
  active: boolean;
  complete: boolean;
  label: string;
}) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
        complete
          ? "border-primary bg-primary/10 text-primary"
          : active
            ? "border-primary/30 bg-white text-primary shadow-sm"
            : "border-border-light bg-white text-text-muted"
      }`}
    >
      {complete ? <CheckCircle2 size={12} /> : null}
      <span>{label}</span>
    </div>
  );
}

export default function PackagePurchaseFlowModal({
  isOpen,
  onClose,
  slug,
  profile,
  plans,
  initialPlanCode,
}: Props) {
  const t = useTranslations("practitioner-profile");
  const locale = useLocale();
  const numLocale = locale === "ar" ? "ar-SA" : "en-US";
  const { user } = useAuthStore();
  const isPatient = user?.role === "PATIENT";

  const availableDurations = [30, 60] as const;

  const packageOptions = useMemo(() => sortPlans(plans), [plans]);
  const initialPlan = useMemo(() => {
    if (!packageOptions.length) return null;
    return (
      packageOptions.find((item) => item.item.code === initialPlanCode) ?? packageOptions[0] ?? null
    );
  }, [initialPlanCode, packageOptions]);

  const [step, setStep] = useState<PurchaseStep>("choose-package");
  const [selectedPlanCode, setSelectedPlanCode] = useState<string | null>(initialPlan?.item.code ?? null);
  const [selectedDuration, setSelectedDuration] = useState<30 | 60>(60);
  const [selectedSlots, setSelectedSlots] = useState<SelectableSlot[]>([]);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [initiateError, setInitiateError] = useState<string | null>(null);
  const [policyNotice, setPolicyNotice] = useState<string | null>(null);
  const [acceptedRefundPolicyId, setAcceptedRefundPolicyId] = useState<string | null>(null);
  const [paymentClientSecret, setPaymentClientSecret] = useState<string | null>(null);
  const [paymentReturnUrl, setPaymentReturnUrl] = useState("");
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [createdPurchase, setCreatedPurchase] = useState<PatientPackagePurchaseItem | null>(null);

  const createPurchase = useCreatePackagePurchase();
  const initiatePayment = useInitiatePackagePurchasePayment();

  const defaultDuration = 60;
  const effectiveDuration: 30 | 60 = availableDurations.includes(selectedDuration)
    ? selectedDuration
    : defaultDuration;
  const effectivePlanCode =
    (selectedPlanCode && packageOptions.some((item) => item.item.code === selectedPlanCode)
      ? selectedPlanCode
      : packageOptions[0]?.item.code) ?? null;
  const selectedPlan = useMemo(() => {
    if (!packageOptions.length) return null;
    return packageOptions.find((item) => item.item.code === effectivePlanCode) ?? packageOptions[0] ?? null;
  }, [effectivePlanCode, packageOptions]);

  const quoteInput = useMemo(() => {
    if (!selectedPlan) return null;
    return {
      packagePlanCode: selectedPlan.item.code,
      practitionerSlug: slug,
      durationMinutes: effectiveDuration,
      sessionMode: "VIDEO" as const,
    };
  }, [effectiveDuration, selectedPlan, slug]);

  const quoteQuery = usePatientPackagePlanQuoteQuery(quoteInput);
  const quoteItem = quoteQuery.data?.item ?? null;
  const quote = quoteItem?.quote ?? null;
  const quoteCurrency = quote?.selectedCurrencyCode ?? null;
  const requiredCount = quote?.sessionCount ?? selectedPlan?.item.sessionCount ?? 0;
  const quoteError = quoteQuery.error ? toAppError(quoteQuery.error) : null;
  const currencyUnavailable = quoteError?.code === "PACKAGE_PLAN_CURRENCY_PRICE_UNAVAILABLE";
  const currentQuotePlan = quoteItem?.item ?? selectedPlan?.item ?? null;
  const purchaseNetAmount = quote?.patientPayableTotal ?? createdPurchase?.patientPayableTotal ?? "0";
  const practitionerName = locale === "ar" ? profile.nameAr || profile.nameEn : profile.nameEn || profile.nameAr;
  const selectedSlotsPreview = useMemo(
    () => [...selectedSlots].sort((left, right) => left.startsAt.localeCompare(right.startsAt)),
    [selectedSlots],
  );

  const {
    data: packageRefundPolicyData,
    isLoading: packageRefundPolicyLoading,
    error: packageRefundPolicyError,
    refetch: refetchPackageRefundPolicy,
  } = useRefundPolicy("PACKAGE", {
    enabled: isOpen && isPatient && profile.acceptsPackage !== false,
  });
  const packageRefundPolicy = packageRefundPolicyData?.item ?? null;
  const packageRefundPolicyAppError = packageRefundPolicyError ? toAppError(packageRefundPolicyError) : null;
  const packagePolicyReady = Boolean(packageRefundPolicy && packageRefundPolicy.isActive);
  const reviewActionDisabled =
    createPurchase.isPending ||
    initiatePayment.isPending ||
    selectedSlots.length !== requiredCount ||
    !quote ||
    packageRefundPolicyLoading ||
    !packagePolicyReady ||
    acceptedRefundPolicyId !== packageRefundPolicy?.id;
  const reviewActionHelper = !packagePolicyReady
    ? t("packages.flow.errors.policyUnavailable")
    : acceptedRefundPolicyId === packageRefundPolicy?.id
      ? ""
      : t("packages.flow.errors.policyRequired");

  const stepLabels = [
    t("packages.flow.steps.choosePackage"),
    t("packages.flow.steps.chooseTimes"),
    t("packages.flow.steps.review"),
    t("packages.flow.steps.pay"),
  ] as const;

  const currentStepIndex = (() => {
    switch (step) {
      case "choose-package":
        return 0;
      case "choose-times":
        return 1;
      case "review":
        return 2;
      case "pay":
        return 3;
    }
  })();

  function handleSelectPlan(planCode: string) {
    setSelectedPlanCode(planCode);
    setStep("choose-package");
  }

  function handleDurationChange(duration: 30 | 60) {
    if (!availableDurations.includes(duration)) return;
    setSelectedDuration(duration);
    setStep("choose-package");
  }

  function handleClose() {
    setAcceptedRefundPolicyId(null);
    setPolicyNotice(null);
    setPurchaseError(null);
    setInitiateError(null);
    setIsRedirecting(false);
    setPaymentClientSecret(null);
    onClose();
  }

  function canProceedToReview() {
    return Boolean(quote && selectedSlots.length === requiredCount);
  }

  async function handleConfirmPurchase() {
    if (!quote || !selectedPlan || !isPatient) {
      setPurchaseError(t("packages.flow.errors.authRequired"));
      return;
    }

    if (selectedSlots.length !== requiredCount) {
      setPurchaseError(t("packages.flow.errors.slotCountMismatch", { total: requiredCount }));
      return;
    }

    if (!packageRefundPolicy || packageRefundPolicyAppError?.code === REFUND_POLICY_ERROR_CODES.activeNotFound) {
      setPurchaseError(t("packages.flow.errors.policyUnavailable"));
      return;
    }

    if (acceptedRefundPolicyId !== packageRefundPolicy.id) {
      setPurchaseError(t("packages.flow.errors.policyRequired"));
      return;
    }

    setPurchaseError(null);
    setInitiateError(null);

    let purchaseId: string | null = null;
    const purchaseDuration = effectiveDuration;

    try {
      const purchaseResponse = await createPurchase.mutateAsync({
        packagePlanCode: selectedPlan.item.code,
        practitionerSlug: slug,
        durationMinutes: purchaseDuration,
        sessionMode: "VIDEO",
        selectedSessionSlots: selectedSlots.map((slot) => ({
          scheduledStartAt: normalizeUtcIso(slot.startsAt),
        })),
      });

      purchaseId = purchaseResponse.item.id;
      setCreatedPurchase(purchaseResponse.item);

      const paymentResponse = await initiatePayment.mutateAsync({
        purchaseId,
        input: {
          acceptedRefundPolicyId: acceptedRefundPolicyId ?? "",
          returnUrl: typeof window !== "undefined" ? window.location.href : undefined,
        },
      });
      const payment = paymentResponse.item;

      if (payment.checkoutUrl) {
        setIsRedirecting(true);
        window.location.assign(payment.checkoutUrl);
        return;
      }

      if (payment.clientSecret) {
        setPaymentClientSecret(payment.clientSecret);
        setPaymentReturnUrl(typeof window !== "undefined" ? window.location.href : "");
        setStep("pay");
        return;
      }

      setInitiateError(t("packages.flow.errors.paymentMissingRedirect"));
    } catch (error) {
      const appError = toAppError(error);
      if (appError.code === "PACKAGE_PURCHASE_SLOT_CONFLICT") {
        setPurchaseError(t("packages.flow.errors.slotConflict"));
        return;
      }
      if (appError.code === "PACKAGE_PLAN_CURRENCY_PRICE_UNAVAILABLE") {
        setPurchaseError(t("packages.flow.errors.currencyUnavailable"));
        return;
      }
      if (appError.code === REFUND_POLICY_ERROR_CODES.staleAcceptance) {
        setPolicyNotice(t("packages.flow.errors.policyStale"));
        setAcceptedRefundPolicyId(null);
        void refetchPackageRefundPolicy();
        return;
      }
      if (appError.code === REFUND_POLICY_ERROR_CODES.wrongType) {
        setPolicyNotice(t("packages.flow.errors.policyValidation"));
        setAcceptedRefundPolicyId(null);
        return;
      }
      if (appError.code === REFUND_POLICY_ERROR_CODES.activeNotFound) {
        setPolicyNotice(t("packages.flow.errors.policyUnavailable"));
        setAcceptedRefundPolicyId(null);
        return;
      }
      if (appError.statusCode === 409) {
        setInitiateError(t("packages.flow.errors.conflict"));
        return;
      }

      if (!purchaseId) {
        setPurchaseError(t("packages.flow.errors.createFailed"));
      } else {
        setInitiateError(t("packages.flow.errors.paymentFailed"));
      }
    }
  }

  if (!isOpen) return null;

  if (profile.acceptsPackage === false) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} size="lg">
        <ModalHeader
          eyebrow={t("packages.flow.eyebrow")}
          title={t("packages.flow.disabledTitle")}
          description={t("packages.flow.disabledSubtitle")}
        />
        <ModalBody>
          <StateCard
            title={t("packages.flow.disabledEmptyTitle")}
            note={t("packages.flow.disabledEmptyNote")}
          />
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={handleClose}>
            {t("packages.flow.close")}
          </Button>
        </ModalFooter>
      </Modal>
    );
  }

  if (!packageOptions.length) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="2xl">
      <div className="flex max-h-[calc(100vh-2rem)] flex-col">
        <ModalHeader
          eyebrow={t("packages.flow.eyebrow")}
          title={t("packages.flow.title")}
          description={t("packages.flow.subtitle")}
        >
          <div className="mt-4 flex flex-wrap gap-2">
            {stepLabels.map((label, index) => (
              <StepBadge
                key={label}
                active={index === currentStepIndex}
                complete={index < currentStepIndex}
                label={`${index + 1}. ${label}`}
              />
            ))}
          </div>
        </ModalHeader>

        <ModalBody className="space-y-5">
          {!isPatient ? (
            <StateCard
              title={t("packages.flow.authTitle")}
              note={t("packages.flow.authNote")}
              action={{
                label: t("packages.flow.signInToContinue"),
                href: (
                  <Link
                  href="/signin?mode=patient"
                    className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover"
                  >
                    {t("packages.flow.signInToContinue")}
                  </Link>
                ),
              }}
            />
          ) : null}

          {step === "choose-package" ? (
            <section className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                {packageOptions.map((plan) => {
                  const active = plan.item.code === selectedPlanCode;
                  return (
                    <button
                      key={plan.item.code}
                      type="button"
                      onClick={() => handleSelectPlan(plan.item.code)}
                      className={`rounded-[24px] border p-4 text-start transition ${
                        active
                          ? "border-primary bg-primary-light shadow-sm dark:bg-primary/10"
                          : "border-border-light bg-white hover:border-primary/40 dark:bg-surface-secondary"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                            {plan.item.code}
                          </p>
                          <h3 className="mt-1 text-base font-semibold text-text-primary dark:text-white/90">
                            {plan.item.title}
                          </h3>
                        </div>
                        <Badge variant="solid" color="primary" size="sm">
                          {formatPercent(plan.quote.discountPercent)}
                        </Badge>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-text-secondary">
                        {plan.item.description}
                      </p>
                      <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-white/80 px-3 py-2 text-xs dark:bg-white/5">
                        <span className="text-text-muted">{t("packages.plan.sessionCount")}</span>
                        <span className="font-semibold text-text-primary dark:text-white/90">
                          {plan.item.sessionCount} {t("packages.plan.sessions")}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="grid gap-3 rounded-[28px] border border-border-light bg-surface p-4 dark:bg-white/5 md:grid-cols-3">
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                    {t("packages.flow.duration")}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {([30, 60] as const).map((duration) => {
                      const enabled = availableDurations.includes(duration);
                      const active = duration === selectedDuration;
                      return (
                        <button
                          key={duration}
                          type="button"
                          disabled={!enabled}
                          onClick={() => handleDurationChange(duration)}
                          className={`inline-flex items-center justify-center rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                            active
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border-light bg-white text-text-secondary hover:border-primary/40 hover:text-primary dark:bg-white/5"
                          } ${enabled ? "" : "cursor-not-allowed opacity-45"}`}
                        >
                          {duration === 30 ? t("booking.duration30") : t("booking.duration60")}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                    {t("packages.flow.sessionMode")}
                  </p>
                  <Badge variant="light" color="info" size="sm" startIcon={<Sparkles size={14} />}>
                    {t("packages.flow.videoOnly")}
                  </Badge>
                </div>
              </div>

              {quoteQuery.isLoading ? (
                <div className="grid gap-3 rounded-[28px] border border-border-light bg-surface p-4 dark:bg-white/5 md:grid-cols-3">
                  <Skeleton className="h-20 rounded-2xl" />
                  <Skeleton className="h-20 rounded-2xl" />
                  <Skeleton className="h-20 rounded-2xl" />
                </div>
              ) : quote ? (
                <div className="rounded-[28px] border border-border-light bg-white p-4 dark:bg-surface-secondary">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                        {t("packages.flow.previewHeading")}
                      </p>
                      <h4 className="mt-1 text-lg font-semibold text-text-primary dark:text-white/90">
                        {currentQuotePlan?.title ?? selectedPlan?.item.title ?? ""}
                      </h4>
                    </div>
                    <Badge variant="solid" color="primary" size="sm">
                      {formatPercent(quote.discountPercent)}
                    </Badge>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl bg-surface px-4 py-3 dark:bg-white/5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                        {t("packages.quote.baseSessionPrice")}
                      </p>
                      <p className="mt-1 text-base font-semibold text-text-primary dark:text-white/90">
                        <QuoteMoney amount={quote.selectedBaseSessionPrice} currencyCode={quoteCurrency} />
                      </p>
                    </div>
                    <div className="rounded-2xl bg-surface px-4 py-3 dark:bg-white/5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                        {t("packages.quote.regularTotal")}
                      </p>
                      <p className="mt-1 text-base font-semibold text-text-primary dark:text-white/90">
                        <QuoteMoney amount={quote.undiscountedTotal} currencyCode={quoteCurrency} />
                      </p>
                    </div>
                    <div className="rounded-2xl bg-surface px-4 py-3 dark:bg-white/5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                        {t("packages.quote.discountAmount")}
                      </p>
                      <p className="mt-1 text-base font-semibold text-success-700 dark:text-success-300">
                        <QuoteMoney amount={quote.discountAmount} currencyCode={quoteCurrency} />
                      </p>
                    </div>
                    <div className="rounded-2xl bg-primary-light px-4 py-3 dark:bg-primary/10">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                        {t("packages.quote.payableTotal")}
                      </p>
                      <p className="mt-1 text-lg font-bold text-primary">
                        <QuoteMoney amount={quote.patientPayableTotal} currencyCode={quoteCurrency} />
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-text-muted">
                    <span>{selectedPlan?.item.code ?? ""}</span>
                    <span>•</span>
                    <span>{formatDurationLabel(quote.durationMinutes)}</span>
                    <span>•</span>
                    <span>{quoteCurrency}</span>
                  </div>
                </div>
              ) : quoteError ? (
                <StateCard
                  title={
                    currencyUnavailable
                      ? t("packages.errors.currencyUnavailable")
                      : t("packages.errors.loadFailed")
                  }
                  note={
                    currencyUnavailable
                      ? t("packages.errors.currencyUnavailableHint")
                      : t("packages.errors.loadFailedHint")
                  }
                  action={{
                    label: t("packages.retry"),
                    onClick: () => quoteQuery.refetch(),
                  }}
                />
              ) : null}
            </section>
          ) : null}

          {step === "choose-times" && quote ? (
            <section className="space-y-4">
              <div className="grid gap-3 rounded-[28px] border border-border-light bg-surface p-4 dark:bg-white/5 md:grid-cols-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                    {t("packages.flow.selectedPackage")}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-text-primary dark:text-white/90">
                    {selectedPlan?.item.title ?? ""}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                    {t("packages.flow.selectedDuration")}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-text-primary dark:text-white/90">
                    {formatDurationLabel(selectedDuration)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                    {t("packages.flow.selectedCurrency")}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-text-primary dark:text-white/90">
                    {quoteCurrency ?? t("packages.errors.currencyUnavailable")}
                  </p>
                </div>
              </div>

              <PackagePurchaseSlotPicker
                slug={slug}
                durationMinutes={selectedDuration}
                requiredCount={requiredCount}
                selectedSlots={selectedSlots}
                onChange={setSelectedSlots}
              />
            </section>
          ) : null}

          {step === "review" && quote ? (
            <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
              <div className="space-y-4">
                <div className="rounded-[28px] border border-border-light bg-white p-4 shadow-sm dark:bg-surface-secondary">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                        {t("packages.flow.reviewHeading")}
                      </p>
                      <h4 className="text-lg font-semibold text-text-primary dark:text-white/90">
                        {selectedPlan?.item.title ?? ""}
                      </h4>
                      {practitionerName ? (
                        <p className="text-sm text-text-secondary">
                          {t("packages.flow.practitioner")}: {practitionerName}
                        </p>
                      ) : null}
                    </div>
                    <Badge variant="solid" color="primary" size="sm">
                      {t("packages.flow.slotProgress", {
                        selected: selectedSlots.length,
                        total: requiredCount,
                      })}
                    </Badge>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl bg-surface px-4 py-3 dark:bg-white/5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                        {t("packages.plan.sessionCount")}
                      </p>
                      <p className="mt-1 text-base font-semibold text-text-primary dark:text-white/90">
                        {selectedPlan?.item.sessionCount} {t("packages.plan.sessions")}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-surface px-4 py-3 dark:bg-white/5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                        {t("packages.flow.selectedDuration")}
                      </p>
                      <p className="mt-1 text-base font-semibold text-text-primary dark:text-white/90">
                        {formatDurationLabel(selectedDuration)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-surface px-4 py-3 dark:bg-white/5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                        {t("packages.flow.selectedCurrency")}
                      </p>
                      <p className="mt-1 text-base font-semibold text-text-primary dark:text-white/90">
                        {quoteCurrency ? t(`packages.currency.${quoteCurrency}`) : t("packages.errors.currencyUnavailable")}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-primary-light px-4 py-3 dark:bg-primary/10">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                        {t("packages.quote.discount")}
                      </p>
                      <p className="mt-1 text-lg font-bold text-primary">
                        {formatPercent(quote.discountPercent)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-border-light bg-surface p-4 dark:bg-white/5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                        {t("packages.flow.selectedSessions")}
                      </p>
                      <p className="mt-1 text-sm text-text-secondary">
                        {t("packages.flow.chosenSlots")}
                      </p>
                    </div>
                    <Badge variant="light" color="info" size="sm">
                      {t("packages.flow.slotProgress", {
                        selected: selectedSlotsPreview.length,
                        total: requiredCount,
                      })}
                    </Badge>
                  </div>

                  <ol className="mt-4 space-y-3">
                    {selectedSlotsPreview.map((slot, index) => (
                      <li
                        key={slot.startsAt}
                        className="rounded-[20px] border border-border-light bg-white px-4 py-3 dark:bg-surface-secondary"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                              {index + 1} / {requiredCount}
                            </p>
                            <p className="text-sm font-semibold text-text-primary dark:text-white/90">
                              {formatDayLabel(slot.startsAt, numLocale)}
                            </p>
                            <p className="text-sm text-text-secondary">
                              {formatTimeLabel(slot.startsAt, numLocale)} • {formatDurationLabel(selectedDuration)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedSlots((current) =>
                                current.filter((selected) => selected.startsAt !== slot.startsAt),
                              )
                            }
                            className="inline-flex items-center gap-2 rounded-full border border-border-light bg-white px-3 py-2 text-xs font-semibold text-text-primary transition hover:border-primary/40 hover:text-primary dark:bg-white/5"
                          >
                            <X size={12} />
                            {t("packages.flow.removeSlot")}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="rounded-[28px] border border-border-light bg-white p-4 dark:bg-surface-secondary">
                  <p className="text-sm font-semibold text-text-primary dark:text-white/90">
                    {t("packages.flow.previewHeading")}
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl bg-surface px-4 py-3 dark:bg-white/5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                        {t("packages.quote.baseSessionPrice")}
                      </p>
                      <p className="mt-1 text-base font-semibold text-text-primary dark:text-white/90">
                        <QuoteMoney amount={quote.selectedBaseSessionPrice} currencyCode={quoteCurrency} />
                      </p>
                    </div>
                    <div className="rounded-2xl bg-surface px-4 py-3 dark:bg-white/5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                        {t("packages.quote.regularTotal")}
                      </p>
                      <p className="mt-1 text-base font-semibold text-text-primary dark:text-white/90">
                        <QuoteMoney amount={quote.undiscountedTotal} currencyCode={quoteCurrency} />
                      </p>
                    </div>
                    <div className="rounded-2xl bg-surface px-4 py-3 dark:bg-white/5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                        {t("packages.quote.discountAmount")}
                      </p>
                      <p className="mt-1 text-base font-semibold text-success-700 dark:text-success-300">
                        <QuoteMoney amount={quote.discountAmount} currencyCode={quoteCurrency} />
                      </p>
                    </div>
                    <div className="rounded-2xl bg-primary-light px-4 py-3 dark:bg-primary/10">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                        {t("packages.quote.payableTotal")}
                      </p>
                      <p className="mt-1 text-lg font-bold text-primary">
                        <QuoteMoney amount={quote.patientPayableTotal} currencyCode={quoteCurrency} />
                      </p>
                    </div>
                  </div>
                </div>

                <RefundPolicyAcceptanceCard
                  policyType="PACKAGE"
                  policy={packageRefundPolicy}
                  isLoading={packageRefundPolicyLoading}
                  error={packageRefundPolicyError}
                  acceptedPolicyId={acceptedRefundPolicyId}
                  onAcceptedPolicyIdChange={setAcceptedRefundPolicyId}
                  onRetry={() => void refetchPackageRefundPolicy()}
                  presentation="inline"
                />

                {policyNotice ? (
                  <p className="rounded-2xl border border-warning-200 bg-warning-50 px-4 py-3 text-xs leading-6 text-warning-800 dark:border-warning-400/30 dark:bg-warning-500/10 dark:text-warning-200">
                    {policyNotice}
                  </p>
                ) : null}

                {purchaseError ? <StateCard title={purchaseError} note={t("packages.flow.reviewRetryHint")} /> : null}
                {initiateError ? <StateCard title={initiateError} note={t("packages.flow.reviewRetryHint")} /> : null}
              </div>

              <aside className="space-y-4 lg:sticky lg:top-4">
                <div className="rounded-[28px] border border-border-light bg-primary-light/35 p-4 shadow-sm dark:bg-primary/10">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                    {t("packages.quote.payableTotal")}
                  </p>
                  <p className="mt-2 text-3xl font-bold text-primary">
                    <QuoteMoney amount={quote.patientPayableTotal} currencyCode={quoteCurrency} />
                  </p>
                  <p className="mt-2 text-sm text-text-secondary">
                    {t("packages.flow.slotProgress", {
                      selected: selectedSlotsPreview.length,
                      total: requiredCount,
                    })}
                  </p>

                  <Button
                    className="mt-4 w-full"
                    onClick={() => void handleConfirmPurchase()}
                    disabled={reviewActionDisabled}
                  >
                    {createPurchase.isPending || initiatePayment.isPending
                      ? t("packages.flow.processing")
                      : t("packages.flow.confirmPurchase")}
                  </Button>

                  {reviewActionHelper ? (
                    <p className="mt-3 text-xs leading-6 text-text-muted">
                      {reviewActionHelper}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs leading-6 text-text-muted">
                    {t("packages.flow.payNote")}
                  </p>
                </div>
              </aside>
            </section>
          ) : null}

          {step === "pay" && paymentClientSecret ? (
            <section className="space-y-4">
              <div className="rounded-[28px] border border-border-light bg-surface p-4 dark:bg-white/5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                  {t("packages.flow.payHeading")}
                </p>
                <p className="mt-1 text-sm font-semibold text-text-primary dark:text-white/90">
                  {selectedPlan?.item.title ?? ""}
                </p>
                <p className="mt-1 text-sm text-text-secondary">{t("packages.flow.payNote")}</p>
              </div>

              <StripePaymentForm
                clientSecret={paymentClientSecret}
                netPaidAmount={purchaseNetAmount}
                currency={quoteCurrency!.toUpperCase()}
                returnUrl={paymentReturnUrl || (typeof window !== "undefined" ? window.location.href : "")}
              />
            </section>
          ) : null}

          {isRedirecting ? (
            <StateCard
              title={t("packages.flow.redirectingTitle")}
              note={t("packages.flow.redirectingNote")}
            />
          ) : null}
        </ModalBody>

        <ModalFooter className="sticky bottom-0">
          <div className="flex w-full flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-text-muted">
              {quote ? (
                <span>
                  {t("packages.flow.slotProgress", {
                    selected: selectedSlots.length,
                    total: requiredCount,
                  })}
                </span>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              {step !== "choose-package" ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setPurchaseError(null);
                    setInitiateError(null);
                    if (step === "choose-times") setStep("choose-package");
                    if (step === "review") setStep("choose-times");
                    if (step === "pay") setStep("review");
                  }}
                >
                  {t("packages.flow.back")}
                </Button>
              ) : (
                  <Button variant="outline" onClick={handleClose}>
                    {t("packages.flow.close")}
                  </Button>
                )}

              {step === "choose-package" ? (
                <Button
                  onClick={() => setStep("choose-times")}
                  disabled={!selectedPlan || !quote || quoteQuery.isLoading}
                >
                  {t("packages.flow.continueToTimes")}
                </Button>
              ) : step === "choose-times" ? (
                <Button
                  onClick={() => setStep("review")}
                  disabled={!canProceedToReview()}
                >
                  {t("packages.flow.reviewButton")}
                </Button>
              ) : null}
            </div>
          </div>
        </ModalFooter>
      </div>
    </Modal>
  );
}
