"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { FormModal } from "@/components/ui/modal";
import Label from "@/components/form/Label";
import TextArea from "@/components/form/input/TextArea";
import { AlertTriangle } from "lucide-react";
import type { AdminPatientListItem } from "../types/admin-patients.types";
import type { CountryListItem } from "../api/admin-patients.api";
import { CountrySelector } from "./CountrySelector";
import { useAdminCountries, useAdminPatientCountryChange } from "../hooks/use-admin-patients";

interface AdminPatientCountryChangeModalProps {
  patient: AdminPatientListItem;
  isOpen: boolean;
  onClose: () => void;
}

export function AdminPatientCountryChangeModal({
  patient,
  isOpen,
  onClose,
}: AdminPatientCountryChangeModalProps) {
  const t = useTranslations("admin-patients");
  const tChangeCountry = useTranslations("admin-patients.changeCountry");

  const [selectedCountry, setSelectedCountry] = useState<CountryListItem | null>(null);
  const [reason, setReason] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  const { data: countries = [], isLoading: countriesLoading } = useAdminCountries();
  const changeCountry = useAdminPatientCountryChange();

  const isSameCountry =
    selectedCountry && patient.countryCode
      ? selectedCountry.isoCode.toUpperCase() === patient.countryCode.toUpperCase()
      : false;

  const reasonValid = reason.trim().length >= 10;
  const canProceed = selectedCountry && !isSameCountry && reasonValid;

  const handleSubmit = () => {
    if (!canProceed || !selectedCountry) return;
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    if (!selectedCountry) return;
    try {
      await changeCountry.mutateAsync({
        patientId: patient.id,
        countryCode: selectedCountry.isoCode,
        reason: reason.trim(),
      });
      handleClose();
    } catch {
      // Error is handled by the mutation
    }
  };

  const handleClose = () => {
    setSelectedCountry(null);
    setReason("");
    setShowConfirm(false);
    onClose();
  };

  const currentCountryDisplay = patient.countryCode
    ? patient.countryCode.toUpperCase()
    : tChangeCountry("currentCountryNotSet");

  const sameCountryMessage = isSameCountry && selectedCountry
    ? tChangeCountry("sameCountryError", { country: selectedCountry.name })
    : null;

  return (
    <>
      <FormModal
        isOpen={isOpen}
        onClose={handleClose}
        size="md"
        title={tChangeCountry("title")}
        description={tChangeCountry("description")}
        eyebrow={tChangeCountry("eyebrow")}
        loading={changeCountry.isPending}
        submitDisabled={!canProceed}
        submitLabel={tChangeCountry("confirm")}
        cancelLabel={tChangeCountry("cancel")}
        onSubmit={handleSubmit}
        onCancel={handleClose}
        stickyFooter
      >
        <div className="flex flex-col gap-5">
          {/* Patient info */}
          <div className="rounded-2xl border border-border-light bg-surface-secondary/40 px-4 py-3 dark:border-border-light dark:bg-surface-secondary/20">
            <p className="text-sm font-semibold text-text-primary dark:text-white/95">
              {patient.displayName ?? t("table.unknownName")}
            </p>
            <p className="mt-0.5 text-xs text-text-muted">
              {patient.primaryEmail ?? patient.primaryPhone ?? patient.id}
            </p>
          </div>

          {/* Current country */}
          <div className="flex flex-col gap-2">
            <Label>
              {tChangeCountry("currentCountry")}
            </Label>
            <div className="flex h-11 items-center rounded-xl border border-border-light bg-surface-secondary/40 px-4 dark:border-border-light dark:bg-surface-secondary/20">
              <span className="text-sm text-text-secondary">
                {currentCountryDisplay}
              </span>
            </div>
          </div>

          {/* New country selector */}
          <div className="flex flex-col gap-2">
            <Label>
              {tChangeCountry("newCountry")}
            </Label>
            {countriesLoading ? (
              <div className="flex h-11 items-center rounded-xl border border-border-light bg-surface-secondary/40 px-4 dark:border-border-light dark:bg-surface-secondary/20">
                <span className="text-sm text-text-muted">{t("states.loading")}</span>
              </div>
            ) : (
              <CountrySelector
                countries={countries}
                value={selectedCountry?.isoCode ?? null}
                onChange={setSelectedCountry}
                placeholder={tChangeCountry("selectCountry")}
                searchPlaceholder={tChangeCountry("searchCountry")}
                emptyMessage={tChangeCountry("countriesEmpty")}
                overflowMessage={(count) => tChangeCountry("countriesOverflow", { count })}
              />
            )}
            {sameCountryMessage && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                {sameCountryMessage}
              </p>
            )}
          </div>

          {/* Reason */}
          <div className="flex flex-col gap-2">
            <Label>
              {tChangeCountry("reason")} <span className="text-error-500">*</span>
            </Label>
            <TextArea
              value={reason}
              onChange={setReason}
              placeholder={tChangeCountry("reasonPlaceholder")}
              rows={3}
              hint={tChangeCountry("reasonHint")}
              error={reason.length > 0 && !reasonValid}
            />
          </div>

          {/* Warning notice */}
          <div className="flex items-start gap-2 rounded-2xl border border-warning-200 bg-warning-50 px-4 py-3 dark:border-warning-500/20 dark:bg-warning-500/10">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning-600 dark:text-warning-400" />
            <p className="text-sm text-warning-800 dark:text-warning-200">
              {tChangeCountry("warning")}
            </p>
          </div>
        </div>
      </FormModal>

      {/* Confirmation dialog — uses FormModal with Cancel + Confirm */}
      <FormModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        size="sm"
        title={tChangeCountry("confirmTitle")}
        eyebrow={tChangeCountry("eyebrow")}
        loading={changeCountry.isPending}
        submitLabel={tChangeCountry("confirm")}
        cancelLabel={tChangeCountry("cancel")}
        onSubmit={handleConfirm}
        onCancel={() => setShowConfirm(false)}
        stickyFooter
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text-secondary">
            {tChangeCountry("confirmDescription", {
              from: currentCountryDisplay,
              to: selectedCountry ? `${selectedCountry.name} (${selectedCountry.isoCode})` : "",
            })}
          </p>
          <div className="rounded-xl border border-warning-200 bg-warning-50 px-4 py-3 dark:border-warning-500/20 dark:bg-warning-500/10">
            <p className="text-sm text-warning-800 dark:text-warning-200">
              {reason.trim()}
            </p>
          </div>
        </div>
      </FormModal>
    </>
  );
}
