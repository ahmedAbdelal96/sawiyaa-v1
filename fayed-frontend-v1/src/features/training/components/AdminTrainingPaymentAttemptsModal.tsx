"use client";

import { useLocale, useTranslations } from "next-intl";
import { AlertCircle, CreditCard } from "lucide-react";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import { Modal, ModalBody, ModalHeader } from "@/components/ui/modal";
import { useAdminTrainingPaymentAttempts } from "../hooks/use-training";
import { formatTrainingAmount, formatTrainingDatetime, getPaymentStatusTone, getStatusToneClasses } from "./training-utils";

type Props = {
  isOpen: boolean;
  trainingId: string | null;
  onClose: () => void;
};

function isFailureStatus(status: string) {
  return ["FAILED", "EXPIRED", "CANCELLED", "REQUIRES_ACTION"].includes(status);
}

export default function AdminTrainingPaymentAttemptsModal({
  isOpen,
  trainingId,
  onClose,
}: Props) {
  const t = useTranslations("training");
  const locale = useLocale();
  const attemptsQuery = useAdminTrainingPaymentAttempts(trainingId, {
    page: 1,
    limit: 100,
  });

  const items = (attemptsQuery.data?.items ?? []).filter((item) => isFailureStatus(item.status));
  const totalItems = items.length;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalHeader
        eyebrow={t("admin.detail.paymentAttempts.eyebrow")}
        title={t("admin.detail.paymentAttempts.title")}
        description={t("admin.detail.paymentAttempts.note")}
      />

      <ModalBody>
        {attemptsQuery.isLoading ? (
          <ListStateSkeleton items={4} heightClass="h-20" />
        ) : attemptsQuery.isError ? (
          <StateCard
            title={t("admin.detail.paymentAttempts.states.error.heading")}
            note={t("admin.detail.paymentAttempts.states.error.note")}
          />
        ) : items.length > 0 ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
              <span className="inline-flex items-center gap-1 rounded-full bg-surface-tertiary px-3 py-1 font-medium dark:bg-white/5">
                <CreditCard className="h-3.5 w-3.5" />
                {t("admin.detail.paymentAttempts.count", { value: totalItems })}
              </span>
            </div>

            {items.map((attempt) => {
              const tone = getPaymentStatusTone(attempt.status);
              return (
                <div
                  key={attempt.id}
                  className="rounded-[22px] border border-border-light bg-white px-4 py-4 dark:border-white/8 dark:bg-white/[0.03]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-text-primary dark:text-white/95">
                        {attempt.patientDisplayName ?? t("admin.detail.paymentAttempts.patientFallback")}
                      </p>
                      <p className="mt-1 text-xs text-text-muted">
                        {t("admin.detail.paymentAttempts.schedule", { code: attempt.scheduleCode })}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusToneClasses(
                        tone,
                      )}`}
                    >
                      {t(`statuses.payment.${attempt.status}` as Parameters<typeof t>[0])}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-2xl border border-border-light/60 bg-surface-secondary/60 px-3 py-2 dark:border-white/8 dark:bg-white/[0.02]">
                      <p className="text-xs font-medium text-text-muted">
                        {t("admin.detail.paymentAttempts.amount")}
                      </p>
                      <p className="mt-1 text-sm text-text-primary dark:text-white/95">
                        {formatTrainingAmount(attempt.amountTotal, attempt.currencyCode, locale)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-border-light/60 bg-surface-secondary/60 px-3 py-2 dark:border-white/8 dark:bg-white/[0.02]">
                      <p className="text-xs font-medium text-text-muted">
                        {t("admin.detail.paymentAttempts.createdAt")}
                      </p>
                      <p className="mt-1 text-sm text-text-primary dark:text-white/95">
                        {formatTrainingDatetime(attempt.createdAt, locale)}
                      </p>
                    </div>
                  </div>

                  {attempt.failureReason ? (
                    <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
                      <div className="flex items-center gap-2 font-medium">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {t("admin.detail.paymentAttempts.failureReason")}
                      </div>
                      <p className="mt-1 leading-6">{attempt.failureReason}</p>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <StateCard
            title={t("admin.detail.paymentAttempts.states.empty.heading")}
            note={t("admin.detail.paymentAttempts.states.empty.note")}
          />
        )}
      </ModalBody>
    </Modal>
  );
}
