import React, { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  Button,
  Card,
  Header,
  LoadingState,
  Screen,
  Text,
} from "../../../../src/components/ui";
import { useTheme } from "../../../../src/providers/ThemeProvider";
import { usePatientSession } from "../../../../src/features/patient/sessions/hooks";
import { useReconcileSessionPaymentReturn } from "../../../../src/features/patient/payments/hooks";
import { normalizePaymentRedirectStatus } from "../../../../src/features/patient/payments/return-utils";
import { trackAnalyticsEvent } from "../../../../src/lib/analytics";

const CONFIRMED_SESSION_STATUSES = new Set([
  "UPCOMING",
  "UPCOMING",
  "READY_TO_JOIN",
  "IN_PROGRESS",
  "COMPLETED",
]);

const POLL_INTERVAL_MS = 3_000;
const MAX_POLL_DURATION_MS = 45_000; // Extended from 15s to allow for delayed webhook processing

function isConfirmedStatus(status: string | null | undefined) {
  return Boolean(status && CONFIRMED_SESSION_STATUSES.has(status));
}

export default function SessionPaymentReturnScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{
    id: string;
    redirect_status?: string;
    redirectStatus?: string;
    success?: string;
    pending?: string;
    order?: string;
    providerReference?: string;
    recovery?: string;
    browserResult?: string;
  }>();

  const sessionId = params.id?.trim() ?? "";
  const normalizedRedirectStatus = normalizePaymentRedirectStatus({
    redirectStatus: params.redirect_status ?? params.redirectStatus,
    success: params.success,
    pending: params.pending,
  });
  const providerReference = params.providerReference ?? params.order ?? null;
  const recoveryMode = params.recovery ?? null;
  const browserResult = params.browserResult ?? null;
  const shouldAttemptSuccessRecovery = normalizedRedirectStatus === "succeeded";
  const isTerminalRedirectStatus =
    normalizedRedirectStatus === "failed" ||
    normalizedRedirectStatus === "canceled";
  const shouldStartPolling =
    shouldAttemptSuccessRecovery ||
    ((recoveryMode === "browser" || recoveryMode === "deeplink") &&
      !normalizedRedirectStatus &&
      !isTerminalRedirectStatus);

  const sessionQuery = usePatientSession(sessionId || null);
  const reconcileMutation = useReconcileSessionPaymentReturn();
  const reconciliationAttemptedRef = useRef(false);
  const trackedOutcomeRef = useRef<string | null>(null);
  const [pollingActive, setPollingActive] = useState(shouldStartPolling);

  useEffect(() => {
    if (!shouldStartPolling) return;

    const timeoutId = setTimeout(() => {
      setPollingActive(false);
    }, MAX_POLL_DURATION_MS);

    return () => clearTimeout(timeoutId);
  }, [shouldStartPolling]);

  useEffect(() => {
    if (!pollingActive || !sessionId) return;

    if (isConfirmedStatus(sessionQuery.data?.status)) {
      setPollingActive(false);
      return;
    }

    if (
      sessionQuery.data?.status === "EXPIRED" ||
      sessionQuery.data?.status === "CANCELLED"
    ) {
      setPollingActive(false);
      return;
    }

    void sessionQuery.refetch();
    const intervalId = setInterval(() => {
      void sessionQuery.refetch();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [pollingActive, sessionId, sessionQuery, sessionQuery.data?.status]);

  useEffect(() => {
    if (!sessionId || !shouldAttemptSuccessRecovery) return;
    if (reconciliationAttemptedRef.current) return;

    reconciliationAttemptedRef.current = true;

    reconcileMutation.mutate(
      {
        sessionId,
        input: {
          providerReference,
          redirectStatus: normalizedRedirectStatus,
          success: normalizedRedirectStatus === "succeeded" ? true : null,
          pending: normalizedRedirectStatus === "succeeded" ? false : null,
        },
      },
      {
        onSettled: () => {
          void sessionQuery.refetch();
        },
      },
    );
  }, [
    normalizedRedirectStatus,
    providerReference,
    reconcileMutation,
    sessionId,
    sessionQuery,
    shouldAttemptSuccessRecovery,
  ]);

  useEffect(() => {
    if (!sessionQuery.data) return;
    if (!isConfirmedStatus(sessionQuery.data.status)) return;

    router.replace(`/(patient)/sessions/${sessionId}`);
  }, [router, sessionId, sessionQuery.data]);

  useEffect(() => {
    if (!sessionQuery.data) {
      return;
    }

    const currentStatus = sessionQuery.data.status;
    const currentIsPendingPayment = currentStatus === "PENDING_PAYMENT";

    if (isConfirmedStatus(currentStatus)) {
      if (trackedOutcomeRef.current !== "succeeded") {
        trackedOutcomeRef.current = "succeeded";
        trackAnalyticsEvent("payment_succeeded", {
          sessionId,
          sessionStatus: currentStatus,
          redirectStatus: normalizedRedirectStatus || "none",
          recovery: recoveryMode || "unknown",
        });
      }
      return;
    }

    const shouldMarkFailed =
      (currentIsPendingPayment &&
        (normalizedRedirectStatus === "failed" ||
          normalizedRedirectStatus === "canceled")) ||
      (currentIsPendingPayment &&
        !pollingActive &&
        trackedOutcomeRef.current !== "failed");

    if (shouldMarkFailed && trackedOutcomeRef.current !== "failed") {
      trackedOutcomeRef.current = "failed";
      trackAnalyticsEvent("payment_failed", {
        sessionId,
        sessionStatus: currentStatus,
        redirectStatus: normalizedRedirectStatus || "none",
        recovery: recoveryMode || "unknown",
      });
    }
  }, [
    normalizedRedirectStatus,
    pollingActive,
    recoveryMode,
    sessionId,
    sessionQuery.data,
  ]);

  const status = sessionQuery.data?.status;
  const isConfirmed = isConfirmedStatus(status);
  const isPendingPayment = status === "PENDING_PAYMENT";
  const isExpired = status === "EXPIRED";
  const isCancelled = status === "CANCELLED";
  const reconcileErrorMessage = reconcileMutation.isError
    ? t("patientPaymentsFlow.return.reconcileErrorNote")
    : null;

  const stateCard = useMemo(() => {
    if (isConfirmed) {
      return {
        icon: (
          <Ionicons
            name="checkmark-circle"
            size={52}
            color={theme.colors.primary}
          />
        ),
        title: t("patientPaymentsFlow.return.confirmed.heading"),
        note: t("patientPaymentsFlow.return.confirmed.note"),
      };
    }

    if (isExpired) {
      return {
        icon: (
          <Ionicons
            name="time-outline"
            size={48}
            color={theme.colors.textMuted}
          />
        ),
        title: t("patientPaymentsFlow.return.expired.heading"),
        note: t("patientPaymentsFlow.return.expired.note"),
      };
    }

    if (isCancelled) {
      return {
        icon: (
          <Ionicons
            name="close-circle-outline"
            size={48}
            color={theme.colors.textMuted}
          />
        ),
        title: t("patientPaymentsFlow.return.cancelled.heading"),
        note: t("patientPaymentsFlow.return.cancelled.note"),
      };
    }

    if (isPendingPayment && normalizedRedirectStatus === "failed") {
      return {
        icon: <Ionicons name="close-circle" size={48} color="#ba1a1a" />,
        title: t("patientPaymentsFlow.return.failed.heading"),
        note: t("patientPaymentsFlow.return.failed.note"),
      };
    }

    if (isPendingPayment && normalizedRedirectStatus === "canceled") {
      return {
        icon: (
          <Ionicons
            name="close-circle-outline"
            size={48}
            color={theme.colors.textMuted}
          />
        ),
        title: t("patientPaymentsFlow.return.canceled.heading"),
        note: t("patientPaymentsFlow.return.canceled.note"),
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
        title: t("patientPaymentsFlow.return.verifying.heading"),
        note: t("patientPaymentsFlow.return.verifying.note"),
      };
    }

    // Polling completed but still pending - show "check again" option
    if (isPendingPayment && !pollingActive) {
      return {
        icon: (
          <Ionicons
            name="hourglass-outline"
            size={48}
            color={theme.colors.textMuted}
          />
        ),
        title: t("patientPaymentsFlow.return.pendingStill.heading"),
        note: t("patientPaymentsFlow.return.pendingStill.note"),
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
      title: t("patientPaymentsFlow.return.pending.heading"),
      note: t("patientPaymentsFlow.return.pending.note"),
    };
  }, [
    isCancelled,
    isConfirmed,
    isExpired,
    isPendingPayment,
    normalizedRedirectStatus,
    pollingActive,
    t,
    theme.colors.primary,
    theme.colors.textMuted,
  ]);

  if (!sessionId) {
    return (
      <Screen bg="background">
        <Header
          showBack
          onBack={() => router.replace("/(patient)/sessions")}
          title={t("patientPaymentsFlow.return.title")}
        />
        <View style={styles.centerState}>
          <Text weight="600" style={styles.centerTitle}>
            {t("patientPaymentsFlow.return.missingSessionNote")}
          </Text>
          <Button
            title={t("patientPaymentsFlow.return.viewSessions")}
            onPress={() => router.replace("/(patient)/sessions")}
            style={styles.centerButton}
          />
        </View>
      </Screen>
    );
  }

  if (sessionQuery.isLoading && !sessionQuery.data) {
    return (
      <Screen bg="background">
        <Header showBack title={t("patientPaymentsFlow.return.title")} />
        <LoadingState fullScreen />
      </Screen>
    );
  }

  if (sessionQuery.isError || !sessionQuery.data) {
    return (
      <Screen bg="background">
        <Header showBack title={t("patientPaymentsFlow.return.title")} />
        <View style={styles.centerState}>
          <Text weight="600" style={styles.centerTitle}>
            {t("patientPaymentsFlow.return.loadErrorNote")}
          </Text>
          <Button
            title={t("patientPaymentsFlow.return.retry")}
            onPress={() => void sessionQuery.refetch()}
            variant="secondary"
            style={styles.centerButton}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen bg="background">
      <Header showBack title={t("patientPaymentsFlow.return.title")} />

      <ScrollView contentContainerStyle={styles.content}>
        <Card variant="elevated" padding="md" style={styles.stateCard}>
          <View style={styles.iconWrap}>{stateCard.icon}</View>
          <Text weight="bold" style={styles.title}>
            {stateCard.title}
          </Text>
          <Text color={theme.colors.textSecondary} style={styles.note}>
            {stateCard.note}
          </Text>

          {recoveryMode === "browser" && isPendingPayment ? (
            <Text color={theme.colors.textMuted} style={styles.browserNote}>
              {browserResult && browserResult !== "success"
                ? t("patientPaymentsFlow.return.browserDismissedNote")
                : t("patientPaymentsFlow.return.browserNote")}
            </Text>
          ) : null}

          {reconcileErrorMessage && shouldAttemptSuccessRecovery ? (
            <Text style={styles.errorText} color="#ba1a1a">
              {reconcileErrorMessage}
            </Text>
          ) : null}
        </Card>

        <Card variant="flat" padding="md" style={styles.helpCard}>
          <Text weight="600" style={styles.helpTitle}>
            {t("patientPaymentsFlow.return.actionsTitle")}
          </Text>
          <View style={styles.actionsWrap}>
            {isPendingPayment && !pollingActive && (
              <Button
                title={t("patientPaymentsFlow.return.checkAgain")}
                onPress={() => {
                  setPollingActive(true);
                  void sessionQuery.refetch();
                }}
                disabled={sessionQuery.isLoading}
                style={styles.actionButton}
              />
            )}
            <Button
              title={t("patientPaymentsFlow.return.viewSession")}
              onPress={() => router.replace(`/(patient)/sessions/${sessionId}`)}
              style={styles.actionButton}
            />
            <Button
              title={t("patientPaymentsFlow.return.retryPayment")}
              variant="secondary"
              onPress={() =>
                router.replace(`/(patient)/sessions/${sessionId}/pay`)
              }
              style={styles.actionButton}
            />
          </View>
        </Card>
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
    textAlign: "center",
    marginBottom: 8,
  },
  note: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },
  browserNote: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 12,
    lineHeight: 20,
  },
  errorText: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 12,
  },
  helpCard: {
    marginBottom: 0,
  },
  helpTitle: {
    fontSize: 15,
    marginBottom: 12,
  },
  actionsWrap: {
    gap: 10,
  },
  actionButton: {
    width: "100%",
  },
});
