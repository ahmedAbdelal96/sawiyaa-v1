import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Linking, View } from "react-native";

import { routes } from "@/core/constants/routes";
import { useAppTheme } from "@/core/theme/theme-provider";
import { PaymentStatusCard } from "@/modules/payments/components/payment-status-card";
import {
  useInitiateSessionPayment,
  usePaymentDetails,
  useSessionFinancialBreakdown,
  useValidateSessionCoupon,
} from "@/modules/payments/hooks/use-payments";
import { resolvePaymentCheckoutTarget } from "@/modules/payments/lib/payment-return";
import {
  AppButton,
  AppCard,
  AppEmptyState,
  AppErrorState,
  AppHeader,
  AppInput,
  AppLoader,
  AppScreen,
  AppText,
} from "@/shared/ui";

export function PaymentCheckoutScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { spacing, colors } = useAppTheme();
  const params = useLocalSearchParams<{ sessionId?: string }>();
  const sessionId = Array.isArray(params.sessionId) ? params.sessionId[0] : params.sessionId || "";
  const [couponCode, setCouponCode] = useState("");
  const [appliedCouponCode, setAppliedCouponCode] = useState<string | undefined>();
  const [latestPaymentId, setLatestPaymentId] = useState<string | undefined>();

  const breakdownQuery = useSessionFinancialBreakdown(sessionId, appliedCouponCode);
  const couponValidationMutation = useValidateSessionCoupon(sessionId);
  const initiateMutation = useInitiateSessionPayment(sessionId);
  const paymentDetailsQuery = usePaymentDetails(latestPaymentId || "");

  const paymentTarget = useMemo(
    () =>
      initiateMutation.data
        ? resolvePaymentCheckoutTarget({
            checkoutUrl: initiateMutation.data.checkoutUrl,
            clientSecret: initiateMutation.data.clientSecret,
          })
        : { type: "none" as const, value: null as string | null },
    [initiateMutation.data],
  );

  if (!sessionId) {
    return (
      <AppScreen>
        <AppEmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
      </AppScreen>
    );
  }

  return (
    <AppScreen scroll>
      <View style={{ gap: spacing.lg }}>
        <AppHeader title={t("paymentCheckoutTitle")} subtitle={t("paymentCheckoutSubtitle")} />

        {breakdownQuery.isLoading ? <AppLoader label={t("loading")} /> : null}
        {breakdownQuery.isError ? <AppErrorState onRetry={() => breakdownQuery.refetch()} /> : null}

        {breakdownQuery.data ? (
          <AppCard style={{ backgroundColor: colors.surfaceLow }}>
            <View style={{ gap: spacing.sm }}>
              <AppText variant="title" style={{ fontWeight: "800" }}>
                {t("paymentSummaryTitle")}
              </AppText>
              <AppText color={colors.primary} style={{ fontWeight: "800" }}>
                {`${breakdownQuery.data.netPaidAmount} ${breakdownQuery.data.currency}`}
              </AppText>
              <AppText color={colors.textSecondary}>
                {t("paymentGrossLabel")}: {breakdownQuery.data.grossAmount}
              </AppText>
              <AppText color={colors.textSecondary}>
                {t("paymentDiscountLabel")}: {breakdownQuery.data.discountAmount}
              </AppText>
            </View>
          </AppCard>
        ) : null}

        <AppCard style={{ backgroundColor: colors.surfaceLowest }}>
          <View style={{ gap: spacing.sm }}>
            <AppInput
              label={t("paymentCouponLabel")}
              value={couponCode}
              onChangeText={setCouponCode}
              placeholder={t("paymentCouponPlaceholder")}
              autoCapitalize="characters"
            />
            <AppButton
              label={t("paymentValidateCoupon")}
              loading={couponValidationMutation.isPending}
              disabled={!couponCode.trim()}
              onPress={() =>
                couponValidationMutation.mutate(couponCode.trim(), {
                  onSuccess: () => setAppliedCouponCode(couponCode.trim()),
                })
              }
            />
            {couponValidationMutation.isError ? <AppErrorState /> : null}
          </View>
        </AppCard>

        <AppButton
          label={t("paymentInitiate")}
          loading={initiateMutation.isPending}
          onPress={() =>
            initiateMutation.mutate(appliedCouponCode, {
              onSuccess: async (payment) => {
                setLatestPaymentId(payment.id);
                if (payment.checkoutUrl) {
                  await Linking.openURL(payment.checkoutUrl);
                }
              },
            })
          }
        />

        {initiateMutation.isError ? <AppErrorState /> : null}

        {initiateMutation.data ? <PaymentStatusCard payment={initiateMutation.data} /> : null}

        {paymentTarget.type === "checkoutUrl" ? (
          <View style={{ gap: spacing.sm }}>
            <AppButton
              label={t("paymentCheckoutReturnCta")}
              onPress={() => {
                if (!latestPaymentId) return;
                router.push(routes.app.paymentReturnFor(latestPaymentId));
              }}
              variant="secondary"
            />
            <AppButton
              label={t("paymentRefreshStatus")}
              onPress={() => {
                if (latestPaymentId) {
                  void paymentDetailsQuery.refetch();
                }
              }}
              variant="secondary"
            />
          </View>
        ) : null}

        {paymentTarget.type === "clientSecret" ? (
          <AppCard style={{ backgroundColor: colors.surfaceLow }}>
            <AppText color={colors.textSecondary}>{t("paymentClientSecretNote")}</AppText>
          </AppCard>
        ) : null}

        {paymentDetailsQuery.data ? <PaymentStatusCard payment={paymentDetailsQuery.data} /> : null}

        {latestPaymentId ? (
          <AppButton
            label={t("paymentOpenDetails")}
            onPress={() => router.push(routes.app.paymentDetails(latestPaymentId))}
            variant="secondary"
          />
        ) : null}
      </View>
    </AppScreen>
  );
}
