import { useTranslation } from "react-i18next";
import { View } from "react-native";

import { useAppTheme } from "@/core/theme/theme-provider";
import type { PaymentItem } from "@/modules/payments/domain/payments.types";
import { AppText, StatusBadge } from "@/shared/ui";

type PaymentStatusCardProps = {
  payment: PaymentItem;
};

function getStatusLabel(status: string, t: (key: string) => string) {
  switch (status) {
    case "SUCCEEDED":
      return t("paymentStatusSucceeded");
    case "FAILED":
      return t("paymentStatusFailed");
    case "PROCESSING":
      return t("paymentStatusProcessing");
    case "EXPIRED":
      return t("paymentStatusExpired");
    default:
      return t("paymentStatusPending");
  }
}

export function PaymentStatusCard({ payment }: PaymentStatusCardProps) {
  const { t } = useTranslation();
  const { spacing, colors } = useAppTheme();

  return (
    <View style={{ gap: spacing.sm }}>
      <AppText variant="title" style={{ fontWeight: "800" }}>
        {t("paymentSummaryTitle")}
      </AppText>
      <StatusBadge
        label={getStatusLabel(payment.status, t)}
        tone={
          payment.status === "SUCCEEDED"
            ? "success"
            : payment.status === "FAILED" || payment.status === "EXPIRED"
              ? "danger"
              : "warning"
        }
      />
      <AppText color={colors.textSecondary}>{`${payment.amount} ${payment.currency}`}</AppText>
    </View>
  );
}
