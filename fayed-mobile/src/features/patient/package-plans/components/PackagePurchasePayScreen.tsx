import React, { useEffect, useMemo, useState } from "react";
import { I18nManager, Platform, StyleSheet, Switch, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  Button,
  Card,
  DetailPageScaffold,
  ScreenHeading,
  SectionHeader,
  StatusChip,
  SummaryRow,
  Text,
} from "../../../../components/ui";
import { useTheme } from "../../../../providers/ThemeProvider";
import { resolveSupportedCurrencyCode } from "../../../../lib/currency";
import { normalizeAllowedExternalUrl } from "../../../../lib/external-url";
import { useInitiatePackagePurchasePayment, useMyPackagePurchase, usePackageRefundPolicy } from "../hooks";
import { isInvalidPaymentReturnUrlError, logPaymentInitiationError } from "../../payments/payment-initiation-errors";
import {
  canContinuePackagePurchasePayment,
  formatDatetime,
  formatMoney,
  getPackagePurchaseCompletionCount,
  getPackagePurchaseStatusTone,
  getPackagePurchaseStatusTranslationKey,
  isPackagePurchasePaymentExpired,
  resolvePackagePurchasePlanCount,
  warnPackagePurchaseContractMismatch,
} from "../lib";

WebBrowser.maybeCompleteAuthSession();

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
  const planCountFromCode = purchase ? resolvePackagePurchasePlanCount(purchase.planCode) : null;
  const hasPlanMismatch = Boolean(
    purchase &&
      planCountFromCode !== null &&
      planCountFromCode !== purchase.sessionCount,
  );

  useEffect(() => {
    if (!purchase || !hasPlanMismatch) {
      return;
    }

    warnPackagePurchaseContractMismatch({
      purchaseId: purchase.id,
      planCode: purchase.planCode,
      sessionCount: purchase.sessionCount,
      linkedSessionsCount: purchase.linkedSessions.totalItems,
    });
  }, [
    hasPlanMismatch,
    purchase,
    purchase?.id,
    purchase?.linkedSessions.totalItems,
    purchase?.planCode,
    purchase?.sessionCount,
  ]);

  const canContinuePayment = useMemo(
    () => Boolean(purchase && canContinuePackagePurchasePayment(purchase)),
    [purchase],
  );
  const paymentReturnUrl = useMemo(() => {
    if (!purchaseId) {
      return null;
    }

    const paymentReturnPath = `/package-purchases/${purchaseId}/pay`;

    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.location?.origin) {
        return `${window.location.origin}${paymentReturnPath}`;
      }

      return null;
    }

    return Linking.createURL(paymentReturnPath, {
      scheme: "fayed",
    });
  }, [purchaseId]);

  if (purchaseQuery.isLoading) {
    return (
      <DetailPageScaffold
        showBack
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
        showBack
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
  const currency = resolveSupportedCurrencyCode({
    currencyCode: purchase.selectedCurrencyCode,
    regionalPricingMode: purchase.regionalPricingMode,
    resolvedCountryIsoCode: purchase.resolvedCountryIsoCode,
  });
  const title = t("packagePurchases.plans.generic", {
    count: purchase.sessionCount,
    defaultValue: `${purchase.sessionCount} session package`,
  });

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
          returnUrl: paymentReturnUrl ?? undefined,
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
          setLocalError(t("packagePurchases.pay.unsupportedRedirect", "We could not open the payment link."));
          return;
        }

        setIsRedirecting(true);

        if (Platform.OS === "web") {
          window.location.assign(safeUrl);
          return;
        }

        if (!paymentReturnUrl) {
          setLocalError(t("packagePurchases.pay.unsupportedRedirect", "We could not open the payment link."));
          return;
        }

        try {
          const result = await WebBrowser.openAuthSessionAsync(
            safeUrl,
            paymentReturnUrl,
          );

          if (result.type === "success") {
            await purchaseQuery.refetch();
            router.replace(`/(patient)/package-purchases/${purchaseId}` as never);
            return;
          }

          setLocalError(
            t(
              "packagePurchases.pay.openFailed",
              "Could not open the payment page. Please try again.",
            ),
          );
        } catch (error) {
          if (__DEV__) {
            console.error("Failed to open package checkout", error);
          }

          setLocalError(
            t(
              "packagePurchases.pay.openFailed",
              "Could not open the payment page. Please try again.",
            ),
          );
        }
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
      logPaymentInitiationError("package-payment-initiation", error);

      if (isInvalidPaymentReturnUrlError(error)) {
        setLocalError(
          t("packagePurchases.pay.unsupportedRedirect", "We could not open the payment link."),
        );
        return;
      }

      setLocalError(
        t("packagePurchases.pay.openFailed", "Could not open the payment page. Please try again."),
      );
    } finally {
      setIsRedirecting(false);
    }
  };

  return (
    <DetailPageScaffold
      showBack
      contentContainerStyle={styles.scaffold}
    >
      <View style={styles.stack}>
        <ScreenHeading
          title={t("packagePurchases.pay.headingTitle")}
          subtitle={t("packagePurchases.pay.headingSubtitle")}
          titleVariant="h2"
        />
        <Card variant="elevated" padding="lg" style={styles.heroCard}>
          <View style={[styles.heroTopRow, I18nManager.isRTL && styles.heroTopRowRtl]}>
            <View style={styles.heroMeta}>
              <Text weight="bold" style={styles.heroTitle}>
                {title}
              </Text>
              <Text color={theme.colors.textSecondary} style={styles.heroSubtitle}>
                {t("packagePurchases.pay.subtitle", "Complete the package payment securely.")}
              </Text>
            </View>
            <StatusChip
              label={t(getPackagePurchaseStatusTranslationKey(purchase.status), {
                defaultValue: purchase.status,
              })}
              tone={getPackagePurchaseStatusTone(purchase.status)}
              showDot={false}
            />
          </View>
          <View style={styles.paymentSummary}>
            <SummaryRow
              label={t("packagePurchases.pay.total")}
              value={formatMoney(purchase.patientPayableTotal, currency, locale)}
            />
            <SummaryRow
              label={t("packagePurchases.pay.progress")}
              value={`${completionCount}/${purchase.sessionCount}`}
            />
            {purchase.status === "PENDING_PAYMENT" ? (
              <SummaryRow
                label={t("packagePurchases.pay.paymentDueBy")}
                value={purchase.paymentExpiresAt ? formatDatetime(purchase.paymentExpiresAt, locale) : "-"}
                helperText={
                  paymentExpired
                    ? t("packagePurchases.pay.paymentExpired")
                    : t("packagePurchases.pay.paymentDueByHelper")
                }
              />
            ) : null}
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
                {i18n.language?.startsWith("ar")
                  ? (refundPolicy.titleAr ?? refundPolicy.titleEn ?? refundPolicy.key)
                  : (refundPolicy.titleEn ?? refundPolicy.titleAr ?? refundPolicy.key)}
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
              <View style={[styles.acceptRow, I18nManager.isRTL && styles.acceptRowRtl]}>
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
  heroTopRowRtl: {
    flexDirection: "row-reverse",
  },
  heroMeta: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 18,
    lineHeight: 24,
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
  noticeCard: {
    marginHorizontal: 0,
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
  acceptRowRtl: {
    flexDirection: "row-reverse",
  },
  acceptText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  footer: {
    marginTop: 10,
  },
});

