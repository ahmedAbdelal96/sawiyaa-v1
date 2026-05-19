"use client";

import { useTranslations } from "next-intl";
import InputField from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { FormModal } from "@/components/ui/modal";
import type { AccountingStepUpController } from "../hooks/use-accounting-step-up";

type Props = {
  controller: AccountingStepUpController;
};

export default function AccountingStepUpDialog({ controller }: Props) {
  const t = useTranslations("admin-accounting");

  return (
    <FormModal
      isOpen={controller.isOpen}
      onClose={controller.close}
      title={t("stepUp.title")}
      description={t("stepUp.description")}
      submitLabel={t("stepUp.confirm")}
      cancelLabel={t("stepUp.cancel")}
      onSubmit={controller.submit}
      onCancel={controller.close}
      loading={controller.isPending}
      submitDisabled={controller.isPending || !controller.password.trim()}
      size="md"
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>{t("stepUp.passwordLabel")}</Label>
          <InputField
            type="password"
            placeholder={t("stepUp.passwordPlaceholder")}
            value={controller.password}
            onChange={(event) => controller.setPassword(event.target.value)}
            autoComplete="current-password"
            error={Boolean(controller.error)}
            hint={controller.error ?? t("stepUp.hint")}
          />
        </div>

        {controller.expiresAt ? (
          <p className="text-xs text-text-secondary">{t("stepUp.successNote")}</p>
        ) : null}
      </div>
    </FormModal>
  );
}
