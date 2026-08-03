import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Platform,
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
  ScreenHeading,
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
import { useRefundPolicy } from "../../../../src/features/patient/refund-policies/hooks";
import { extractHostedCheckoutReturnParams } from "../../../../src/features/patient/payments/return-utils";
import { extractApiErrorMessage } from "../../../../src/lib/api";
import { formatMoney as formatCentralMoney, parseMoney } from "../../../../src/lib/money";
import { normalizeAllowedExternalUrl } from "../../../../src/lib/external-url";
import { formatViewerDateTime } from "../../../../src/lib/time-formatting";
import { trackAnalyticsEvent } from "../../../../src/lib/analytics";
import { logPaymentInitiationError } from "../../../../src/features/patient/payments/payment-initiation-errors";
import type {
  PaymobCheckoutMethod,
  SessionPaymentCapabilityMethod,
} from "../../../../src/features/patient/payments/types";
import {
  classifyCouponError,
  normalizePromoCodeInput,
} from "../../../../src/features/patient/payments/coupon-utils";

WebBrowser.maybeCompleteAuthSession();

const CONFIRMED_SESSION_STATUSES = new Set([
  "UPCOMING",
  "UPCOMING",
  "READY_TO_JOIN",
  "IN_PROGRESS",
  "COMPLETED",
]);

function formatMoney(amount: string, currencyCode: string | null | undefined, locale: string): string {
  const money = parseMoney(amount, currencyCode);
  return money ? formatCentralMoney(money, locale) : "-";
}

function formatDateTime(isoString: string | null, locale: string): string {
  if (!isoString) return "";
  return formatViewerDateTime(isoString, { locale });
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

function getRefundPolicyTitle(
  policy: { titleAr: string | null; titleEn: string | null; key: string } | null,
  locale: string,
) {
  if (!policy) return "";
  const isArabic = locale.startsWith("ar");
  return isArabic ? policy.titleAr ?? policy.titleEn ?? policy.key : policy.titleEn ?? policy.titleAr ?? policy.key;
}

function getProviderDisplayName(provider: string | null | undefined): string {
  if (provider === "PAYMOB") return "Paymob";
  if (provider === "STRIPE") return "Stripe";
  if (provider === "INTERNAL_WALLET") return "Wallet";
  return "-";
}

function normalizeCapabilityMethods(
  capabilities: {
    normalizedMethods?: SessionPaymentCapabilityMethod[];
    methods: SessionPaymentCapabilityMethod[];
    supportedMethods: string[];
  } | null,
) {
  if (!capabilities) return [];

  const source =
    capabilities.normalizedMethods && capabilities.normalizedMethods.length > 0
      ? capabilities.normalizedMethods
      : capabilities.methods;

  const supported = new Set(capabilities.supportedMethods);
  return source.filter((method) => {
    if (!method.enabled) return false;
    // Product decision: hide postponed/unconfirmed methods.
    if (method.key === "MEEZA" || method.key === "FAWRY") return false;
    if (method.key === "FAYED_WALLET") return false;
    return supported.size === 0 || supported.has(method.key);
  });
}

function isPaymobMethodKey(value: string | null | undefined): value is PaymobCheckoutMethod {
  return value === "CARD" || value === "WALLET";
}

function RefundPolicyModal({
  visible,
  policy,
  locale,
  onClose,
  onAccept,
  t,
}: {
  visible: boolean;
  policy: {
    titleAr: string | null;
    titleEn: string | null;
    key: string;
    clauseCount: number;
    clauses: Array<{
      titleAr: string | null;
      titleEn: string | null;
      bodyAr: string;
      bodyEn: string;
      sortOrder: number;
    }>;
  } | null;
  locale: string;
  onClose: () => void;
  onAccept: () => void;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  const { theme } = useTheme();
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [scrollViewportHeight, setScrollViewportHeight] = useState(0);
  const [scrollContentHeight, setScrollContentHeight] = useState(0);

  useEffect(() => {
    if (visible) {
      setScrolledToEnd(false);
      setAgreed(false);
    }
  }, [visible]);

  useEffect(() => {
    if (
      scrollViewportHeight > 0 &&
      scrollContentHeight > 0 &&
      scrollContentHeight <= scrollViewportHeight + 24
    ) {
      setScrolledToEnd(true);
    }
  }, [scrollContentHeight, scrollViewportHeight]);

  if (!policy) return null;

  const isArabic = locale.startsWith("ar");
  const title = getRefundPolicyTitle(policy, locale);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderText}>
              <Text weight="bold" style={styles.modalEyebrow}>
                {t("patientPaymentsFlow.checkout.refundPolicy.modalEyebrow")}
              </Text>
              <Text weight="bold" style={styles.modalTitle}>
                {title}
              </Text>
              <Text color="#6b7280" style={styles.modalSubtitle}>
                {t("patientPaymentsFlow.checkout.refundPolicy.modalSubtitle", {
                  count: policy.clauseCount,
                  defaultValue:
                    policy.clauseCount === 1 ? "1 clause" : `${policy.clauseCount} clauses`,
                })}
              </Text>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t("patientPaymentsFlow.checkout.refundPolicy.closeModal")}
              onPress={onClose}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={20} color="#1f2937" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
            onLayout={({ nativeEvent }) => {
              setScrollViewportHeight(nativeEvent.layout.height);
            }}
            onContentSizeChange={(_, contentHeight) => {
              setScrollContentHeight(contentHeight);
            }}
            onScroll={({ nativeEvent }) => {
              const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
              const reachedEnd =
                layoutMeasurement.height + contentOffset.y >= contentSize.height - 24;
              setScrolledToEnd(reachedEnd);
            }}
            scrollEventThrottle={16}
          >
            <Text color="#6b7280" style={styles.modalIntro}>
              {t("patientPaymentsFlow.checkout.refundPolicy.modalIntro")}
            </Text>

            <View style={styles.modalClausesList}>
              {policy.clauses
                .slice()
                .sort((left, right) => left.sortOrder - right.sortOrder)
                .map((clause, index) => (
                  <View key={index} style={styles.modalClauseItem}>
                    <Text weight="bold" style={styles.modalClauseTitle}>
                      {isArabic ? clause.titleAr ?? clause.titleEn ?? "" : clause.titleEn ?? clause.titleAr ?? ""}
                    </Text>
                    <Text color="#4b5563" style={styles.modalClauseBody}>
                      {isArabic ? clause.bodyAr : clause.bodyEn}
                    </Text>
                  </View>
                ))}
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => {
                if (!scrolledToEnd) return;
                setAgreed((current) => !current);
              }}
              disabled={!scrolledToEnd}
              style={[
                styles.modalAcceptRow,
                {
                  backgroundColor: scrolledToEnd ? theme.colors.primaryLight : "#f3f4f6",
                  borderColor: scrolledToEnd ? theme.colors.primary : "#d9e0e6",
                },
              ]}
            >
              <View
                style={[
                  styles.modalCheckbox,
                  {
                    borderColor: scrolledToEnd ? theme.colors.primary : "#d9e0e6",
                    backgroundColor: agreed ? theme.colors.primary : "#fff",
                  },
                ]}
              >
                {agreed ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
              </View>
              <Text color="#374151" style={styles.modalAcceptText}>
                {t("patientPaymentsFlow.checkout.refundPolicy.acceptNote")}
              </Text>
            </TouchableOpacity>

            <View style={styles.modalActions}>
              <Button
                title={t("patientPaymentsFlow.checkout.refundPolicy.confirm")}
                onPress={() => {
                  if (!scrolledToEnd || !agreed) return;
                  onAccept();
                }}
                disabled={!scrolledToEnd || !agreed}
                style={styles.modalConfirmButton}
              />
              <TouchableOpacity onPress={onClose} style={styles.modalCancelButton}>
                <Text weight="600" style={styles.modalCancelText}>
                  {t("patientPaymentsFlow.checkout.refundPolicy.later")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function mapBrowserResultToRedirectStatus(
  resultType: string,
): "canceled" | undefined {
  if (resultType === "cancel") {
    return "canceled";
  }

  return undefined;
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
  const [couponError, setCouponError] = useState<string | null>(null);
  const [useWalletBalance, setUseWalletBalance] = useState(true);
  const [selectedExternalMethodKey, setSelectedExternalMethodKey] = useState<
    string | null
  >(null);
  const [flowMessage, setFlowMessage] = useState<string | null>(null);
  const [flowError, setFlowError] = useState<string | null>(null);
  const [isLaunchingCheckout, setIsLaunchingCheckout] = useState(false);
  const [acceptedRefundPolicy, setAcceptedRefundPolicy] = useState(false);
  const [policyModalVisible, setPolicyModalVisible] = useState(false);
  const policyModalOpenedForIdRef = useRef<string | null>(null);
  const initiateLockRef = useRef(false);

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
  const paymentCurrency = breakdown?.currency ?? wallet?.currencyCode ?? null;
  const normalizedCouponDraft = normalizePromoCodeInput(couponDraft);
  const sessionReturnUrl = useMemo(() => {
    if (!id) {
      return null;
    }

    const paymentReturnPath = `/sessions/${id}/payment-return`;

    if (
      Platform.OS === "web" &&
      typeof window !== "undefined" &&
      window.location?.origin
    ) {
      return `${window.location.origin}${paymentReturnPath}`;
    }

    return Linking.createURL(paymentReturnPath, {
      scheme: "fayed",
    });
  }, [id]);

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
  const refundPolicyQuery = useRefundPolicy("SESSION", {
    enabled: Boolean(id),
  });
  const refundPolicy = refundPolicyQuery.data?.item ?? null;

  useEffect(() => {
    if (!refundPolicy?.id) return;

    if (acceptedRefundPolicy) {
      policyModalOpenedForIdRef.current = refundPolicy.id;
      setPolicyModalVisible(false);
      return;
    }

    if (policyModalOpenedForIdRef.current === refundPolicy.id) return;

    policyModalOpenedForIdRef.current = refundPolicy.id;
    setPolicyModalVisible(true);
  }, [acceptedRefundPolicy, refundPolicy?.id]);

  const supportedGatewayMethods = useMemo(
    () => normalizeCapabilityMethods(capabilities),
    [capabilities],
  );

  const defaultGatewayMethod = useMemo(() => {
    if (!capabilities) return null;
    if (capabilities.defaultMethod && supportedGatewayMethods.some((m) => m.key === capabilities.defaultMethod)) {
      return capabilities.defaultMethod;
    }

    return supportedGatewayMethods[0]?.key ?? null;
  }, [capabilities, supportedGatewayMethods]);

  useEffect(() => {
    if (!gatewayPaymentRequired) {
      setSelectedExternalMethodKey(null);
      return;
    }

    if (!defaultGatewayMethod) return;

    setSelectedExternalMethodKey((current) => {
      if (current && supportedGatewayMethods.some((method) => method.key === current)) {
        return current;
      }

      return defaultGatewayMethod;
    });
  }, [defaultGatewayMethod, gatewayPaymentRequired, supportedGatewayMethods]);

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
  const couponApplyLoading = Boolean(appliedCoupon) && breakdownQuery.isFetching;
  const walletCapability = capabilities?.wallet ?? null;
  const walletCapabilityEnabled = walletCapability?.enabled === true;
  const walletCapabilityCurrency = walletCapability?.currencyCode ?? paymentCurrency;
  const walletCapabilityBalance = walletCapability?.availableBalance ?? walletBalance;
  const couponApplied = Boolean(appliedCoupon) && Boolean(breakdown) && !couponError;
  const activeCouponCode =
    appliedCoupon &&
    normalizedCouponDraft === appliedCoupon &&
    !couponError
      ? appliedCoupon
      : null;
  const breakdownDisplayError =
    breakdownQuery.isFetching
      ? null
      : couponError || (breakdownQuery.isError ? breakdownErrorMsg : null);

  useEffect(() => {
    if (!appliedCoupon) {
      if (couponError) {
        setCouponError(null);
      }
      return;
    }

    if (!breakdownQuery.isError) {
      if (couponError) {
        setCouponError(null);
      }
      return;
    }

    if (isPricingUnavailable) {
      if (couponError) {
        setCouponError(null);
      }
      return;
    }

    const mappedCouponError = classifyCouponError(
      extractApiErrorMessage(breakdownQuery.error),
    );

    if (mappedCouponError) {
      setCouponError(
        t(`patientPaymentsFlow.checkout.coupon.errors.${mappedCouponError}`),
      );
      return;
    }

    setCouponError(
      t("patientPaymentsFlow.checkout.coupon.errors.generic"),
    );
  }, [
    appliedCoupon,
    breakdownQuery.error,
    breakdownQuery.isError,
    couponError,
    isPricingUnavailable,
    t,
  ]);

  useEffect(() => {
    if (walletCapability && !walletCapabilityEnabled && useWalletBalance) {
      setUseWalletBalance(false);
    }
  }, [walletCapability, walletCapabilityEnabled, useWalletBalance]);

  const applyCoupon = () => {
    const value = normalizedCouponDraft;
    if (!value.length) {
      setAppliedCoupon(null);
      setCouponError(null);
      return;
    }

    setCouponError(null);
    setAppliedCoupon(value);
    setCouponDraft(value);
    Keyboard.dismiss();
  };

  const removeCoupon = () => {
    setCouponDraft("");
    setAppliedCoupon(null);
    setCouponError(null);
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

    const safeCheckoutUrl = normalizeAllowedExternalUrl(checkoutUrl);
    if (!safeCheckoutUrl) {
      setFlowError(
        t("patientPaymentsFlow.checkout.unsupportedProviderPayload"),
      );
      trackAnalyticsEvent("payment_failed", {
        sessionId: id ?? "unknown",
        reason: "invalid_checkout_url",
        provider: capabilities?.provider || "unknown",
      });
      setIsLaunchingCheckout(false);
      return;
    }

    if (Platform.OS === "web") {
      try {
        window.location.assign(safeCheckoutUrl);
      } finally {
        setIsLaunchingCheckout(false);
      }
      return;
    }

    if (sessionReturnUrl) {
      try {
        const result = await WebBrowser.openAuthSessionAsync(
          safeCheckoutUrl,
          sessionReturnUrl,
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
      await WebBrowser.openBrowserAsync(safeCheckoutUrl);

      navigateToPaymentReturn({
        recovery: "browser",
        providerReference: providerReference ?? undefined,
      });
    } finally {
      setIsLaunchingCheckout(false);
    }
  };

  const providerDisplayName = getProviderDisplayName(
    capabilities?.provider ?? breakdown?.paymentProvider ?? null,
  );
  const selectedExternalMethod = supportedGatewayMethods.find(
    (method) => method.key === selectedExternalMethodKey,
  );
  const hasExternalMethods = supportedGatewayMethods.length > 0;
  const externalMethodSelectionRequired =
    gatewayPaymentRequired && hasExternalMethods;
  const missingRequiredExternalMethod =
    externalMethodSelectionRequired && !selectedExternalMethod;
  const paymobSelectedMethod =
    capabilities?.provider === "PAYMOB" && isPaymobMethodKey(selectedExternalMethod?.key)
      ? selectedExternalMethod.key
      : undefined;
  const isWalletToggleEnabled =
    walletCapabilityEnabled && toNumber(walletCapabilityBalance) > 0;

  const handleInitiatePayment = async () => {
    if (!id || isLaunchingCheckout || initiateLockRef.current) return;
    setFlowMessage(null);
    setFlowError(null);

    if (!refundPolicy || !acceptedRefundPolicy) {
      setFlowError(
        t("patientPaymentsFlow.checkout.refundPolicy.mustAccept", {
          defaultValue:
            "Please review and accept the session refund policy before continuing.",
        }),
      );
      setPolicyModalVisible(true);
      return;
    }

    initiateLockRef.current = true;

    trackAnalyticsEvent("payment_initiated", {
      sessionId: id,
      provider: capabilities?.provider || "unknown",
      useWalletBalance,
      gatewayRequired: gatewayPaymentRequired,
      couponApplied: Boolean(activeCouponCode),
    });

    try {
      const payload = await initiateMutation.mutateAsync({
        sessionId: id,
        input: {
          couponCode: activeCouponCode ?? undefined,
          useWalletBalance,
          acceptedRefundPolicyId: refundPolicy.id,
          paymobMethod:
            gatewayPaymentRequired && capabilities?.provider === "PAYMOB"
              ? paymobSelectedMethod
              : undefined,
          returnUrl:
            gatewayPaymentRequired && capabilities?.provider === "PAYMOB"
              ? (sessionReturnUrl ?? undefined)
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
        trackAnalyticsEvent("payment_failed", {
          sessionId: id,
          reason: "unsupported_provider_payload",
          provider: capabilities?.provider || "unknown",
        });
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
      trackAnalyticsEvent("payment_failed", {
        sessionId: id,
        reason: "unresolved_payment_state",
        provider: capabilities?.provider || "unknown",
      });
    } catch (error) {
      logPaymentInitiationError("session-payment-initiation", error);
      setFlowError(t("patientPaymentsFlow.checkout.requestFailed"));
      trackAnalyticsEvent("payment_failed", {
        sessionId: id,
        reason: "initiate_failed",
        provider: capabilities?.provider || "unknown",
      });
    } finally {
      initiateLockRef.current = false;
    }
  };

  if (loading) {
    return (
      <Screen bg="background">
        <Header showBack />
        <LoadingState fullScreen />
      </Screen>
    );
  }

  if (hasError || !session) {
    return (
      <Screen bg="background">
        <Header showBack />
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
        <Header showBack />
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
      <Header showBack />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* ── Page Title ─────────────────────────────────────── */}
        <View style={styles.pageHeader}>
          <Text variant="h2" weight="bold" style={styles.pageTitle}>
            {t("patientPaymentsFlow.checkout.screenTitle")}
          </Text>
          <Text style={styles.pageSubtitle} color={theme.colors.textSecondary}>
            {t("patientPaymentsFlow.checkout.headingSubtitle")}
          </Text>
        </View>

        {/* ── Session Summary Hero ────────────────────────────── */}
        <View style={[styles.heroCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderLight }]}>
          <View style={[styles.heroAccent, { backgroundColor: theme.colors.primary }]} />
          <View style={styles.heroBody}>
            <View style={styles.heroIconWrap}>
              <Ionicons name="videocam" size={26} color={theme.colors.primary} />
            </View>
            <View style={styles.heroTextWrap}>
              <Text weight="bold" style={styles.heroName}>
                {session.practitioner.displayName ?? "-"}
              </Text>
              <Text color={theme.colors.textSecondary} style={styles.heroSubtitle}>
                {t("patientPaymentsFlow.checkout.practitionerCard.sessionType")}
              </Text>
              <View style={styles.heroPillRow}>
                <View style={[styles.heroPill, { backgroundColor: theme.colors.primaryLight }]}>
                  <Ionicons name="calendar-outline" size={12} color={theme.colors.primary} />
                  <Text style={styles.heroPillText} color={theme.colors.primary} weight="600">
                    {formatDateTime(session.scheduledStartAt, locale)}
                  </Text>
                </View>
                <View style={[styles.heroPill, { backgroundColor: theme.colors.surfaceTertiary }]}>
                  <Ionicons name="hourglass-outline" size={12} color={theme.colors.textSecondary} />
                  <Text style={styles.heroPillText} color={theme.colors.textSecondary} weight="600">
                    {t("patientSessionsFlow.detail.durationValue", { minutes: session.durationMinutes })}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* ── Coupon Code ─────────────────────────────────────── */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderLight }]}>
          <View style={[styles.cardHeader, { borderBottomColor: theme.colors.borderLight }]}>
            <View style={[styles.cardIconWrap, { backgroundColor: theme.colors.primaryLight }]}>
              <Ionicons name="pricetag" size={15} color={theme.colors.primary} />
            </View>
            <Text weight="bold" style={styles.cardTitle}>
              {t("patientPaymentsFlow.checkout.coupon.label")}
            </Text>
            {couponApplied ? (
              <View style={[styles.couponBadge, { backgroundColor: "#dcfce7", borderColor: "#bbf7d0" }]}>
                <Ionicons name="checkmark-circle" size={13} color="#16a34a" />
                <Text style={styles.couponBadgeText} color="#16a34a" weight="600">
                  {activeCouponCode}
                </Text>
              </View>
            ) : null}
          </View>
          <View style={styles.cardBody}>
            <View style={styles.couponRow}>
              <Input
                value={couponDraft}
                onChangeText={(value) => {
                  const normalized = normalizePromoCodeInput(value);
                  setCouponDraft(normalized);
                  setCouponError(null);
                  if (appliedCoupon && normalized !== appliedCoupon) {
                    setAppliedCoupon(null);
                  }
                }}
                placeholder={t("patientPaymentsFlow.checkout.coupon.placeholder")}
                containerStyle={styles.couponInput}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              {!appliedCoupon ? (
                <TouchableOpacity
                  style={[styles.couponBtn, { backgroundColor: theme.colors.primary }]}
                  onPress={applyCoupon}
                  disabled={
                    couponApplyLoading ||
                    !normalizedCouponDraft ||
                    (appliedCoupon === normalizedCouponDraft && !couponError)
                  }
                >
                  {couponApplyLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text color="#fff" weight="bold" style={styles.couponBtnText}>
                      {t("patientPaymentsFlow.checkout.coupon.apply")}
                    </Text>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.couponBtn, { backgroundColor: theme.colors.surfaceTertiary, borderWidth: 1, borderColor: theme.colors.borderLight }]}
                  onPress={removeCoupon}
                >
                  <Ionicons name="close" size={16} color={theme.colors.textPrimary} />
                </TouchableOpacity>
              )}
            </View>
            {couponError ? (
              <View style={styles.alertBox}>
                <Ionicons name="alert-circle-outline" size={14} color="#ba1a1a" />
                <Text color="#ba1a1a" style={styles.alertText}>{couponError}</Text>
              </View>
            ) : couponApplied ? (
              <View style={[styles.alertBox, { backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" }]}>
                <Ionicons name="checkmark-circle-outline" size={14} color="#16a34a" />
                <Text color="#16a34a" style={styles.alertText}>
                  {t("patientPaymentsFlow.checkout.coupon.applied", { code: appliedCoupon })}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* ── Wallet Toggle ───────────────────────────────────── */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderLight }]}>
          <View style={styles.walletRow}>
            <View style={[styles.walletIconWrap, {
              backgroundColor: isWalletToggleEnabled ? theme.colors.primaryLight : theme.colors.surfaceTertiary
            }]}>
              <Ionicons
                name="wallet"
                size={20}
                color={isWalletToggleEnabled ? theme.colors.primary : theme.colors.textMuted}
              />
            </View>
            <View style={styles.walletTextWrap}>
              <Text weight="bold" style={styles.walletLabel}>
                {t("patientPaymentsFlow.checkout.walletToggle.label")}
              </Text>
              <Text color={isWalletToggleEnabled ? theme.colors.primary : theme.colors.textMuted} style={styles.walletHint}>
                {isWalletToggleEnabled
                  ? t("patientPaymentsFlow.checkout.walletToggle.available", {
                      amount: formatMoney(walletCapabilityBalance, walletCapabilityCurrency, locale),
                    })
                  : t("patientPaymentsFlow.checkout.walletToggle.noBalance")}
              </Text>
            </View>
            <Switch
              value={useWalletBalance && isWalletToggleEnabled}
              onValueChange={setUseWalletBalance}
              disabled={!isWalletToggleEnabled}
              thumbColor="#ffffff"
              trackColor={{ false: theme.colors.borderStrong, true: theme.colors.primary }}
            />
          </View>
        </View>

        {/* ── Price Breakdown ─────────────────────────────────── */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderLight }]}>
          <View style={[styles.cardHeader, { borderBottomColor: theme.colors.borderLight }]}>
            <View style={[styles.cardIconWrap, { backgroundColor: theme.colors.primaryLight }]}>
              <Ionicons name="receipt" size={15} color={theme.colors.primary} />
            </View>
            <Text weight="bold" style={styles.cardTitle}>
              {t("patientPaymentsFlow.checkout.breakdown.title")}
            </Text>
          </View>
          <View style={styles.cardBody}>
            {breakdownLoading ? (
              <View style={styles.skeletonRow}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text color={theme.colors.textMuted} style={styles.skeletonText}>
                  {isRtl ? "جاري تحميل الأسعار..." : "Loading pricing…"}
                </Text>
              </View>
            ) : breakdownDisplayError ? (
              <View style={[styles.alertBox, { backgroundColor: "rgba(186,26,26,0.06)", borderColor: "rgba(186,26,26,0.2)" }]}>
                <Ionicons name="alert-circle-outline" size={16} color="#ba1a1a" />
                <Text color="#ba1a1a" style={styles.alertText}>
                  {isPricingUnavailable
                    ? t("patientPaymentsFlow.checkout.pricingUnavailableNote")
                    : breakdownDisplayError}
                </Text>
              </View>
            ) : breakdown ? (
              <>
                <View style={styles.priceRow}>
                  <Text color={theme.colors.textSecondary} style={styles.priceLabel}>
                    {t("patientPaymentsFlow.checkout.breakdown.sessionFee")}
                  </Text>
                  <Text weight="600" style={styles.priceValue}>
                    {formatMoney(breakdown.grossAmount, paymentCurrency, locale)}
                  </Text>
                </View>
                {toNumber(breakdown.discountAmount) > 0 ? (
                  <View style={styles.priceRow}>
                    <Text color={theme.colors.textSecondary} style={styles.priceLabel}>
                      {t("patientPaymentsFlow.checkout.breakdown.discount")}
                    </Text>
                    <Text weight="600" color="#16a34a" style={styles.priceValue}>
                      -{formatMoney(breakdown.discountAmount, paymentCurrency, locale)}
                    </Text>
                  </View>
                ) : null}
                {split.walletUsed > 0 ? (
                  <View style={styles.priceRow}>
                    <Text color={theme.colors.textSecondary} style={styles.priceLabel}>
                      {t("patientPaymentsFlow.checkout.breakdown.walletDeduction")}
                    </Text>
                    <Text weight="600" color={theme.colors.primary} style={styles.priceValue}>
                      -{formatMoney(split.walletUsed.toFixed(2), paymentCurrency, locale)}
                    </Text>
                  </View>
                ) : null}
                <View style={[styles.priceRow, styles.totalRow, { borderTopColor: theme.colors.borderLight }]}>
                  <Text weight="bold" style={styles.totalLabel}>
                    {t("patientPaymentsFlow.checkout.breakdown.total")}
                  </Text>
                  <Text weight="bold" style={styles.totalValue} color={theme.colors.primary}>
                    {formatMoney(breakdown.netPaidAmount, paymentCurrency, locale)}
                  </Text>
                </View>
                <View style={[styles.splitPill, { backgroundColor: theme.colors.surfaceTertiary, borderColor: theme.colors.borderLight }]}>
                  <View style={styles.splitItem}>
                    <Ionicons name="wallet-outline" size={14} color={theme.colors.textMuted} />
                    <Text style={styles.splitLabel} color={theme.colors.textSecondary}>
                      {t("patientPaymentsFlow.checkout.state.walletPart")}
                    </Text>
                    <Text weight="600" style={styles.splitAmount}>
                      {formatMoney(split.walletUsed.toFixed(2), paymentCurrency, locale)}
                    </Text>
                  </View>
                  <View style={[styles.splitDivider, { backgroundColor: theme.colors.borderLight }]} />
                  <View style={styles.splitItem}>
                    <Ionicons name="card-outline" size={14} color={theme.colors.textMuted} />
                    <Text style={styles.splitLabel} color={theme.colors.textSecondary}>
                      {t("patientPaymentsFlow.checkout.state.gatewayPart")}
                    </Text>
                    <Text weight="600" style={styles.splitAmount}>
                      {formatMoney(split.gatewayRemaining.toFixed(2), paymentCurrency, locale)}
                    </Text>
                  </View>
                </View>
                <Text color={theme.colors.textMuted} style={styles.splitNotice}>
                  {split.gatewayRemaining > 0
                    ? t("patientPaymentsFlow.checkout.browserReturnNotice")
                    : t("patientPaymentsFlow.checkout.state.walletOnly")}
                </Text>
              </>
            ) : null}
          </View>
        </View>

        {/* ── Payment Method ──────────────────────────────────── */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderLight }]}>
          <View style={[styles.cardHeader, { borderBottomColor: theme.colors.borderLight }]}>
            <View style={[styles.cardIconWrap, { backgroundColor: theme.colors.primaryLight }]}>
              <Ionicons name="card" size={15} color={theme.colors.primary} />
            </View>
            <Text weight="bold" style={styles.cardTitle}>
              {t("patientPaymentsFlow.checkout.paymentMethod.title")}
            </Text>
          </View>
          <View style={styles.cardBody}>
            {!gatewayPaymentRequired ? (
              <View style={[styles.walletOnlyBanner, { backgroundColor: theme.colors.primaryLight, borderColor: theme.colors.primary + "30" }]}>
                <Ionicons name="wallet" size={20} color={theme.colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text weight="bold" color={theme.colors.primary} style={styles.walletOnlyTitle}>
                    {t("patientPaymentsFlow.checkout.paymentMethod.wallet")}
                  </Text>
                  <Text color={theme.colors.primary} style={styles.walletOnlyHint}>
                    {t("patientPaymentsFlow.checkout.state.walletOnly")}
                  </Text>
                </View>
                <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
              </View>
            ) : capabilitiesLoading ? (
              <View style={styles.skeletonRow}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text color={theme.colors.textMuted} style={styles.skeletonText}>
                  {t("patientPaymentsFlow.checkout.paymentMethod.loadingMethods")}
                </Text>
              </View>
            ) : capabilitiesErrorMsg ? (
              <View style={[styles.alertBox, { backgroundColor: "rgba(186,26,26,0.06)", borderColor: "rgba(186,26,26,0.2)" }]}>
                <Ionicons name="alert-circle-outline" size={16} color="#ba1a1a" />
                <Text color="#ba1a1a" style={styles.alertText}>{capabilitiesErrorMsg}</Text>
              </View>
            ) : !hasExternalMethods ? (
              <View style={[styles.alertBox, { backgroundColor: "rgba(186,26,26,0.06)", borderColor: "rgba(186,26,26,0.2)" }]}>
                <Ionicons name="alert-circle-outline" size={16} color="#ba1a1a" />
                <Text color="#ba1a1a" style={styles.alertText}>
                  {t("patientPaymentsFlow.checkout.paymentMethod.methodUnavailable")}
                </Text>
              </View>
            ) : (
              <View style={styles.methodGrid}>
                {supportedGatewayMethods.map((method) => {
                  const isSelected = selectedExternalMethodKey === method.key;
                  const isCard = method.key === "CARD";
                  const isPaymobWallet = method.key === "WALLET";
                  const isStripeHosted =
                    method.key === "STRIPE_CHECKOUT" ||
                    method.type === "PROVIDER_HOSTED" ||
                    capabilities?.provider === "STRIPE";

                  let subtitle = t("patientPaymentsFlow.checkout.paymentMethod.gatewayHint");
                  if (isCard) {
                    subtitle = t("patientPaymentsFlow.checkout.paymentMethod.paymobCardHint", { defaultValue: "ادفع ببطاقتك عبر Paymob" });
                  } else if (isPaymobWallet) {
                    subtitle = t("patientPaymentsFlow.checkout.paymentMethod.paymobWalletHint", { defaultValue: "ادفع من محفظتك الإلكترونية عبر Paymob" });
                  } else if (isStripeHosted) {
                    subtitle = t("patientPaymentsFlow.checkout.paymentMethod.stripeHostedHint", { defaultValue: "سيتم إكمال الدفع في صفحة آمنة." });
                  }

                  const methodIcon = isPaymobWallet
                    ? "phone-portrait-outline"
                    : isStripeHosted
                      ? "shield-checkmark-outline"
                      : "card-outline";

                  return (
                    <TouchableOpacity
                      key={method.key}
                      activeOpacity={0.85}
                      onPress={() => setSelectedExternalMethodKey(method.key)}
                      style={[
                        styles.methodCard,
                        {
                          backgroundColor: isSelected ? theme.colors.primaryLight : theme.colors.surface,
                          borderColor: isSelected ? theme.colors.primary : theme.colors.borderLight,
                          borderWidth: isSelected ? 2 : 1,
                        },
                      ]}
                    >
                      <View style={[styles.methodCardIcon, {
                        backgroundColor: isSelected ? theme.colors.primary : theme.colors.surfaceTertiary
                      }]}>
                        <Ionicons name={methodIcon} size={18} color={isSelected ? "#fff" : theme.colors.textSecondary} />
                      </View>
                      <View style={styles.methodCardText}>
                        <Text weight="bold" style={styles.methodCardTitle}
                          color={isSelected ? theme.colors.primary : theme.colors.textPrimary}>
                          {method.label}
                        </Text>
                        <Text color={theme.colors.textMuted} style={styles.methodCardSubtitle}>
                          {subtitle}
                        </Text>
                      </View>
                      {isSelected ? (
                        <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
                      ) : (
                        <View style={[styles.methodRadio, { borderColor: theme.colors.borderStrong }]} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
            <View style={styles.trustRow}>
              <View style={styles.trustItem}>
                <Ionicons name="lock-closed" size={12} color={theme.colors.textMuted} />
                <Text color={theme.colors.textMuted} style={styles.trustText}>
                  {t("patientPaymentsFlow.checkout.trustBadges.secure")}
                </Text>
              </View>
              <View style={[styles.trustDot, { backgroundColor: theme.colors.borderStrong }]} />
              <View style={styles.trustItem}>
                <Ionicons name="checkmark-circle" size={12} color={theme.colors.textMuted} />
                <Text color={theme.colors.textMuted} style={styles.trustText}>
                  {t("patientPaymentsFlow.checkout.trustBadges.moh")}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Refund Policy ───────────────────────────────────── */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderLight }]}>
          <View style={[styles.cardHeader, { borderBottomColor: theme.colors.borderLight }]}>
            <View style={[styles.cardIconWrap, { backgroundColor: theme.colors.surfaceTertiary }]}>
              <Ionicons name="shield-checkmark-outline" size={15} color={theme.colors.textSecondary} />
            </View>
            <Text weight="bold" style={styles.cardTitle}>
              {t("patientPaymentsFlow.checkout.refundPolicy.title", "Refund policy")}
            </Text>
          </View>
          <View style={styles.cardBody}>
            {refundPolicyQuery.isLoading ? (
              <View style={styles.skeletonRow}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text color={theme.colors.textMuted} style={styles.skeletonText}>
                  {t("patientPaymentsFlow.checkout.refundPolicy.loading", "Loading refund policy...")}
                </Text>
              </View>
            ) : refundPolicy ? (
              <>
                <Text color={theme.colors.textSecondary} style={styles.policyName}>
                  {getRefundPolicyTitle(refundPolicy, locale)}
                </Text>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setPolicyModalVisible(true)}
                  style={[styles.policyViewBtn, { backgroundColor: theme.colors.surfaceTertiary, borderColor: theme.colors.borderLight }]}
                >
                  <Ionicons name="document-text-outline" size={16} color={theme.colors.primary} />
                  <Text weight="600" color={theme.colors.primary} style={styles.policyViewBtnText}>
                    {t("patientPaymentsFlow.checkout.refundPolicy.viewPolicy", "Review refund policy")}
                  </Text>
                  <Ionicons name={isRtl ? "chevron-back" : "chevron-forward"} size={16} color={theme.colors.primary} />
                </TouchableOpacity>
                {acceptedRefundPolicy ? (
                  <View style={[styles.acceptedBanner, { backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" }]}>
                    <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
                    <Text color="#166534" weight="600" style={styles.acceptedText}>
                      {t("patientPaymentsFlow.checkout.refundPolicy.acceptedBadge", "Refund policy accepted")}
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.acceptedBanner, { backgroundColor: "rgba(245,158,11,0.08)", borderColor: "rgba(245,158,11,0.3)" }]}>
                    <Ionicons name="information-circle-outline" size={18} color="#b45309" />
                    <Text color="#92400e" style={styles.acceptedText}>
                      {t("patientPaymentsFlow.checkout.refundPolicy.reviewRequired", "Please review the policy before paying.")}
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <View style={[styles.alertBox, { backgroundColor: "rgba(186,26,26,0.06)", borderColor: "rgba(186,26,26,0.2)" }]}>
                <Ionicons name="alert-circle-outline" size={16} color="#ba1a1a" />
                <Text color="#ba1a1a" style={styles.alertText}>
                  {t("patientPaymentsFlow.checkout.refundPolicy.missing", "The refund policy is unavailable right now.")}
                </Text>
              </View>
            )}
          </View>
        </View>

        {flowMessage ? (
          <View style={[styles.alertBox, { backgroundColor: theme.colors.primaryLight, borderColor: theme.colors.primary + "40" }]}>
            <Ionicons name="information-circle-outline" size={16} color={theme.colors.primary} />
            <Text color={theme.colors.primary} style={styles.alertText}>{flowMessage}</Text>
          </View>
        ) : null}
        {flowError ? (
          <View style={[styles.alertBox, { backgroundColor: "rgba(186,26,26,0.06)", borderColor: "rgba(186,26,26,0.2)" }]}>
            <Ionicons name="alert-circle-outline" size={16} color="#ba1a1a" />
            <Text color="#ba1a1a" style={styles.alertText}>{flowError}</Text>
          </View>
        ) : null}
      </ScrollView>

      <RefundPolicyModal
        visible={policyModalVisible && Boolean(refundPolicy)}
        policy={refundPolicy}
        locale={locale}
        onClose={() => setPolicyModalVisible(false)}
        onAccept={() => {
          setAcceptedRefundPolicy(true);
          setPolicyModalVisible(false);
          setFlowError(null);
        }}
        t={t}
      />

      <View
        style={[styles.footer, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.borderLight }]}
      >
        <View style={styles.footerLeft}>
          <Text color={theme.colors.textMuted} style={styles.footerTotalLabel}>
            {t("patientPaymentsFlow.checkout.breakdown.total")}
          </Text>
          <Text weight="bold" style={styles.footerTotalAmount} color={breakdown ? theme.colors.primary : theme.colors.textPrimary}>
            {breakdown
              ? formatMoney(breakdown.netPaidAmount, paymentCurrency, locale)
              : breakdownErrorMsg
                ? t("patientPaymentsFlow.checkout.pricingUnavailableShort")
                : "-"}
          </Text>
          <Text color={theme.colors.textMuted} style={styles.footerTrust}>
            {t("patientPaymentsFlow.checkout.footerTrustNote")}
          </Text>
        </View>
        <Button
          title={
            initiateMutation.isPending || isLaunchingCheckout
              ? t("patientPaymentsFlow.checkout.processing")
              : t("patientPaymentsFlow.checkout.confirmButton")
          }
          loading={initiateMutation.isPending || isLaunchingCheckout}
          onPress={handleInitiatePayment}
          disabled={
            initiateMutation.isPending ||
            isLaunchingCheckout ||
            initiateLockRef.current ||
            !breakdown ||
            breakdownLoading ||
            breakdownQuery.isFetching ||
            refundPolicyQuery.isLoading ||
            !refundPolicy ||
            !acceptedRefundPolicy ||
            capabilitiesLoading ||
            Boolean(capabilitiesErrorMsg) ||
            Boolean(couponError) ||
            missingRequiredExternalMethod
          }
          style={styles.footerBtn}
          rightIcon={
            !(initiateMutation.isPending || isLaunchingCheckout) ? (
              <Ionicons name={isRtl ? "arrow-back" : "arrow-forward"} size={18} color="#fff" />
            ) : undefined
          }
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 200, gap: 12 },
  pageHeader: { paddingVertical: 4, paddingHorizontal: 2, gap: 4 },
  pageTitle: { fontSize: 24, lineHeight: 32 },
  pageSubtitle: { fontSize: 14, lineHeight: 20 },
  heroCard: { borderRadius: 18, borderWidth: 1, overflow: "hidden" },
  heroAccent: { height: 4 },
  heroBody: { flexDirection: "row", alignItems: "flex-start", padding: 16, gap: 14 },
  heroIconWrap: { width: 52, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,107,96,0.1)" },
  heroTextWrap: { flex: 1, gap: 3 },
  heroName: { fontSize: 16, lineHeight: 23 },
  heroSubtitle: { fontSize: 13, lineHeight: 19 },
  heroPillRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  heroPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  heroPillText: { fontSize: 12 },
  card: { borderRadius: 18, borderWidth: 1, overflow: "hidden" },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  cardIconWrap: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  cardTitle: { flex: 1, fontSize: 15, lineHeight: 21 },
  cardBody: { paddingHorizontal: 16, paddingVertical: 14, gap: 10 },
  couponBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
  couponBadgeText: { fontSize: 12 },
  couponRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  couponInput: { flex: 1, marginBottom: 0 },
  couponBtn: { width: 46, height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  couponBtnText: { fontSize: 13 },
  walletRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  walletIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  walletTextWrap: { flex: 1 },
  walletLabel: { fontSize: 14, lineHeight: 20 },
  walletHint: { fontSize: 12, lineHeight: 18 },
  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  priceLabel: { fontSize: 14, lineHeight: 20 },
  priceValue: { fontSize: 14, lineHeight: 20 },
  totalRow: { borderTopWidth: 1, paddingTop: 12, marginTop: 4 },
  totalLabel: { fontSize: 16, lineHeight: 22 },
  totalValue: { fontSize: 18, lineHeight: 24 },
  splitPill: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  splitItem: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10 },
  splitLabel: { flex: 1, fontSize: 12, lineHeight: 18 },
  splitAmount: { fontSize: 13, lineHeight: 18 },
  splitDivider: { height: 1 },
  splitNotice: { fontSize: 12, lineHeight: 18 },
  skeletonRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 },
  skeletonText: { fontSize: 13 },
  alertBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, borderRadius: 12, borderWidth: 1, padding: 12, backgroundColor: "rgba(186,26,26,0.06)", borderColor: "rgba(186,26,26,0.2)" },
  alertText: { flex: 1, fontSize: 13, lineHeight: 19 },
  walletOnlyBanner: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, padding: 14 },
  walletOnlyTitle: { fontSize: 14, lineHeight: 20 },
  walletOnlyHint: { fontSize: 12, lineHeight: 18 },
  methodGrid: { gap: 10 },
  methodCard: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, padding: 14 },
  methodCardIcon: { width: 40, height: 40, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  methodCardText: { flex: 1 },
  methodCardTitle: { fontSize: 14, lineHeight: 20 },
  methodCardSubtitle: { fontSize: 12, lineHeight: 18, marginTop: 2 },
  methodRadio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2 },
  trustRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 4 },
  trustItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  trustText: { fontSize: 11 },
  trustDot: { width: 3, height: 3, borderRadius: 2 },
  policyName: { fontSize: 13, lineHeight: 19, marginBottom: 4 },
  policyViewBtn: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, borderWidth: 1, padding: 12 },
  policyViewBtnText: { flex: 1, fontSize: 14 },
  acceptedBanner: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, borderWidth: 1, padding: 12, marginTop: 4 },
  acceptedText: { flex: 1, fontSize: 13, lineHeight: 19 },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, borderTopWidth: 1, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20, flexDirection: "row", alignItems: "center", gap: 14 },
  footerLeft: { flex: 1 },
  footerTotalLabel: { fontSize: 11 },
  footerTotalAmount: { fontSize: 18, lineHeight: 24 },
  footerTrust: { fontSize: 10, marginTop: 2 },
  footerBtn: { flex: 1.2, borderRadius: 14 },
  centerState: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  centerTitle: { fontSize: 16, textAlign: "center", marginBottom: 16 },
  centerButton: { maxWidth: 260 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.5)", justifyContent: "center", padding: 16 },
  modalCard: { maxHeight: "90%", backgroundColor: "#fff", borderRadius: 24, overflow: "hidden", borderWidth: 1, borderColor: "#d9e0e6" },
  modalHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#d9e0e6" },
  modalHeaderText: { flex: 1, gap: 4 },
  modalEyebrow: { fontSize: 12, color: "#006B60", textTransform: "uppercase", letterSpacing: 0.6 },
  modalTitle: { fontSize: 18 },
  modalSubtitle: { fontSize: 13, lineHeight: 19 },
  modalCloseButton: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "#f7f9fa" },
  modalScroll: { flexGrow: 0 },
  modalScrollContent: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14, gap: 12 },
  modalIntro: { fontSize: 13, lineHeight: 20 },
  modalClausesList: { gap: 12 },
  modalClauseItem: { padding: 14, borderRadius: 16, backgroundColor: "#f7f9fa", borderWidth: 1, borderColor: "#d9e0e6", gap: 6 },
  modalClauseTitle: { fontSize: 14, lineHeight: 20 },
  modalClauseBody: { fontSize: 13, lineHeight: 20 },
  modalFooter: { borderTopWidth: 1, borderTopColor: "#d9e0e6", padding: 16, gap: 12 },
  modalAcceptRow: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 14 },
  modalCheckbox: { width: 22, height: 22, borderRadius: 7, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  modalAcceptText: { flex: 1, fontSize: 13, lineHeight: 20 },
  modalActions: { gap: 10 },
  modalConfirmButton: { width: "100%" },
  modalCancelButton: { alignSelf: "center", paddingVertical: 2 },
  modalCancelText: { fontSize: 13, color: "#4b5563" },
});
