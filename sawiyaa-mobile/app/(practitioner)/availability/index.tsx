import React, { useCallback, useEffect, useState, useMemo } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import {
  Screen,
  Header,
  LoadingState,
  ErrorState,
  Text,
} from "../../../src/components/ui";
import { useTheme } from "../../../src/providers/ThemeProvider";

import {
  useMyAvailabilityWeeks,
  useCreateAvailabilityWeek,
  useUpdateAvailabilityWeek,
  usePublishAvailabilityWeek,
  useCopyAvailabilityWeekToNext,
} from "../../../src/features/practitioner/availability/hooks";
import { WeekSwitcher } from "../../../src/features/practitioner/availability/components/WeekSwitcher";
import { WeekStatusCard } from "../../../src/features/practitioner/availability/components/WeekStatusCard";
import { DaySelector } from "../../../src/features/practitioner/availability/components/DaySelector";
import { DurationSwitcher } from "../../../src/features/practitioner/availability/components/DurationSwitcher";
import { SlotsGrid } from "../../../src/features/practitioner/availability/components/SlotsGrid";
import { AvailabilityActionBar } from "../../../src/features/practitioner/availability/components/AvailabilityActionBar";
import type {
  AvailabilityWeekSlot,
  AvailabilityWeekUiStatus,
} from "../../../src/features/practitioner/availability/types";

type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;
type SessionBlockDuration = 30 | 60;
type DraftSchedule = Record<DayOfWeek, Record<SessionBlockDuration, number[]>>;

function createEmptyDraftSchedule(): DraftSchedule {
  return {
    0: { 30: [], 60: [] },
    1: { 30: [], 60: [] },
    2: { 30: [], 60: [] },
    3: { 30: [], 60: [] },
    4: { 30: [], 60: [] },
    5: { 30: [], 60: [] },
    6: { 30: [], 60: [] },
  };
}

function slotsToDraftSchedule(slots: AvailabilityWeekSlot[]): DraftSchedule {
  const output = createEmptyDraftSchedule();
  for (const slot of slots) {
    const day = slot.dayOfWeek as DayOfWeek;
    const duration = slot.durationMinutes === 60 ? 60 : 30;
    if (!output[day][duration].includes(slot.startMinuteOfDay)) {
      output[day][duration].push(slot.startMinuteOfDay);
    }
  }
  // Sort start times for visual consistency
  for (let day = 0; day <= 6; day++) {
    const d = day as DayOfWeek;
    output[d][30].sort((a, b) => a - b);
    output[d][60].sort((a, b) => a - b);
  }
  return output;
}

function draftScheduleToSlots(draft: DraftSchedule): Omit<AvailabilityWeekSlot, "id">[] {
  const slots: Omit<AvailabilityWeekSlot, "id">[] = [];
  for (let day = 0; day <= 6; day++) {
    const d = day as DayOfWeek;
    for (const duration of [30, 60] as SessionBlockDuration[]) {
      for (const start of draft[d][duration]) {
        slots.push({
          dayOfWeek: d,
          durationMinutes: duration,
          startMinuteOfDay: start,
          endMinuteOfDay: start + duration,
        });
      }
    }
  }
  return slots;
}

function normalizeDraft(draft: DraftSchedule): DraftSchedule {
  const normalized = {} as DraftSchedule;
  for (let day = 0; day <= 6; day++) {
    const d = day as DayOfWeek;
    normalized[d] = {
      30: [...(draft[d][30] || [])].sort((a, b) => a - b),
      60: [...(draft[d][60] || [])].sort((a, b) => a - b),
    };
  }
  return normalized;
}

function isDraftScheduleEqual(d1: DraftSchedule, d2: DraftSchedule): boolean {
  for (let day = 0; day <= 6; day++) {
    const d = day as DayOfWeek;
    const d1_30 = d1[d]?.[30] || [];
    const d2_30 = d2[d]?.[30] || [];
    if (d1_30.length !== d2_30.length) return false;
    for (let i = 0; i < d1_30.length; i++) {
      if (d1_30[i] !== d2_30[i]) return false;
    }

    const d1_60 = d1[d]?.[60] || [];
    const d2_60 = d2[d]?.[60] || [];
    if (d1_60.length !== d2_60.length) return false;
    for (let i = 0; i < d1_60.length; i++) {
      if (d1_60[i] !== d2_60[i]) return false;
    }
  }
  return true;
}

function extractMutationError(err: unknown): string {
  try {
    const axiosErr = err as any;
    const data = axiosErr?.response?.data;
    // Backend returns { statusCode, message, errorCode }
    const errorCode: string | undefined = data?.errorCode ?? data?.error;
    const backendMessage: string | undefined =
      typeof data?.message === "string" ? data.message : undefined;

    // Map known errorCodes to friendly Arabic messages
    const errorCodeMap: Record<string, string> = {
      AVAILABILITY_SLOT_IN_PAST: "لا يمكن حفظ وقت انتهى بالفعل.",
      AVAILABILITY_SLOT_BOOKED: "لا يمكن تعديل وقت مرتبط بحجز.",
      AVAILABILITY_WEEK_NOT_EDITABLE: "لا يمكن تعديل هذا الجدول.",
      AVAILABILITY_WEEK_NOT_DRAFT: "هذا الجدول ليس مسودة ولا يمكن تعديله بهذه الطريقة.",
      AVAILABILITY_PUBLISHED_TIMEZONE_LOCKED: "لا يمكن تغيير المنطقة الزمنية بعد اعتماد الجدول.",
      AVAILABILITY_WEEK_NOT_FOUND: "تعذر العثور على الجدول.",
    };

    if (errorCode && errorCodeMap[errorCode]) {
      return errorCodeMap[errorCode];
    }

    // Fall back to backend translated message if available
    if (backendMessage) {
      return backendMessage;
    }
  } catch {
    // Ignore extraction errors
  }
  return "لم نتمكن من حفظ التعديلات. حاول مرة أخرى.";
}


export default function PractitionerAvailabilityScreen() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const isRtl = i18n.dir() === "rtl";

  // Navigation / Tab Selection State
  const [selectedWeekKey, setSelectedWeekKey] = useState<"current" | "next">("current");
  const [selectedDay, setSelectedDay] = useState<number>(1); // Default to Monday
  const [selectedDuration, setSelectedDuration] = useState<SessionBlockDuration>(30);

  // Queries & Mutations
  const { data, isLoading, isError, refetch } = useMyAvailabilityWeeks();

  const createWeekMutation = useCreateAvailabilityWeek();
  const updateWeekMutation = useUpdateAvailabilityWeek();
  const publishWeekMutation = usePublishAvailabilityWeek();
  const copyWeekMutation = useCopyAvailabilityWeekToNext();

  // Local draft schedules
  const [draftSchedule, setDraftSchedule] = useState<DraftSchedule>(createEmptyDraftSchedule);
  const [initialDraftSchedule, setInitialDraftSchedule] = useState<DraftSchedule>(createEmptyDraftSchedule);

  const activeWeek = useMemo(() => {
    if (!data) return null;
    return selectedWeekKey === "current" ? data.currentWeek : data.nextWeek;
  }, [data, selectedWeekKey]);

  const isSlotInPast = useCallback(
    (dayOfWeek: number, duration: number, startMinute: number) => {
      if (!activeWeek) return false;
      try {
        const [year, month, day] = activeWeek.weekStartDate.split("-").map(Number);
        const weekStartUtc = new Date(Date.UTC(year, month - 1, day));
        const targetDate = new Date(weekStartUtc.getTime() + dayOfWeek * 24 * 60 * 60 * 1000);

        const formatter = new Intl.DateTimeFormat("en-US", {
          timeZone: activeWeek.timezone,
          year: "numeric",
          month: "numeric",
          day: "numeric",
          hour: "numeric",
          minute: "numeric",
          second: "numeric",
          hour12: false,
        });
        const nowParts = formatter.formatToParts(new Date());
        const getPart = (type: string) => Number(nowParts.find((p) => p.type === type)?.value);
        const tzNow = new Date(
          Date.UTC(
            getPart("year"),
            getPart("month") - 1,
            getPart("day"),
            getPart("hour"),
            getPart("minute"),
            getPart("second"),
          ),
        );

        const slotHour = Math.floor(startMinute / 60);
        const slotMinute = startMinute % 60;
        const slotDateInTz = new Date(
          Date.UTC(
            targetDate.getUTCFullYear(),
            targetDate.getUTCMonth(),
            targetDate.getUTCDate(),
            slotHour,
            slotMinute,
          ),
        );

        return slotDateInTz.getTime() < tzNow.getTime();
      } catch (e) {
        return false;
      }
    },
    [activeWeek],
  );

  // Sync server data to local draft schedule buffer
  useEffect(() => {
    if (activeWeek) {
      if (activeWeek.status === "NOT_SET") {
        const empty = createEmptyDraftSchedule();
        setDraftSchedule(empty);
        setInitialDraftSchedule(empty);
      } else {
        const parsed = slotsToDraftSchedule(activeWeek.slots);
        setDraftSchedule(parsed);
        setInitialDraftSchedule(parsed);
      }
    }
  }, [activeWeek]);

  // Verify dirty state
  const isDirty = useMemo(() => {
    return !isDraftScheduleEqual(draftSchedule, initialDraftSchedule);
  }, [draftSchedule, initialDraftSchedule]);

  // Total slots counts
  const totalSlotsCount = useMemo(() => {
    let count = 0;
    for (let day = 0; day <= 6; day++) {
      count += draftSchedule[day as DayOfWeek][30].length;
      count += draftSchedule[day as DayOfWeek][60].length;
    }
    return count;
  }, [draftSchedule]);

  const dailySlotsCount = useMemo(() => {
    const day = selectedDay as DayOfWeek;
    return (
      draftSchedule[day][30].length +
      draftSchedule[day][60].length
    );
  }, [draftSchedule, selectedDay]);

  if (isLoading) {
    return (
      <Screen bg="background">
        <Header title={t("practitioner.availability.title")} />
        <LoadingState message={t("practitioner.availability.weeks.loading", "Loading availability...")} />
      </Screen>
    );
  }

  if (isError || !data) {
    return (
      <Screen bg="background">
        <Header title={t("practitioner.availability.title")} />
        <ErrorState
          title={t("practitioner.availability.weeks.failedLoad", "Could not load schedule")}
          onRetry={refetch}
        />
      </Screen>
    );
  }

  const isEditable = activeWeek?.isEditable ?? false;
  const isMutationLoading =
    createWeekMutation.isPending ||
    updateWeekMutation.isPending ||
    publishWeekMutation.isPending ||
    copyWeekMutation.isPending;

  const toggleSlot = (minute: number) => {
    if (!isEditable) return;
    const day = selectedDay as DayOfWeek;
    const duration = selectedDuration;

    const originalSlot = activeWeek?.slots.find(
      (s) =>
        s.dayOfWeek === day &&
        s.durationMinutes === duration &&
        s.startMinuteOfDay === minute,
    );
    if (originalSlot && originalSlot.canEdit === false) {
      return;
    }

    if (isSlotInPast(day, duration, minute)) {
      return;
    }

    setDraftSchedule((prev) => {
      const currentList = prev[day][duration];
      const exists = currentList.includes(minute);
      const updatedList = exists
        ? currentList.filter((m) => m !== minute)
        : [...currentList, minute].sort((a, b) => a - b);

      return {
        ...prev,
        [day]: {
          ...prev[day],
          [duration]: updatedList,
        },
      };
    });
  };

  const handleCreateDraft = () => {
    if (!activeWeek) return;
    createWeekMutation.mutate(
      {
        weekStartDate: activeWeek.weekStartDate,
        timezone: data.timezone,
        slots: [], // Initialize empty
      },
      {
        onError: (err: unknown) => {
          Alert.alert(
            t("common.error", "خطأ"),
            extractMutationError(err),
            [{ text: t("common.ok", "موافق") }],
          );
        },
      },
    );
  };


  const handleSaveDraft = () => {
    if (!activeWeek?.id) return;
    const flatSlots = draftScheduleToSlots(draftSchedule);
    updateWeekMutation.mutate(
      {
        weekId: activeWeek.id,
        payload: {
          timezone: activeWeek.timezone,
          slots: flatSlots,
        },
      },
      {
        onError: (err: unknown) => {
          Alert.alert(
            t("common.error", "خطأ"),
            extractMutationError(err),
            [{ text: t("common.ok", "موافق") }],
          );
        },
      },
    );
  };


  const handlePublishWeek = () => {
    if (!activeWeek?.id) return;
    publishWeekMutation.mutate(activeWeek.id, {
      onError: (err: unknown) => {
        Alert.alert(
          t("common.error", "خطأ"),
          extractMutationError(err),
          [{ text: t("common.ok", "موافق") }],
        );
      },
    });
  };


  const handleCopyToNext = () => {
    if (!activeWeek?.id) return;
    copyWeekMutation.mutate(activeWeek.id, {
      onError: (err: unknown) => {
        Alert.alert(
          t("common.error", "خطأ"),
          extractMutationError(err),
          [{ text: t("common.ok", "موافق") }],
        );
      },
    });
  };


  return (
    <Screen bg="background">
      <Header title={t("practitioner.availability.title")} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* timezone label */}
        <View style={styles.timezoneLabelWrapper}>
          <Text
            style={[
              theme.typography.caption,
              { color: theme.colors.textSecondary, textAlign: isRtl ? "right" : "left" },
            ]}
          >
            {t("practitioner.availability.timezone", { timezone: data.timezone })}
          </Text>
        </View>

        {/* current/next week switcher */}
        <WeekSwitcher
          selectedWeekKey={selectedWeekKey}
          onSelect={setSelectedWeekKey}
        />

        {/* status card display */}
        {activeWeek && (
          <WeekStatusCard
            week={activeWeek}
            selectedDay={selectedDay}
            selectedDuration={selectedDuration}
          />
        )}

        {/* schedule editor panels */}
        {activeWeek && activeWeek.status !== "NOT_SET" && (
          <View style={styles.editorContainer}>
            <DaySelector selectedDay={selectedDay} onSelectDay={setSelectedDay} />
            <DurationSwitcher
              selectedDuration={selectedDuration}
              onSelect={setSelectedDuration}
            />

            {/* Slots Counter Metadata Row */}
            <View
              style={[
                styles.summaryRow,
                { flexDirection: isRtl ? "row-reverse" : "row" },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[theme.typography.caption, { color: theme.colors.textSecondary, textAlign: isRtl ? "right" : "left" }]}>
                  {t("practitioner.availability.weeks.editor.dailySlotCount", { count: dailySlotsCount })}
                </Text>
                <Text style={[theme.typography.caption, { color: theme.colors.textSecondary, marginTop: 2, textAlign: isRtl ? "right" : "left" }]}>
                  {t("practitioner.availability.weeks.editor.weeklySlotCount", { count: totalSlotsCount })}
                </Text>
              </View>
              {isDirty && (
                <View
                  style={[
                    styles.dirtyBadge,
                    {
                      backgroundColor: theme.colors.warningLight || "#FFF9E6",
                      borderColor: theme.colors.warning || "#F0B000",
                    },
                  ]}
                >
                  <Text
                    style={[
                      theme.typography.caption,
                      { color: theme.colors.warning || "#B87F00", fontWeight: "700" },
                    ]}
                  >
                    {t("practitioner.availability.weeks.editor.unsaved")}
                  </Text>
                </View>
              )}
            </View>

            {dailySlotsCount === 0 && (
              <View style={styles.emptySlotsAlert}>
                <Text
                  style={[
                    theme.typography.caption,
                    { color: theme.colors.textMuted, textAlign: "center" },
                  ]}
                >
                  {t("practitioner.availability.weeks.editor.noSlots")}
                </Text>
              </View>
            )}

            <SlotsGrid
              selectedDay={selectedDay}
              selectedDuration={selectedDuration}
              draftSchedule={draftSchedule}
              onToggleSlot={toggleSlot}
              isEditable={isEditable}
              weekSlots={activeWeek.slots}
              isSlotInPast={isSlotInPast}
            />
          </View>
        )}
      </ScrollView>

      {/* Sticky Bottom Action Buttons */}
      {activeWeek && (
        <AvailabilityActionBar
          status={activeWeek.status}
          isDirty={isDirty}
          hasSlots={totalSlotsCount > 0}
          selectedWeekKey={selectedWeekKey}
          nextWeekStatus={data.nextWeek.status}
          isLoading={isMutationLoading}
          onCreateDraft={handleCreateDraft}
          onSaveDraft={handleSaveDraft}
          onPublish={handlePublishWeek}
          onCopyToNext={handleCopyToNext}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  timezoneLabelWrapper: {
    paddingTop: 8,
    paddingBottom: 2,
  },
  editorContainer: {
    marginTop: 4,
  },
  summaryRow: {
    paddingVertical: 6,
    justifyContent: "space-between",
    alignItems: "center",
  },
  dirtyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  emptySlotsAlert: {
    marginVertical: 4,
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#F8F8F8",
    alignItems: "center",
  },
});
