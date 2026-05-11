import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  Header,
  Screen,
  Text,
  Card,
  Button,
  LoadingState,
  ErrorState,
} from "../../../../src/components/ui";
import { useTheme } from "../../../../src/providers/ThemeProvider";
import {
  useCancelPatientSession,
  usePatientSessionCancellationPreview,
} from "../../../../src/features/patient/sessions/hooks";
import { formatLocalizedDateTime } from "../../../../src/features/patient/sessions/slot-utils";
import { extractApiErrorMessage } from "../../../../src/lib/api";

export default function SessionCancellationPreviewScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language?.startsWith("ar") ?? false;
  const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US";
  const params = useLocalSearchParams<{ id: string }>();

  const previewQuery = usePatientSessionCancellationPreview(params.id ?? null);
  const cancelMutation = useCancelPatientSession();
  const [reason, setReason] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const moneyValues = useMemo(() => {
    const preview = previewQuery.data;
    if (!preview) {
      return [];
    }

    return [
      {
        label: t("patientSessionsFlow.cancelPreview.totalPaid"),
        value: preview.paymentAmountTotal,
      },
      {
        label: t("patientSessionsFlow.cancelPreview.refundAmount"),
        value: preview.refundAmount,
      },
      {
        label: t("patientSessionsFlow.cancelPreview.walletCredit"),
        value: preview.walletCreditAmount,
      },
      {
        label: t("patientSessionsFlow.cancelPreview.gatewayRefund"),
        value: preview.gatewayRefundAmount,
      },
    ];
  }, [previewQuery.data, t]);

  if (previewQuery.isLoading) {
    return (
      <Screen bg="background">
        <Header showBack  />
        <LoadingState fullScreen />
      </Screen>
    );
  }

  if (previewQuery.isError || !previewQuery.data) {
    return (
      <Screen bg="background">
        <Header showBack  />
        <ErrorState fullScreen onRetry={previewQuery.refetch} />
      </Screen>
    );
  }

  const preview = previewQuery.data;

  const onCancelSession = async () => {
    setSubmitError(null);

    try {
      await cancelMutation.mutateAsync({
        sessionId: preview.sessionId,
        reason: reason.trim().length > 0 ? reason.trim() : undefined,
      });
      router.replace(`/(patient)/sessions/${preview.sessionId}`);
    } catch (error) {
      setSubmitError(extractApiErrorMessage(error));
    }
  };

  return (
    <Screen bg="background">
      <Header
        showBack
        title={t("patientSessionsFlow.cancelPreview.title")}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card
          variant="elevated"
          padding="lg"
          style={[
            styles.heroCard,
            isRtl
              ? {
                  borderLeftWidth: 3,
                  borderLeftColor: theme.colors.primary,
                  borderRightWidth: 0,
                }
              : { borderRightColor: theme.colors.primary },
          ]}
        >
          <Text weight="bold" style={styles.heroTitle}>
            {t("patientSessionsFlow.cancelPreview.heading")}
          </Text>
          <Text color={theme.colors.textSecondary} style={styles.heroSubtitle}>
            {t("patientSessionsFlow.cancelPreview.subtitle")}
          </Text>
        </Card>

        <Card variant="flat" padding="md" style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons
              name="calendar-outline"
              size={18}
              color={theme.colors.primary}
            />
            <Text weight="600" style={styles.sectionTitle}>
              {t("patientSessionsFlow.cancelPreview.policySummary")}
            </Text>
          </View>

          <View style={styles.dataRow}>
            <Text color={theme.colors.textMuted}>
              {t("patientSessionsFlow.cancelPreview.sessionStart")}
            </Text>
            <Text weight="600">
              {formatLocalizedDateTime(preview.sessionStartAt, locale)}
            </Text>
          </View>
          <View style={styles.dataRow}>
            <Text color={theme.colors.textMuted}>
              {t("patientSessionsFlow.cancelPreview.matchedRule")}
            </Text>
            <Text weight="600">
              {preview.matchedRuleCode
                ? t(
                    `patientSessionsFlow.cancelPreview.matchedRuleCodes.${preview.matchedRuleCode}` as Parameters<
                      typeof t
                    >[0],
                    {
                      defaultValue: t(
                        "patientSessionsFlow.cancelPreview.matchedRuleCodes.UNKNOWN",
                      ),
                    },
                  )
                : t(
                    "patientSessionsFlow.cancelPreview.matchedRuleCodes.UNKNOWN",
                  )}
            </Text>
          </View>
          <View style={styles.dataRow}>
            <Text color={theme.colors.textMuted}>
              {t("patientSessionsFlow.cancelPreview.hoursBefore")}
            </Text>
            <Text weight="600">
              {t("patientSessionsFlow.cancelPreview.hoursValue", {
                value: Math.round(preview.hoursBeforeStart),
              })}
            </Text>
          </View>

          {!preview.canCancelNow ? (
            <Card variant="flat" padding="sm" style={styles.blockedCard}>
              <Text color="#ba1a1a" style={styles.blockedText}>
                {t("patientSessionsFlow.cancelPreview.cannotCancelNow")}
              </Text>
              {preview.blockingReasonCode ? (
                <Text
                  color="#ba1a1a"
                  style={[styles.blockedText, { marginTop: 4 }]}
                >
                  {t(
                    `patientSessionsFlow.cancelPreview.blockingReasons.${preview.blockingReasonCode}` as Parameters<
                      typeof t
                    >[0],
                    {
                      defaultValue: t(
                        "patientSessionsFlow.cancelPreview.blockingReasons.UNKNOWN",
                      ),
                    },
                  )}
                </Text>
              ) : null}
            </Card>
          ) : null}
        </Card>

        <Card variant="flat" padding="md" style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons
              name="cash-outline"
              size={18}
              color={theme.colors.primary}
            />
            <Text weight="600" style={styles.sectionTitle}>
              {t("patientSessionsFlow.cancelPreview.refundSummary")}
            </Text>
          </View>

          {moneyValues.map((item) => (
            <View key={item.label} style={styles.dataRow}>
              <Text color={theme.colors.textSecondary}>{item.label}</Text>
              <Text weight="600">{item.value}</Text>
            </View>
          ))}
        </Card>

        <Card variant="flat" padding="md" style={styles.sectionCard}>
          <Text weight="600" style={styles.sectionTitle}>
            {t("patientSessionsFlow.cancelPreview.reasonLabel")}
          </Text>
          <TextInput
            value={reason}
            onChangeText={setReason}
            multiline
            numberOfLines={4}
            placeholder={t(
              "patientSessionsFlow.cancelPreview.reasonPlaceholder",
            )}
            placeholderTextColor={theme.colors.textMuted}
            style={[
              styles.reasonInput,
              {
                borderColor: theme.colors.borderLight,
                color: theme.colors.textPrimary,
                backgroundColor: theme.colors.surface,
              },
            ]}
          />
        </Card>

        {submitError ? (
          <Card variant="flat" padding="sm">
            <Text color="#ba1a1a">{submitError}</Text>
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
        <Button
          title={
            cancelMutation.isPending
              ? t("patientSessionsFlow.cancelPreview.cancelling")
              : t("patientSessionsFlow.cancelPreview.confirmCta")
          }
          onPress={onCancelSession}
          disabled={!preview.canCancelNow || cancelMutation.isPending}
          style={styles.primaryAction}
        />
        <Button
          title={t("patientSessionsFlow.cancelPreview.keepSession")}
          variant="secondary"
          onPress={() => router.back()}
          style={styles.secondaryAction}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 145,
    gap: 12,
  },
  heroCard: {
    borderRightWidth: 3,
    borderRightColor: "#3f7dcf",
  },
  heroTitle: {
    fontSize: 28,
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 15,
    lineHeight: 22,
  },
  sectionCard: {
    borderWidth: 1,
    borderColor: "#e7ecf2",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
  },
  dataRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 9,
  },
  blockedCard: {
    marginTop: 6,
  },
  blockedText: {
    fontSize: 13,
  },
  reasonInput: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 96,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: "top",
    marginTop: 8,
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    gap: 8,
  },
  primaryAction: {
    borderRadius: 12,
  },
  secondaryAction: {
    borderRadius: 12,
  },
});


