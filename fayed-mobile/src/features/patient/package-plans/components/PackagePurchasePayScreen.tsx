import React, { useMemo, useState } from "react";
import { Linking, ScrollView, StyleSheet, Switch, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import {
  Button,
  Card,
  DetailPageScaffold,
  EmptyState,
  SectionHeader,
  StatusChip,
  SummaryRow,
  Text,
} from "../../../../components/ui";
import { useTheme } from "../../../../providers/ThemeProvider";
import { extractApiErrorMessage } from "../../../../lib/api";
import { normalizeAllowedExternalUrl } from "../../../../lib/external-url";
import { useInitiatePackagePurchasePayment, useMyPackagePurchase, usePackageRefundPolicy } from "../hooks";
import {
  canContinuePackagePurchasePayment,
  formatMoney,
  getPackagePurchaseCompletionCount,
  isPackagePurchasePaymentExpired,
} from "../lib";

function getStatusTone(status: string | null | undefined) {
  switch (status) {
    case "ACTIVE":
      return "success" as const;
    case "PENDING_PAYMENT":
      return "warning" as const;
    case "COMPLETED":
      return "default" as const;
    default:
      return "default" as const;
  }
}

export default function PackagePurchasePayScreen({
  purchaseId,
}: {
  purchaseId: string;
}) {
  const router = useRouter();
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US";
  const purchaseQuery = useMyPackagePurchase(purchaseId);
  const purchase = purchaseQuery.data?.item ?? null;
  const initiateMutation = useInitiatePackagePurchasePayment();
  const [accepted, setAccepted] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const refundPolicyQuery = usePackageRefundPolicy("PACKAGE", {
    enabled: Boolean(purchase?.status === "PENDING_PAYMENT"),
  });
  const refundPolicy = refundPolicyQuery.data?.item ?? null;

  const canContinuePayment = useMemo(
    () => Boolean(purchase && canContinuePackagePurchasePayment(purchase)),
    [purchase],
  );

  if (purchaseQuery.isLoading) {
    return (
      <DetailPageScaffold
        title={t("packagePurchases.pay.title", "Payment")}
        showBack
        onBack={() => router.back()}
        loading
        loadingMessage={t("packagePurchases.pay.loading", "Loading payment...")}
      >
        <View />
      </DetailPageScaffold>
    );
  }

  if (purchaseQuery.isError || !purchase) {
    return (
      <DetailPageScaffold
        title={t("packagePurchases.pay.title", "Payment")}
        showBack
        onBack={() => router.back()}
        error={purchaseQuery.isError}
        errorTitle={t("packagePurchases.pay.errorTitle", "We could not load the payment")}
        errorMessage={t("packagePurchases.pay.errorMessage", "Please try again in a moment.")}
        onRetry={() => purchaseQuery.refetch()}
        retryText={t("packagePurchases.pay.retry", "Try again")}
      >
        <View />
      </DetailPageScaffold>
    );
  }

  const paymentExpired = isPackagePurchasePaymentExpired(purchase);
  const completionCount = getPackagePurchaseCompletionCount(purchase);

  const handleContinue = async () => {
    setLocalError(null);

    if (!refundPolicy) {
      setLocalError(
        t("packagePurchases.pay.refundPolicyMissing", "Package refund policy is not available right now."),
      );
      return;
    }

    if (!accepted) {
      setLocalError(
        t(
          "packagePurchases.pay.acceptRefundPolicy",
          "Please confirm that you accept the package refund policy before continuing.",
        ),
      );
      return;
    }

    try {
      const response = await initiateMutation.mutateAsync({
        purchaseId,
        input: {
          acceptedRefundPolicyId: refundPolicy.id,
        },
      });

      const payment = response.item;

      if (payment.status === "CAPTURED" || payment.status === "AUTHORIZED") {
        router.replace(`/(patient)/package-purchases/${purchaseId}` as never);
        return;
      }

      if (payment.checkoutUrl) {
        const safeUrl = normalizeAllowedExternalUrl(payment.checkoutUrl);
        if (!safeUrl) {
          setLocalError(
            t("packagePurchases.pay.unsupportedRedirect", "We could not open the payment link."),
          );
          return;
        }

        setIsRedirecting(true);
        await Linking.openURL(safeUrl);
        router.replace(`/(patient)/package-purchases/${purchaseId}` as never);
        return;
      }

      if (payment.clientSecret) {
        setLocalError(
          t(
            "packagePurchases.pay.nativeUnsupported",
            "This payment method requires a native card flow that is not enabled yet.",
          ),
        );
        return;
      }

      router.replace(`/(patient)/package-purchases/${purchaseId}` as never);
    } catch (error) {
      setLocalError(extractApiErrorMessage(error));
    } finally {
      setIsRedirecting(false);
    }
  };

  return (
    <DetailPageScaffold
      title={t("packagePurchases.pay.title", "Payment")}
      showBack
      onBack={() => router.back()}
      contentContainerStyle={styles.scaffold}
    >
      <View style={styles.stack}>
        <Card variant="elevated" padding="lg" style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroMeta}>
              <Text weight="bold" style={styles.heroTitle}>
                {purchase.planCode}
              </Text>
              <Text color={theme.colors.textSecondary} style={styles.heroSubtitle}>
                {t("packagePurchases.pay.subtitle", "Complete the package payment securely.")}
              </Text>
            </View>
            <StatusChip label={purchase.status} tone={getStatusTone(purchase.status)} showDot={false} />
          </View>
          <View style={styles.paymentSummary}>
            <SummaryRow
              label={t("packagePurchases.pay.total", "Total")}
              value={formatMoney(purchase.patientPayableTotal, purchase.selectedCurrencyCode, locale)}
            />
            <SummaryRow
              label={t("packagePurchases.pay.progress", "Progress")}
              value={`${completionCount}/${purchase.sessionCount}`}
            />
            <SummaryRow
              label={t("packagePurchases.pay.paymentExpiry", "Payment expiry")}
              value={purchase.paymentExpiresAt ? purchase.paymentExpiresAt : "-"}
              helperText={
                paymentExpired
                  ? t("packagePurchases.pay.expired", "This payment window has expired.")
                  : t("packagePurchases.pay.active", "This payment window is still active.")
              }
            />
          </View>
        </Card>

        <Card variant="elevated" padding="lg" style={styles.sectionCard}>
          <SectionHeader
            title={t("packagePurchases.pay.refundTitle", "Refund policy")}
            subtitle={t(
              "packagePurchases.pay.refundSubtitle",
              "Please confirm the package refund policy before continuing.",
            )}
          />
          {refundPolicyQuery.isLoading ? (
            <Text color={theme.colors.textSecondary} style={styles.helperText}>
              {t("packagePurchases.pay.refundLoading", "Loading refund policy...")}
            </Text>
          ) : refundPolicy ? (
            <Card variant="outlined" padding="md" style={styles.policyCard}>
              <Text weight="600" style={styles.policyTitle}>
                {refundPolicy.titleEn ?? refundPolicy.titleAr ?? refundPolicy.key}
              </Text>
              <Text color={theme.colors.textSecondary} style={styles.policyMeta}>
                {t("packagePurchases.pay.policyClauses", {
                  count: refundPolicy.clauseCount,
                  defaultValue:
                    refundPolicy.clauseCount === 1
                      ? "1 clause"
                      : `${refundPolicy.clauseCount} clauses`,
                })}
              </Text>
              <View style={styles.acceptRow}>
                <Switch
                  value={accepted}
                  onValueChange={setAccepted}
                  thumbColor="#ffffff"
                  trackColor={{
                    false: theme.colors.borderStrong,
                    true: theme.colors.primary,
                  }}
                />
                <Text color={theme.colors.textSecondary} style={styles.acceptText}>
                  {t(
                    "packagePurchases.pay.acceptNote",
                    "I accept the package refund policy.",
                  )}
                </Text>
              </View>
            </Card>
          ) : (
            <Text color={theme.colors.textSecondary} style={styles.helperText}>
              {t("packagePurchases.pay.refundUnavailable", "The refund policy is unavailable right now.")}
            </Text>
          )}
        </Card>

        {localError ? (
          <Card variant="flat" padding="sm" style={styles.noticeCard}>
            <Text color="#ba1a1a">{localError}</Text>
          </Card>
        ) : null}

        {isRedirecting ? (
          <Card variant="flat" padding="sm" style={styles.noticeCard}>
            <Text color={theme.colors.textSecondary}>
              {t("packagePurchases.pay.redirecting", "Redirecting to payment...")}
            </Text>
          </Card>
        ) : null}
      </View>

      <View style={styles.footer}>
        <Button
          title={
            initiateMutation.isPending || isRedirecting
              ? t("packagePurchases.pay.processing", "Processing...")
              : t("packagePurchases.pay.continue", "Continue to payment")
          }
          onPress={handleContinue}
          disabled={
            initiateMutation.isPending ||
            isRedirecting ||
            !purchase ||
            !canContinuePayment ||
            refundPolicyQuery.isLoading ||
            !refundPolicy ||
            !accepted
          }
        />
      </View>
    </DetailPageScaffold>
  );
}

const styles = StyleSheet.create({
  scaffold: {
    paddingBottom: 84,
  },
  stack: {
    gap: 14,
  },
  heroCard: {
    marginHorizontal: 0,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  heroMeta: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 22,
    lineHeight: 30,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 22,
    marginTop: 6,
  },
  paymentSummary: {
    marginTop: 12,
  },
  sectionCard: {
    marginHorizontal: 0,
  },
  helperText: {
    fontSize: 13,
    lineHeight: 20,
  },
  policyCard: {
    marginHorizontal: 0,
    marginTop: 12,
  },
  policyTitle: {
    fontSize: 15,
  },
  policyMeta: {
    fontSize: 12,
    marginTop: 4,
  },
  acceptRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
  },
  acceptText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  noticeCard: {
    marginHorizontal: 0,
  },
  footer: {
    marginTop: 10,
  },
});
