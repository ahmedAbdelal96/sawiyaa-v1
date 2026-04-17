import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { View } from "react-native";

import { routes } from "@/core/constants/routes";
import { useAppTheme } from "@/core/theme/theme-provider";
import { PaymentStatusCard } from "@/modules/payments/components/payment-status-card";
import { usePaymentDetails } from "@/modules/payments/hooks/use-payments";
import { AppButton, AppCard, AppEmptyState, AppErrorState, AppHeader, AppLoader, AppScreen } from "@/shared/ui";

export function PaymentDetailsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { spacing } = useAppTheme();
  const params = useLocalSearchParams<{ id?: string }>();
  const paymentId = Array.isArray(params.id) ? params.id[0] : params.id || "";
  const paymentQuery = usePaymentDetails(paymentId);

  if (!paymentId) {
    return (
      <AppScreen>
        <AppEmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
      </AppScreen>
    );
  }

  if (paymentQuery.isLoading) {
    return (
      <AppScreen>
        <AppLoader label={t("loading")} />
      </AppScreen>
    );
  }

  if (paymentQuery.isError) {
    return (
      <AppScreen>
        <AppErrorState onRetry={() => paymentQuery.refetch()} />
      </AppScreen>
    );
  }

  if (!paymentQuery.data) {
    return (
      <AppScreen>
        <AppEmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
      </AppScreen>
    );
  }

  return (
    <AppScreen scroll>
      <View style={{ gap: spacing.lg }}>
        <AppHeader title={t("paymentDetailsTitle")} subtitle={t("paymentDetailsSubtitle")} />
        <AppCard style={{ backgroundColor: "rgba(242,244,246,0.7)" }}>
          <View style={{ gap: spacing.md }}>
            <PaymentStatusCard payment={paymentQuery.data} />
            <AppButton
              label={t("supportCreateTicket")}
              onPress={() =>
                router.push(
                  routes.app.supportNewTicketPrefilled({
                    category: "PAYMENT",
                    relatedPaymentId: paymentId,
                    subject: `${t("paymentDetailsTitle")} - ${paymentQuery.data.provider}`,
                  }),
                )
              }
              variant="secondary"
            />
          </View>
        </AppCard>
      </View>
    </AppScreen>
  );
}
