import React, { useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Button, ErrorState, Header, LoadingState, Screen, Text } from "../../../src/components/ui";
import { useTheme } from "../../../src/providers/ThemeProvider";
import {
  useAvailabilityWeekDetails,
  useMyAvailabilityWeeks,
} from "../../../src/features/practitioner/availability/hooks";
import {
  formatScheduleTimeZoneLabel,
  getDefaultScheduleDay,
  getSelectedWeekSlots,
  getTodayDateInTimeZone,
  getTodayDayOfWeek,
  getWeekDays,
  filterScheduleSlots,
  type ScheduleDurationFilter,
  type ScheduleSlotStatus,
} from "../../../src/features/practitioner/availability/schedule-view-model";
import type { AvailabilityWeekWindowEntry } from "../../../src/features/practitioner/availability/types";
import type { DayOfWeek } from "../../../src/features/practitioner/availability/utils";
import { ScheduleDayStrip } from "../../../src/features/practitioner/availability/components/ScheduleDayStrip";
import { ScheduleDurationFilter as ScheduleDurationFilterControl } from "../../../src/features/practitioner/availability/components/ScheduleDurationFilter";
import { ScheduleSlotList } from "../../../src/features/practitioner/availability/components/ScheduleSlotList";
import { ScheduleWeekNavigator } from "../../../src/features/practitioner/availability/components/ScheduleWeekNavigator";

function sortWeeks(weeks: AvailabilityWeekWindowEntry[]): AvailabilityWeekWindowEntry[] {
  return [...weeks].sort((a, b) => a.weekStartDate.localeCompare(b.weekStartDate));
}

export default function PractitionerScheduleScreen() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  const { repeatSuccess } = useLocalSearchParams<{ repeatSuccess?: string }>();
  const weeksQuery = useMyAvailabilityWeeks();
  const [selectedWeekStartDate, setSelectedWeekStartDate] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<DayOfWeek | null>(null);
  const [durationFilter, setDurationFilter] = useState<ScheduleDurationFilter>("all");

  const weeks = useMemo(() => sortWeeks(weeksQuery.data?.weeks ?? []), [weeksQuery.data?.weeks]);
  const currentWeek = weeks.find((week) => week.isCurrentWeek) ?? weeks[0];

  useEffect(() => {
    if (!currentWeek) return;
    setSelectedWeekStartDate((value) => (
      value && weeks.some((week) => week.weekStartDate === value)
        ? value
        : currentWeek.weekStartDate
    ));
  }, [currentWeek, weeks]);

  const selectedWeek = weeks.find((week) => week.weekStartDate === selectedWeekStartDate) ?? currentWeek;
  const todayDay = getTodayDayOfWeek(weeksQuery.data?.timezone);

  useEffect(() => {
    if (!selectedWeek) return;
    setSelectedDay((value) => value ?? getDefaultScheduleDay(selectedWeek.isCurrentWeek, todayDay));
  }, [selectedWeek, todayDay]);

  const selectedDayValue = selectedDay ?? getDefaultScheduleDay(Boolean(selectedWeek?.isCurrentWeek), todayDay);
  const selectedWeekDetailsQuery = useAvailabilityWeekDetails(selectedWeek?.weekId ?? undefined);
  const selectedWeekDetails = selectedWeekDetailsQuery.data?.week;
  const days = selectedWeek
    ? getWeekDays(
      selectedWeek.weekStartDate,
      i18n.language,
      getTodayDateInTimeZone(weeksQuery.data?.timezone),
    )
    : [];
  const selectedDayData = days.find((day) => day.dayOfWeek === selectedDayValue);
  const visibleSlots = useMemo(
    () => {
      const slots = getSelectedWeekSlots(selectedWeekDetails, selectedWeek?.weekStartDate);
      return selectedWeek ? filterScheduleSlots(slots, selectedDayValue, durationFilter) : [];
    },
    [durationFilter, selectedDayValue, selectedWeek, selectedWeekDetails],
  );
  const timezone = selectedWeekDetails?.timezone ?? weeksQuery.data?.timezone ?? null;
  const timezoneLabel = timezone && selectedWeek
    ? formatScheduleTimeZoneLabel(
      timezone,
      i18n.language,
      new Date(`${selectedWeek.weekStartDate}T00:00:00Z`),
    )
    : null;
  const canEditSelectedWeek = selectedWeek
    ? selectedWeek.weekId ? selectedWeek.canEdit : selectedWeek.canCreate
    : false;

  const statusLabel = (status: ScheduleSlotStatus) => {
    switch (status) {
      case "booked":
        return t("practitioner.schedule.status.booked");
      case "notEditable":
        return t("practitioner.schedule.status.notEditable");
      default:
        return t("practitioner.schedule.status.available");
    }
  };

  const openAddTimes = () => {
    if (!selectedWeek) return;
    if (!timezone) {
      Alert.alert(
        t("practitioner.schedule.timezoneRequiredTitle"),
        t("practitioner.schedule.timezoneRequiredBody"),
        [
          { text: t("common.cancel"), style: "cancel" },
          { text: t("practitioner.schedule.openTimezoneSettings"), onPress: () => router.push("/(practitioner)/account" as never) },
        ],
      );
      return;
    }

    const params = {
      dayOfWeek: String(selectedDayValue),
      duration: durationFilter === "all" ? "30" : String(durationFilter),
      returnToSchedule: "1",
      timezone,
      ...(selectedWeek.weekId
        ? { weekId: selectedWeek.weekId }
        : { weekStartDate: selectedWeek.weekStartDate }),
    };
    router.push({ pathname: "/(practitioner)/availability/editor" as never, params } as never);
  };

  if (weeksQuery.isLoading) {
    return <Screen><Header title={t("practitioner.schedule.title")} /><LoadingState message={t("practitioner.schedule.loading")} /></Screen>;
  }

  if (weeksQuery.isError || !weeksQuery.data) {
    return <Screen><Header title={t("practitioner.schedule.title")} /><ErrorState title={t("practitioner.schedule.loadError")} message={t("practitioner.schedule.loadErrorBody")} retryText={t("common.retry")} onRetry={() => void weeksQuery.refetch()} /></Screen>;
  }

  if (!selectedWeek) {
    return <Screen><Header title={t("practitioner.schedule.title")} /><View style={styles.noWeek}><Text variant="title" weight="700" style={styles.center}>{t("practitioner.schedule.noWeekTitle")}</Text><Text color={theme.colors.textSecondary} style={styles.center}>{t("practitioner.schedule.noWeekBody")}</Text></View></Screen>;
  }

  const durationOptions = [
    { value: "all" as const, label: t("practitioner.schedule.duration.all") },
    { value: 30 as const, label: t("practitioner.schedule.duration.minutes", { count: 30 }) },
    { value: 60 as const, label: t("practitioner.schedule.duration.minutes", { count: 60 }) },
  ];

  return (
    <Screen>
      <Header title={t("practitioner.schedule.title")} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScheduleWeekNavigator
          weeks={weeks}
          selectedWeekStartDate={selectedWeek.weekStartDate}
          locale={i18n.language}
          previousLabel={t("practitioner.schedule.previousWeek")}
          nextLabel={t("practitioner.schedule.nextWeek")}
          onSelectWeek={setSelectedWeekStartDate}
        />

        <ScheduleDayStrip
          days={days}
          selectedDay={selectedDayValue}
          todayLabel={t("practitioner.schedule.today")}
          onSelectDay={setSelectedDay}
        />

        <ScheduleDurationFilterControl value={durationFilter} options={durationOptions} onChange={setDurationFilter} />

        {repeatSuccess === "1" ? (
          <View style={[styles.successNotice, { borderColor: theme.colors.success, backgroundColor: theme.colors.primarySoft }]}>
            <Text variant="caption" color={theme.colors.success} weight="700" style={styles.center}>
              {t("practitioner.schedule.repeatSuccess")}
            </Text>
          </View>
        ) : null}

        {selectedWeekDetailsQuery.isLoading && selectedWeek.weekId ? (
          <LoadingState message={t("practitioner.schedule.slotsLoading")} />
        ) : selectedWeekDetailsQuery.isError ? (
          <ErrorState title={t("practitioner.schedule.slotsLoadError")} message={t("practitioner.schedule.loadErrorBody")} retryText={t("common.retry")} onRetry={() => void selectedWeekDetailsQuery.refetch()} />
        ) : (
          <>
            {visibleSlots.length > 0 ? (
              <ScheduleSlotList
                slots={visibleSlots}
                title={t("practitioner.schedule.sectionTitle", { day: selectedDayData?.weekdayLabel ?? "" })}
                periodMetaLabel={(count, duration) => t("practitioner.schedule.periodMeta", { count, duration })}
                statusLabel={statusLabel}
              />
            ) : (
              <View style={[styles.emptyDay, { backgroundColor: theme.colors.surfaceRaised, borderColor: theme.colors.divider }]}>
                <Text variant="title" weight="700" style={styles.center}>
                  {t("practitioner.schedule.empty.title", { day: selectedDayData?.weekdayLabel ?? "" })}
                </Text>
                <Text color={theme.colors.textSecondary} style={styles.center}>
                  {t("practitioner.schedule.empty.body")}
                </Text>
              </View>
            )}
          </>
        )}

        <View style={styles.addAction}>
          <Button title={t("practitioner.schedule.addTimes")} onPress={openAddTimes} disabled={!canEditSelectedWeek} />
          {!canEditSelectedWeek ? <Text variant="caption" color={theme.colors.textMuted} style={styles.center}>{t("practitioner.schedule.editUnavailable")}</Text> : null}
        </View>

        {selectedWeek.weekId ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t("practitioner.schedule.repeatWeekly")}
            onPress={() => router.push({ pathname: "/(practitioner)/availability/repeat-targets" as never, params: { sourceWeekId: selectedWeek.weekId } } as never)}
            style={styles.repeatAction}
          >
            <Text color={theme.colors.primary} weight="700" style={styles.center}>
              {t("practitioner.schedule.repeatWeekly")}
            </Text>
          </TouchableOpacity>
        ) : null}

        <Text variant="caption" color={theme.colors.textMuted} style={styles.timezone}>
          {t("practitioner.schedule.timezone", { timezone: timezoneLabel ?? t("practitioner.schedule.timezoneFallback") })}
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 10, paddingBottom: 24, gap: 12 },
  emptyDay: { alignItems: "center", gap: 6, paddingVertical: 18, paddingHorizontal: 14, borderWidth: StyleSheet.hairlineWidth, borderRadius: 14 },
  center: { textAlign: "center" },
  addAction: { gap: 6, marginTop: -2 },
  repeatAction: { minHeight: 44, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  successNotice: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12 },
  timezone: { textAlign: "center", marginTop: -2, fontSize: 11 },
  noWeek: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 24 },
});
