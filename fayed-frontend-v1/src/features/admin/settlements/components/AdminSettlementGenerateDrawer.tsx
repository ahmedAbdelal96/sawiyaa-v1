"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { BadgeDollarSign, Info } from "lucide-react";
import Button from "@/components/ui/button/Button";
import { Drawer, ModalBody, ModalHeader } from "@/components/ui/modal";
import { useGenerateAdminSettlementBatch } from "../hooks/use-admin-settlements";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onGenerated: (batchId: string, settlementItemsCount: number) => void;
};

export default function AdminSettlementGenerateDrawer({
  isOpen,
  onClose,
  onGenerated,
}: Props) {
  const t = useTranslations("admin-settlements");
  const generateMutation = useGenerateAdminSettlementBatch();
  const currentDate = new Date();
  const [year, setYear] = useState(String(currentDate.getFullYear()));
  const [month, setMonth] = useState(String(currentDate.getMonth() + 1));
  const [currency, setCurrency] = useState("");
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(
    null,
  );
  const parsedYear = Number.parseInt(year, 10);
  const parsedMonth = Number.parseInt(month, 10);
  const normalizedCurrency = currency.trim().toUpperCase();
  const isFormValid =
    !Number.isNaN(parsedYear) &&
    parsedYear >= 2000 &&
    parsedYear <= 3000 &&
    !Number.isNaN(parsedMonth) &&
    parsedMonth >= 1 &&
    parsedMonth <= 12 &&
    normalizedCurrency.length >= 3;

  const resetDrawerState = () => {
    setYear(String(currentDate.getFullYear()));
    setMonth(String(currentDate.getMonth() + 1));
    setCurrency("");
    setFeedback(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    if (!isFormValid) {
      setFeedback({ tone: "error", message: t("generate.validation") });
      return;
    }

    try {
      const result = await generateMutation.mutateAsync({
        periodYear: parsedYear,
        periodMonth: parsedMonth,
        currencyCode: normalizedCurrency,
      });
      setFeedback({
        tone: "success",
        message:
          result.item.settlementItemsCount === 0
            ? t("generate.successEmpty")
            : t("generate.success"),
      });
      setYear(String(currentDate.getFullYear()));
      setMonth(String(currentDate.getMonth() + 1));
      setCurrency("");
      onGenerated(result.item.id, result.item.settlementItemsCount);
    } catch {
      setFeedback({ tone: "error", message: t("errors.generic") });
    }
  };

  const closeDrawer = () => {
    if (generateMutation.isPending) return;
    resetDrawerState();
    onClose();
  };

  return (
    <Drawer isOpen={isOpen} onClose={closeDrawer} side="right" className="max-w-2xl">
      <div className="flex h-full max-h-[inherit] flex-col">
        <ModalHeader
          eyebrow={t("generate.eyebrow")}
          title={t("generate.heading")}
          description={t("generate.description")}
        />
        <ModalBody className="flex-1 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="rounded-[24px] border border-primary/15 bg-primary/5 p-4 text-sm text-text-secondary dark:border-primary/20 dark:bg-primary/10 dark:text-primary-light">
              <div className="flex items-start gap-3">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="space-y-2">
                  <p className="font-semibold text-text-primary dark:text-white/95">
                    {t("generate.helperTitle")}
                  </p>
                  <ul className="space-y-1 text-sm leading-6">
                    <li>{t("generate.helperItems.defaultPath")}</li>
                    <li>{t("generate.helperItems.noPractitionerPicker")}</li>
                    <li>{t("generate.helperItems.backendDuplicateGuard")}</li>
                    <li>{t("generate.helperItems.zeroItemsPossible")}</li>
                  </ul>
                  <p className="text-xs text-text-secondary">{t("generate.confirmationNote")}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                  {t("generate.fields.periodYear")}
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={2000}
                  max={3000}
                  value={year}
                  onChange={(event) => {
                    setYear(event.target.value);
                    if (feedback?.tone === "error") setFeedback(null);
                  }}
                  placeholder={t("generate.placeholders.periodYear")}
                  className="app-control w-full px-4 py-3"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                  {t("generate.fields.periodMonth")}
                </span>
                <select
                  value={month}
                  onChange={(event) => {
                    setMonth(event.target.value);
                    if (feedback?.tone === "error") setFeedback(null);
                  }}
                  className="app-control w-full px-4 py-3"
                >
                  {Array.from({ length: 12 }, (_, index) => index + 1).map((monthValue) => (
                    <option key={monthValue} value={monthValue}>
                      {String(monthValue).padStart(2, "0")}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("generate.fields.currency")}
              </span>
              <input
                value={currency}
                onChange={(event) => {
                  setCurrency(event.target.value);
                  if (feedback?.tone === "error") setFeedback(null);
                }}
                placeholder={t("generate.placeholders.currency")}
                className="app-control w-full px-4 py-3 uppercase"
              />
            </label>

            {feedback ? (
              <p
                className={`text-sm ${
                  feedback.tone === "success"
                    ? "text-text-brand dark:text-primary-light"
                    : "text-error-600 dark:text-error-400"
                }`}
              >
                {feedback.message}
              </p>
            ) : null}

            <div className="flex flex-wrap justify-end gap-2 border-t border-border-light pt-4 dark:border-white/8">
              <Button
                type="button"
                variant="outline"
                onClick={closeDrawer}
                disabled={generateMutation.isPending}
              >
                {t("generate.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={generateMutation.isPending || !isFormValid}
                startIcon={<BadgeDollarSign className="h-4 w-4" />}
              >
                {generateMutation.isPending
                  ? t("generate.submitting")
                  : t("generate.submit")}
              </Button>
            </div>
          </form>
        </ModalBody>
      </div>
    </Drawer>
  );
}
