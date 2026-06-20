import React, { useEffect, useMemo, useRef, useState } from "react";
import { Platform, ScrollView, StyleSheet, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  Button,
  Card,
  Header,
  LoadingState,
  Screen,
  SectionHeader,
  SummaryRow,
  Text,
} from "../../../../components/ui";
import { useTheme } from "../../../../providers/ThemeProvider";
import { useAppDirection } from "../../../../i18n/direction";
import {
  extractHostedCheckoutReturnParams,
  normalizePaymentRedirectStatus,
} from "../../payments/return-utils";
import { usePublicAcademyEnrollment } from "../hooks";
import {
  buildAcademyEnrollmentPaymentRedirectUrl,
  buildAcademyEnrollmentPaymentReturnUrl,
} from "../navigation";
import {
  formatAcademyMoney,
  getAcademyPaymentStatusTranslationKey,
} from "../display";

WebBrowser.maybeCompleteAuthSession();

const CONFIRMED_ENROLLMENT_STATUSES = new Set(["PAID", "CONFIRMED"]);
const TERMINAL_ENROLLMENT_STATUSES = new Set([
  "CANCELLED",
  "REFUNDED",
  "PAYMENT_FAILED",
]);
const POLL_INTERVAL_MS = 3_000;
const MAX_POLL_DURATION_MS = 45_000;

function isConfirmedEnrollmentStatus(status: string | null | undefined) {
  return Boolean(status && CONFIRMED_ENROLLMENT_STATUSES.has(status));
}

function isTerminalEnrollmentStatus(status: string | null | undefined) {
  return Boolean(status && TERMINAL_ENROLLMENT_STATUSES.has(status));
}

function mapBrowserResultToRedirectStatus(
  resultType: string | null | undefined,
) {
  if (resultType === "success") {
    return "succeeded";
  }

  if (resultType === "cancel" || resultType === "dismiss") {
    return "canceled";
  }

  return null;
}

function getFriendlyOpenFailedCopy(t: ReturnType<typeof useTranslation>["t"]) {
  return {
    title: t("academy.enrollment.paymentReturnOpenFailedTitle"),
    note: t("academy.enrollment.paymentReturnOpenFailedSubtitle"),
  };
}

function getFriendlyExpiredCopy(t: ReturnType<typeof useTranslation>["t"]) {
  return {
    title: t("academy.enrollment.paymentReturnExpiredTitle"),
    note: t("academy.enrollment.paymentReturnExpiredSubtitle"),
  };
}

function getFriendlyUnavailableCopy(t: ReturnType<typeof useTranslation>["t"]) {
  return {
    title: t("academy.enrollment.paymentReturnUnavailableTitle"),
    note: t("academy.enrollment.paymentReturnUnavailableSubtitle"),
  };
}

export default function AcademyEnrollmentPaymentReturnScreen({
  enrollmentId,
  token,
  locale,
}: {
  enrollmentId: string;
  token: string;
  locale: string;
}) {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { textAlign } = useAppDirection();
  const params = useLocalSearchParams<{
    redirect_status?: string;
    redirectStatus?: string;
    success?: string;
    pending?: string;
    order?: string;
    providerReference?: string;
    browserResult?: string;
  }>();

  const routeEnrollmentId = enrollmentId.trim();
  const routeToken = token.trim();
  const normalizedRedirectStatus = normalizePaymentRedirectStatus({
    redirectStatus: params.redirect_status ?? params.redirectStatus,
    success: params.success,
    pending: params.pending,
  });
  const providerReference = params.providerReference ?? params.order ?? null;
  const browserResult = params.browserResult ?? null;

  const enrollmentQuery = usePublicAcademyEnrollment(
    routeEnrollmentId || null,
    routeToken || null,
  );
  const enrollment = enrollmentQuery.data ?? null;
  const payment = enrollment?.payment ?? null;
  const isConfirmed = isConfirmedEnrollmentStatus(enrollment?.enrollmentStatus);
  const isTerminal = isTerminalEnrollmentStatus(enrollment?.enrollmentStatus);
  const isPendingPayment =
    enrollment?.enrollmentStatus === "PENDING_PAYMENT" ||
    enrollment?.enrollmentStatus === "PAYMENT_FAILED";
  const paymentAmountLabel =
    payment && formatAcademyMoney(payment.amount, payment.currency, locale);
  const showPaymentSection = Boolean(payment) || isPendingPayment || isTerminal;
  const shouldStartPolling = Boolean(
    normalizedRedirectStatus || browserResult || providerReference,
  );

  const [pollingActive, setPollingActive] = useState(shouldStartPolling);
  const [openFailedCopy, setOpenFailedCopy] = useState<{
    title: string;
    note: string;
  } | null>(null);
  const openInProgressRef = useRef(false);
  const pendingPaymentHelperText = isPendingPayment
    ? pollingActive
      ? t("academy.enrollment.paymentReturnProcessingNote")
      : t("academy.enrollment.pendingPaymentHelp")
    : null;

  useEffect(() => {
    if (!shouldStartPolling) {
      return;
    }

    setPollingActive(true);
    const timeoutId = setTimeout(() => {
      setPollingActive(false);
    }, MAX_POLL_DURATION_MS);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [shouldStartPolling]);

  useEffect(() => {
    if (!pollingActive || !routeEnrollmentId) {
      return;
    }

    if (isConfirmed || isTerminal) {
      setPollingActive(false);
      return;
    }

    void enrollmentQuery.refetch();
    const intervalId = setInterval(() => {
      void enrollmentQuery.refetch();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [enrollmentQuery, isConfirmed, isTerminal, pollingActive, routeEnrollmentId]);

  const handleCompletePayment = async () => {
    if (openInProgressRef.current) {
      return;
    }

    setOpenFailedCopy(null);

    const returnUrl = buildAcademyEnrollmentPaymentReturnUrl({
      enrollmentId: routeEnrollmentId,
      token: routeToken,
    });
    const redirectUrl = buildAcademyEnrollmentPaymentRedirectUrl({
      enrollmentId: routeEnrollmentId,
      token: routeToken,
      returnUrl,
    });

    try {
      openInProgressRef.current = true;

      if (Platform.OS === "web") {
        window.location.assign(redirectUrl);
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(
        redirectUrl,
        returnUrl,
      );

      const returnParams =
        result.type === "success" && result.url
          ? extractHostedCheckoutReturnParams(result.url)
          : {};

      const redirectStatus =
        result.type === "success"
          ? returnParams.redirect_status ?? returnParams.redirectStatus
          : mapBrowserResultToRedirectStatus(result.type);

      router.replace({
        pathname: "/(patient)/academy/enrollments/[id]/payment-return",
        params: {
          id: routeEnrollmentId,
          token: routeToken,
          browserResult: result.type,
          ...(redirectStatus ? { redirect_status: redirectStatus } : {}),
          ...returnParams,
        },
      } as never);
      setPollingActive(true);
    } catch (error) {
      if (__DEV__) {
        console.error("Failed to open Academy payment redirect", error);
      }

      setOpenFailedCopy(getFriendlyOpenFailedCopy(t));
    } finally {
      openInProgressRef.current = false;
    }
  };

  const paymentStatusLabel = enrollment?.paymentStatus
    ? t(getAcademyPaymentStatusTranslationKey(enrollment.paymentStatus))
    : t("academy.enrollment.paymentStatuses.UNKNOWN");

  const stateCard = useMemo(() => {
    if (isConfirmed) {
      return {
        icon: (
          <Ionicons
            name="checkmark-circle"
            size={52}
            color={theme.colors.success}
          />
        ),
        title: t("academy.enrollment.paymentReturnSuccessTitle"),
        note: t("academy.enrollment.paymentReturnSuccessSubtitle"),
        bgColor: theme.colors.statusSuccessBg,
        borderColor: theme.colors.success,
        textColor: theme.colors.statusSuccessText,
      };
    }

    if (enrollment?.enrollmentStatus === "PAYMENT_FAILED" || normalizedRedirectStatus === "failed") {
      return {
        icon: <Ionicons name="close-circle" size={48} color={theme.colors.error} />,
        title: t("academy.enrollment.paymentReturnFailedTitle"),
        note: t("academy.enrollment.paymentReturnFailedSubtitle"),
        bgColor: theme.colors.statusErrorBg,
        borderColor: theme.colors.error,
        textColor: theme.colors.statusErrorText,
      };
    }

    if (normalizedRedirectStatus === "payment_expired") {
      return {
        icon: <Ionicons name="time-outline" size={48} color={theme.colors.error} />,
        title: getFriendlyExpiredCopy(t).title,
        note: getFriendlyExpiredCopy(t).note,
        bgColor: theme.colors.statusErrorBg,
        borderColor: theme.colors.error,
        textColor: theme.colors.statusErrorText,
      };
    }

    if (normalizedRedirectStatus === "payment_unavailable") {
      return {
        icon: (
          <Ionicons name="alert-circle-outline" size={48} color={theme.colors.error} />
        ),
        title: getFriendlyUnavailableCopy(t).title,
        note: getFriendlyUnavailableCopy(t).note,
        bgColor: theme.colors.statusErrorBg,
        borderColor: theme.colors.error,
        textColor: theme.colors.statusErrorText,
      };
    }

    if (normalizedRedirectStatus === "canceled" || browserResult === "cancel") {
      return {
        icon: (
          <Ionicons
            name="close-circle-outline"
            size={48}
            color={theme.colors.textMuted}
          />
        ),
        title: t("academy.enrollment.paymentReturnCancelledTitle"),
        note: t("academy.enrollment.paymentReturnCancelledSubtitle"),
        bgColor: theme.colors.surfaceMuted,
        borderColor: theme.colors.border,
        textColor: theme.colors.textSecondary,
      };
    }

    if (isPendingPayment && pollingActive) {
      return {
        icon: (
          <Ionicons
            name="sync-outline"
            size={48}
            color={theme.colors.primary}
          />
        ),
        title: t("academy.enrollment.paymentReturnVerifyingTitle"),
        note: t("academy.enrollment.paymentReturnVerifyingSubtitle"),
        bgColor: theme.colors.primaryLight,
        borderColor: theme.colors.primary,
        textColor: theme.colors.primary,
      };
    }

    if (isPendingPayment) {
      return {
        icon: (
          <Ionicons
            name="card-outline"
            size={48}
            color={theme.colors.primary}
          />
        ),
        title: t("academy.enrollment.paymentReturnPendingTitle"),
        note: t("academy.enrollment.paymentReturnPendingSubtitle"),
        bgColor: theme.colors.primaryLight,
        borderColor: theme.colors.primary,
        textColor: theme.colors.primary,
      };
    }

    return {
      icon: (
        <Ionicons
          name="time-outline"
          size={48}
          color={theme.colors.textMuted}
        />
      ),
      title: t("academy.enrollment.paymentReturnPendingTitle"),
      note: t("academy.enrollment.paymentReturnPendingSubtitle"),
      bgColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      textColor: theme.colors.textSecondary,
    };
  }, [
    browserResult,
    isConfirmed,
    isPendingPayment,
    normalizedRedirectStatus,
    pollingActive,
    t,
    theme.colors,
    enrollment?.enrollmentStatus,
  ]);

  if (!routeEnrollmentId || !routeToken) {
    return (
      <Screen bg="background">
        <Header
          showBack
          onBack={() => router.replace("/(patient)/academy")}
          title={t("academy.enrollment.paymentReturnTitle")}
        />
        <View style={styles.centerState}>
          <Text weight="600" style={styles.centerTitle}>
            {t("academy.enrollment.notFoundDescription")}
          </Text>
          <Button
            title={t("academy.enrollment.back")}
            onPress={() => router.replace("/(patient)/academy")}
            style={styles.centerButton}
          />
        </View>
      </Screen>
    );
  }

  if (enrollmentQuery.isLoading && !enrollmentQuery.data) {
    return (
      <Screen bg="background">
        <Header showBack title={t("academy.enrollment.paymentReturnTitle")} />
        <LoadingState fullScreen />
      </Screen>
    );
  }

  if (enrollmentQuery.isError || !enrollmentQuery.data) {
    return (
      <Screen bg="background">
        <Header showBack title={t("academy.enrollment.paymentReturnTitle")} />
        <View style={styles.centerState}>
          <Text weight="600" style={styles.centerTitle}>
            {t("academy.enrollment.errorMessage")}
          </Text>
          <Button
            title={t("academy.enrollment.retry")}
            onPress={() => void enrollmentQuery.refetch()}
            variant="secondary"
            style={styles.centerButton}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen bg="background">
      <Header showBack title={t("academy.enrollment.paymentReturnTitle")} />

      <ScrollView contentContainerStyle={styles.content}>
        <Card
          variant="outlined"
          padding="md"
          style={[
            styles.stateCard,
            {
              backgroundColor: stateCard.bgColor,
              borderColor: stateCard.borderColor,
            },
          ]}
        >
          <View style={styles.iconWrap}>{stateCard.icon}</View>
          <Text weight="700" style={[styles.title, { textAlign: "center", color: stateCard.textColor }]}>
            {stateCard.title}
          </Text>
          <Text color={theme.colors.textSecondary} style={[styles.note, { textAlign: "center" }]}>
            {stateCard.note}
          </Text>
        </Card>

        {openFailedCopy ? (
          <Card variant="outlined" padding="md" style={styles.sectionCard}>
            <SectionHeader
              title={openFailedCopy.title}
              subtitle={openFailedCopy.note}
            />
            <Button
              title={t("academy.enrollment.paymentReturnCompletePayment")}
              onPress={() => void handleCompletePayment()}
              style={styles.button}
            />
          </Card>
        ) : null}

        {showPaymentSection ? (
          <Card variant="outlined" padding="md" style={styles.sectionCard}>
            <SectionHeader
              title={t("academy.enrollment.paymentTitle")}
              subtitle={
                isPendingPayment
                  ? t("academy.enrollment.paymentReturnProcessingSubtitle")
                  : t("academy.enrollment.paymentSubtitle")
              }
            />
            <View style={styles.summary}>
              <SummaryRow
                label={t("academy.enrollment.course")}
                value={enrollment!.courseTitle}
              />
              {payment ? (
                <SummaryRow
                  label={t("academy.enrollment.amount")}
                  value={
                    paymentAmountLabel ??
                    `${payment.amount} ${payment.currency}`
                  }
                />
              ) : null}
              <SummaryRow
                label={t("academy.enrollment.paymentStatusLabel")}
                value={paymentStatusLabel}
              />
            </View>
            {isPendingPayment ? (
              <View style={styles.actionsWrap}>
                <Button
                  title={t("academy.enrollment.paymentReturnCompletePayment")}
                  onPress={() => void handleCompletePayment()}
                  style={styles.actionButton}
                />
                {pollingActive ? (
                  <Button
                    title={t("academy.enrollment.paymentReturnCheckAgain")}
                    variant="secondary"
                    onPress={() => void enrollmentQuery.refetch()}
                    style={styles.actionButton}
                  />
                ) : null}
              </View>
            ) : null}
            {isPendingPayment ? (
              <Text color={theme.colors.textSecondary} style={[styles.helperText, { textAlign }]}>
                {pendingPaymentHelperText}
              </Text>
            ) : null}
            {isTerminal ? (
              <Text color={theme.colors.textSecondary} style={[styles.helperText, { textAlign }]}>
                {t("academy.enrollment.paymentReturnSupportNote")}
              </Text>
            ) : null}
          </Card>
        ) : null}

        {isConfirmed ? (
          <Card variant="outlined" padding="md" style={styles.sectionCard}>
            <SectionHeader
              title={t("academy.enrollment.paymentReturnSuccessActionsTitle")}
              subtitle={t(
                "academy.enrollment.paymentReturnSuccessActionsSubtitle",
              )}
            />
            <View style={styles.actionsWrap}>
              <Button
                title={t("academy.enrollment.paymentReturnViewEnrollment")}
                onPress={() =>
                  router.replace({
                    pathname: "/(patient)/academy/enrollments/[id]",
                    params: { id: routeEnrollmentId, token: routeToken },
                  } as never)
                }
                style={styles.actionButton}
              />
              <Button
                title={t("academy.enrollment.paymentReturnOpenProgram")}
                variant="secondary"
                onPress={() =>
                  router.replace(
                    `/(patient)/academy/${enrollment!.courseSlug}` as never,
                  )
                }
                style={styles.actionButton}
              />
            </View>
          </Card>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 48,
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
  stateCard: {
    alignItems: "center",
  },
  iconWrap: {
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    marginBottom: 8,
  },
  note: {
    fontSize: 14,
    lineHeight: 22,
  },
  sectionCard: {
    marginBottom: 0,
  },
  summary: {
    marginTop: 12,
  },
  helperText: {
    fontSize: 12.5,
    lineHeight: 19,
    marginTop: 12,
  },
  button: {
    marginTop: 12,
  },
  actionsWrap: {
    gap: 10,
    marginTop: 12,
  },
  actionButton: {
    width: "100%",
  },
});
