import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Button, Header, LoadingState, Screen, Text } from "../../../src/components/ui";
import { useTheme } from "../../../src/providers/ThemeProvider";
import { extractApiErrorCode } from "../../../src/lib/api";
import { useAvailabilityWeekDetails, useCreateAvailabilityWeek, useMyAvailabilityWeeks, useUpdateAvailabilityWeek } from "../../../src/features/practitioner/availability/hooks";
import { AvailabilityTimeRange } from "../../../src/features/practitioner/availability/components/AvailabilityTimeRange";
import { ScheduleDayStrip } from "../../../src/features/practitioner/availability/components/ScheduleDayStrip";
import { getAvailabilityEditorGridLayout } from "../../../src/features/practitioner/availability/editor-layout";
import { groupAvailabilityPeriods, type AvailabilityPeriod } from "../../../src/features/practitioner/availability/availability-periods";
import { groupAvailabilityTimeOptions } from "../../../src/features/practitioner/availability/editor-view-model";
import { getTodayDateInTimeZone, getWeekDays } from "../../../src/features/practitioner/availability/schedule-view-model";
import { AVAILABILITY_WEEK_MAX_SLOTS, countSelectedAvailabilitySlots, emptySelectedTimes, formatMinuteRange, formatMinuteRangeParts, getDiscreteSlotsInRange, selectedTimesEqual, selectedTimesToSlots, slotsToSelectedTimes, type DayOfWeek, type DurationMinutes, type SelectedTimes } from "../../../src/features/practitioner/availability/utils";

type PeriodEditorState = {
  mode: "add" | "edit";
  periodId?: string;
  start: string;
  end: string;
};

function formatInputTime(minute: number) {
  return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
}

export default function AvailabilityWeekEditorScreen() {
  const params = useLocalSearchParams<{ weekId?: string; weekStartDate?: string; timezone?: string; dayOfWeek?: string; duration?: string; returnToSchedule?: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const weekId = typeof params.weekId === "string" ? params.weekId : params.weekId?.[0];
  const weekStartDate = typeof params.weekStartDate === "string" ? params.weekStartDate : params.weekStartDate?.[0];
  const routeTimezone = typeof params.timezone === "string" ? params.timezone : params.timezone?.[0];
  const routeDayOfWeek = typeof params.dayOfWeek === "string" ? params.dayOfWeek : params.dayOfWeek?.[0];
  const routeDuration = typeof params.duration === "string" ? params.duration : params.duration?.[0];
  const returnToSchedule = (typeof params.returnToSchedule === "string" ? params.returnToSchedule : params.returnToSchedule?.[0]) === "1";
  const details = useAvailabilityWeekDetails(weekId);
  const weeksQuery = useMyAvailabilityWeeks();
  const create = useCreateAvailabilityWeek();
  const update = useUpdateAvailabilityWeek();
  const rtl = i18n.dir() === "rtl";
  const submitInFlight = useRef(false);
  const initialDuration: DurationMinutes = routeDuration === "60" ? 60 : 30;
  const initialDay: DayOfWeek = [0, 1, 2, 3, 4, 5, 6].includes(Number(routeDayOfWeek)) ? Number(routeDayOfWeek) as DayOfWeek : 1;
  const [duration, setDuration] = useState<DurationMinutes>(initialDuration);
  const [day, setDay] = useState<DayOfWeek>(initialDay);
  const [selected, setSelected] = useState<SelectedTimes>(emptySelectedTimes);
  const [initial, setInitial] = useState<SelectedTimes>(emptySelectedTimes);
  const [invalidLegacy60Slots, setInvalidLegacy60Slots] = useState<{ dayOfWeek: number; startMinuteOfDay: number; endMinuteOfDay: number }[]>([]);
  const [initialInvalidLegacy60Slots, setInitialInvalidLegacy60Slots] = useState<typeof invalidLegacy60Slots>([]);
  const [gridContentWidth, setGridContentWidth] = useState<number | null>(null);
  const [periodEditor, setPeriodEditor] = useState<PeriodEditorState | null>(null);
  const [periodError, setPeriodError] = useState<string | null>(null);
  const [periodNotice, setPeriodNotice] = useState<string | null>(null);
  const [individualTimesExpanded, setIndividualTimesExpanded] = useState(false);
  const week = details.data?.week;
  const timezone = week?.timezone ?? routeTimezone ?? "";
  const readOnly = Boolean(week && !week.isEditable);
  const protectedKeys = useMemo(() => new Set((week?.slots ?? []).filter((slot) => slot.canEdit === false || slot.canRemove === false || slot.isBookedOrReserved).map((slot) => `${slot.dayOfWeek}:${slot.durationMinutes}:${slot.startMinuteOfDay}`)), [week?.slots]);
  const gridLayout = useMemo(() => getAvailabilityEditorGridLayout(windowWidth, gridContentWidth), [gridContentWidth, windowWidth]);
  const editorWeekStartDate = week?.weekStartDate ?? weekStartDate ?? null;
  const editorDays = useMemo(() => editorWeekStartDate ? getWeekDays(editorWeekStartDate, i18n.language, getTodayDateInTimeZone(timezone || null)) : [], [editorWeekStartDate, i18n.language, timezone]);
  const selectedDayData = editorDays.find((item) => item.dayOfWeek === day);
  const timeGroups = useMemo(() => groupAvailabilityTimeOptions(duration), [duration]);
  const availabilityPeriods = useMemo(() => groupAvailabilityPeriods(
    selected[duration][day]
      .filter((start) => start % duration === 0)
      .map((startMinuteOfDay) => ({
        startMinuteOfDay,
        durationMinutes: duration,
        state: protectedKeys.has(`${day}:${duration}:${startMinuteOfDay}`) ? "protected" as const : "editable" as const,
      })),
  ), [day, duration, protectedKeys, selected]);
  const periodPreview = useMemo(() => periodEditor ? getDiscreteSlotsInRange(periodEditor.start, periodEditor.end, duration) : null, [duration, periodEditor]);
  const editableAvailableCount = selected[duration][day].filter((start) => start % duration === 0 && !protectedKeys.has(`${day}:${duration}:${start}`)).length;

  useEffect(() => {
    if (!week) return;
    const value = slotsToSelectedTimes(week.slots);
    setSelected(value.selected);
    setInitial(value.selected);
    setInvalidLegacy60Slots(value.invalidLegacy60Slots);
    setInitialInvalidLegacy60Slots(value.invalidLegacy60Slots);
  }, [week]);

  useEffect(() => {
    setPeriodEditor(null);
    setPeriodError(null);
    setPeriodNotice(null);
  }, [day, duration]);

  const dirty = useMemo(() => !selectedTimesEqual(selected, initial) || JSON.stringify(invalidLegacy60Slots) !== JSON.stringify(initialInvalidLegacy60Slots), [selected, initial, invalidLegacy60Slots, initialInvalidLegacy60Slots]);

  useEffect(() => navigation.addListener("beforeRemove", (event) => {
    if (!dirty) return;
    event.preventDefault();
    Alert.alert(t("practitioner.availability.discardTitle"), t("practitioner.availability.discardBody"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("common.discard"), style: "destructive", onPress: () => navigation.dispatch(event.data.action) },
    ]);
  }), [dirty, navigation, t]);

  const toggle = (minute: number) => {
    if (readOnly || protectedKeys.has(`${day}:${duration}:${minute}`)) return;
    setSelected((current) => ({ ...current, [duration]: { ...current[duration], [day]: current[duration][day].includes(minute) ? current[duration][day].filter((value) => value !== minute) : [...current[duration][day], minute].sort((a, b) => a - b) } }));
  };

  const openAddPeriod = () => {
    if (readOnly) return;
    setPeriodError(null);
    setPeriodNotice(null);
    setPeriodEditor({ mode: "add", start: "", end: "" });
  };

  const openEditPeriod = (period: AvailabilityPeriod) => {
    if (readOnly || period.state === "protected") return;
    setPeriodError(null);
    setPeriodNotice(null);
    setPeriodEditor({ mode: "edit", periodId: period.id, start: formatInputTime(period.startMinuteOfDay), end: formatInputTime(period.endMinuteOfDay) });
  };

  const removePeriod = (period: AvailabilityPeriod) => {
    if (readOnly || period.state === "protected") return;
    Alert.alert(t("practitioner.availability.removePeriodConfirmTitle"), t("practitioner.availability.removePeriodConfirmBody"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("practitioner.availability.removePeriod"),
        style: "destructive",
        onPress: () => {
          setSelected((current) => ({ ...current, [duration]: { ...current[duration], [day]: current[duration][day].filter((start) => !period.slotStarts.includes(start)) } }));
          setPeriodNotice(t("practitioner.availability.periodRemoved"));
        },
      },
    ]);
  };

  const savePeriod = () => {
    if (!periodEditor || readOnly) return;
    const result = periodPreview;
    if (!result || !result.ok) {
      setPeriodNotice(null);
      setPeriodError(t(`practitioner.availability.customRange.errors.${result?.reason ?? "invalidFormat"}`, { duration }));
      return;
    }

    const editingPeriod = periodEditor.mode === "edit" ? availabilityPeriods.find((period) => period.id === periodEditor.periodId) : undefined;
    const oldStarts = editingPeriod?.slotStarts ?? [];
    const conflictsWithProtected = result.slots.some((start) => protectedKeys.has(`${day}:${duration}:${start}`));
    if (conflictsWithProtected) {
      setPeriodNotice(null);
      setPeriodError(t("practitioner.availability.periodConflictProtected"));
      return;
    }

    setSelected((current) => {
      const retained = current[duration][day].filter((start) => !oldStarts.includes(start));
      return { ...current, [duration]: { ...current[duration], [day]: [...new Set([...retained, ...result.slots])].sort((a, b) => a - b) } };
    });
    setPeriodError(null);
    setPeriodNotice(t(periodEditor.mode === "add" ? "practitioner.availability.periodAdded" : "practitioner.availability.periodUpdated"));
    setPeriodEditor(null);
  };

  const showSaveError = (error: unknown) => {
    const code = extractApiErrorCode(error);
    Alert.alert(t("common.error"), t(code === "AVAILABILITY_INVALID_GRANULARITY" ? "practitioner.availability.errors.invalidGranularity" : "practitioner.availability.actionError"));
  };

  const save = () => {
    if (readOnly || submitInFlight.current || create.isPending || update.isPending) return;
    if (!timezone || (!weekId && !weekStartDate)) {
      Alert.alert(t("common.error"), t(!timezone ? "practitioner.availability.timezoneRequired" : "practitioner.availability.actionError"));
      return;
    }
    if (invalidLegacy60Slots.length > 0) return;
    const selectedSlotCount = countSelectedAvailabilitySlots(selected);
    if (selectedSlotCount > AVAILABILITY_WEEK_MAX_SLOTS) {
      Alert.alert(t("common.error"), t("practitioner.availability.errors.weekSlotsLimit", { count: AVAILABILITY_WEEK_MAX_SLOTS }));
      return;
    }
    submitInFlight.current = true;
    const slots = selectedTimesToSlots(selected);
    if (weekId) {
      update.mutate({ weekId, payload: { timezone, slots } }, {
        onSuccess: () => { submitInFlight.current = false; setInitial(selected); setInitialInvalidLegacy60Slots(invalidLegacy60Slots); router.back(); },
        onError: (error) => { submitInFlight.current = false; showSaveError(error); },
      });
      return;
    }
    create.mutate({ weekStartDate: weekStartDate!, timezone, slots }, {
      onSuccess: (data) => {
        submitInFlight.current = false;
        setInitial(selected);
        setInitialInvalidLegacy60Slots(invalidLegacy60Slots);
        if (returnToSchedule) router.back();
        else router.replace(`/(practitioner)/availability/${data.week.id}` as never);
      },
      onError: async (error) => {
        submitInFlight.current = false;
        if (extractApiErrorCode(error) === "AVAILABILITY_WEEK_ALREADY_EXISTS") {
          const refreshed = await weeksQuery.refetch();
          const existing = refreshed.data?.weeks.find((entry) => entry.weekStartDate === weekStartDate && entry.weekId);
          if (existing?.weekId) { router.replace(`/(practitioner)/availability/${existing.weekId}` as never); return; }
          Alert.alert(t("common.error"), t("practitioner.availability.errors.weekAlreadyExists"));
          return;
        }
        showSaveError(error);
      },
    });
  };

  const formatPeriodRange = (period: AvailabilityPeriod) => {
    const parts = formatMinuteRangeParts(period.startMinuteOfDay, period.endMinuteOfDay - period.startMinuteOfDay, rtl);
    return `${parts.start} – ${parts.end}`;
  };

  const titleKey = weekId ? "practitioner.availability.editDayTitle" : "practitioner.availability.addTimesTitle";
  if (weekId && (details.isLoading || !week)) return <Screen><Header showBack title={t(titleKey)} /><LoadingState message={t("practitioner.availability.loading")} /></Screen>;

  return (
    <Screen>
      <Header showBack title={t(titleKey)} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {selectedDayData ? (
          <View style={styles.contextBlock}>
            <Text variant="title" weight="700" style={styles.center}>{selectedDayData.weekdayLabel}</Text>
            <Text variant="caption" color={theme.colors.textSecondary} style={styles.center}>{t("practitioner.availability.editorContext", { date: selectedDayData.dayNumber })}</Text>
          </View>
        ) : null}

        {editorDays.length > 0 ? <ScheduleDayStrip days={editorDays} selectedDay={day} todayLabel={t("practitioner.schedule.today")} onSelectDay={setDay} /> : null}

        <View style={[styles.segment, { flexDirection: rtl ? "row-reverse" : "row", borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceRaised }]}>
          {([30, 60] as DurationMinutes[]).map((value) => (
            <TouchableOpacity key={value} onPress={() => setDuration(value)} accessibilityRole="tab" accessibilityState={{ selected: duration === value }} accessibilityLabel={t("practitioner.availability.duration", { count: value })} style={[styles.segmentItem, { backgroundColor: duration === value ? theme.colors.primary : theme.colors.surfaceRaised }]}>
              <Text color={duration === value ? theme.colors.onPrimary : theme.colors.textPrimary}>{t("practitioner.availability.duration", { count: value })}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {readOnly ? <View style={[styles.notice, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.divider }]}><Ionicons name="lock-closed-outline" size={16} color={theme.colors.textSecondary} /><Text variant="caption" color={theme.colors.textSecondary} style={styles.noticeText}>{t("practitioner.availability.editUnavailable")}</Text></View> : null}

        <View style={styles.periodOverview}>
          <View style={[styles.sectionHeader, { flexDirection: rtl ? "row-reverse" : "row" }]}>
            <View style={styles.sectionHeadingCopy}>
              <Text variant="subtitle" weight="700">{t("practitioner.availability.availablePeriodsTitle")}</Text>
              <Text variant="caption" color={theme.colors.textSecondary}>{t("practitioner.availability.availablePeriodsBody")}</Text>
            </View>
            <Text variant="caption" color={theme.colors.textSecondary}>{t("practitioner.availability.duration", { count: duration })}</Text>
          </View>

          {availabilityPeriods.length === 0 ? <Text variant="caption" color={theme.colors.textSecondary} style={styles.emptyPeriods}>{t("practitioner.availability.availablePeriodsEmpty")}</Text> : availabilityPeriods.map((period) => (
            <View key={period.id} style={[styles.periodRow, { flexDirection: rtl ? "row-reverse" : "row", backgroundColor: theme.colors.surfaceRaised, borderColor: theme.colors.divider }]}>
              <View style={styles.periodMain}>
                <Text variant="subtitle" weight="700" style={styles.periodRange}>{formatPeriodRange(period)}</Text>
                <Text variant="caption" color={theme.colors.textSecondary}>{t("practitioner.availability.periodTimes", { count: period.slotStarts.length, duration: period.durationMinutes })}</Text>
                {period.state === "protected" ? <View style={[styles.protectedLabel, { flexDirection: rtl ? "row-reverse" : "row" }]}><Ionicons name="lock-closed-outline" size={13} color={theme.colors.textMuted} /><Text variant="caption" color={theme.colors.textSecondary}>{t("practitioner.availability.periodProtected")}</Text></View> : null}
                {period.state === "editable" ? <View style={[styles.periodActions, { flexDirection: rtl ? "row-reverse" : "row" }]}>
                  <TouchableOpacity onPress={() => openEditPeriod(period)} disabled={readOnly} accessibilityRole="button" accessibilityLabel={`${t("practitioner.availability.editPeriod")}: ${formatPeriodRange(period)}`} style={[styles.periodAction, { borderColor: theme.colors.border }]}><Text variant="caption" weight="700" color={theme.colors.primary}>{t("practitioner.availability.editPeriod")}</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => removePeriod(period)} disabled={readOnly} accessibilityRole="button" accessibilityLabel={`${t("practitioner.availability.removePeriod")}: ${formatPeriodRange(period)}`} style={[styles.periodAction, { borderColor: theme.colors.border }]}><Text variant="caption" weight="700" color={theme.colors.error}>{t("practitioner.availability.removePeriod")}</Text></TouchableOpacity>
                </View> : null}
              </View>
            </View>
          ))}

          {periodNotice ? <Text variant="caption" color={theme.colors.textSecondary} style={styles.formMessage}>{periodNotice}</Text> : null}
          <Button title={t("practitioner.availability.addPeriod")} onPress={openAddPeriod} disabled={readOnly} style={styles.addPeriodButton} />
        </View>

        {periodEditor ? <View style={[styles.periodEditor, { backgroundColor: theme.colors.surfaceRaised, borderColor: theme.colors.divider }]}>
          <View style={[styles.sectionHeader, { flexDirection: rtl ? "row-reverse" : "row" }]}>
            <Text variant="subtitle" weight="700">{t(periodEditor.mode === "add" ? "practitioner.availability.addPeriodTitle" : "practitioner.availability.editPeriodTitle")}</Text>
            <TouchableOpacity onPress={() => setPeriodEditor(null)} accessibilityRole="button" accessibilityLabel={t("common.cancel")}><Ionicons name="close-circle-outline" size={22} color={theme.colors.textSecondary} /></TouchableOpacity>
          </View>
          <View style={[styles.rangeFields, { flexDirection: rtl ? "row-reverse" : "row" }]}>
            <View style={styles.rangeField}>
              <Text variant="caption" color={theme.colors.textSecondary}>{t("practitioner.availability.customRange.start")}</Text>
              <TextInput value={periodEditor.start} onChangeText={(value) => { setPeriodEditor((current) => current ? { ...current, start: value } : current); setPeriodError(null); }} placeholder={t("practitioner.availability.customRange.startPlaceholder")} placeholderTextColor={theme.colors.textMuted} keyboardType="numeric" maxLength={5} style={[styles.rangeInput, { color: theme.colors.textPrimary, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceRaised }]} accessibilityLabel={t("practitioner.availability.customRange.start")} />
            </View>
            <View style={styles.rangeField}>
              <Text variant="caption" color={theme.colors.textSecondary}>{t("practitioner.availability.customRange.end")}</Text>
              <TextInput value={periodEditor.end} onChangeText={(value) => { setPeriodEditor((current) => current ? { ...current, end: value } : current); setPeriodError(null); }} placeholder={t("practitioner.availability.customRange.endPlaceholder")} placeholderTextColor={theme.colors.textMuted} keyboardType="numeric" maxLength={5} style={[styles.rangeInput, { color: theme.colors.textPrimary, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceRaised }]} accessibilityLabel={t("practitioner.availability.customRange.end")} />
            </View>
          </View>
          <Text variant="caption" color={theme.colors.textSecondary} style={styles.previewText}>{periodPreview?.ok ? t("practitioner.availability.periodPreview", { count: periodPreview.slots.length, duration }) : t("practitioner.availability.periodPreviewEmpty")}</Text>
          {periodError ? <Text variant="caption" color={theme.colors.error} style={styles.formMessage}>{periodError}</Text> : null}
          <Button title={t("practitioner.availability.confirmPeriod")} onPress={savePeriod} disabled={readOnly} />
        </View> : null}

        <Pressable onPress={() => setIndividualTimesExpanded((value) => !value)} accessibilityRole="button" accessibilityState={{ expanded: individualTimesExpanded }} style={({ pressed }) => [styles.disclosure, { flexDirection: rtl ? "row-reverse" : "row", backgroundColor: theme.colors.surfaceRaised, borderColor: theme.colors.divider }, pressed && styles.pressed]}>
          <View style={styles.disclosureCopy}>
            <Text variant="subtitle" weight="700">{t(individualTimesExpanded ? "practitioner.availability.hideIndividualTimes" : "practitioner.availability.individualTimes")}</Text>
            <Text variant="caption" color={theme.colors.textSecondary}>{t("practitioner.availability.individualTimesOptional")}</Text>
          </View>
          <Ionicons name={individualTimesExpanded ? "chevron-up" : "chevron-down"} size={18} color={theme.colors.textSecondary} />
        </Pressable>

        {individualTimesExpanded ? <View style={styles.individualTimes}>
          {timeGroups.map(({ period, options }) => (
            <View key={period} style={styles.periodSection}>
              <View style={[styles.periodHeader, { flexDirection: rtl ? "row-reverse" : "row" }]}>
                <Text variant="subtitle" weight="700">{t(`practitioner.availability.periods.${period}`)}</Text>
                <Text variant="caption" color={theme.colors.textSecondary}>{t("practitioner.availability.periodSlotCount", { count: options.length })}</Text>
              </View>
              <View onLayout={(event) => { const width = Math.round(event.nativeEvent.layout.width); setGridContentWidth((current) => current === width ? current : width); }} style={styles.slotGrid}>
                {options.map((minute) => {
                  const active = selected[duration][day].includes(minute);
                  const protectedTime = protectedKeys.has(`${day}:${duration}:${minute}`);
                  const disabled = protectedTime || readOnly;
                  return <TouchableOpacity key={minute} onPress={() => toggle(minute)} disabled={disabled} accessibilityRole="button" accessibilityState={{ selected: active, disabled }} accessibilityLabel={`${formatMinuteRange(minute, duration, rtl)}${protectedTime ? `, ${t("practitioner.availability.protectedSlot")}` : ""}`} style={[styles.time, { width: gridLayout.slotWidth, minHeight: gridLayout.columns === 3 ? 62 : 48, backgroundColor: active ? theme.colors.primarySoft : theme.colors.surfaceRaised, borderColor: active ? theme.colors.primary : theme.colors.border, opacity: protectedTime ? 0.58 : readOnly ? 0.45 : 1 }]}>
                    <AvailabilityTimeRange startMinuteOfDay={minute} durationMinutes={duration} rtl={rtl} compact={gridLayout.columns === 3} />
                    {active ? <Ionicons name="checkmark-circle" size={14} color={theme.colors.primary} style={styles.slotIcon} /> : protectedTime ? <Ionicons name="lock-closed-outline" size={13} color={theme.colors.textMuted} style={styles.slotIcon} /> : null}
                  </TouchableOpacity>;
                })}
              </View>
            </View>
          ))}
        </View> : null}

        {invalidLegacy60Slots.length > 0 ? <View style={styles.legacyWarning}><Text variant="caption" color={theme.colors.warning} style={styles.note}>{t("practitioner.availability.errors.invalidLegacy60", { count: invalidLegacy60Slots.length })}</Text>{invalidLegacy60Slots.map((slot) => <View key={`${slot.dayOfWeek}:${slot.startMinuteOfDay}:${slot.endMinuteOfDay}`} style={[styles.legacyRow, { flexDirection: rtl ? "row-reverse" : "row" }]}><Text variant="caption" color={theme.colors.textPrimary}>{formatMinuteRange(slot.startMinuteOfDay, 60, rtl)}</Text><TouchableOpacity onPress={() => setInvalidLegacy60Slots((current) => current.filter((item) => item.dayOfWeek !== slot.dayOfWeek || item.startMinuteOfDay !== slot.startMinuteOfDay || item.endMinuteOfDay !== slot.endMinuteOfDay))} accessibilityRole="button" accessibilityLabel={t("practitioner.availability.errors.removeInvalidLegacy60")}><Text variant="caption" color={theme.colors.primary}>{t("common.remove")}</Text></TouchableOpacity></View>)}</View> : null}
        {week?.status === "PUBLISHED" && !readOnly ? <Text variant="caption" color={theme.colors.textSecondary} style={styles.note}>{t("practitioner.availability.publishedEditNote")}</Text> : null}

        <View style={[styles.selectedSummary, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.divider }]}>
          <Text variant="subtitle" weight="700">{editableAvailableCount > 0 ? t("practitioner.availability.availableCount", { count: editableAvailableCount }) : t("practitioner.availability.availableCountEmpty")}</Text>
          <Text variant="caption" color={theme.colors.textSecondary}>{selectedDayData?.weekdayLabel ?? ""} · {t("practitioner.availability.duration", { count: duration })}</Text>
        </View>

        <Button title={t("practitioner.availability.saveTimes")} onPress={save} loading={create.isPending || update.isPending} disabled={!dirty || invalidLegacy60Slots.length > 0 || readOnly} />
        <Button title={t("common.cancel")} variant="secondary" onPress={() => dirty ? Alert.alert(t("practitioner.availability.discardTitle"), t("practitioner.availability.discardBody"), [{ text: t("common.cancel"), style: "cancel" }, { text: t("common.discard"), onPress: () => router.back() }]) : router.back()} style={styles.cancel} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 12, paddingBottom: 32, gap: 14 },
  contextBlock: { gap: 2 },
  center: { textAlign: "center" },
  segment: { borderWidth: 1, borderRadius: 12, padding: 4, gap: 4 },
  segmentItem: { flex: 1, alignItems: "center", justifyContent: "center", minHeight: 44, paddingHorizontal: 8, borderRadius: 9 },
  notice: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingHorizontal: 12, paddingVertical: 10, borderWidth: StyleSheet.hairlineWidth, borderRadius: 12 },
  noticeText: { flexShrink: 1, textAlign: "center" },
  periodOverview: { gap: 9 },
  sectionHeader: { alignItems: "center", justifyContent: "space-between", gap: 8 },
  sectionHeadingCopy: { flex: 1, gap: 1 },
  emptyPeriods: { paddingVertical: 6 },
  periodRow: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 12 },
  periodMain: { flex: 1, minWidth: 0 },
  periodRange: { writingDirection: "ltr", textAlign: "left" },
  periodActions: { gap: 8, marginTop: 10 },
  periodAction: { minHeight: 36, paddingHorizontal: 10, borderWidth: StyleSheet.hairlineWidth, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  protectedLabel: { alignItems: "center", gap: 5, marginTop: 6 },
  addPeriodButton: { marginTop: 2 },
  periodEditor: { gap: 10, padding: 14, borderWidth: StyleSheet.hairlineWidth, borderRadius: 14 },
  rangeFields: { gap: 8 },
  rangeField: { flex: 1, gap: 5, minWidth: 0 },
  rangeInput: { minHeight: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, textAlign: "center", writingDirection: "ltr" },
  previewText: { textAlign: "center" },
  formMessage: { textAlign: "center" },
  disclosure: { minHeight: 58, alignItems: "center", justifyContent: "space-between", gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderWidth: StyleSheet.hairlineWidth, borderRadius: 12 },
  disclosureCopy: { flex: 1, gap: 1 },
  pressed: { opacity: 0.72 },
  individualTimes: { gap: 14 },
  periodSection: { gap: 7 },
  periodHeader: { alignItems: "center", justifyContent: "space-between", gap: 8 },
  slotGrid: { width: "100%", flexDirection: "row", flexWrap: "wrap", alignItems: "stretch", gap: 8 },
  time: { minWidth: 96, paddingHorizontal: 4, borderWidth: 1, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" },
  slotIcon: { marginTop: 2 },
  legacyWarning: { gap: 4, marginTop: 2 },
  legacyRow: { alignItems: "center", justifyContent: "space-between", paddingVertical: 8 },
  note: { textAlign: "center" },
  selectedSummary: { gap: 3, paddingHorizontal: 14, paddingVertical: 11, borderWidth: StyleSheet.hairlineWidth, borderRadius: 12 },
  cancel: { marginTop: -4 },
});
