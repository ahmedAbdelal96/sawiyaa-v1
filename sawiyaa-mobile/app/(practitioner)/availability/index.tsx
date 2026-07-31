import React from "react";
import { Alert, FlatList, Pressable, StyleSheet, Switch, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Button, Card, ErrorState, Header, LoadingState, Screen, Text } from "../../../src/components/ui";
import { useTheme } from "../../../src/providers/ThemeProvider";
import { useMyAvailabilityWeeks, useMyBookingSettings, useUpdateMyBookingSettings } from "../../../src/features/practitioner/availability/hooks";
import { useMyPresence, useSetInstantBooking } from "../../../src/features/practitioner/presence/hooks";
import { formatWeekRange } from "../../../src/features/practitioner/availability/utils";
import type { AvailabilityWeekWindowEntry } from "../../../src/features/practitioner/availability/types";

function statusKey(status: AvailabilityWeekWindowEntry["status"]) {
  return `practitioner.availability.status.${status}`;
}

export default function PractitionerAvailabilityScreen() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  const weeksQuery = useMyAvailabilityWeeks();
  const settingsQuery = useMyBookingSettings();
  const settingsMutation = useUpdateMyBookingSettings();
  const presenceQuery = useMyPresence();
  const instantBookingMutation = useSetInstantBooking();
  const isRtl = i18n.dir() === "rtl";

  if (weeksQuery.isLoading || settingsQuery.isLoading) return <Screen><Header title={t("practitioner.availability.title")} /><LoadingState message={t("practitioner.availability.loading")} /></Screen>;
  if (weeksQuery.isError || !weeksQuery.data) return <Screen><Header title={t("practitioner.availability.title")} /><ErrorState title={t("practitioner.availability.loadError")} onRetry={() => void weeksQuery.refetch()} /></Screen>;

  const data = weeksQuery.data;
  const openDetails = (week: AvailabilityWeekWindowEntry) => {
    if (week.weekId) router.push(`/(practitioner)/availability/${week.weekId}` as never);
    else if (data.timezone) {
      router.push({ pathname: "/(practitioner)/availability/editor" as never, params: { weekStartDate: week.weekStartDate, timezone: data.timezone } } as never);
    } else Alert.alert(t("common.error"), t("practitioner.availability.timezoneRequired"));
  };

  const renderWeek = ({ item }: { item: AvailabilityWeekWindowEntry }) => (
    <Pressable onPress={() => openDetails(item)} accessibilityRole="button" style={({ pressed }) => [styles.pressable, pressed && { opacity: 0.78 }]}>
      <Card variant="outlined" padding="md" style={styles.card}>
        <View style={[styles.row, { flexDirection: isRtl ? "row-reverse" : "row" }]}>
          <View style={styles.flex}>
            <Text weight="700">{formatWeekRange(item.weekStartDate, item.weekEndDate, i18n.language)}</Text>
            <Text variant="caption" color={theme.colors.textSecondary} style={styles.meta}>
              {item.isCurrentWeek ? t("practitioner.availability.currentWeek") : t("practitioner.availability.weekNumber", { count: item.relativeWeekIndex })} · {t("practitioner.availability.slotCount", { count: item.slotCount })}
            </Text>
          </View>
          <Text variant="caption" color={item.status === "PUBLISHED" ? theme.colors.success : theme.colors.textSecondary} weight="700">{t(statusKey(item.status))}</Text>
        </View>
        {item.containsBookings ? <Text variant="caption" color={theme.colors.textMuted} style={styles.protected}>{t("practitioner.availability.protectedSlots")}</Text> : null}
        <View style={[styles.cardActions, { flexDirection: isRtl ? "row-reverse" : "row" }]}>
          <Text variant="caption" color={theme.colors.primary} weight="700">{item.weekId ? t("practitioner.availability.viewDetails") : t("practitioner.availability.createWeek")}</Text>
          {item.canCreate && !item.weekId ? (
            <View
              style={[
                styles.smallButton,
                {
                  backgroundColor: theme.colors.surfaceRaised,
                  borderColor: theme.colors.border,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderRadius: theme.radius.md,
                  justifyContent: "center",
                  alignItems: "center",
                  paddingHorizontal: 18,
                },
              ]}
            >
              <Text variant="caption" color={theme.colors.textPrimary} weight="700">
                {t("practitioner.availability.createWeek")}
              </Text>
            </View>
          ) : null}
        </View>
      </Card>
    </Pressable>
  );

  const accepts = settingsQuery.data?.acceptsNormalBookings ?? true;
  return <Screen>
    <Header title={t("practitioner.availability.title")} />
    <FlatList
      data={data.weeks}
      keyExtractor={(item) => item.weekId ?? item.weekStartDate}
      renderItem={renderWeek}
      contentContainerStyle={styles.content}
      ListHeaderComponent={<>
        <Text variant="body" color={theme.colors.textSecondary} style={styles.lead}>{t("practitioner.availability.overviewBody")}</Text>
        <Card variant="outlined" padding="md" style={styles.bookingCard}>
          <View style={[styles.row, { flexDirection: isRtl ? "row-reverse" : "row" }]}>
            <View style={styles.flex}><Text weight="700">{t("practitioner.availability.normalBookings")}</Text><Text variant="caption" color={theme.colors.textSecondary} style={styles.meta}>{t("practitioner.availability.normalBookingsBody")}</Text></View>
            <Switch value={accepts} onValueChange={(value) => { if (!value) Alert.alert(t("practitioner.availability.pauseBookingsTitle"), t("practitioner.availability.pauseBookingsBody"), [{ text: t("common.cancel"), style: "cancel" }, { text: t("common.confirm"), onPress: () => settingsMutation.mutate(false) }]); else settingsMutation.mutate(true); }} disabled={settingsMutation.isPending} accessibilityLabel={t("practitioner.availability.normalBookings")} />
          </View>
        </Card>
        <Card variant="outlined" padding="md" style={styles.bookingCard}>
          <View style={[styles.row, { flexDirection: isRtl ? "row-reverse" : "row" }]}>
            <View style={styles.flex}>
              <Text weight="700">{t("practitioner.availability.instantBooking", { defaultValue: "Instant booking" })}</Text>
              <Text variant="caption" color={theme.colors.textSecondary} style={styles.meta}>
                {t("practitioner.availability.presenceStatus", { defaultValue: "Presence: {{status}}", status: presenceQuery.data?.presence.status ?? "OFFLINE" })}
              </Text>
            </View>
            <Switch value={Boolean(presenceQuery.data?.presence.isInstantBookingEnabled)} onValueChange={(value) => instantBookingMutation.mutate({ isInstantBookingEnabled: value })} disabled={instantBookingMutation.isPending || presenceQuery.isLoading} accessibilityLabel={t("practitioner.availability.instantBooking", { defaultValue: "Instant booking" })} />
          </View>
        </Card>
        {!data.timezone ? <Card variant="outlined" padding="md" style={styles.warning}><Text weight="700">{t("practitioner.availability.timezoneRequired")}</Text><Text variant="caption" color={theme.colors.textSecondary}>{t("practitioner.availability.timezoneRequiredBody")}</Text><Button title={t("practitioner.availability.openTimezoneSettings")} variant="secondary" onPress={() => router.push("/(practitioner)/account" as never)} style={styles.settingsButton} /></Card> : <Text variant="caption" color={theme.colors.textSecondary} style={styles.timezone}>{t("practitioner.availability.timezone", { timezone: data.timezone })}</Text>}
        <Text weight="700" style={styles.sectionTitle}>{t("practitioner.availability.weeksTitle")}</Text>
      </>}
      ListEmptyComponent={<Text color={theme.colors.textSecondary}>{t("practitioner.availability.noWeeks")}</Text>}
    />
  </Screen>;
}

const styles = StyleSheet.create({ content: { padding: 16, paddingBottom: 32 }, lead: { marginBottom: 16, textAlign: "center" }, bookingCard: { marginBottom: 12 }, warning: { marginBottom: 16, gap: 8 }, settingsButton: { marginTop: 4 }, timezone: { marginBottom: 20, textAlign: "center" }, sectionTitle: { marginBottom: 10 }, pressable: { marginBottom: 10 }, card: { borderRadius: 16 }, row: { alignItems: "center", gap: 12 }, flex: { flex: 1, minWidth: 0 }, meta: { marginTop: 5 }, protected: { marginTop: 12 }, cardActions: { alignItems: "center", justifyContent: "space-between", marginTop: 14, gap: 10 }, smallButton: { width: "auto", minWidth: 120, paddingVertical: 8, minHeight: 40 } });
