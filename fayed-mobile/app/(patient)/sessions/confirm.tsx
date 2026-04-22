import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Header, Screen, Text, Card, Button } from "../../../src/components/ui";
import { useTheme } from "../../../src/providers/ThemeProvider";
import { useCreateScheduledSession } from "../../../src/features/patient/sessions/hooks";
import { formatLocalizedDateTime } from "../../../src/features/patient/sessions/slot-utils";
import { extractApiErrorMessage } from "../../../src/lib/api";

export default function BookingConfirmationScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language?.startsWith("ar") ?? false;
  const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US";

  const params = useLocalSearchParams<{
    slug: string;
    practitionerName?: string;
    practitionerTitle?: string;
    practitionerAvatarUrl?: string;
    selectedStartAt: string;
    maxDuration: string;
  }>();

  const maxDuration = (Number(params.maxDuration) >= 60 ? 60 : 30) as 30 | 60;
  const [duration, setDuration] = useState<30 | 60>(
    maxDuration >= 60 ? 60 : 30,
  );
  const createMutation = useCreateScheduledSession();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const selectedDateText = useMemo(() => {
    if (!params.selectedStartAt) {
      return t("patientSessionsFlow.common.notAvailable");
    }
    return formatLocalizedDateTime(params.selectedStartAt, locale);
  }, [params.selectedStartAt, locale, t]);

  const totalLabel = useMemo(() => {
    return t("patientSessionsFlow.confirmation.durationValue", {
      minutes: duration,
    });
  }, [duration, t]);

  const handleConfirm = async () => {
    if (!params.slug || !params.selectedStartAt) {
      return;
    }

    setSubmitError(null);

    try {
      const payload = await createMutation.mutateAsync({
        practitionerSlug: params.slug,
        scheduledStartAt: params.selectedStartAt,
        durationMinutes: duration,
        sessionMode: "VIDEO",
      });

      router.replace({
        pathname: "/sessions/success",
        params: {
          sessionId: payload.item.id,
          sessionCode: payload.item.sessionCode,
          status: payload.item.status,
          practitionerName:
            payload.item.practitioner.displayName ??
            params.practitionerName ??
            t("patientSessionsFlow.common.practitionerFallback"),
          sessionStartAt:
            payload.item.scheduledStartAt ?? params.selectedStartAt,
          durationMinutes: String(payload.item.durationMinutes),
        },
      });
    } catch (error) {
      setSubmitError(extractApiErrorMessage(error));
    }
  };

  return (
    <Screen bg="background">
      <Header
        showBack
        onBack={() => router.back()}
        title={t("patientSessionsFlow.confirmation.title")}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroBlock}>
          <Text weight="bold" style={styles.heroTitle}>
            {t("patientSessionsFlow.confirmation.heading")}
          </Text>
          <Text color={theme.colors.textSecondary} style={styles.heroSubtitle}>
            {t("patientSessionsFlow.confirmation.subtitle")}
          </Text>
        </View>

        <Card
          variant="elevated"
          padding="lg"
          style={[
            styles.sectionCard,
            isRtl
              ? {
                  borderLeftWidth: 3,
                  borderLeftColor: theme.colors.primary,
                  borderRightWidth: 0,
                }
              : { borderRightColor: theme.colors.primary },
          ]}
        >
          <View style={styles.sectionTitleRow}>
            <Ionicons
              name="calendar-outline"
              size={20}
              color={theme.colors.primary}
            />
            <Text weight="600" style={styles.sectionTitle}>
              {t("patientSessionsFlow.confirmation.sessionDetails")}
            </Text>
          </View>

          <View style={styles.practitionerRow}>
            <View style={styles.practitionerMetaCol}>
              <Text color={theme.colors.textMuted} style={styles.metaLabel}>
                {t("patientSessionsFlow.common.practitioner")}
              </Text>
              <Text weight="600" style={styles.metaValue}>
                {params.practitionerName ??
                  t("patientSessionsFlow.common.practitionerFallback")}
              </Text>
              <Text
                color={theme.colors.textSecondary}
                style={styles.metaSubValue}
              >
                {params.practitionerTitle ??
                  t("patientSessionsFlow.common.professionalFallback")}
              </Text>
            </View>
            <View
              style={[
                styles.avatarPlaceholder,
                { backgroundColor: theme.colors.surfaceTertiary },
              ]}
            >
              <Ionicons
                name="person"
                size={26}
                color={theme.colors.textMuted}
              />
            </View>
          </View>

          <View style={styles.infoRow}>
            <View
              style={[
                styles.infoIconWrap,
                { backgroundColor: theme.colors.surfaceSecondary },
              ]}
            >
              <Ionicons
                name="calendar-clear-outline"
                size={18}
                color={theme.colors.primary}
              />
            </View>
            <View style={styles.infoTextWrap}>
              <Text color={theme.colors.textMuted} style={styles.metaLabel}>
                {t("patientSessionsFlow.common.dateAndTime")}
              </Text>
              <Text weight="600" style={styles.metaValue}>
                {selectedDateText}
              </Text>
            </View>
          </View>

          <View style={styles.durationWrap}>
            <Text color={theme.colors.textMuted} style={styles.metaLabel}>
              {t("patientSessionsFlow.confirmation.selectDuration")}
            </Text>
            <View style={styles.durationButtonsRow}>
              <TouchableOpacity
                style={[
                  styles.durationButton,
                  {
                    backgroundColor:
                      duration === 30
                        ? theme.colors.primaryLight
                        : theme.colors.surface,
                    borderColor:
                      duration === 30
                        ? theme.colors.primary
                        : theme.colors.borderLight,
                  },
                ]}
                onPress={() => setDuration(30)}
              >
                <Text
                  weight={duration === 30 ? "600" : "normal"}
                  color={
                    duration === 30
                      ? theme.colors.primary
                      : theme.colors.textPrimary
                  }
                >
                  {t("patientSessionsFlow.confirmation.duration30")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.durationButton,
                  {
                    backgroundColor:
                      duration === 60
                        ? theme.colors.primaryLight
                        : theme.colors.surface,
                    borderColor:
                      duration === 60
                        ? theme.colors.primary
                        : theme.colors.borderLight,
                    opacity: maxDuration >= 60 ? 1 : 0.35,
                  },
                ]}
                disabled={maxDuration < 60}
                onPress={() => setDuration(60)}
              >
                <Text
                  weight={duration === 60 ? "600" : "normal"}
                  color={
                    duration === 60
                      ? theme.colors.primary
                      : theme.colors.textPrimary
                  }
                >
                  {t("patientSessionsFlow.confirmation.duration60")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Card>

        <Card variant="elevated" padding="lg" style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <Ionicons
              name="card-outline"
              size={20}
              color={theme.colors.primary}
            />
            <Text weight="600" style={styles.sectionTitle}>
              {t("patientSessionsFlow.confirmation.paymentSummary")}
            </Text>
          </View>

          <View style={styles.moneyRow}>
            <Text color={theme.colors.textSecondary}>
              {t("patientSessionsFlow.confirmation.sessionDuration")}
            </Text>
            <Text weight="600">{totalLabel}</Text>
          </View>

          <View style={styles.moneyRow}>
            <Text color={theme.colors.textSecondary}>
              {t("patientSessionsFlow.confirmation.statusLabel")}
            </Text>
            <Text weight="600" color={theme.colors.primary}>
              {t("patientSessionsFlow.confirmation.pendingPayment")}
            </Text>
          </View>

          <Card variant="flat" padding="sm" style={styles.securityNote}>
            <Text
              color={theme.colors.textSecondary}
              style={styles.securityText}
            >
              {t("patientSessionsFlow.confirmation.honestPaymentNotice")}
            </Text>
          </Card>
        </Card>

        <Card variant="flat" padding="md" style={styles.policyCard}>
          <View style={styles.sectionTitleRow}>
            <Ionicons
              name="information-circle-outline"
              size={18}
              color={theme.colors.textSecondary}
            />
            <Text weight="600" style={styles.sectionTitle}>
              {t("patientSessionsFlow.confirmation.cancellationPolicy")}
            </Text>
          </View>
          <Text color={theme.colors.textSecondary} style={styles.policyText}>
            {t("patientSessionsFlow.confirmation.policyHint")}
          </Text>
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
            createMutation.isPending
              ? t("patientSessionsFlow.confirmation.confirming")
              : t("patientSessionsFlow.confirmation.confirmCta")
          }
          onPress={handleConfirm}
          disabled={
            createMutation.isPending || !params.slug || !params.selectedStartAt
          }
          style={styles.confirmButton}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 130,
    gap: 14,
  },
  heroBlock: {
    alignItems: "center",
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 34,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 16,
    textAlign: "center",
  },
  sectionCard: {
    borderRightWidth: 3,
    borderRightColor: "#3f7dcf",
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 20,
  },
  practitionerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  practitionerMetaCol: {
    flex: 1,
    marginEnd: 8,
  },
  metaLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 24,
  },
  metaSubValue: {
    fontSize: 16,
  },
  avatarPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  infoIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginEnd: 10,
  },
  infoTextWrap: {
    flex: 1,
  },
  durationWrap: {
    marginTop: 4,
  },
  durationButtonsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  durationButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  moneyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  securityNote: {
    marginTop: 8,
  },
  securityText: {
    fontSize: 13,
    lineHeight: 20,
  },
  policyCard: {
    marginBottom: 4,
  },
  policyText: {
    fontSize: 14,
    lineHeight: 22,
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  confirmButton: {
    borderRadius: 12,
  },
});
