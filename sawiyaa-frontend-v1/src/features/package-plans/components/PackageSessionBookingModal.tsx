"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Calendar, X } from "lucide-react";
import Button from "@/components/ui/button/Button";
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "@/components/ui/modal";
import { StateCard } from "@/components/shared/ContentStates";
import { toAppError } from "@/lib/api/errors";
import {
  normalizeUtcIso,
  type SelectableSlot,
} from "@/features/practitioner-profile/lib/availability-slot-utils";
import {
  packagePurchaseQueryKeys,
  useBookPackageSession,
} from "../hooks/use-package-purchases";
import type { PatientPackagePurchaseItem } from "../types/package-purchases.types";
import PackagePurchaseSlotPicker from "./PackagePurchaseSlotPicker";

export default function PackageSessionBookingModal({
  purchase,
  onBooked,
}: {
  purchase: PatientPackagePurchaseItem;
  onBooked?: () => void;
}) {
  const t = useTranslations("package-purchases");
  const locale = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState<SelectableSlot[]>([]);
  const bookSession = useBookPackageSession();
  const queryClient = useQueryClient();
  const practitionerSlug = purchase.practitioner?.publicSlug;

  const close = () => {
    setIsOpen(false);
    setSelectedSlots([]);
    bookSession.reset();
  };

  const submit = async () => {
    const selected = selectedSlots[0];
    if (!selected) return;
    try {
      await bookSession.mutateAsync({
        purchaseId: purchase.id,
        scheduledStartAt: normalizeUtcIso(selected.startsAt),
      });
      onBooked?.();
      close();
    } catch {
      // A stale tab can lose the last entitlement. Refresh the canonical
      // package projection before showing the conflict so the next attempt
      // starts from the current balance.
      await queryClient.invalidateQueries({
        queryKey: packagePurchaseQueryKeys.detail(purchase.id, locale),
      });
    }
  };

  if (!practitionerSlug) return null;

  return (
    <>
      <Button
        className="shrink-0"
        onClick={() => setIsOpen(true)}
        startIcon={<Calendar size={14} />}
      >
        {t("list.actions.bookSession")}
      </Button>
      <Modal isOpen={isOpen} onClose={close} size="2xl">
        <ModalHeader
          eyebrow={t("detail.packageEyebrow")}
          title={
            locale === "ar" ? "حجز جلسة من الباقة" : "Book a package session"
          }
          description={
            locale === "ar"
              ? "اختر موعدًا واحدًا متاحًا، وستظهر جلستك ضمن جلساتك المعتادة."
              : "Choose one available time. It will appear with your regular sessions."
          }
        />
        <ModalBody className="space-y-4">
          <PackagePurchaseSlotPicker
            slug={practitionerSlug}
            durationMinutes={purchase.durationMinutes === 30 ? 30 : 60}
            requiredCount={1}
            maxSelectableCount={1}
            selectedSlots={selectedSlots}
            onChange={setSelectedSlots}
          />
          {bookSession.error ? (
            <StateCard
              title={
                toAppError(bookSession.error).statusCode === 409
                  ? t("detail.bookingConflict")
                  : t("detail.bookingError")
              }
              note={t("detail.bookingRetry")}
            />
          ) : null}
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={close} startIcon={<X size={14} />}>
            {t("detail.close")}
          </Button>
          <Button
            onClick={() => void submit()}
            disabled={!selectedSlots.length || bookSession.isPending}
          >
            {bookSession.isPending
              ? t("detail.booking")
              : t("list.actions.bookSession")}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
