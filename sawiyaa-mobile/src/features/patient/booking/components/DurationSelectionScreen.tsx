import React, { useMemo, useState } from "react";
import { Image, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Button, Card, ErrorState, Header, LoadingState, Screen, Text } from "../../../../components/ui";
import { useTheme } from "../../../../providers/ThemeProvider";
import { useGetPublicPractitionerDetails } from "../../discovery/api";
import { usePublicPractitionerPackagePlans } from "../../package-plans/hooks";
import { formatMoney as formatCentralMoney, parseMoney } from "../../../../lib/money";
import { getProfessionalTitleLabel } from "../../../practitioner/reference-data";
import { useAppDirection } from "../../../../i18n/direction";
import { getSupportedBookingDurations, type BookingDuration } from "../view-model";

const FALLBACK_AVATAR = require("../../../../../assets/user.avif");

export default function DurationSelectionScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const { rowDirection, textAlign, isRtl } = useAppDirection();
  const params = useLocalSearchParams<{
    slug: string;
    practitionerName?: string;
    practitionerTitle?: string;
    practitionerAvatarUrl?: string;
  }>();
  const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US";
  const [selectedDuration, setSelectedDuration] = useState<BookingDuration | null>(null);
  const [avatarFailed, setAvatarFailed] = useState(false);

  const practitionerQuery = useGetPublicPractitionerDetails(params.slug ?? null);
  const practitioner = practitionerQuery.data?.data.item ?? null;
  const durations = useMemo(() => getSupportedBookingDurations(practitioner), [practitioner]);
  const packagePlansQuery = usePublicPractitionerPackagePlans(
    params.slug ?? null,
    { sessionMode: "VIDEO" },
    { enabled: Boolean(params.slug) },
  );
  const hasPackageOption = packagePlansQuery.data?.items.length ? packagePlansQuery.data.items.length > 0 : false;
  const practitionerName = params.practitionerName ?? practitioner?.displayName ?? t("patientSessionsFlow.common.practitionerFallback");
  const practitionerTitle = params.practitionerTitle ?? getProfessionalTitleLabel(practitioner?.professionalTitle, isRtl) ?? t("patientSessionsFlow.common.professionalFallback");
  const avatarUrl = params.practitionerAvatarUrl ?? practitioner?.avatarUrl ?? "";

  const goToAppointment = (durationMinutes: BookingDuration) => {
    router.push({
      pathname: "/(patient)/sessions/select-time",
      params: {
        slug: params.slug,
        durationMinutes: String(durationMinutes),
        practitionerName,
        practitionerTitle,
        practitionerAvatarUrl: avatarUrl,
      },
    });
  };

  if (practitionerQuery.isLoading) {
    return <Screen bg="background"><Header showBack /><LoadingState fullScreen /></Screen>;
  }

  if (practitionerQuery.isError || !practitioner) {
    return (
      <Screen bg="background">
        <Header showBack />
        <ErrorState onRetry={() => void practitionerQuery.refetch()} />
      </Screen>
    );
  }

  return (
    <Screen bg="background" testID="patient-booking-duration-screen" edges={["top", "left", "right"]}>
      <Header showBack />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.heading}>
          <Text variant="h2" weight="bold" style={[styles.title, { textAlign }]}>
            {t("patientBookingFlow.duration.title")}
          </Text>
          <Text color={theme.colors.textSecondary} style={[styles.subtitle, { textAlign }]}>
            {t("patientBookingFlow.duration.subtitle")}
          </Text>
        </View>

        <Card variant="elevated" padding="md" style={styles.practitionerCard}>
          <View style={[styles.practitionerRow, { flexDirection: rowDirection }]}>
            <View style={[styles.avatarWrap, { backgroundColor: theme.colors.surfaceTertiary }]}>
              {avatarUrl && !avatarFailed ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatar} onError={() => setAvatarFailed(true)} />
              ) : (
                <Image source={FALLBACK_AVATAR} style={styles.avatar} />
              )}
            </View>
            <View style={styles.practitionerCopy}>
              <Text weight="600" style={[styles.practitionerName, { textAlign }]}>{practitionerName}</Text>
              <Text color={theme.colors.textSecondary} style={[styles.practitionerTitle, { textAlign }]}>{practitionerTitle}</Text>
            </View>
          </View>
        </Card>

        {durations.length === 0 ? (
          <Card variant="flat" padding="md" style={styles.noticeCard}>
            <Ionicons name="time-outline" size={24} color={theme.colors.textSecondary} />
            <Text weight="600" style={[styles.noticeTitle, { textAlign }]}>{t("patientBookingFlow.duration.unavailableTitle")}</Text>
            <Text color={theme.colors.textSecondary} style={[styles.noticeBody, { textAlign }]}>{t("patientBookingFlow.duration.unavailableBody")}</Text>
          </Card>
        ) : (
          <View style={styles.options}>
            {durations.map((option) => {
              const selected = option.durationMinutes === selectedDuration;
              const money = option.amount == null ? null : parseMoney(String(option.amount), option.currencyCode);
              return (
                <TouchableOpacity
                  key={option.durationMinutes}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => setSelectedDuration(option.durationMinutes)}
                  style={[
                    styles.durationOption,
                    {
                      backgroundColor: selected ? theme.colors.primaryLight : theme.colors.surface,
                      borderColor: selected ? theme.colors.primary : theme.colors.borderLight,
                    },
                  ]}
                >
                  <View style={styles.durationIcon}>
                    <Ionicons name="time-outline" size={22} color={selected ? theme.colors.primary : theme.colors.textSecondary} />
                  </View>
                  <View style={styles.durationCopy}>
                    <Text weight="600" style={[styles.durationLabel, { textAlign }]}>
                      {t(`patientBookingFlow.duration.minutes${option.durationMinutes}`)}
                    </Text>
                    <Text color={selected ? theme.colors.primary : theme.colors.textSecondary} style={[styles.price, { textAlign }]}>
                      {money ? formatCentralMoney(money, locale) : t("patientBookingFlow.duration.priceUnavailable")}
                    </Text>
                  </View>
                  <Ionicons name={selected ? "checkmark-circle" : "ellipse-outline"} size={22} color={selected ? theme.colors.primary : theme.colors.borderStrong} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {hasPackageOption ? (
          <Card variant="outlined" padding="md" style={styles.packageCard}>
            <View style={styles.packageRow}>
              <View style={styles.packageCopy}>
                <Text weight="600" style={[styles.packageTitle, { textAlign }]}>{t("patientBookingFlow.duration.packageTitle")}</Text>
                <Text color={theme.colors.textSecondary} style={[styles.packageHint, { textAlign }]}>{t("patientBookingFlow.duration.packageHint")}</Text>
              </View>
              <Button
                title={t("patientBookingFlow.duration.packageAction")}
                variant="secondary"
                onPress={() => router.push({ pathname: "/(patient)/sessions/select-time", params: { slug: params.slug, bookingType: "package", durationMinutes: String(selectedDuration ?? durations[0]?.durationMinutes ?? 30), practitionerName, practitionerTitle, practitionerAvatarUrl: avatarUrl } })}
                style={styles.packageButton}
              />
            </View>
          </Card>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.borderLight }]}>
        <Button
          title={t("patientBookingFlow.duration.continue")}
          onPress={() => selectedDuration && goToAppointment(selectedDuration)}
          disabled={!selectedDuration}
          style={styles.footerButton}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 120, gap: 12 },
  heading: { gap: 4, paddingHorizontal: 2 },
  title: { fontSize: 25, lineHeight: 33 },
  subtitle: { fontSize: 14, lineHeight: 21 },
  practitionerCard: { borderRadius: 16 },
  practitionerRow: { alignItems: "center", gap: 12 },
  avatarWrap: { width: 48, height: 48, borderRadius: 999, overflow: "hidden" },
  avatar: { width: 48, height: 48, borderRadius: 999 },
  practitionerCopy: { flex: 1, gap: 2 },
  practitionerName: { fontSize: 16, lineHeight: 22 },
  practitionerTitle: { fontSize: 13, lineHeight: 19 },
  options: { gap: 10 },
  durationOption: { minHeight: 78, borderWidth: 1, borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  durationIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0, 107, 96, 0.08)" },
  durationCopy: { flex: 1, gap: 3 },
  durationLabel: { fontSize: 16, lineHeight: 22 },
  price: { fontSize: 14, lineHeight: 20 },
  noticeCard: { alignItems: "center", gap: 6 },
  noticeTitle: { fontSize: 16, lineHeight: 22 },
  noticeBody: { fontSize: 14, lineHeight: 21, textAlign: "center" },
  packageCard: { borderRadius: 16 },
  packageRow: { alignItems: "stretch", gap: 10 },
  packageCopy: { gap: 3 },
  packageTitle: { fontSize: 15, lineHeight: 21 },
  packageHint: { fontSize: 12, lineHeight: 18 },
  packageButton: { alignSelf: "flex-start", minWidth: 116 },
  footer: { borderTopWidth: 1, padding: 16, paddingBottom: 20 },
  footerButton: { width: "100%" },
});
