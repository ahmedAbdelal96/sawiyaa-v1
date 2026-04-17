import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { View } from "react-native";

import { routes } from "@/core/constants/routes";
import { useAppTheme } from "@/core/theme/theme-provider";
import { PaymentStatusCard } from "@/modules/payments/components/payment-status-card";
import { usePaymentsList } from "@/modules/payments/hooks/use-payments";
import { AppButton, AppCard, AppEmptyState, AppErrorState, AppHeader, AppLoader, AppScreen } from "@/shared/ui";

export function PaymentsListScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { spacing } = useAppTheme();
  const paymentsQuery = usePaymentsList();

  if (paymentsQuery.isLoading) {
    return (
      <AppScreen>
        <AppLoader label={t("loading")} />
      </AppScreen>
    );
  }

  if (paymentsQuery.isError) {
    return (
      <AppScreen>
        <AppErrorState onRetry={() => paymentsQuery.refetch()} />
      </AppScreen>
    );
  }

  if (!paymentsQuery.data || paymentsQuery.data.items.length === 0) {
    return (
      <AppScreen>
        <AppHeader title={t("paymentsTitle")} subtitle={t("paymentsSubtitle")} />
        <AppEmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
      </AppScreen>
    );
  }

  return (
    <AppScreen scroll>
      <View style={{ gap: spacing.lg }}>
        <AppHeader title={t("paymentsTitle")} subtitle={t("paymentsSubtitle")} />
        {paymentsQuery.data.items.map((payment) => (
          <AppCard key={payment.id} style={{ gap: spacing.md, backgroundColor: "rgba(242,244,246,0.7)" }}>
            <PaymentStatusCard payment={payment} />
            <AppButton
              label={t("paymentOpenDetails")}
              onPress={() => router.push(routes.app.paymentDetails(payment.id))}
              variant="secondary"
            />
          </AppCard>
        ))}
      </View>
    </AppScreen>
  );
}
