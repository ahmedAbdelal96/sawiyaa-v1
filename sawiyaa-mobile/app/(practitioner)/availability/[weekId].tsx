import React from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Button, Card, ErrorState, Header, LoadingState, Screen, Text } from "../../../src/components/ui";
import { useTheme } from "../../../src/providers/ThemeProvider";
import { useAvailabilityWeekDetails, usePublishAvailabilityWeek } from "../../../src/features/practitioner/availability/hooks";
import { formatMinuteRange, formatWeekRange } from "../../../src/features/practitioner/availability/utils";

export default function AvailabilityWeekDetailsScreen() {
  const { weekId } = useLocalSearchParams<{ weekId: string }>();
  const { t, i18n } = useTranslation(); const { theme } = useTheme(); const router = useRouter();
  const query = useAvailabilityWeekDetails(weekId); const publish = usePublishAvailabilityWeek(); const rtl = i18n.dir() === "rtl";
  if (query.isLoading || !query.data) return <Screen><Header showBack title={t("practitioner.availability.detailsTitle")} /><LoadingState message={t("practitioner.availability.loading")} /></Screen>;
  if (query.isError) return <Screen><Header showBack title={t("practitioner.availability.detailsTitle")} /><ErrorState title={t("practitioner.availability.loadError")} onRetry={() => void query.refetch()} /></Screen>;
  const week = query.data.week;
  const days = [0, 1, 2, 3, 4, 5, 6];
  const publishWeek = () => Alert.alert(t("practitioner.availability.publishTitle"), t("practitioner.availability.publishBody"), [{ text: t("common.cancel"), style: "cancel" }, { text: t("common.confirm"), onPress: () => publish.mutate(week.id!, { onError: () => Alert.alert(t("common.error"), t("practitioner.availability.actionError")) }) }]);
  return <Screen><Header showBack title={t("practitioner.availability.detailsTitle")} /><ScrollView contentContainerStyle={styles.content}>
    <Text weight="700" style={styles.range}>{formatWeekRange(week.weekStartDate, week.weekEndDate, i18n.language)}</Text>
    <Text variant="caption" color={theme.colors.textSecondary} style={styles.center}>{t(`practitioner.availability.status.${week.status}`)} · {t("practitioner.availability.timezone", { timezone: week.timezone })}</Text>
    {week.status === "PUBLISHED" ? <Card variant="outlined" padding="md" style={styles.notice}><Text variant="caption" color={theme.colors.textSecondary}>{t("practitioner.availability.publishedNote")}</Text></Card> : null}
    {days.map((day) => { const slots = week.slots.filter((slot) => slot.dayOfWeek === day); return <Card key={day} variant="outlined" padding="md" style={styles.dayCard}><Text weight="700" style={{ textAlign: rtl ? "right" : "left" }}>{t(`practitioner.availability.weeks.days.${["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][day]}`)}</Text>{slots.length ? slots.map((slot) => <View key={slot.id || `${day}-${slot.startMinuteOfDay}-${slot.durationMinutes}`} style={[styles.slot, { flexDirection: rtl ? "row-reverse" : "row" }]}><Text>{formatMinuteRange(slot.startMinuteOfDay, slot.durationMinutes, rtl)}</Text>{slot.canEdit === false || slot.isBookedOrReserved ? <Text variant="caption" color={theme.colors.textMuted}>{t("practitioner.availability.protectedSlot")}</Text> : null}</View>) : <Text variant="caption" color={theme.colors.textMuted} style={styles.empty}>{t("practitioner.availability.noSlots")}</Text>}</Card>; })}
    <View style={styles.actions}><Button title={t("practitioner.availability.editWeek")} onPress={() => router.push({ pathname: "/(practitioner)/availability/editor" as never, params: { weekId: week.id } } as never)} disabled={!week.isEditable} /><Button title={t("practitioner.availability.publishWeek")} variant="secondary" onPress={publishWeek} disabled={!query.data.canPublish || publish.isPending} loading={publish.isPending} /><Button title={t("practitioner.availability.repeatWeek")} variant="secondary" onPress={() => router.push({ pathname: "/(practitioner)/availability/repeat-targets" as never, params: { sourceWeekId: week.id } } as never)} /></View>
  </ScrollView></Screen>;
}
const styles = StyleSheet.create({ content: { padding: 16, paddingBottom: 32 }, range: { textAlign: "center", fontSize: 18 }, center: { textAlign: "center", marginTop: 6 }, notice: { marginTop: 16, marginBottom: 10 }, dayCard: { marginTop: 10, borderRadius: 14 }, slot: { justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#D7DDD9", marginTop: 8 }, empty: { marginTop: 10 }, actions: { gap: 10, marginTop: 18 } });
