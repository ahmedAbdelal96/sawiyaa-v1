import React, { useMemo, useRef, useState } from "react";
import { Image, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Header, Screen, Text, Card, Button } from "../../../src/components/ui";
import { useTheme } from "../../../src/providers/ThemeProvider";
import { useCreateScheduledSession } from "../../../src/features/patient/sessions/hooks";
import { useSessionFinancialBreakdown } from "../../../src/features/patient/payments/hooks";
import { formatLocalizedDateTime } from "../../../src/features/patient/sessions/slot-utils";
import { extractApiErrorMessage } from "../../../src/lib/api";
import { trackAnalyticsEvent } from "../../../src/lib/analytics";
import { resolveSupportedCurrencyCode } from "../../../src/lib/currency";

function formatMoney(amount: string, currencyCode: string): string {
  const value = Number(amount);
  if (!Number.isFinite(value)) {
    return `${amount} ${currencyCode.toUpperCase()}`;
  }

  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(value);
}

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
    return formatLocalizedDateTime(params.selectedStartAt, locale);
  }, [params.selectedStartAt, locale, t]);

  const totalLabel = useMemo(() => {
    return t("patientSessionsFlow.confirmation.durationValue", {
      minutes: duration,
    });
  }, [duration, t]);

  const breakdown = breakdownQuery.data?.item;
  const breakdownCurrency = resolveSupportedCurrencyCode({
    currencyCode: breakdown?.currency ?? null,
    regionalPricingMode: breakdown?.regionalPricingMode ?? null,
    resolvedCountryIsoCode: breakdown?.resolvedCountryIsoCode ?? null,
  });
  const canContinueToPayment = Boolean(createdSession?.id && breakdown);

  const handleConfirm = async () => {
    if (confirmLockRef.current || createMutation.isPending) {
      return;
    }

    if (createdSession?.id) {
      router.replace(`/(patient)/sessions/${createdSession.id}/pay` as any);
      return;
    }

    if (!params.slug || !params.selectedStartAt) {
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
      <Header
        showBack
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
              {params.practitionerAvatarUrl ? (
                <Image
                  source={{ uri: params.practitionerAvatarUrl }}
                  style={styles.avatarImage}
                />
              ) : (
                <Ionicons
                  name="person"
                  size={26}
                  color={theme.colors.textMuted}
                />
              )}
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
                    opacity: createdSession ? 0.55 : 1,
                  },
                ]}
                onPress={() => setDuration(30)}
                disabled={Boolean(createdSession)}
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
                    opacity: maxDuration >= 60 && !createdSession ? 1 : 0.35,
                  },
                ]}
                disabled={maxDuration < 60 || Boolean(createdSession)}
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
                  {formatMoney(breakdown.grossAmount, breakdownCurrency)}
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
                  {formatMoney(breakdown.discountAmount, breakdownCurrency)}
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
                  {formatMoney(breakdown.netPaidAmount, breakdownCurrency)}
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

          <Card variant="flat" padding="sm" style={styles.securityNote}>
            <Text
              color={theme.colors.textSecondary}
              style={styles.securityText}
            >
              {createdSession
                ? t(
                    "patientSessionsFlow.confirmation.reviewBeforePaymentNotice",
                    "Your session is now pending payment. Review this final breakdown before you continue to checkout.",
                  )
                : t(
                    "patientSessionsFlow.confirmation.reviewBeforeCreateNotice",
                    "We will create a pending-payment session first, then show the final backend payment breakdown before you continue to checkout.",
                  )}
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
            (!createdSession && (!params.slug || !params.selectedStartAt)) ||
            (Boolean(createdSession) && !canContinueToPayment)
          }
          style={styles.confirmButton}
        />

        {createdSession ? (
          <Button
            title={t("patientSessionsFlow.success.goToSessions")}
            variant="secondary"
            onPress={() => router.replace("/(patient)/sessions")}
            style={styles.secondaryButton}
          />
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 170,
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
    overflow: "hidden",
  },
  avatarImage: {
    width: 70,
    height: 70,
    borderRadius: 16,
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
    gap: 10,
  },
  confirmButton: {
    borderRadius: 12,
  },
  secondaryButton: {
    borderRadius: 12,
  },
});

