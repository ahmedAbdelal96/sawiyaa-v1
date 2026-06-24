import React from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Card, Screen, Text, Button } from "../../../src/components/ui";
import { useTheme } from "../../../src/providers/ThemeProvider";
import { formatLocalizedDateTime } from "../../../src/features/patient/sessions/slot-utils";

export default function BookingSuccessScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language?.startsWith("ar") ?? false;
  const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US";

  const params = useLocalSearchParams<{
    sessionId: string;
    sessionCode?: string;
    status?: string;
    practitionerName?: string;
    sessionStartAt?: string;
    durationMinutes?: string;
  }>();

  return (
    <Screen bg="background" style={styles.screen}>
      <View style={styles.contentWrap}>
        <View style={styles.iconWrap}>
          <Card variant="elevated" padding="lg" style={styles.iconCard}>
            <Ionicons
              name="checkmark-circle"
              size={44}
              color={theme.colors.primary}
            />
          </Card>
        </View>

        <Text weight="bold" style={styles.heading}>
          {params.status === "PENDING_PAYMENT"
            ? t("patientSessionsFlow.success.pendingTitle")
            : t("patientSessionsFlow.success.confirmedTitle")}
        </Text>
        <Text color={theme.colors.textSecondary} style={styles.subtitle}>
          {params.status === "PENDING_PAYMENT"
            ? t("patientSessionsFlow.success.pendingSubtitle")
            : t("patientSessionsFlow.success.confirmedSubtitle")}
        </Text>

        <Card
          variant="elevated"
          padding="lg"
          style={[
            styles.summaryCard,
            isRtl
              ? {
                  borderLeftWidth: 3,
                  borderLeftColor: theme.colors.primary,
                  borderRightWidth: 0,
                }
              : { borderRightColor: theme.colors.primary },
          ]}
        >
          <Text weight="600" style={styles.sessionCode}>
            {params.sessionCode ?? params.sessionId}
          </Text>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  params.status === "PENDING_PAYMENT"
                    ? "#fff4e0"
                    : theme.colors.primaryLight,
              },
            ]}
          >
            <Text
              weight="600"
              color={
                params.status === "PENDING_PAYMENT"
                  ? "#b06000"
                  : theme.colors.primary
              }
              style={styles.statusHint}
            >
              {params.status === "PENDING_PAYMENT"
                ? t("patientSessionsFlow.statuses.PENDING_PAYMENT")
                : t("patientSessionsFlow.statuses.CONFIRMED")}
            </Text>
          </View>
          <Text color={theme.colors.textSecondary} style={styles.statusDetail}>
            {params.status === "PENDING_PAYMENT"
              ? t("patientSessionsFlow.success.pendingPaymentHint")
              : t("patientSessionsFlow.success.confirmedHint")}
          </Text>

          <View style={styles.summaryMetaRow}>
            <Text color={theme.colors.textMuted}>
              {t("patientSessionsFlow.common.practitioner")}
            </Text>
            <Text weight="600">
              {params.practitionerName ??
                t("patientSessionsFlow.common.practitionerFallback")}
            </Text>
          </View>

          <View style={styles.summaryMetaRow}>
            <Text color={theme.colors.textMuted}>
              {t("patientSessionsFlow.common.dateAndTime")}
            </Text>
            <Text weight="600">
              {params.sessionStartAt
                ? formatLocalizedDateTime(params.sessionStartAt, locale)
                : t("patientSessionsFlow.common.notAvailable")}
            </Text>
          </View>

          <View style={styles.summaryMetaRow}>
            <Text color={theme.colors.textMuted}>
              {t("patientSessionsFlow.common.duration")}
            </Text>
            <Text weight="600">
              {t("patientSessionsFlow.success.durationValue", {
                minutes: Number(params.durationMinutes ?? "0"),
              })}
            </Text>
          </View>
        </Card>
      </View>

      <View style={styles.actionsWrap}>
        <Button
          title={t("patientSessionsFlow.success.goToSessions")}
          onPress={() => router.replace("/(patient)/sessions")}
          style={styles.primaryAction}
        />
        <Button
          title={t("patientSessionsFlow.success.goHome")}
          variant="secondary"
          onPress={() => router.replace("/(patient)")}
          style={styles.secondaryAction}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 20,
    paddingTop: 38,
    paddingBottom: 26,
  },
  contentWrap: {
    flex: 1,
    alignItems: "center",
  },
  iconWrap: {
    marginTop: 10,
    marginBottom: 22,
  },
  iconCard: {
    borderRadius: 20,
    minWidth: 120,
    minHeight: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  heading: {
    fontSize: 44,
    lineHeight: 50,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    textAlign: "center",
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  summaryCard: {
    width: "100%",
    borderRightWidth: 3,
    borderRightColor: "#3f7dcf",
  },
  sessionCode: {
    fontSize: 20,
    marginBottom: 4,
  },
  statusHint: {
    fontSize: 12,
    fontWeight: "600",
  },
  statusBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
  },
  statusDetail: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 12,
  },
  summaryMetaRow: {
    marginBottom: 8,
  },
  actionsWrap: {
    gap: 10,
  },
  primaryAction: {
    borderRadius: 12,
  },
  secondaryAction: {
    borderRadius: 12,
  },
});
