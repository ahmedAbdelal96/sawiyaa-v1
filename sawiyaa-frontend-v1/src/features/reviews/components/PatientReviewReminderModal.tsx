"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Modal, ModalBody } from "@/components/ui/modal";
import { useAuthState } from "@/stores/auth-store";
import { usePendingPatientReviews } from "../hooks/use-reviews";
import PatientSessionReviewCard from "@/features/sessions/components/PatientSessionReviewCard";

const REMINDER_DISMISS_KEY = "sawiyaa.patient.reviewReminderDismissed.v1";
const REMINDER_QUERY_LIMIT = 3;

export default function PatientReviewReminderModal() {
  const t = useTranslations("reviews");
  const { user } = useAuthState();
  const [isDismissed, setIsDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const stored = window.sessionStorage.getItem(REMINDER_DISMISS_KEY);
      setIsDismissed(stored === "1");
    } catch {
      setIsDismissed(false);
    }
  }, []);

  const pendingReviewsQuery = usePendingPatientReviews(
    { page: 1, limit: REMINDER_QUERY_LIMIT },
    Boolean(user) && isDismissed === false,
  );

  const pendingReview = useMemo(
    () => {
      const items = pendingReviewsQuery.data?.items ?? [];
      if (items.length === 0) return null;

      return [...items].sort((left, right) => {
        const leftCompleted = left.completedAt ? Date.parse(left.completedAt) : 0;
        const rightCompleted = right.completedAt ? Date.parse(right.completedAt) : 0;
        if (leftCompleted !== rightCompleted) {
          return rightCompleted - leftCompleted;
        }

        const leftScheduled = left.scheduledStartAt ? Date.parse(left.scheduledStartAt) : 0;
        const rightScheduled = right.scheduledStartAt ? Date.parse(right.scheduledStartAt) : 0;
        if (leftScheduled !== rightScheduled) {
          return rightScheduled - leftScheduled;
        }

        return right.sessionId.localeCompare(left.sessionId);
      })[0] ?? null;
    },
    [pendingReviewsQuery.data?.items],
  );

  const isOpen = Boolean(user) && isDismissed === false && Boolean(pendingReview);

  const dismissForSession = () => {
    try {
      window.sessionStorage.setItem(REMINDER_DISMISS_KEY, "1");
    } catch {
      // Keep UI responsive
    }
    setIsDismissed(true);
  };

  if (!user || isDismissed === null || !pendingReview) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={dismissForSession}
      size="md"
      ariaLabel={t("patient.reminder.modalTitle")}
    >
      <ModalBody className="p-6">
        <PatientSessionReviewCard
          sessionId={pendingReview.sessionId}
          practitionerName={pendingReview.practitioner.displayName}
          completedAt={pendingReview.completedAt}
          onSubmitted={() => {
            // Dismiss after a short delay so they can see the success state
            setTimeout(() => {
              dismissForSession();
            }, 1500);
          }}
          onCancel={dismissForSession}
        />
      </ModalBody>
    </Modal>
  );
}
