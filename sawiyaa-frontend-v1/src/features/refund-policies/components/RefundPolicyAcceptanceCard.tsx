"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { FileText } from "lucide-react";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { StateCard } from "@/components/shared/ContentStates";
import { Skeleton } from "@/components/shared/LoadingStates";
import { toAppError } from "@/lib/api/errors";
import type { RefundPolicy, RefundPolicyType } from "../types/refund-policies.types";
import { REFUND_POLICY_ERROR_CODES } from "../lib/refund-policy-errors";
import PublicRefundPolicyDocument from "./PublicRefundPolicyDocument";

type Props = {
  policyType: RefundPolicyType;
  policy: RefundPolicy | null;
  isLoading: boolean;
  error: unknown;
  acceptedPolicyId: string | null;
  onAcceptedPolicyIdChange: (value: string | null) => void;
  onRetry: () => void;
  className?: string;
  presentation?: "compact" | "inline";
};

function useIsMobileViewport() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 640px)");
    const update = () => setIsMobile(mediaQuery.matches);

    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  return isMobile;
}

export default function RefundPolicyAcceptanceCard({
  policyType,
  policy,
  isLoading,
  error,
  acceptedPolicyId,
  onAcceptedPolicyIdChange,
  onRetry,
  className = "",
  presentation = "compact",
}: Props) {
  const t = useTranslations("refund-policies");
  const locale = useLocale();
  const isArabic = locale === "ar";
  const isMobile = useIsMobileViewport();
  const [isReaderOpen, setIsReaderOpen] = useState(false);

  const appError = useMemo(() => (error ? toAppError(error) : null), [error]);
  const errorCode = appError?.code ?? null;
  const selectedPolicyId = policy?.id ?? null;
  const isAccepted = Boolean(policy && acceptedPolicyId === selectedPolicyId);
  const displayTitle = isArabic ? policy?.titleAr || policy?.titleEn : policy?.titleEn || policy?.titleAr;
  const policyNote = policyType === "SESSION" ? t("card.sessionNote") : t("card.packageNote");
  const blockedTitle = t("card.blockedTitle");
  const blockedNote = t("card.blockedNote");
  const validationTitle = t("card.validationTitle");
  const validationNote = t("card.validationNote");
  const staleTitle = t("card.staleTitle");
  const staleNote = t("card.staleNote");
  const clauseCountLabel = t("card.clauseCount", { count: policy?.clauses.length ?? 0 });
  const isInline = presentation === "inline";

  if (isLoading && !policy) {
    return (
      <div className={`rounded-[28px] border border-border-light bg-white p-5 shadow-sm dark:bg-surface-secondary ${className}`}>
        <p className="mb-2 text-sm font-semibold text-text-primary dark:text-white/90">
          {t("card.loadingTitle")}
        </p>
        <p className="mb-4 text-xs leading-6 text-text-secondary">
          {t("card.loadingNote")}
        </p>
        <Skeleton className="h-5 rounded-full" />
        <Skeleton className="mt-4 h-14 rounded-2xl" />
        <Skeleton className="mt-3 h-12 rounded-2xl" />
      </div>
    );
  }

  if (!policy || !policy.isActive || errorCode === REFUND_POLICY_ERROR_CODES.activeNotFound) {
    return (
      <StateCard
        title={blockedTitle}
        note={blockedNote}
        action={{
          label: t("card.retry"),
          onClick: onRetry,
        }}
      />
    );
  }

  if (errorCode === REFUND_POLICY_ERROR_CODES.wrongType) {
    return (
      <StateCard
        title={validationTitle}
        note={validationNote}
        action={{
          label: t("card.retry"),
          onClick: onRetry,
        }}
      />
    );
  }

  if (errorCode === REFUND_POLICY_ERROR_CODES.staleAcceptance) {
    return (
      <StateCard
        title={staleTitle}
        note={staleNote}
        action={{
          label: t("card.retry"),
          onClick: onRetry,
        }}
      />
    );
  }

  return (
    <>
      <section
        className={`rounded-[28px] border border-border-light bg-white p-5 shadow-sm dark:border-border-light dark:bg-surface-secondary ${className}`}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              {t("card.heading")}
            </p>
            <h3 className="text-lg font-semibold text-text-primary dark:text-white/95">
              {displayTitle || t("card.heading")}
            </h3>
            <p className="max-w-2xl text-sm leading-7 text-text-secondary">
              {policyNote}
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <Badge variant="solid" color={policy.isActive ? "success" : "warning"} size="sm">
              {policy.isActive ? t("card.activeBadge") : t("card.inactiveBadge")}
            </Badge>
            <span className="inline-flex rounded-full border border-border-light bg-surface-tertiary px-3 py-1 text-xs font-semibold text-text-primary dark:bg-white/5 dark:text-white/90">
              {clauseCountLabel}
            </span>
          </div>
        </div>

        <div className="mt-4 space-y-4">
          <div className="rounded-2xl border border-border-light bg-surface-tertiary px-4 py-3 dark:bg-white/5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
              {t("card.checkboxHintLabel")}
            </p>
            <p className="mt-1 text-sm leading-6 text-text-secondary">
              {t("card.checkboxHint")}
            </p>
          </div>

          {isInline ? (
            <>
              <div className="rounded-[24px] border border-border-light bg-white p-4 dark:bg-surface-secondary">
                <PublicRefundPolicyDocument
                  policy={policy}
                  showEnglishSecondary={false}
                  showHeader={false}
                  className="space-y-4"
                />
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-[24px] border border-border-light bg-white px-4 py-4 text-sm transition hover:border-primary/30 dark:bg-surface-secondary">
                <input
                  type="checkbox"
                  checked={isAccepted}
                  onChange={(event) =>
                    onAcceptedPolicyIdChange(event.target.checked ? (selectedPolicyId ?? null) : null)
                  }
                  className="mt-1 h-4 w-4 rounded border-border-light text-primary focus:ring-primary"
                />
                <span className="space-y-1">
                  <span className="block font-semibold text-text-primary dark:text-white/90">
                    {t("card.checkboxLabel")}
                  </span>
                  <span className="block text-xs leading-6 text-text-secondary">
                    {t("card.checkboxNote")}
                  </span>
                </span>
              </label>
            </>
          ) : (
            <>
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border-light bg-white px-4 py-4 text-sm transition hover:border-primary/30 dark:bg-surface-secondary">
                <input
                  type="checkbox"
                  checked={isAccepted}
                  onChange={(event) =>
                    onAcceptedPolicyIdChange(event.target.checked ? (selectedPolicyId ?? null) : null)
                  }
                  className="mt-1 h-4 w-4 rounded border-border-light text-primary focus:ring-primary"
                />
                <span className="space-y-1">
                  <span className="block font-semibold text-text-primary dark:text-white/90">
                    {t("card.checkboxLabel")}
                  </span>
                  <span className="block text-xs leading-6 text-text-secondary">
                    {t("card.checkboxNote")}
                  </span>
                </span>
              </label>
            </>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs leading-6 text-text-muted">
              {t("card.readPolicyNote")}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsReaderOpen(true)}
            >
              <span className="inline-flex items-center gap-2">
                <FileText size={14} />
                {t("card.readFullPolicy")}
              </span>
            </Button>
          </div>
        </div>
      </section>

      <Modal
        isOpen={isReaderOpen}
        onClose={() => setIsReaderOpen(false)}
        size="2xl"
        isFullscreen={isMobile}
        className={isMobile ? "rounded-none" : "w-full max-w-[900px]"}
      >
        <div className="flex max-h-[calc(100vh-2rem)] flex-col">
          <ModalHeader
            eyebrow={t("card.readerEyebrow")}
            title={displayTitle || t("card.heading")}
            description={policyNote}
          />
          <ModalBody className="space-y-5">
            <PublicRefundPolicyDocument
              policy={policy}
              showEnglishSecondary={isArabic && !isInline}
              className="space-y-5"
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setIsReaderOpen(false)}>
              {t("card.close")}
            </Button>
          </ModalFooter>
        </div>
      </Modal>
    </>
  );
}
