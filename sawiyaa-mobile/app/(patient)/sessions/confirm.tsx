import React, { useMemo, useRef, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  View,
  TouchableOpacity,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  Header,
  Screen,
  Text,
  Button,
} from "../../../src/components/ui";
import { useTheme } from "../../../src/providers/ThemeProvider";
import { useCreateScheduledSession } from "../../../src/features/patient/sessions/hooks";
import { useSessionFinancialBreakdown } from "../../../src/features/patient/payments/hooks";
import {
  formatTimeZoneLabel,
  formatPatientDateTime,
  resolvePatientDisplayTimeZone,
} from "../../../src/lib/time-formatting";
import { usePatientProfile } from "../../../src/features/patient/profile/hooks";
import { extractApiErrorMessage } from "../../../src/lib/api";
import { trackAnalyticsEvent } from "../../../src/lib/analytics";
import {
  formatMoney as formatCentralMoney,
  parseMoney,
} from "../../../src/lib/money";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const FALLBACK_AVATAR = require("../../../assets/user.avif");

function formatMoney(
  amount: string,
  currencyCode: string | null | undefined,
  locale: string,
): string {
  const money = parseMoney(amount, currencyCode);
  return money ? formatCentralMoney(money, locale) : "-";
}

function InfoRow({
  icon,
  label,
  value,
  valueColor,
  accent,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  valueColor?: string;
  accent?: boolean;
}) {
  const { theme } = useTheme();
  return (
    <View style={infoRowStyles.row}>
      <View
        style={[
          infoRowStyles.iconWrap,
          {
            backgroundColor: accent
              ? theme.colors.primaryLight
              : theme.colors.surfaceTertiary,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={17}
          color={accent ? theme.colors.primary : theme.colors.textSecondary}
        />
      </View>
      <View style={infoRowStyles.textWrap}>
        <Text style={infoRowStyles.label} color={theme.colors.textMuted}>
          {label}
        </Text>
        <Text
          weight="600"
          style={infoRowStyles.value}
          color={valueColor ?? theme.colors.textPrimary}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

const infoRowStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginEnd: 12,
  },
  textWrap: { flex: 1 },
  label: { fontSize: 11, marginBottom: 2, textTransform: "uppercase", letterSpacing: 0.5 },
  value: { fontSize: 15, lineHeight: 21 },
});

function PriceRow({
  label,
  value,
  isTotal,
}: {
  label: string;
  value: string;
  isTotal?: boolean;
}) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        priceRowStyles.row,
        isTotal && {
          borderTopWidth: 1,
          borderTopColor: theme.colors.borderLight,
          marginTop: 4,
          paddingTop: 12,
        },
      ]}
    >
      <Text
        style={priceRowStyles.label}
        weight={isTotal ? "600" : "400"}
        color={isTotal ? theme.colors.textPrimary : theme.colors.textSecondary}
      >
        {label}
      </Text>
      <Text
        weight={isTotal ? "bold" : "600"}
        style={priceRowStyles.value}
        color={isTotal ? theme.colors.primary : theme.colors.textPrimary}
      >
        {value}
      </Text>
    </View>
  );
}

const priceRowStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 7,
  },
  label: { fontSize: 14 },
  value: { fontSize: 14 },
});

export default function BookingConfirmationScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const isRtl = i18n.language?.startsWith("ar") ?? false;
  const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US";
  const patientProfileQuery = usePatientProfile();
  const timezone =
    resolvePatientDisplayTimeZone(patientProfileQuery.data?.profile.timezone) ??
    "UTC";

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
  const [avatarFailed, setAvatarFailed] = useState(false);

  const createMutation = useCreateScheduledSession();
  const breakdownQuery = useSessionFinancialBreakdown(
    createdSession?.id ?? null,
  );

  const selectedDateText = useMemo(() => {
    if (!params.selectedStartAt) {
      return t("patientSessionsFlow.common.notAvailable");
    }
    return formatPatientDateTime(params.selectedStartAt, timezone, { locale });
  }, [params.selectedStartAt, locale, t, timezone]);

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
    return formatPatientDateTime(params.selectedStartAt, timezone, { locale });
  }, [locale, params.selectedStartAt, timezone]);

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

  const showAvatar = params.practitionerAvatarUrl && !avatarFailed;

  return (
    <Screen bg="background" testID="patient-booking-screen">
      <Header showBack />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 136 + Math.max(insets.bottom, 10) },
        ]}
      >
        {/* ── Page Title ─────────────────────────────────────── */}
        <View style={styles.pageHeader}>
          <Text variant="h2" weight="bold" style={[styles.pageTitle, isRtl && { textAlign: "right" }]}>
            {t("patientSessionsFlow.confirmation.reviewTitle")}
          </Text>
          <Text style={[styles.pageSubtitle, isRtl && { textAlign: "right" }]} color={theme.colors.textSecondary}>
            {t("patientSessionsFlow.confirmation.reviewSubtitle")}
          </Text>
        </View>

        {/* ── Practitioner Hero Card ──────────────────────────── */}
        <View
          style={[
            styles.heroCard,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderLight },
          ]}
        >
          {/* Accent bar */}
          <View style={[styles.heroAccentBar, { backgroundColor: theme.colors.primary }]} />

          <View style={styles.heroContent}>
            {/* Avatar */}
            <View
              style={[
                styles.heroAvatarWrap,
                { backgroundColor: theme.colors.surfaceTertiary, borderColor: theme.colors.borderLight },
              ]}
            >
              {showAvatar ? (
                <Image
                  source={{ uri: params.practitionerAvatarUrl }}
                  style={styles.heroAvatar}
                  onError={() => setAvatarFailed(true)}
                />
              ) : (
                <Image source={FALLBACK_AVATAR} style={styles.heroAvatar} />
              )}
            </View>

            {/* Name + title */}
            <View style={styles.heroMeta}>
              <Text
                weight="bold"
                style={[styles.heroName, isRtl && { textAlign: "right" }]}
              >
                {params.practitionerName ??
                  t("patientSessionsFlow.common.practitionerFallback")}
              </Text>
              <Text
                style={[styles.heroTitle, isRtl && { textAlign: "right" }]}
                color={theme.colors.textSecondary}
                numberOfLines={2}
              >
                {params.practitionerTitle ??
                  t("patientSessionsFlow.common.professionalFallback")}
              </Text>

              {/* Session mode badge */}
              <View style={styles.heroBadgeRow}>
                <View
                  style={[
                    styles.heroBadge,
                    { backgroundColor: theme.colors.primaryLight },
                  ]}
                >
                  <Ionicons name="videocam" size={13} color={theme.colors.primary} />
                  <Text style={styles.heroBadgeText} color={theme.colors.primary} weight="600">
                    {isRtl ? "جلسة فيديو" : "Video Session"}
                  </Text>
                </View>
                <View
                  style={[
                    styles.heroBadge,
                    { backgroundColor: theme.colors.surfaceTertiary },
                  ]}
                >
                  <Ionicons name="time-outline" size={13} color={theme.colors.textSecondary} />
                  <Text style={styles.heroBadgeText} color={theme.colors.textSecondary} weight="600">
                    {totalLabel}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* ── Session Details Card ────────────────────────────── */}
        <View
          style={[
            styles.card,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderLight },
          ]}
        >
          {/* Card header */}
          <View style={[styles.cardHeader, { borderBottomColor: theme.colors.borderLight }]}>
            <View style={[styles.cardHeaderIcon, { backgroundColor: theme.colors.primaryLight }]}>
              <Ionicons name="calendar" size={16} color={theme.colors.primary} />
            </View>
            <Text weight="bold" style={styles.cardHeaderTitle}>
              {t("patientSessionsFlow.confirmation.sessionDetails")}
            </Text>
          </View>

          <View style={styles.cardBody}>
            <InfoRow
              icon="calendar-clear-outline"
              label={t("patientSessionsFlow.common.dateAndTime")}
              value={selectedDateText}
              accent
            />
            <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />
            <InfoRow
              icon="hourglass-outline"
              label={t("patientSessionsFlow.common.duration")}
              value={totalLabel}
            />
            <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />
            <InfoRow
              icon="globe-outline"
              label={t("patientSessionsFlow.detail.timezone")}
              value={formatTimeZoneLabel(timezone, { locale, includeOffset: true })}
            />
          </View>
        </View>

        {/* ── Payment Summary Card ────────────────────────────── */}
        <View
          style={[
            styles.card,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderLight },
          ]}
        >
          <View style={[styles.cardHeader, { borderBottomColor: theme.colors.borderLight }]}>
            <View style={[styles.cardHeaderIcon, { backgroundColor: theme.colors.primaryLight }]}>
              <Ionicons name="card" size={16} color={theme.colors.primary} />
            </View>
            <Text weight="bold" style={styles.cardHeaderTitle}>
              {t("patientSessionsFlow.confirmation.paymentSummary")}
            </Text>
          </View>

          <View style={styles.cardBody}>
            {/* Session code after booking created */}
            {createdSession ? (
              <View
                style={[
                  styles.sessionCodeBanner,
                  { backgroundColor: theme.colors.primaryLight, borderColor: theme.colors.primary + "30" },
                ]}
              >
                <Ionicons name="checkmark-circle" size={18} color={theme.colors.primary} />
                <View style={{ flex: 1, marginStart: 8 }}>
                  <Text style={styles.sessionCodeLabel} color={theme.colors.primary} weight="600">
                    {isRtl ? "تم إنشاء الحجز" : "Booking created"}
                  </Text>
                  <Text style={styles.sessionCodeValue} color={theme.colors.textSecondary}>
                    {isRtl ? `رقم الجلسة: ${createdSession.sessionCode}` : `Ref: ${createdSession.sessionCode}`}
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Before session created — show duration + pending status */}
            {!createdSession ? (
              <>
                <PriceRow
                  label={t("patientSessionsFlow.confirmation.sessionDuration")}
                  value={totalLabel}
                />
                <PriceRow
                  label={t("patientSessionsFlow.confirmation.statusLabel")}
                  value={t("patientSessionsFlow.confirmation.pendingPayment")}
                />

                {/* Preview notice */}
                <View
                  style={[
                    styles.noticeBox,
                    { backgroundColor: theme.colors.surfaceTertiary, borderColor: theme.colors.borderLight },
                  ]}
                >
                  <Ionicons name="information-circle-outline" size={16} color={theme.colors.textSecondary} />
                  <Text
                    style={styles.noticeText}
                    color={theme.colors.textSecondary}
                  >
                    {t("patientSessionsFlow.confirmation.previewNotice")}
                  </Text>
                </View>
              </>
            ) : null}

            {/* After session created — show real breakdown */}
            {createdSession && breakdownQuery.isLoading ? (
              <View
                style={[
                  styles.noticeBox,
                  { backgroundColor: theme.colors.surfaceTertiary, borderColor: theme.colors.borderLight },
                ]}
              >
                <Ionicons name="sync-outline" size={16} color={theme.colors.textSecondary} />
                <Text style={styles.noticeText} color={theme.colors.textSecondary}>
                  {t(
                    "patientSessionsFlow.confirmation.breakdownLoading",
                    "Loading payment breakdown…",
                  )}
                </Text>
              </View>
            ) : null}

            {createdSession && breakdown ? (
              <>
                <PriceRow
                  label={t("patientSessionsFlow.confirmation.grossAmount", "Session price")}
                  value={formatMoney(breakdown.grossAmount, breakdownCurrency, locale)}
                />
                {Number(breakdown.discountAmount) > 0 ? (
                  <PriceRow
                    label={t("patientSessionsFlow.confirmation.discountAmount", "Discount")}
                    value={`- ${formatMoney(breakdown.discountAmount, breakdownCurrency, locale)}`}
                  />
                ) : null}
                <PriceRow
                  label={t("patientSessionsFlow.confirmation.amountDue", "Amount due")}
                  value={formatMoney(breakdown.netPaidAmount, breakdownCurrency, locale)}
                  isTotal
                />
              </>
            ) : null}

            {createdSession && breakdownQuery.isError ? (
              <View
                style={[
                  styles.errorBox,
                  { backgroundColor: "rgba(186,26,26,0.06)", borderColor: "rgba(186,26,26,0.18)" },
                ]}
              >
                <Ionicons name="alert-circle-outline" size={16} color="#ba1a1a" />
                <Text style={[styles.noticeText, { flex: 1, marginStart: 8 }]} color="#ba1a1a">
                  {t(
                    "patientSessionsFlow.confirmation.breakdownError",
                    "Payment breakdown could not be loaded.",
                  )}
                </Text>
                <TouchableOpacity
                  onPress={() => breakdownQuery.refetch()}
                  style={styles.retryInline}
                >
                  <Text style={{ fontSize: 13 }} color={theme.colors.primary} weight="600">
                    {t("patientSessionsFlow.common.retry")}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </View>

        {/* ── Cancellation Policy ─────────────────────────────── */}
        <View
          style={[
            styles.policyCard,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderLight },
          ]}
        >
          <View style={styles.policyInner}>
            <View
              style={[
                styles.policyIconWrap,
                { backgroundColor: theme.colors.surfaceTertiary },
              ]}
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={18}
                color={theme.colors.textSecondary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text weight="600" style={styles.policyTitle}>
                {t("patientSessionsFlow.confirmation.cancellationPolicy")}
              </Text>
              <Text
                color={theme.colors.textSecondary}
                style={[styles.policyText, isRtl && { textAlign: "right" }]}
              >
                {t("patientSessionsFlow.confirmation.policyHint")}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Submit Error ────────────────────────────────────── */}
        {submitError ? (
          <View
            style={[
              styles.errorBox,
              { backgroundColor: "rgba(186,26,26,0.06)", borderColor: "rgba(186,26,26,0.18)" },
            ]}
          >
            <Ionicons name="alert-circle-outline" size={16} color="#ba1a1a" />
            <Text
              style={[styles.noticeText, { flex: 1, marginStart: 8 }]}
              color="#ba1a1a"
            >
              {submitError}
            </Text>
          </View>
        ) : null}
      </ScrollView>

      {/* ── Sticky Footer ──────────────────────────────────── */}
      <View
        style={[
          styles.footer,
          {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.borderLight,
            paddingBottom: Math.max(16, insets.bottom + 8),
          },
        ]}
      >
        {/* Appointment summary strip */}
        {footerSummary ? (
          <View style={[styles.footerSummaryRow, { backgroundColor: theme.colors.background }]}>
            <Ionicons name="calendar-outline" size={13} color={theme.colors.textMuted} />
            <Text style={styles.footerSummaryText} color={theme.colors.textMuted}>
              {footerSummary}
            </Text>
          </View>
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
                    "Create booking & review payment",
                  )
          }
          onPress={handleConfirm}
          disabled={
            createMutation.isPending ||
            confirmLockRef.current ||
            (!createdSession && !hasRequiredParams) ||
            (Boolean(createdSession) && !canContinueToPayment)
          }
          style={styles.ctaButton}
          rightIcon={
            !createMutation.isPending ? (
              <Ionicons
                name={isRtl ? "arrow-back" : "arrow-forward"}
                size={18}
                color="#fff"
              />
            ) : undefined
          }
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
    gap: 12,
  },

  // Page header
  pageHeader: {
    paddingVertical: 4,
    paddingHorizontal: 2,
    gap: 4,
  },
  pageTitle: {
    fontSize: 24,
    lineHeight: 32,
  },
  pageSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },

  // Hero practitioner card
  heroCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  heroAccentBar: {
    height: 4,
    width: "100%",
  },
  heroContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    gap: 14,
  },
  heroAvatarWrap: {
    width: 72,
    height: 72,
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  heroAvatar: {
    width: 72,
    height: 72,
  },
  heroMeta: {
    flex: 1,
    gap: 4,
  },
  heroName: {
    fontSize: 17,
    lineHeight: 24,
  },
  heroTitle: {
    fontSize: 13,
    lineHeight: 19,
  },
  heroBadgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  heroBadgeText: {
    fontSize: 12,
  },

  // Generic card
  card: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  cardHeaderIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  cardHeaderTitle: {
    fontSize: 15,
    lineHeight: 21,
  },
  cardBody: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  divider: {
    height: 1,
    marginHorizontal: 0,
  },

  // Session code banner
  sessionCodeBanner: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginVertical: 8,
  },
  sessionCodeLabel: {
    fontSize: 13,
    lineHeight: 18,
  },
  sessionCodeValue: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },

  // Notice / info box
  noticeBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginTop: 10,
    marginBottom: 4,
  },
  noticeText: {
    fontSize: 13,
    lineHeight: 19,
    flex: 1,
  },

  // Error box
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginTop: 8,
  },
  retryInline: {
    paddingHorizontal: 8,
  },

  // Policy card
  policyCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  policyInner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
  },
  policyIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  policyTitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  policyText: {
    fontSize: 13,
    lineHeight: 19,
  },

  // Footer
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 10,
  },
  footerSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  footerSummaryText: {
    fontSize: 12,
    lineHeight: 17,
  },
  ctaButton: {
    borderRadius: 14,
  },
});
