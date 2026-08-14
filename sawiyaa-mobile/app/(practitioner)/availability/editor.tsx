import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Button, Card, Header, LoadingState, Screen, Text } from "../../../src/components/ui";
import { useTheme } from "../../../src/providers/ThemeProvider";
import { extractApiErrorCode } from "../../../src/lib/api";
import { useAvailabilityWeekDetails, useCreateAvailabilityWeek, useMyAvailabilityWeeks, useUpdateAvailabilityWeek } from "../../../src/features/practitioner/availability/hooks";
import { AvailabilityTimeRange } from "../../../src/features/practitioner/availability/components/AvailabilityTimeRange";
import { AVAILABILITY_WEEK_MAX_SLOTS, countSelectedAvailabilitySlots, emptySelectedTimes, formatMinuteRange, selectedTimesEqual, selectedTimesToSlots, slotsToSelectedTimes, timeOptions, type DayOfWeek, type DurationMinutes, type SelectedTimes } from "../../../src/features/practitioner/availability/utils";

export default function AvailabilityWeekEditorScreen() {
  const params = useLocalSearchParams<{ weekId?: string; weekStartDate?: string; timezone?: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const weekId = typeof params.weekId === "string" ? params.weekId : params.weekId?.[0];
  const weekStartDate = typeof params.weekStartDate === "string" ? params.weekStartDate : params.weekStartDate?.[0];
  const routeTimezone = typeof params.timezone === "string" ? params.timezone : params.timezone?.[0];
  const details = useAvailabilityWeekDetails(weekId);
  const weeksQuery = useMyAvailabilityWeeks();
  const create = useCreateAvailabilityWeek();
  const update = useUpdateAvailabilityWeek();
  const rtl = i18n.dir() === "rtl";
  const submitInFlight = useRef(false);
  const [duration, setDuration] = useState<DurationMinutes>(30);
  const [day, setDay] = useState<DayOfWeek>(1);
  const [selected, setSelected] = useState<SelectedTimes>(emptySelectedTimes);
  const [initial, setInitial] = useState<SelectedTimes>(emptySelectedTimes);
  const [invalidLegacy60Slots, setInvalidLegacy60Slots] = useState<Array<{ dayOfWeek: number; startMinuteOfDay: number; endMinuteOfDay: number }>>([]);
  const [initialInvalidLegacy60Slots, setInitialInvalidLegacy60Slots] = useState<typeof invalidLegacy60Slots>([]);
  const week = details.data?.week;
  const timezone = week?.timezone ?? routeTimezone ?? "";
  const protectedKeys = useMemo(() => new Set((week?.slots ?? []).filter((slot) => slot.canEdit === false || slot.canRemove === false || slot.isBookedOrReserved).map((slot) => `${slot.dayOfWeek}:${slot.durationMinutes}:${slot.startMinuteOfDay}`)), [week?.slots]);

  useEffect(() => {
    if (!week) return;
    const value = slotsToSelectedTimes(week.slots);
    setSelected(value.selected);
    setInitial(value.selected);
    setInvalidLegacy60Slots(value.invalidLegacy60Slots);
    setInitialInvalidLegacy60Slots(value.invalidLegacy60Slots);
  }, [week]);

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
    if (week && !week.isEditable) return;
    if (protectedKeys.has(`${day}:${duration}:${minute}`)) return;
    setSelected((current) => ({ ...current, [duration]: { ...current[duration], [day]: current[duration][day].includes(minute) ? current[duration][day].filter((value) => value !== minute) : [...current[duration][day], minute].sort((a, b) => a - b) } }));
  };

  const showSaveError = (error: unknown) => {
    const code = extractApiErrorCode(error);
    Alert.alert(t("common.error"), t(code === "AVAILABILITY_INVALID_GRANULARITY" ? "practitioner.availability.errors.invalidGranularity" : "practitioner.availability.actionError"));
  };

  const save = () => {
    if (submitInFlight.current || create.isPending || update.isPending) return;
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
      onSuccess: (data) => { submitInFlight.current = false; setInitial(selected); setInitialInvalidLegacy60Slots(invalidLegacy60Slots); router.replace(`/(practitioner)/availability/${data.week.id}` as never); },
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

  if (weekId && (details.isLoading || !week)) return <Screen><Header showBack title={t("practitioner.availability.editorTitle")} /><LoadingState message={t("practitioner.availability.loading")} /></Screen>;
  const days = [0, 1, 2, 3, 4, 5, 6] as DayOfWeek[];
  const dayKeys = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  return <Screen><Header showBack title={t("practitioner.availability.editorTitle")} /><ScrollView contentContainerStyle={styles.content}>
    <Text variant="caption" color={theme.colors.textSecondary} style={styles.center}>{t("practitioner.availability.editorBody")}</Text>
    <View style={[styles.segment, { flexDirection: rtl ? "row-reverse" : "row" }]}>{([30, 60] as DurationMinutes[]).map((value) => <TouchableOpacity key={value} onPress={() => setDuration(value)} accessibilityRole="tab" accessibilityState={{ selected: duration === value }} accessibilityLabel={t("practitioner.availability.duration", { count: value })} style={[styles.segmentItem, { backgroundColor: duration === value ? theme.colors.primary : theme.colors.surfaceRaised }]}><Text color={duration === value ? theme.colors.onPrimary : theme.colors.textPrimary}>{t("practitioner.availability.duration", { count: value })}</Text></TouchableOpacity>)}</View>
    <View style={[styles.days, { flexDirection: rtl ? "row-reverse" : "row" }]}>{days.map((value) => <TouchableOpacity key={value} onPress={() => setDay(value)} accessibilityRole="tab" accessibilityState={{ selected: day === value }} accessibilityLabel={t(`practitioner.availability.weeks.days.${dayKeys[value]}`)} style={[styles.day, { backgroundColor: day === value ? theme.colors.primarySoft : theme.colors.surfaceRaised }]}><Text variant="caption" weight="700">{t(`practitioner.availability.weeks.days.${dayKeys[value]}`).slice(0, 3)}</Text></TouchableOpacity>)}</View>
    <Card variant="outlined" padding="sm" style={styles.grid}>{timeOptions(duration).map((minute) => { const active = selected[duration][day].includes(minute); const protectedTime = protectedKeys.has(`${day}:${duration}:${minute}`); return <TouchableOpacity key={minute} onPress={() => toggle(minute)} disabled={protectedTime} accessibilityRole="button" accessibilityState={{ selected: active, disabled: protectedTime }} accessibilityLabel={`${formatMinuteRange(minute, duration, rtl)}${protectedTime ? `, ${t("practitioner.availability.protectedSlot")}` : ""}`} style={[styles.time, { backgroundColor: active ? theme.colors.primarySoft : theme.colors.surfaceRaised, borderColor: active ? theme.colors.primary : theme.colors.border, opacity: protectedTime ? 0.7 : 1 }]}><AvailabilityTimeRange startMinuteOfDay={minute} durationMinutes={duration} rtl={rtl} /><>{protectedTime ? <Ionicons name="lock-closed-outline" size={12} color={theme.colors.textMuted} /> : null}</></TouchableOpacity>; })}</Card>
    {invalidLegacy60Slots.length > 0 ? <View style={styles.legacyWarning}><Text variant="caption" color={theme.colors.warning} style={styles.note}>{t("practitioner.availability.errors.invalidLegacy60", { count: invalidLegacy60Slots.length })}</Text>{invalidLegacy60Slots.map((slot) => <View key={`${slot.dayOfWeek}:${slot.startMinuteOfDay}:${slot.endMinuteOfDay}`} style={[styles.legacyRow, { flexDirection: rtl ? "row-reverse" : "row" }]}><Text variant="caption" color={theme.colors.textPrimary}>{formatMinuteRange(slot.startMinuteOfDay, 60, rtl)}</Text><TouchableOpacity onPress={() => setInvalidLegacy60Slots((current) => current.filter((item) => item.dayOfWeek !== slot.dayOfWeek || item.startMinuteOfDay !== slot.startMinuteOfDay || item.endMinuteOfDay !== slot.endMinuteOfDay))} accessibilityRole="button" accessibilityLabel={t("practitioner.availability.errors.removeInvalidLegacy60")}><Text variant="caption" color={theme.colors.primary}>{t("common.remove")}</Text></TouchableOpacity></View>)}</View> : null}{week?.status === "PUBLISHED" ? <Text variant="caption" color={theme.colors.textSecondary} style={styles.note}>{t("practitioner.availability.publishedEditNote")}</Text> : null}{dirty ? <Text variant="caption" color={theme.colors.warning} style={styles.note}>{t("practitioner.availability.unsavedChanges")}</Text> : null}
    <Button title={t("practitioner.availability.saveWeek")} onPress={save} loading={create.isPending || update.isPending} disabled={!dirty || invalidLegacy60Slots.length > 0} /><Button title={t("common.cancel")} variant="secondary" onPress={() => dirty ? Alert.alert(t("practitioner.availability.discardTitle"), t("practitioner.availability.discardBody"), [{ text: t("common.cancel"), style: "cancel" }, { text: t("common.discard"), onPress: () => router.back() }]) : router.back()} style={styles.cancel} />
  </ScrollView></Screen>;
}

const styles = StyleSheet.create({ content: { padding: 16, paddingBottom: 32 }, center: { textAlign: "center", marginBottom: 16 }, segment: { borderWidth: 1, borderColor: "#D7DDD9", borderRadius: 12, padding: 4, marginBottom: 12 }, segmentItem: { flex: 1, alignItems: "center", padding: 11, borderRadius: 9 }, days: { gap: 5, marginBottom: 12 }, day: { flex: 1, minHeight: 42, alignItems: "center", justifyContent: "center", borderRadius: 9, paddingHorizontal: 2 }, grid: { flexDirection: "row", flexWrap: "wrap", gap: 7 }, time: { width: "31.5%", minHeight: 42, borderWidth: 1, borderRadius: 9, alignItems: "center", justifyContent: "center" }, legacyWarning: { marginTop: 12 }, legacyRow: { alignItems: "center", justifyContent: "space-between", paddingVertical: 8 }, note: { textAlign: "center", marginVertical: 12 }, cancel: { marginTop: 10 } });
