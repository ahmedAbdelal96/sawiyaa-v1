import React, { useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
} from "react-native";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  Button,
  Card,
  Header,
  Input,
  LoadingState,
  Screen,
  Text,
} from "../../../../src/components/ui";
import { useTheme } from "../../../../src/providers/ThemeProvider";
import { usePatientSession } from "../../../../src/features/patient/sessions/hooks";
import {
  useInitiateSessionPayment,
  usePatientSessionPaymentCapabilities,
  usePatientWalletSummary,
  useSessionFinancialBreakdown,
} from "../../../../src/features/patient/payments/hooks";
import { extractHostedCheckoutReturnParams } from "../../../../src/features/patient/payments/return-utils";
import { extractApiErrorMessage } from "../../../../src/lib/api";
import type { PaymobCheckoutMethod } from "../../../../src/features/patient/payments/types";

WebBrowser.maybeCompleteAuthSession();

const CONFIRMED_SESSION_STATUSES = new Set([
  "CONFIRMED",
  "UPCOMING",
  "READY_TO_JOIN",
  "IN_PROGRESS",
  "COMPLETED",
]);

function formatMoney(amount: string, currencyCode: string): string {
  const num = Number(amount);
  if (!Number.isFinite(num)) return `${amount} ${currencyCode.toUpperCase()}`;
  const rounded = parseFloat(num.toFixed(2));
  const str = rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(2);
  const withCommas = str.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${withCommas} ${currencyCode.toUpperCase()}`;
}

function formatDateTime(isoString: string | null, locale: string): string {
  if (!isoString) return "";
  return new Date(isoString).toLocaleString(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: !locale.startsWith("ar"),
  });
}

function isSessionExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() <= Date.now();
}

function toNumber(value: string | null | undefined): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function isConfirmedSessionStatus(status: string | null | undefined): boolean {
  return Boolean(status && CONFIRMED_SESSION_STATUSES.has(status));
}

function resolveBlockedMessageKey(status: string, expiresAt: string | null) {
  if (status === "EXPIRED" || isSessionExpired(expiresAt)) {
    return "patientPaymentsFlow.checkout.sessionExpired";
  }

  if (isConfirmedSessionStatus(status)) {
    return "patientPaymentsFlow.checkout.sessionAlreadyPaid";
  }

  if (status === "REFUND_PENDING") {
    return "patientPaymentsFlow.checkout.sessionRefundPending";
  }

  if (status === "REFUNDED") {
    return "patientPaymentsFlow.checkout.sessionRefunded";
  }

  return "patientPaymentsFlow.checkout.sessionNotPayable";
}

function mapBrowserResultToRedirectStatus(
  resultType: string,
): "canceled" | undefined {
  if (resultType === "cancel") {
    return "canceled";
  }

  return undefined;
}

function toPatientSafePaymentError(input: string, fallback: string): string {
  const normalized = input.trim();
  if (!normalized) {
    return fallback;
  }

  if (/^[A-Z0-9_]+$/.test(normalized) || normalized.includes("PAYMENT_")) {
    return fallback;
  }

  return normalized;
}

export default function SessionPaymentCheckoutScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US";
  const isRtl = i18n.language?.startsWith("ar") ?? false;

  const [couponDraft, setCouponDraft] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [useWalletBalance, setUseWalletBalance] = useState(true);
  const [selectedPaymobMethod, setSelectedPaymobMethod] = useState<
    string | null
  >(null);
  const [flowMessage, setFlowMessage] = useState<string | null>(null);
  const [flowError, setFlowError] = useState<string | null>(null);
  const [isLaunchingCheckout, setIsLaunchingCheckout] = useState(false);

  const sessionQuery = usePatientSession(id ?? null);
  const walletQuery = usePatientWalletSummary();
  const capabilitiesQuery = usePatientSessionPaymentCapabilities(id ?? null);
  const breakdownQuery = useSessionFinancialBreakdown(
    id ?? null,
    appliedCoupon,
  );
  const initiateMutation = useInitiateSessionPayment();

  const wallet = walletQuery.data?.item ?? null;
  const session = sessionQuery.data;
  const capabilities = capabilitiesQuery.data?.item ?? null;
  const breakdown = breakdownQuery.data?.item;

  const walletBalance = wallet?.availableBalance ?? "0";
  const currency = wallet?.currencyCode ?? breakdown?.currency ?? "SAR";
  const nativeReturnUrl = useMemo(
    () =>
      id
        ? Linking.createURL(`/sessions/${id}/payment-return`, {
            scheme: "fayed",
          })
        : null,
    [id],
  );

  const split = useMemo(() => {
    if (!breakdown) {
      return { walletUsed: 0, gatewayRemaining: 0 };
    }

    const total = toNumber(breakdown.netPaidAmount);
    const walletPart = useWalletBalance
      ? Math.min(toNumber(walletBalance), total)
      : 0;
    const gatewayPart = Math.max(total - walletPart, 0);
    return { walletUsed: walletPart, gatewayRemaining: gatewayPart };
  }, [breakdown, useWalletBalance, walletBalance]);

  const payableSession =
    session?.status === "PENDING_PAYMENT" &&
    !isSessionExpired(session.expiresAt ?? null);
  const gatewayPaymentRequired = split.gatewayRemaining > 0;

  const supportedGatewayMethods = useMemo(() => {
    if (!capabilities) return [];

    const supportedKeys = new Set(capabilities.supportedMethods);
    const enabledMethods = capabilities.methods.filter(
      (method) => method.enabled && supportedKeys.has(method.key),
    );

    if (enabledMethods.length > 0) {
      return enabledMethods;
    }

    return capabilities.supportedMethods.map((method) => ({
      key: method,
      label: method,
      type: method,
      enabled: true,
    }));
  }, [capabilities]);

  const defaultGatewayMethod = useMemo(() => {
    if (!capabilities) return null;

    if (
      capabilities.defaultMethod &&
      capabilities.supportedMethods.includes(capabilities.defaultMethod)
    ) {
      return capabilities.defaultMethod;
    }

    return capabilities.supportedMethods[0] ?? null;
  }, [capabilities]);

  const paymobMethodRequired =
    gatewayPaymentRequired &&
    capabilities?.provider === "PAYMOB" &&
    capabilities.checkoutFlow === "legacy" &&
    capabilities.supportedMethods.length > 1;

  useEffect(() => {
    if (!gatewayPaymentRequired) {
      setSelectedPaymobMethod(null);
      return;
    }

    if (!defaultGatewayMethod) return;

    setSelectedPaymobMethod((current) => {
      if (current && capabilities?.supportedMethods.includes(current)) {
        return current;
      }

      return defaultGatewayMethod;
    });
  }, [capabilities, defaultGatewayMethod, gatewayPaymentRequired]);

  const sessionLoading = sessionQuery.isLoading;
  const sessionError = sessionQuery.isError;
  const capabilitiesLoading =
    gatewayPaymentRequired && capabilitiesQuery.isLoading;
  const capabilitiesErrorMsg =
    gatewayPaymentRequired && capabilitiesQuery.isError
      ? extractApiErrorMessage(capabilitiesQuery.error)
      : null;

  const breakdownLoading = breakdownQuery.isLoading && Boolean(id);
  const breakdownErrorMsg = breakdownQuery.isError
    ? extractApiErrorMessage(breakdownQuery.error)
    : null;
  const isPricingUnavailable =
    breakdownQuery.isError &&
    (breakdownErrorMsg?.includes("FINANCIAL_RULE_PRICING_UNAVAILABLE") ||
      breakdownErrorMsg?.includes("السعر غير متاح") ||
      breakdownErrorMsg?.includes("pricing") ||
      breakdownErrorMsg?.includes("unavailable"));

  const loading = sessionLoading || breakdownLoading;
  const hasError = sessionError;
  const loadErrorMessage = extractApiErrorMessage(sessionQuery.error);

  const applyCoupon = () => {
    const value = couponDraft.trim();
    setAppliedCoupon(value.length ? value : null);
  };

  const removeCoupon = () => {
    setCouponDraft("");
    setAppliedCoupon(null);
  };

  const navigateToPaymentReturn = (
    params: Record<string, string | undefined>,
  ) => {
    if (!id) return;

    router.replace({
      pathname: "/(patient)/sessions/[id]/payment-return",
      params: {
        id,
        ...Object.fromEntries(
          Object.entries(params).filter((entry) => Boolean(entry[1])),
        ),
      },
    });
  };

  const openHostedCheckoutRecovery = async (
    checkoutUrl: string,
    providerReference: string | null,
  ) => {
    setIsLaunchingCheckout(true);

    if (nativeReturnUrl) {
      try {
        const result = await WebBrowser.openAuthSessionAsync(
          checkoutUrl,
          nativeReturnUrl,
        );

        if (result.type === "success") {
          const returnParams = extractHostedCheckoutReturnParams(result.url);

          navigateToPaymentReturn({
            ...returnParams,
            recovery: "deeplink",
            browserResult: result.type,
            providerReference:
              returnParams.providerReference ?? providerReference ?? undefined,
          });
          return;
        }

        navigateToPaymentReturn({
          recovery: "browser",
          browserResult: result.type,
          redirect_status: mapBrowserResultToRedirectStatus(result.type),
          providerReference: providerReference ?? undefined,
        });
        return;
      } finally {
        setIsLaunchingCheckout(false);
      }
    }

    try {
      await WebBrowser.openBrowserAsync(checkoutUrl);

      navigateToPaymentReturn({
        recovery: "browser",
        providerReference: providerReference ?? undefined,
      });
    } finally {
      setIsLaunchingCheckout(false);
    }
  };

  const handleInitiatePayment = async () => {
    if (!id || isLaunchingCheckout) return;
    setFlowMessage(null);
    setFlowError(null);

    try {
      const payload = await initiateMutation.mutateAsync({
        sessionId: id,
        input: {
          couponCode: appliedCoupon ?? undefined,
          useWalletBalance,
          paymobMethod:
            gatewayPaymentRequired && capabilities?.provider === "PAYMOB"
              ? ((selectedPaymobMethod ?? defaultGatewayMethod ?? undefined) as
                  | PaymobCheckoutMethod
                  | undefined)
              : undefined,
          returnUrl:
            gatewayPaymentRequired && capabilities?.provider === "PAYMOB"
              ? (nativeReturnUrl ?? undefined)
              : undefined,
        },
      });

      const payment = payload.item;
      const paidByWallet = toNumber(payment.amountFromWallet) > 0;
      const paidByGateway = toNumber(payment.amountFromGateway) > 0;

      if (payment.status === "CAPTURED" || payment.status === "AUTHORIZED") {
        setFlowMessage(t("patientPaymentsFlow.checkout.paymentSuccess"));
        navigateToPaymentReturn({
          redirect_status: "succeeded",
          success: "true",
          pending: "false",
          recovery: "wallet",
          providerReference: payment.providerReference ?? undefined,
        });
        return;
      }

      if (payment.checkoutUrl) {
        setFlowMessage(t("patientPaymentsFlow.checkout.redirecting"));
        await openHostedCheckoutRecovery(
          payment.checkoutUrl,
          payment.providerReference,
        );
        return;
      }

      if (payment.clientSecret) {
        setFlowError(
          t("patientPaymentsFlow.checkout.unsupportedProviderPayload"),
        );
        return;
      }

      if (paidByWallet && !paidByGateway) {
        setFlowMessage(t("patientPaymentsFlow.checkout.paymentSuccess"));
        navigateToPaymentReturn({
          redirect_status: "succeeded",
          success: "true",
          pending: "false",
          recovery: "wallet",
          providerReference: payment.providerReference ?? undefined,
        });
        return;
      }

      setFlowError(t("patientPaymentsFlow.checkout.unresolvedPaymentState"));
    } catch (error) {
      setFlowError(
        toPatientSafePaymentError(
          extractApiErrorMessage(error),
          t("patientPaymentsFlow.checkout.requestFailed"),
        ),
      );
    }
  };

  if (loading) {
    return (
      <Screen bg="background">
        <Header
          showBack
          onBack={() => router.back()}
          title={t("patientPaymentsFlow.checkout.title")}
        />
        <LoadingState fullScreen />
      </Screen>
    );
  }

  if (hasError || !session) {
    return (
      <Screen bg="background">
        <Header
          showBack
          onBack={() => router.back()}
          title={t("patientPaymentsFlow.checkout.title")}
        />
        <View style={styles.centerState}>
          <Text weight="600" style={styles.centerTitle}>
            {loadErrorMessage || t("patientPaymentsFlow.checkout.errorNote")}
          </Text>
          <Button
            title={t("patientPaymentsFlow.checkout.retry")}
            onPress={() => {
              void sessionQuery.refetch();
              void breakdownQuery.refetch();
              void capabilitiesQuery.refetch();
            }}
            variant="secondary"
            style={styles.centerButton}
          />
        </View>
      </Screen>
    );
  }

  if (!payableSession) {
    return (
      <Screen bg="background">
        <Header
          showBack
          onBack={() => router.back()}
          title={t("patientPaymentsFlow.checkout.title")}
        />
        <View style={styles.centerState}>
          <Text weight="600" style={styles.centerTitle}>
            {t(resolveBlockedMessageKey(session.status, session.expiresAt))}
          </Text>
          <Button
            title={t("patientPaymentsFlow.checkout.backToSession")}
            onPress={() => router.replace(`/(patient)/sessions/${session.id}`)}
            style={styles.centerButton}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen bg="background">
      <Header
        showBack
        onBack={() => router.back()}
        title={t("patientPaymentsFlow.checkout.title")}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <Card
          variant="elevated"
          padding="md"
          style={[
            styles.sessionCard,
            isRtl
              ? {
                  borderLeftWidth: 3,
                  borderLeftColor: theme.colors.primary,
                  borderRightWidth: 0,
                }
              : {
                  borderRightWidth: 3,
                  borderRightColor: theme.colors.primary,
                  borderLeftWidth: 0,
                },
          ]}
        >
          <Text weight="bold" style={styles.practitionerName}>
            {session.practitioner.displayName ?? "-"}
          </Text>
          <Text
            color={theme.colors.textSecondary}
            style={styles.practitionerSubtitle}
          >
            {t("patientPaymentsFlow.checkout.practitionerCard.sessionType")}
          </Text>
          <View style={styles.sessionMetaRow}>
            <Ionicons
              name="calendar-outline"
              size={14}
              color={theme.colors.textMuted}
            />
            <Text color={theme.colors.textMuted} style={styles.sessionMetaText}>
              {formatDateTime(session.scheduledStartAt, locale)}
            </Text>
          </View>
        </Card>

        <Card variant="flat" padding="md" style={styles.sectionCard}>
          <Text weight="600" style={styles.sectionTitle}>
            {t("patientPaymentsFlow.checkout.coupon.label")}
          </Text>
          <View style={styles.couponRow}>
            <Input
              value={couponDraft}
              onChangeText={setCouponDraft}
              placeholder={t("patientPaymentsFlow.checkout.coupon.placeholder")}
              style={styles.couponInput}
            />
            {!appliedCoupon ? (
              <TouchableOpacity
                style={[
                  styles.couponAction,
                  { backgroundColor: theme.colors.primary },
                ]}
                onPress={applyCoupon}
              >
                <Text color="#fff" weight="600" style={styles.couponActionText}>
                  {t("patientPaymentsFlow.checkout.coupon.apply")}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.couponAction,
                  { backgroundColor: theme.colors.surfaceSecondary },
                ]}
                onPress={removeCoupon}
              >
                <Text
                  color={theme.colors.textPrimary}
                  weight="600"
                  style={styles.couponActionText}
                >
                  {t("patientPaymentsFlow.checkout.coupon.remove")}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          {appliedCoupon ? (
            <Text color={theme.colors.primary} style={styles.couponAppliedText}>
              {t("patientPaymentsFlow.checkout.coupon.applied", {
                code: appliedCoupon,
              })}
            </Text>
          ) : null}
        </Card>

        <Card variant="flat" padding="md" style={styles.sectionCard}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleTextWrap}>
              <Text weight="600" style={styles.sectionTitle}>
                {t("patientPaymentsFlow.checkout.walletToggle.label")}
              </Text>
              <Text color={theme.colors.textMuted} style={styles.toggleHint}>
                {toNumber(walletBalance) > 0
                  ? t("patientPaymentsFlow.checkout.walletToggle.available", {
                      amount: formatMoney(walletBalance, currency),
                    })
                  : t("patientPaymentsFlow.checkout.walletToggle.noBalance")}
              </Text>
            </View>
            <Switch
              value={useWalletBalance && toNumber(walletBalance) > 0}
              onValueChange={setUseWalletBalance}
              disabled={toNumber(walletBalance) <= 0}
              thumbColor="#ffffff"
              trackColor={{
                false: theme.colors.borderStrong,
                true: theme.colors.primary,
              }}
            />
          </View>
        </Card>

        <Card variant="elevated" padding="md" style={styles.sectionCard}>
          <Text weight="bold" style={styles.sectionTitle}>
            {t("patientPaymentsFlow.checkout.breakdown.title")}
          </Text>

          {breakdownLoading ? (
            <LoadingState />
          ) : breakdownErrorMsg ? (
            <View
              style={[
                styles.pricingErrorBox,
                { backgroundColor: theme.colors.surfaceSecondary },
              ]}
            >
              <Ionicons
                name="alert-circle-outline"
                size={18}
                color={theme.colors.textMuted}
              />
              <Text
                color={theme.colors.textMuted}
                style={styles.pricingErrorText}
              >
                {isPricingUnavailable
                  ? t("patientPaymentsFlow.checkout.pricingUnavailableNote")
                  : breakdownErrorMsg}
              </Text>
            </View>
          ) : breakdown ? (
            <>
              <View style={styles.amountRow}>
                <Text color={theme.colors.textSecondary}>
                  {t("patientPaymentsFlow.checkout.breakdown.sessionFee")}
                </Text>
                <Text weight="600">
                  {formatMoney(breakdown.grossAmount, breakdown.currency)}
                </Text>
              </View>

              <View style={styles.amountRow}>
                <Text color={theme.colors.textSecondary}>
                  {t("patientPaymentsFlow.checkout.breakdown.discount")}
                </Text>
                <Text
                  weight="600"
                  color={
                    toNumber(breakdown.discountAmount) > 0
                      ? theme.colors.primary
                      : theme.colors.textPrimary
                  }
                >
                  {toNumber(breakdown.discountAmount) > 0 ? "-" : ""}
                  {formatMoney(breakdown.discountAmount, breakdown.currency)}
                </Text>
              </View>

              <View style={styles.amountRow}>
                <Text color={theme.colors.textSecondary}>
                  {t("patientPaymentsFlow.checkout.breakdown.walletDeduction")}
                </Text>
                <Text weight="600" color={theme.colors.primary}>
                  {formatMoney(split.walletUsed.toFixed(2), breakdown.currency)}
                </Text>
              </View>

              <View style={[styles.amountRow, styles.totalRow]}>
                <Text weight="bold">
                  {t("patientPaymentsFlow.checkout.breakdown.total")}
                </Text>
                <Text weight="bold" style={styles.totalAmount}>
                  {formatMoney(breakdown.netPaidAmount, breakdown.currency)}
                </Text>
              </View>

              <View
                style={[
                  styles.clarityBox,
                  { backgroundColor: theme.colors.surfaceSecondary },
                ]}
              >
                <Text
                  color={theme.colors.textSecondary}
                  style={styles.clarityLabel}
                >
                  {t("patientPaymentsFlow.checkout.state.walletPart")}
                </Text>
                <Text weight="600" style={styles.clarityAmount}>
                  {formatMoney(split.walletUsed.toFixed(2), breakdown.currency)}
                </Text>
                <Text
                  color={theme.colors.textSecondary}
                  style={styles.clarityLabel}
                >
                  {t("patientPaymentsFlow.checkout.state.gatewayPart")}
                </Text>
                <Text weight="600" style={styles.clarityAmount}>
                  {formatMoney(
                    split.gatewayRemaining.toFixed(2),
                    breakdown.currency,
                  )}
                </Text>
                <Text
                  color={theme.colors.textMuted}
                  style={styles.gatewayNotice}
                >
                  {split.gatewayRemaining > 0
                    ? t("patientPaymentsFlow.checkout.browserReturnNotice")
                    : t("patientPaymentsFlow.checkout.state.walletOnly")}
                </Text>
              </View>
            </>
          ) : null}
        </Card>

        <Card variant="flat" padding="md" style={styles.sectionCard}>
          <Text weight="bold" style={styles.sectionTitle}>
            {t("patientPaymentsFlow.checkout.paymentMethod.title")}
          </Text>

          {!gatewayPaymentRequired ? (
            <View style={styles.methodRow}>
              <Ionicons
                name="wallet-outline"
                size={18}
                color={theme.colors.primary}
              />
              <View style={styles.methodTextWrap}>
                <Text weight="600">
                  {t("patientPaymentsFlow.checkout.paymentMethod.wallet")}
                </Text>
                <Text color={theme.colors.textMuted} style={styles.methodHint}>
                  {t("patientPaymentsFlow.checkout.state.walletOnly")}
                </Text>
              </View>
            </View>
          ) : capabilitiesLoading ? (
            <Text color={theme.colors.textMuted} style={styles.methodHint}>
              {t("patientPaymentsFlow.checkout.paymentMethod.loadingMethods")}
            </Text>
          ) : capabilitiesErrorMsg ? (
            <Text color="#ba1a1a" style={styles.methodHint}>
              {capabilitiesErrorMsg}
            </Text>
          ) : (
            <>
              <View style={styles.methodRow}>
                <Ionicons
                  name="card-outline"
                  size={18}
                  color={theme.colors.primary}
                />
                <View style={styles.methodTextWrap}>
                  <Text weight="600">
                    {t(
                      `patientPaymentsFlow.paymentCard.provider.${capabilities?.provider ?? "PAYMOB"}` as const,
                    )}
                  </Text>
                  <Text
                    color={theme.colors.textMuted}
                    style={styles.methodHint}
                  >
                    {paymobMethodRequired
                      ? t(
                          "patientPaymentsFlow.checkout.paymentMethod.methodRequired",
                        )
                      : t(
                          "patientPaymentsFlow.checkout.paymentMethod.gatewayHint",
                        )}
                  </Text>
                </View>
              </View>

              {paymobMethodRequired ? (
                <View style={styles.methodOptionsWrap}>
                  {supportedGatewayMethods.map((method) => {
                    const isSelected = selectedPaymobMethod === method.key;

                    return (
                      <TouchableOpacity
                        key={method.key}
                        activeOpacity={0.85}
                        onPress={() => setSelectedPaymobMethod(method.key)}
                        style={[
                          styles.methodOption,
                          {
                            backgroundColor: isSelected
                              ? theme.colors.primaryLight
                              : theme.colors.surfaceSecondary,
                            borderColor: isSelected
                              ? theme.colors.primary
                              : theme.colors.borderLight,
                          },
                        ]}
                      >
                        <Text
                          weight="600"
                          color={
                            isSelected
                              ? theme.colors.primary
                              : theme.colors.textPrimary
                          }
                        >
                          {method.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : defaultGatewayMethod ? (
                <Text
                  color={theme.colors.textMuted}
                  style={styles.methodSelected}
                >
                  {t("patientPaymentsFlow.checkout.paymentMethod.selected", {
                    method:
                      supportedGatewayMethods.find(
                        (method) => method.key === defaultGatewayMethod,
                      )?.label ?? defaultGatewayMethod,
                  })}
                </Text>
              ) : (
                <Text color="#ba1a1a" style={styles.methodHint}>
                  {t(
                    "patientPaymentsFlow.checkout.paymentMethod.methodUnavailable",
                  )}
                </Text>
              )}
            </>
          )}

          <View style={styles.trustRow}>
            <View style={styles.trustItem}>
              <Ionicons
                name="lock-closed-outline"
                size={12}
                color={theme.colors.textMuted}
              />
              <Text color={theme.colors.textMuted} style={styles.trustText}>
                {t("patientPaymentsFlow.checkout.trustBadges.secure")}
              </Text>
            </View>
            <View style={styles.trustItem}>
              <Ionicons
                name="checkmark-circle-outline"
                size={12}
                color={theme.colors.textMuted}
              />
              <Text color={theme.colors.textMuted} style={styles.trustText}>
                {t("patientPaymentsFlow.checkout.trustBadges.moh")}
              </Text>
            </View>
          </View>
        </Card>

        {flowMessage ? (
          <Card variant="flat" padding="sm" style={styles.feedbackCard}>
            <Text color={theme.colors.primary}>{flowMessage}</Text>
          </Card>
        ) : null}

        {flowError ? (
          <Card variant="flat" padding="sm" style={styles.feedbackCard}>
            <Text color="#ba1a1a">{flowError}</Text>
          </Card>
        ) : null}
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.borderLight,
          },
        ]}
      >
        <View style={styles.bottomSummary}>
          <Text
            color={theme.colors.textMuted}
            style={styles.bottomSummaryLabel}
          >
            {t("patientPaymentsFlow.checkout.confirmButton")}
          </Text>
          <Text weight="bold" style={styles.bottomSummaryAmount}>
            {breakdown
              ? formatMoney(breakdown.netPaidAmount, breakdown.currency)
              : breakdownErrorMsg
                ? t("patientPaymentsFlow.checkout.pricingUnavailableShort")
                : "-"}
          </Text>
        </View>
        <Button
          title={
            initiateMutation.isPending || isLaunchingCheckout
              ? t("patientPaymentsFlow.checkout.processing")
              : t("patientPaymentsFlow.checkout.confirmButton")
          }
          onPress={handleInitiatePayment}
          disabled={
            initiateMutation.isPending ||
            isLaunchingCheckout ||
            !breakdown ||
            breakdownLoading ||
            capabilitiesLoading ||
            Boolean(capabilitiesErrorMsg) ||
            (paymobMethodRequired && !selectedPaymobMethod)
          }
          style={styles.confirmButton}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 180,
    gap: 12,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  centerTitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 16,
  },
  centerButton: {
    maxWidth: 260,
  },
  sessionCard: {
    marginBottom: 0,
  },
  practitionerName: { fontSize: 20, marginBottom: 4 },
  practitionerSubtitle: { fontSize: 13, marginBottom: 8 },
  sessionMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sessionMetaText: { fontSize: 12 },
  sectionCard: { marginBottom: 0 },
  sectionTitle: { fontSize: 15, marginBottom: 8 },
  couponRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  couponInput: {
    marginBottom: 0,
  },
  couponAction: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
  },
  couponActionText: { fontSize: 13 },
  couponAppliedText: { fontSize: 12, marginTop: 8 },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  toggleTextWrap: { flex: 1 },
  toggleHint: { fontSize: 12 },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: "#d8dee8",
    paddingTop: 10,
    marginTop: 2,
    marginBottom: 8,
  },
  totalAmount: { fontSize: 20 },
  clarityBox: {
    borderRadius: 10,
    padding: 10,
    gap: 2,
  },
  clarityLabel: { fontSize: 12 },
  clarityAmount: { fontSize: 14, marginBottom: 4 },
  gatewayNotice: { fontSize: 11, marginTop: 4 },
  methodRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  methodTextWrap: { flex: 1 },
  methodHint: { fontSize: 12, marginTop: 2 },
  methodOptionsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  methodOption: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  methodSelected: {
    fontSize: 12,
    marginTop: 12,
  },
  trustRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    gap: 8,
  },
  trustItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  trustText: { fontSize: 11 },
  feedbackCard: { marginBottom: 0 },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  bottomSummary: { flex: 1 },
  bottomSummaryLabel: { fontSize: 11 },
  bottomSummaryAmount: { fontSize: 18 },
  confirmButton: { flex: 1.1 },
  pricingErrorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
  },
  pricingErrorText: { flex: 1, fontSize: 13, lineHeight: 20 },
});
