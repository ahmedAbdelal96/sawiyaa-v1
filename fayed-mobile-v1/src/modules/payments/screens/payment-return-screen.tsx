import * as Linking from "expo-linking";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";

import { routes } from "@/core/constants/routes";
import { useAppTheme } from "@/core/theme/theme-provider";
import { PaymentStatusCard } from "@/modules/payments/components/payment-status-card";
import { usePaymentDetails } from "@/modules/payments/hooks/use-payments";
import {
  mapPaymentReturnStatus,
  parsePaymentReturnUrl,
} from "@/modules/payments/lib/payment-return";
import { AppButton, AppCard, AppEmptyState, AppHeader, AppLoader, AppScreen, AppText } from "@/shared/ui";

export function PaymentReturnScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { spacing, colors } = useAppTheme();
  const params = useLocalSearchParams<{
    paymentId?: string;
    payment_id?: string;
    id?: string;
    status?: string;
    result?: string;
  }>();
  const [initialUrlPayload, setInitialUrlPayload] = useState<{
    paymentId?: string;
    status?: string;
  }>({});

  useEffect(() => {
    async function readInitialUrl() {
      const initialUrl = await Linking.getInitialURL();
      if (!initialUrl) return;
      const parsed = parsePaymentReturnUrl(initialUrl);
      setInitialUrlPayload({ paymentId: parsed.paymentId, status: parsed.status });
    }

    void readInitialUrl();
  }, []);

  const paymentId = useMemo(() => {
    const p1 = Array.isArray(params.paymentId) ? params.paymentId[0] : params.paymentId;
    const p2 = Array.isArray(params.payment_id) ? params.payment_id[0] : params.payment_id;
    const p3 = Array.isArray(params.id) ? params.id[0] : params.id;
    return p1 || p2 || p3 || initialUrlPayload.paymentId || "";
  }, [params.id, params.paymentId, params.payment_id, initialUrlPayload.paymentId]);

  const rawStatus = useMemo(() => {
    const s1 = Array.isArray(params.status) ? params.status[0] : params.status;
    const s2 = Array.isArray(params.result) ? params.result[0] : params.result;
    return s1 || s2 || initialUrlPayload.status || null;
  }, [initialUrlPayload.status, params.result, params.status]);

  const paymentQuery = usePaymentDetails(paymentId);
  const canonicalStatus = mapPaymentReturnStatus(paymentQuery.data?.status || rawStatus);
  const statusLabel = useMemo(() => {
    if (canonicalStatus === "success") return t("paymentStatusSucceeded");
    if (canonicalStatus === "failed") return t("paymentStatusFailed");
    if (canonicalStatus === "pending") return t("paymentStatusPending");
    return t("paymentReturnUnknown");
  }, [canonicalStatus, t]);

  if (!paymentId && !rawStatus) {
    return (
      <AppScreen>
        <AppEmptyState title={t("paymentReturnTitle")} description={t("paymentReturnDescription")} />
      </AppScreen>
    );
  }

  return (
    <AppScreen scroll>
      <View style={{ gap: spacing.lg }}>
        <AppHeader title={t("paymentReturnTitle")} subtitle={t("paymentReturnDescription")} />

        {paymentQuery.isLoading ? <AppLoader label={t("loading")} /> : null}
        {paymentQuery.data ? <PaymentStatusCard payment={paymentQuery.data} /> : null}

        {!paymentQuery.data ? (
          <AppCard style={{ backgroundColor: colors.surfaceLow }}>
            <AppText color={colors.textSecondary}>
              {`${t("paymentReturnStatusLabel")}: ${statusLabel}`}
            </AppText>
          </AppCard>
        ) : null}

        {canonicalStatus === "success" ? (
          <AppCard style={{ backgroundColor: colors.surfaceLow }}>
            <AppText color={colors.textSecondary}>{t("paymentReturnSuccessHint")}</AppText>
          </AppCard>
        ) : null}
        {canonicalStatus === "failed" ? (
          <AppCard style={{ backgroundColor: colors.surfaceLow }}>
            <AppText color={colors.textSecondary}>{t("paymentReturnFailedHint")}</AppText>
          </AppCard>
        ) : null}
        {canonicalStatus === "pending" ? (
          <AppCard style={{ backgroundColor: colors.surfaceLow }}>
            <AppText color={colors.textSecondary}>{t("paymentReturnPendingHint")}</AppText>
          </AppCard>
        ) : null}

        {paymentId ? (
          <AppButton
            label={t("paymentRefreshStatus")}
            onPress={() => {
              void paymentQuery.refetch();
            }}
            variant="secondary"
          />
        ) : null}

        <AppButton label={t("openPayments")} onPress={() => router.replace(routes.app.payments)} />
        <AppButton
          label={t("openSessions")}
          onPress={() => router.replace(routes.app.sessions)}
          variant="secondary"
        />
      </View>
    </AppScreen>
  );
}
