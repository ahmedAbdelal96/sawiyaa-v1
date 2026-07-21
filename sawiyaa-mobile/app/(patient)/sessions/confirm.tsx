import React, { useMemo, useRef, useState } from "react";
import { Image, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Header, Screen, ScreenHeading, Text, Card, Button } from "../../../src/components/ui";
import { useTheme } from "../../../src/providers/ThemeProvider";
import { useCreateScheduledSession } from "../../../src/features/patient/sessions/hooks";
import { useSessionFinancialBreakdown } from "../../../src/features/patient/payments/hooks";
import { formatTimeZoneLabel, formatViewerDateTime } from "../../../src/lib/time-formatting";
import { extractApiErrorMessage } from "../../../src/lib/api";
import { trackAnalyticsEvent } from "../../../src/lib/analytics";
import { formatMoney as formatCentralMoney, parseMoney } from "../../../src/lib/money";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const FALLBACK_AVATAR = require("../../../assets/user.avif");

function formatMoney(amount: string, currencyCode: string | null | undefined, locale: string): string {
  const money = parseMoney(amount, currencyCode);
  return money ? formatCentralMoney(money, locale) : "-";
}

export default function BookingConfirmationScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const isRtl = i18n.language?.startsWith("ar") ?? false;
  const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US";
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const params = useLocalSearchParams<{
    slug: string;
    practitionerName?: string;
    practitionerTitle?: string;
    practitionerAvatarUrl?: string;
    selectedStartAt: string;
    maxDuration: string;
  }>();

  const duration = (Number(params.maxDuration) >= 60 ? 60 : 30) as 30 | 60;
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdSession, setCreatedSession] = useState<{
    id: string;
    sessionCode: string;
    status: string;
  } | null>(null);
  const confirmLockRef = useRef(false);

  const createMutation = useCreateScheduledSession();
  const breakdownQuery = useSessionFinancialBreakdown(
    createdSession?.id ?? null,
  );

  const selectedDateText = useMemo(() => {
    if (!params.selectedStartAt) {
      return t("patientSessionsFlow.common.notAvailable");
    }
    return formatViewerDateTime(params.selectedStartAt, { locale });
  }, [params.selectedStartAt, locale, t]);

  const totalLabel = useMemo(() => {
    return t("patientSessionsFlow.confirmation.durationValue", {
      minutes: duration,
    });
  }, [duration, t]);

  const breakdown = breakdownQuery.data?.item;
  const breakdownCurrency = breakdown?.currency ?? null;
  const canContinueToPayment = Boolean(createdSession?.id && breakdown);
  const hasRequiredParams = Boolean(params.slug && params.selectedStartAt);
  const footerSummary = useMemo(() => {
    if (!params.selectedStartAt) return "";
    return formatViewerDateTime(params.selectedStartAt, { locale });
  }, [locale, params.selectedStartAt]);

  const handleConfirm = async () => {
    if (confirmLockRef.current || createMutation.isPending) {
      return;
    }

    if (createdSession?.id) {
      router.push(`/(patient)/sessions/${createdSession.id}/pay` as any);
      return;
    }

    if (!hasRequiredParams) {
      return;
    }

    setSubmitError(null);
    confirmLockRef.current = true;

    try {
      const payload = await createMutation.mutateAsync({
        practitionerSlug: params.slug,
        scheduledStartAt: params.selectedStartAt,
        durationMinutes: duration,
        sessionMode: "VIDEO",
      });

      setCreatedSession({
        id: payload.item.id,
        sessionCode: payload.item.sessionCode,
        status: payload.item.status,
      });
      trackAnalyticsEvent("booking_confirmed", {
        practitionerSlug: params.slug || undefined,
        sessionId: payload.item.id,
        sessionStatus: payload.item.status,
        selectedStartAt: params.selectedStartAt,
        durationMinutes: duration,
      });
    } catch (error) {
      setSubmitError(extractApiErrorMessage(error));
    } finally {
      confirmLockRef.current = false;
    }
  };

  return (
    <Screen bg="background">
      <Header showBack />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 140 + Math.max(insets.bottom, 10) },
        ]}
      >
        <ScreenHeading
          title={t("patientSessionsFlow.confirmation.reviewTitle")}
          subtitle={t("patientSessionsFlow.confirmation.reviewSubtitle")}
          titleVariant="h2"
        />

        {!hasRequiredParams ? (
          <Card variant="elevated" padding="lg" style={styles.sectionCard}>
            <Text weight="600" style={styles.sectionTitle}>
              {t("patientSessionsFlow.confirmation.missingParamsTitle")}
            </Text>
            <Text color={theme.colors.textSecondary} style={styles.noteText}>
              {t("patientSessionsFlow.confirmation.missingParamsBody")}
            </Text>
            <Button
              title={t("patientSessionsFlow.confirmation.backToSelectTime")}
              onPress={() => router.back()}
              style={styles.actionButton}
            />
          </Card>
        ) : null}

        <Card variant="elevated" padding="lg" style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="calendar-outline" size={18} color={theme.colors.primary} />
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
            <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.surfaceTertiary }]}>
              {params.practitionerAvatarUrl ? (
                <Image source={{ uri: params.practitionerAvatarUrl }} style={styles.avatarImage} />
              ) : (
                <Image source={FALLBACK_AVATAR} style={styles.avatarImage} />
              )}
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={[styles.infoIconWrap, { backgroundColor: theme.colors.surfaceTertiary }]}>
              <Ionicons name="calendar-clear-outline" size={16} color={theme.colors.primary} />
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

          <View style={styles.infoRow}>
            <View style={[styles.infoIconWrap, { backgroundColor: theme.colors.surfaceTertiary }]}>
              <Ionicons name="hourglass-outline" size={16} color={theme.colors.primary} />
            </View>
            <View style={styles.infoTextWrap}>
              <Text color={theme.colors.textMuted} style={styles.metaLabel}>
                {t("patientSessionsFlow.common.duration")}
              </Text>
              <Text weight="600" style={styles.metaValueSmall}>
                {totalLabel}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={[styles.infoIconWrap, { backgroundColor: theme.colors.surfaceTertiary }]}>
              <Ionicons name="videocam-outline" size={16} color={theme.colors.primary} />
            </View>
            <View style={styles.infoTextWrap}>
              <Text color={theme.colors.textMuted} style={styles.metaLabel}>
                {t("patientSessionsFlow.detail.timezone")}
              </Text>
              <Text weight="600" style={styles.metaValueSmall}>
                {formatTimeZoneLabel(timezone, { locale, includeOffset: true })}
              </Text>
            </View>
          </View>
        </Card>

        <Card variant="elevated" padding="lg" style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="card-outline" size={18} color={theme.colors.primary} />
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

          {createdSession ? (
            <View style={styles.moneyRow}>
              <Text color={theme.colors.textSecondary}>
                {t(
                  "patientSessionsFlow.confirmation.sessionReference",
                  "Session reference",
                )}
              </Text>
              <Text weight="600">{createdSession.sessionCode}</Text>
            </View>
          ) : null}

          {createdSession && breakdownQuery.isLoading ? (
            <Card variant="flat" padding="sm" style={styles.securityNote}>
              <Text
                color={theme.colors.textSecondary}
                style={styles.securityText}
              >
                {t(
                  "patientSessionsFlow.confirmation.breakdownLoading",
                  "Loading the final payment breakdown from the backend...",
                )}
              </Text>
            </Card>
          ) : null}

          {createdSession && breakdown ? (
            <>
              <View style={styles.moneyRow}>
                <Text color={theme.colors.textSecondary}>
                  {t(
                    "patientSessionsFlow.confirmation.grossAmount",
                    "Session price",
                  )}
                </Text>
                <Text weight="600">
                  {formatMoney(breakdown.grossAmount, breakdownCurrency, locale)}
                </Text>
              </View>

              <View style={styles.moneyRow}>
                <Text color={theme.colors.textSecondary}>
                  {t(
                    "patientSessionsFlow.confirmation.discountAmount",
                    "Discount",
                  )}
                </Text>
                <Text weight="600">
                  {formatMoney(breakdown.discountAmount, breakdownCurrency, locale)}
                </Text>
              </View>

              <View style={styles.moneyRow}>
                <Text color={theme.colors.textSecondary}>
                  {t(
                    "patientSessionsFlow.confirmation.amountDue",
                    "Amount due now",
                  )}
                </Text>
                <Text weight="600" color={theme.colors.primary}>
                  {formatMoney(breakdown.netPaidAmount, breakdownCurrency, locale)}
                </Text>
              </View>
            </>
          ) : null}

          {createdSession && breakdownQuery.isError ? (
            <Card variant="flat" padding="sm" style={styles.securityNote}>
              <Text color="#ba1a1a" style={styles.securityText}>
                {t(
                  "patientSessionsFlow.confirmation.breakdownError",
                  "The payment breakdown could not be loaded yet. Try again before continuing to payment.",
                )}
              </Text>
              <Button
                title={t("patientSessionsFlow.common.retry")}
                onPress={() => breakdownQuery.refetch()}
                variant="secondary"
                style={styles.retryButton}
              />
            </Card>
          ) : null}

          {!createdSession ? (
            <Card variant="flat" padding="sm" style={styles.securityNote}>
              <Text color={theme.colors.textSecondary} style={styles.securityText}>
                {t("patientSessionsFlow.confirmation.previewNotice")}
              </Text>
            </Card>
          ) : null}
        </Card>

        <Card variant="elevated" padding="md" style={styles.policyCard}>
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
            paddingBottom: Math.max(10, insets.bottom + 4),
          },
        ]}
      >
        {footerSummary ? (
          <Text style={styles.footerSummary} color={theme.colors.textSecondary}>
            {footerSummary}
          </Text>
        ) : null}
        <Button
          title={
            createMutation.isPending
              ? t("patientSessionsFlow.confirmation.confirming")
              : createdSession
                ? t(
                    "patientSessionsFlow.confirmation.continueToPaymentCta",
                    "Continue to payment",
                  )
                : t(
                    "patientSessionsFlow.confirmation.reviewBreakdownCta",
                    "Create booking and review payment",
                  )
          }
          onPress={handleConfirm}
          disabled={
            createMutation.isPending ||
            confirmLockRef.current ||
            (!createdSession && !hasRequiredParams) ||
            (Boolean(createdSession) && !canContinueToPayment)
          }
          style={styles.confirmButton}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 10,
    gap: 10,
  },
  sectionCard: { borderRadius: 14 },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 16, lineHeight: 22 },
  practitionerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  practitionerMetaCol: {
    flex: 1,
    marginEnd: 8,
  },
  metaLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  metaValue: { fontSize: 16, lineHeight: 22 },
  metaValueSmall: { fontSize: 14, lineHeight: 20 },
  metaSubValue: { fontSize: 13, lineHeight: 19 },
  avatarPlaceholder: {
    width: 58,
    height: 58,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: 58,
    height: 58,
    borderRadius: 14,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  infoIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginEnd: 8,
  },
  infoTextWrap: {
    flex: 1,
  },
  moneyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    gap: 12,
  },
  securityNote: {
    marginTop: 8,
  },
  securityText: {
    fontSize: 13,
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 10,
  },
  policyCard: {
    marginBottom: 4,
    borderRadius: 14,
  },
  policyText: {
    fontSize: 13,
    lineHeight: 20,
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 8,
    gap: 8,
  },
  footerSummary: { fontSize: 12 },
  confirmButton: {
    borderRadius: 12,
  },
  noteText: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
  },
  actionButton: {
    marginTop: 10,
  },
});

