"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import Button from "@/components/ui/button/Button";
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "@/components/ui/modal";
import StripePaymentForm from "@/features/payments/components/StripePaymentForm";
import RefundPolicyAcceptanceCard from "@/features/refund-policies/components/RefundPolicyAcceptanceCard";
import { MoneyText } from "@/components/money/MoneyText";
import { REFUND_POLICY_ERROR_CODES } from "@/features/refund-policies/lib/refund-policy-errors";
import { useRefundPolicy } from "@/features/refund-policies/hooks/use-refund-policies";
import { toAppError } from "@/lib/api/errors";
import { useInitiatePackagePurchasePayment } from "../hooks/use-package-purchases";
import { canContinuePackagePurchasePayment } from "../lib/package-purchase-display";
import { mapPackagePaymentSnapshotMoney, mapPackagePurchaseSnapshotMoney } from "../lib/package-money";
import type { PatientPackagePurchaseItem } from "../types/package-purchases.types";

type Props = {
  purchase: Pick<
    PatientPackagePurchaseItem,
    | "id"
    | "status"
    | "paymentExpiresAt"
    | "patientPayableTotal"
    | "selectedCurrencyCode"
    | "regionalPricingMode"
    | "resolvedCountryIsoCode"
  >;
  label: string;
  className?: string;
  size?: "sm" | "md";
};

export default function PackagePurchasePaymentAction({
  purchase,
  label,
  className = "",
  size = "sm",
}: Props) {
  const t = useTranslations("package-purchases");
  const tRefundPolicy = useTranslations("refund-policies");
  const initiatePayment = useInitiatePackagePurchasePayment();
  const [isConsentOpen, setIsConsentOpen] = useState(false);
  const [acceptedRefundPolicyId, setAcceptedRefundPolicyId] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentReturnUrl, setPaymentReturnUrl] = useState("");
  const [paymentAmount, setPaymentAmount] = useState<string | null>(null);
  const [paymentCurrency, setPaymentCurrency] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [policyNotice, setPolicyNotice] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const canContinue = useMemo(
    () => canContinuePackagePurchasePayment(purchase),
    [purchase],
  );

  const {
    data: refundPolicyData,
    isLoading: refundPolicyLoading,
    error: refundPolicyError,
    refetch: refetchRefundPolicy,
  } = useRefundPolicy("PACKAGE", {
    enabled: isConsentOpen && canContinue,
  });
  const refundPolicy = refundPolicyData?.item ?? null;
  const refundPolicyAppError = refundPolicyError ? toAppError(refundPolicyError) : null;
  const purchaseMoney = mapPackagePurchaseSnapshotMoney({
    amount: purchase.patientPayableTotal,
    selectedCurrencyCode: purchase.selectedCurrencyCode,
  });

  function openConsentModal() {
    setAcceptedRefundPolicyId(null);
    setClientSecret(null);
    setPaymentAmount(null);
    setPaymentCurrency(null);
    setPaymentReturnUrl("");
    setPaymentError(null);
    setPolicyNotice(null);
    setIsConsentOpen(true);
  }

  function closeConsentModal() {
    setIsConsentOpen(false);
    setAcceptedRefundPolicyId(null);
    setClientSecret(null);
    setPaymentAmount(null);
    setPaymentCurrency(null);
    setPaymentReturnUrl("");
    setPaymentError(null);
    setPolicyNotice(null);
    setIsRedirecting(false);
  }

  if (!canContinue) {
    return null;
  }

  async function handleContinuePayment() {
    setPaymentError(null);
    setPolicyNotice(null);

    if (!refundPolicy || refundPolicyAppError?.code === REFUND_POLICY_ERROR_CODES.activeNotFound) {
      setPaymentError(tRefundPolicy("card.blockedNote", { type: tRefundPolicy("types.package") }));
      return;
    }

    if (acceptedRefundPolicyId !== refundPolicy.id) {
      setPaymentError(tRefundPolicy("card.checkboxHint"));
      return;
    }

    try {
      const response = await initiatePayment.mutateAsync({
        purchaseId: purchase.id,
        input: {
          acceptedRefundPolicyId: acceptedRefundPolicyId ?? "",
          returnUrl: typeof window !== "undefined" ? window.location.href : undefined,
        },
      });
      const payment = response.item;

      if (payment.checkoutUrl) {
        setIsRedirecting(true);
        window.location.assign(payment.checkoutUrl);
        return;
      }

      if (payment.clientSecret) {
        const paymentMoney = mapPackagePaymentSnapshotMoney({
          amount: payment.amountTotal,
          currency: payment.currency,
        });
        if (!paymentMoney) {
          setPaymentError(t("payment.errors.startFailed"));
          return;
        }
        setPaymentAmount(paymentMoney.amount);
        setPaymentCurrency(paymentMoney.currencyCode);
        setPaymentReturnUrl(window.location.href);
        setClientSecret(payment.clientSecret);
        return;
      }

      setPaymentError(t("payment.errors.missingRedirect"));
    } catch (error) {
      const appError = toAppError(error);
      if (appError.code === REFUND_POLICY_ERROR_CODES.staleAcceptance) {
        setPolicyNotice(tRefundPolicy("card.staleNote", { type: tRefundPolicy("types.package") }));
        setAcceptedRefundPolicyId(null);
        void refetchRefundPolicy();
        return;
      }
      if (appError.code === REFUND_POLICY_ERROR_CODES.wrongType) {
        setPolicyNotice(tRefundPolicy("card.validationNote"));
        setAcceptedRefundPolicyId(null);
        return;
      }
      if (appError.code === REFUND_POLICY_ERROR_CODES.activeNotFound) {
        setPolicyNotice(tRefundPolicy("card.blockedNote", { type: tRefundPolicy("types.package") }));
        setAcceptedRefundPolicyId(null);
        return;
      }
      if (appError.statusCode === 401) {
        setPaymentError(t("errors.authRequired"));
        return;
      }
      setPaymentError(t("payment.errors.startFailed"));
    }
  }

  return (
    <>
      <Button
        size={size}
        onClick={openConsentModal}
        disabled={initiatePayment.isPending}
        className={className}
      >
        {initiatePayment.isPending ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            {t("payment.continueProcessing")}
          </>
        ) : (
          label
        )}
      </Button>

      <Modal
        isOpen={isConsentOpen}
        onClose={closeConsentModal}
        size="lg"
      >
        <div className="flex max-h-[calc(100vh-2rem)] flex-col">
          <ModalHeader
            eyebrow={t("payment.modalEyebrow")}
            title={t("payment.modalTitle")}
            description={t("payment.modalDescription")}
          />
          <ModalBody className="space-y-4">
            {clientSecret && paymentAmount && paymentCurrency ? (
              <StripePaymentForm
                clientSecret={clientSecret}
                netPaidAmount={paymentAmount}
                currency={paymentCurrency}
                returnUrl={
                  paymentReturnUrl ||
                  (typeof window !== "undefined" ? window.location.href : "")
                }
              />
            ) : (
              <>
                <div className="rounded-[24px] border border-border-light bg-surface px-4 py-4 dark:bg-white/5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                    {t("payment.summaryHeading")}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-text-primary dark:text-white/90">
                    {purchaseMoney ? <MoneyText money={purchaseMoney} /> : t("detail.fields.notAvailable")}
                  </p>
                </div>

                <RefundPolicyAcceptanceCard
                  policyType="PACKAGE"
                  policy={refundPolicy}
                  isLoading={refundPolicyLoading}
                  error={refundPolicyError}
                  acceptedPolicyId={acceptedRefundPolicyId}
                  onAcceptedPolicyIdChange={setAcceptedRefundPolicyId}
                  onRetry={() => void refetchRefundPolicy()}
                  presentation="inline"
                />

                {policyNotice ? (
                  <p className="rounded-2xl border border-warning-200 bg-warning-50 px-4 py-3 text-xs leading-6 text-warning-800 dark:border-warning-400/30 dark:bg-warning-500/10 dark:text-warning-200">
                    {policyNotice}
                  </p>
                ) : null}

                {paymentError ? (
                  <p className="rounded-2xl border border-error-200 bg-error-50 px-4 py-3 text-xs leading-6 text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-200">
                    {paymentError}
                  </p>
                ) : null}
              </>
            )}

            {isRedirecting ? (
              <p className="rounded-2xl border border-border-light bg-surface-tertiary px-4 py-3 text-sm text-text-secondary dark:bg-white/5">
                {t("payment.redirecting")}
              </p>
            ) : null}
          </ModalBody>
          <ModalFooter>
            <Button
              variant="outline"
              onClick={closeConsentModal}
            >
              {t("payment.close")}
            </Button>
            {!clientSecret ? (
              <Button
                onClick={() => void handleContinuePayment()}
                disabled={
                  initiatePayment.isPending ||
                  refundPolicyLoading ||
                  !refundPolicy ||
                  acceptedRefundPolicyId !== refundPolicy.id
                }
              >
                {initiatePayment.isPending ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    {t("payment.continueProcessing")}
                  </>
                ) : (
                  label
                )}
              </Button>
            ) : null}
          </ModalFooter>
        </div>
      </Modal>
    </>
  );
}
