import React, { useEffect, useMemo, useState } from "react";
import {
  I18nManager,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import {
  Button,
  Card,
  ErrorState,
  Header,
  Input,
  LoadingState,
  Screen,
  Text,
} from "../../../src/components/ui";
import {
  useCreateAvailabilityException,
  useDeleteAvailabilityException,
  useMyAvailability,
  useReplaceWeeklyAvailability,
  useUpdateAvailabilityException,
} from "../../../src/features/practitioner/availability/hooks";
import type {
  AvailabilityData,
  AvailabilityException,
  AvailabilityExceptionType,
} from "../../../src/features/practitioner/availability/types";
import {
  useMyPresence,
  useSetInstantBooking,
  useSetPresenceStatus,
} from "../../../src/features/practitioner/presence/hooks";
import type { PresenceStatus } from "../../../src/features/practitioner/presence/types";
import { trackAnalyticsEvent } from "../../../src/lib/analytics";
import { useTheme } from "../../../src/providers/ThemeProvider";

const STATUS_OPTIONS: PresenceStatus[] = ["ONLINE", "AWAY", "BUSY", "OFFLINE"];
const DAY_KEYS = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
] as const;

type DraftSlot = {
  key: string;
  dayOfWeek: number;
  durationMinutes: 30 | 60;
  startMinuteOfDay: number;
  endMinuteOfDay: number;
};

type ExceptionFormState = {
  targetId?: string;
  type: AvailabilityExceptionType;
  startsAt: string;
  endsAt: string;
  reason: string;
  error: string | null;
};

const EMPTY_EXCEPTION_FORM: ExceptionFormState = {
  targetId: undefined,
  type: "BLOCK",
  startsAt: "",
  endsAt: "",
  reason: "",
  error: null,
};

export default function PractitionerAvailabilityScreen() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US";
  const isRTL = I18nManager.isRTL;
  const rowDirection = isRTL ? "row-reverse" : "row";

  const presenceQuery = useMyPresence();
  const availabilityQuery = useMyAvailability();
  const setStatus = useSetPresenceStatus();
  const setInstantBooking = useSetInstantBooking();
  const replaceWeeklyAvailability = useReplaceWeeklyAvailability();
  const createException = useCreateAvailabilityException();
  const deleteException = useDeleteAvailabilityException();
  const updateException = useUpdateAvailabilityException();

  const [draftSlots, setDraftSlots] = useState<DraftSlot[]>([]);
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState(0);
  const [selectedDuration, setSelectedDuration] = useState<30 | 60>(60);
  const [slotSaveMessage, setSlotSaveMessage] = useState<string | null>(null);

  const [exceptionFormOpen, setExceptionFormOpen] = useState(false);
  const [exceptionForm, setExceptionForm] =
    useState<ExceptionFormState>(EMPTY_EXCEPTION_FORM);
  const [exceptionMessage, setExceptionMessage] = useState<string | null>(null);

  const hasLoadError = presenceQuery.isError || availabilityQuery.isError;
  const availabilityData = availabilityQuery.data ?? null;

  useEffect(() => {
    if (!availabilityData) {
      return;
    }
    setDraftSlots(buildDraftSlots(availabilityData));
    setSelectedDayOfWeek((current) => (current >= 0 && current <= 6 ? current : 0));
    setExceptionFormOpen(false);
    setExceptionForm(EMPTY_EXCEPTION_FORM);
  }, [availabilityData]);

  const groupedDraftSlots = useMemo(
    () =>
      DAY_KEYS.map((weekday, dayOfWeek) => ({
        weekday,
        dayOfWeek,
        slots: draftSlots
          .filter((slot) => slot.dayOfWeek === dayOfWeek)
          .sort((left, right) => left.startMinuteOfDay - right.startMinuteOfDay),
      })),
    [draftSlots],
  );

  const selectedDaySlots = useMemo(
    () =>
      draftSlots
        .filter((slot) => slot.dayOfWeek === selectedDayOfWeek)
        .sort((left, right) => left.startMinuteOfDay - right.startMinuteOfDay),
    [draftSlots, selectedDayOfWeek],
  );

  const timeGrid = useMemo(() => buildTimeGrid(8 * 60, 22 * 60), []);
  const activeExceptions = useMemo(
    () => (availabilityData?.exceptions ?? []).filter((item) => item.isActive),
    [availabilityData?.exceptions],
  );
  const weeklySlotsCount = draftSlots.length;
  const isSaving = replaceWeeklyAvailability.isPending;
  const isDirtyState = isDirty(availabilityData, draftSlots);

  const currentStatus = presenceQuery.data?.presence.status ?? null;
  const instantBookingEnabled =
    presenceQuery.data?.presence.isInstantBookingEnabled ?? false;

  const summaryCounts = useMemo(() => {
    const now = new Date();
    const today = now.getDay();
    let todayCount = 0;
    let upcomingCount = 0;
    let activeCount = 0;
    let completedCount = 0;

    for (const slot of draftSlots) {
      if (slot.dayOfWeek === today) {
        todayCount += 1;
      }
      if (slot.dayOfWeek > today) {
        upcomingCount += 1;
      }
      if (slot.dayOfWeek === today && slot.endMinuteOfDay > now.getHours() * 60 + now.getMinutes()) {
        activeCount += 1;
      }
      if (slot.dayOfWeek === today && slot.endMinuteOfDay <= now.getHours() * 60 + now.getMinutes()) {
        completedCount += 1;
      }
    }

    return {
      todayCount,
      upcomingCount,
      activeCount,
      completedCount,
    };
  }, [draftSlots]);

  const toggleSlot = (startMinuteOfDay: number) => {
    const endMinuteOfDay = startMinuteOfDay + selectedDuration;

    const exact = draftSlots.find(
      (slot) =>
        slot.dayOfWeek === selectedDayOfWeek &&
        slot.startMinuteOfDay === startMinuteOfDay &&
        slot.durationMinutes === selectedDuration,
    );

    if (exact) {
      setDraftSlots((current) => current.filter((slot) => slot.key !== exact.key));
      setSlotSaveMessage(null);
      return;
    }

    const overlap = draftSlots.some(
      (slot) =>
        slot.dayOfWeek === selectedDayOfWeek &&
        startMinuteOfDay < slot.endMinuteOfDay &&
        endMinuteOfDay > slot.startMinuteOfDay,
    );

    if (overlap) {
      setSlotSaveMessage(
        t("practitioner.availability.validation.overlap", {
          defaultValue: "لا يمكن إضافة وقت متداخل.",
        }),
      );
      return;
    }

    const newSlot: DraftSlot = {
      key: `${selectedDayOfWeek}-${startMinuteOfDay}-${selectedDuration}`,
      dayOfWeek: selectedDayOfWeek,
      durationMinutes: selectedDuration,
      startMinuteOfDay,
      endMinuteOfDay,
    };

    setDraftSlots((current) =>
      [...current, newSlot].sort(
        (left, right) =>
          left.dayOfWeek - right.dayOfWeek ||
          left.startMinuteOfDay - right.startMinuteOfDay,
      ),
    );
    setSlotSaveMessage(null);
  };

  const handleSaveSchedule = async () => {
    if (!availabilityData?.timezone) {
      setSlotSaveMessage(
        t("practitioner.availability.saveError", {
          defaultValue: "تعذر حفظ التغييرات.",
        }),
      );
      return;
    }

    try {
      await replaceWeeklyAvailability.mutateAsync({
        timezone: availabilityData.timezone,
        slots: draftSlots.map((slot) => ({
          dayOfWeek: slot.dayOfWeek,
          durationMinutes: slot.durationMinutes,
          startMinuteOfDay: slot.startMinuteOfDay,
          endMinuteOfDay: slot.endMinuteOfDay,
        })),
      });
      setSlotSaveMessage(
        t("practitioner.availability.saveSuccess", {
          defaultValue: "تم حفظ الجدول بنجاح.",
        }),
      );
      trackAnalyticsEvent("practitioner_availability_updated", {
        action: "weekly_slots_saved",
        slotsCount: draftSlots.length,
      });
    } catch {
      setSlotSaveMessage(
        t("practitioner.availability.saveError", {
          defaultValue: "تعذر حفظ التغييرات.",
        }),
      );
    }
  };

  const handleResetSchedule = () => {
    if (!availabilityData) {
      return;
    }
    setDraftSlots(buildDraftSlots(availabilityData));
    setSlotSaveMessage(null);
  };

  const openAddException = () => {
    setExceptionFormOpen(true);
    setExceptionForm(EMPTY_EXCEPTION_FORM);
    setExceptionMessage(null);
  };

  const openEditException = (exception: AvailabilityException) => {
    setExceptionFormOpen(true);
    setExceptionForm({
      targetId: exception.id,
      type: exception.type,
      startsAt: toLocalDateTimeInputValue(exception.startsAt),
      endsAt: toLocalDateTimeInputValue(exception.endsAt),
      reason: exception.reason ?? "",
      error: null,
    });
    setExceptionMessage(null);
  };

  const handleCreateOrUpdateException = async () => {
    const validated = validateExceptionForm(exceptionForm, t);
    if (!validated.ok) {
      setExceptionForm((current) => ({ ...current, error: validated.error }));
      return;
    }

    const payload = {
      type: exceptionForm.type,
      startsAt: validated.startsAt,
      endsAt: validated.endsAt,
      reason: exceptionForm.reason.trim() || undefined,
    };

    try {
      if (exceptionForm.targetId) {
        await updateException.mutateAsync({
          exceptionId: exceptionForm.targetId,
          payload,
        });
        trackAnalyticsEvent("practitioner_availability_updated", {
          action: "exception_updated",
          exceptionType: payload.type,
        });
      } else {
        await createException.mutateAsync(payload);
        trackAnalyticsEvent("practitioner_availability_updated", {
          action: "exception_created",
          exceptionType: payload.type,
        });
      }
      setExceptionFormOpen(false);
      setExceptionForm(EMPTY_EXCEPTION_FORM);
      setExceptionMessage(
        t("practitioner.availability.exceptionSaveSuccess", {
          defaultValue: "تم حفظ الاستثناء.",
        }),
      );
    } catch {
      setExceptionMessage(
        t("practitioner.availability.exceptionSaveError", {
          defaultValue: "تعذر حفظ الاستثناء.",
        }),
      );
    }
  };

  const handleDeleteException = async (exception: AvailabilityException) => {
    try {
      await deleteException.mutateAsync(exception.id);
      setExceptionMessage(
        t("practitioner.availability.exceptionDeleteSuccess", {
          defaultValue: "تم حذف الاستثناء.",
        }),
      );
      trackAnalyticsEvent("practitioner_availability_updated", {
        action: "exception_deleted",
        exceptionType: exception.type,
      });
    } catch {
      setExceptionMessage(
        t("practitioner.availability.exceptionDeleteError", {
          defaultValue: "تعذر حذف الاستثناء.",
        }),
      );
    }
  };

  return (
    <Screen bg="background">
      <Header title={t("practitioner.availability.title")} />

      <ScrollView contentContainerStyle={styles.content}>
        {presenceQuery.isLoading || availabilityQuery.isLoading ? (
          <LoadingState fullScreen />
        ) : null}

        {hasLoadError ? (
          <ErrorState
            onRetry={() => {
              void presenceQuery.refetch();
              void availabilityQuery.refetch();
            }}
          />
        ) : null}

        {!presenceQuery.isLoading &&
        !availabilityQuery.isLoading &&
        !hasLoadError &&
        availabilityData &&
        presenceQuery.data ? (
          <>
            <Card variant="outlined" padding="sm" style={styles.sectionCard}>
              <Text weight="600" style={styles.sectionTitle}>
                {t("practitioner.availability.overviewTitle")}
              </Text>
              <Text color={theme.colors.textSecondary} style={styles.sectionBody}>
                {t("practitioner.availability.scheduleBodyCompact", {
                  defaultValue:
                    "حدّد الأوقات التي يمكنك استقبال الجلسات فيها خلال الأسبوع.",
                })}
              </Text>

              <View style={styles.summaryChipsRow}>
                <StatChip
                  label={t("practitioner.availability.summary.today", {
                    defaultValue: "جلسات اليوم",
                  })}
                  value={formatCount(summaryCounts.todayCount, locale)}
                  theme={theme}
                />
                <StatChip
                  label={t("practitioner.availability.summary.upcoming", {
                    defaultValue: "القادمة",
                  })}
                  value={formatCount(summaryCounts.upcomingCount, locale)}
                  theme={theme}
                />
                <StatChip
                  label={t("practitioner.availability.summary.active", {
                    defaultValue: "النشطة",
                  })}
                  value={formatCount(summaryCounts.activeCount, locale)}
                  theme={theme}
                />
                <StatChip
                  label={t("practitioner.availability.summary.completed", {
                    defaultValue: "المكتملة",
                  })}
                  value={formatCount(summaryCounts.completedCount, locale)}
                  theme={theme}
                />
              </View>

              <View style={[styles.timezoneRow, { flexDirection: rowDirection }]}>
                <Text color={theme.colors.textMuted} style={styles.eyebrow}>
                  {t("practitioner.availability.timezoneLabel")}
                </Text>
                <Text weight="600" style={styles.timezoneValue}>
                  {formatTimezoneLabel(availabilityData.timezone, i18n.language)}
                </Text>
              </View>
            </Card>

            <Card variant="outlined" padding="sm" style={styles.sectionCard}>
              <Text weight="600" style={styles.sectionTitle}>
                {t("practitioner.availability.presenceTitle")}
              </Text>
              <View style={styles.statusGrid}>
                {STATUS_OPTIONS.map((status) => {
                  const active = currentStatus === status;
                  return (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.statusChip,
                        {
                          backgroundColor: active
                            ? theme.colors.primaryLight
                            : theme.colors.surface,
                          borderColor: active
                            ? theme.colors.primary
                            : theme.colors.borderLight,
                        },
                      ]}
                      disabled={setStatus.isPending}
                      onPress={() => {
                        if (!active) {
                          setStatus.mutate({ status });
                        }
                      }}
                    >
                      <Text
                        color={active ? theme.colors.primary : theme.colors.textSecondary}
                        weight="600"
                      >
                        {t(`practitioner.presence.status.${status}`)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={[styles.instantRow, { flexDirection: rowDirection }]}>
                <View style={styles.instantTextWrap}>
                  <Text weight="600">{t("practitioner.availability.instantBooking")}</Text>
                  <Text color={theme.colors.textSecondary} style={styles.instantBody}>
                    {t("practitioner.availability.instantBookingBody")}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.toggle,
                    {
                      backgroundColor: instantBookingEnabled
                        ? theme.colors.primary
                        : theme.colors.borderLight,
                    },
                  ]}
                  disabled={setInstantBooking.isPending}
                  onPress={() =>
                    setInstantBooking.mutate({
                      isInstantBookingEnabled: !instantBookingEnabled,
                    })
                  }
                >
                  <View
                    style={[
                      styles.toggleKnob,
                      { alignSelf: instantBookingEnabled ? "flex-end" : "flex-start" },
                    ]}
                  />
                </TouchableOpacity>
              </View>
            </Card>

            <Card variant="outlined" padding="sm" style={styles.sectionCard}>
              <Text weight="600" style={styles.sectionTitle}>
                {t("practitioner.availability.scheduleTitle")}
              </Text>

              <Text weight="600" style={styles.subsectionTitle}>
                {t("practitioner.availability.durationSelector", {
                  defaultValue: "اختر مدة الجلسة",
                })}
              </Text>
              <View style={[styles.typeRow, { flexDirection: rowDirection }]}>
                {[30, 60].map((duration) => {
                  const active = selectedDuration === duration;
                  return (
                    <TouchableOpacity
                      key={duration}
                      style={[
                        styles.typeChip,
                        {
                          backgroundColor: active
                            ? theme.colors.primaryLight
                            : theme.colors.surface,
                          borderColor: active
                            ? theme.colors.primary
                            : theme.colors.borderLight,
                        },
                      ]}
                      onPress={() => setSelectedDuration(duration as 30 | 60)}
                    >
                      <Text
                        color={active ? theme.colors.primary : theme.colors.textSecondary}
                        weight="600"
                      >
                        {t("practitioner.availability.durationMinutes", {
                          defaultValue: "{{minutes}} دقيقة",
                          minutes: duration,
                        })}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text weight="600" style={styles.subsectionTitle}>
                {t("practitioner.availability.selectDay", { defaultValue: "اختر اليوم" })}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[
                  styles.weekdayScroll,
                  { flexDirection: rowDirection },
                ]}
              >
                {groupedDraftSlots.map((day) => {
                  const active = selectedDayOfWeek === day.dayOfWeek;
                  return (
                    <TouchableOpacity
                      key={day.weekday}
                      style={[
                        styles.dayChip,
                        {
                          backgroundColor: active
                            ? theme.colors.primaryLight
                            : theme.colors.surface,
                          borderColor: active
                            ? theme.colors.primary
                            : theme.colors.borderLight,
                        },
                      ]}
                      onPress={() => setSelectedDayOfWeek(day.dayOfWeek)}
                    >
                      <Text
                        weight="600"
                        color={active ? theme.colors.primary : theme.colors.textPrimary}
                      >
                        {t(`practitioner.weekday.${day.weekday}`)}
                      </Text>
                      <Text color={theme.colors.textSecondary} style={styles.dayChipCount}>
                        {formatCount(day.slots.length, locale)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text weight="600" style={styles.subsectionTitle}>
                {t("practitioner.availability.timeSlots", {
                  defaultValue: "الأوقات المتاحة",
                })}
              </Text>
              <View style={styles.slotGrid}>
                {timeGrid.map((minute) => {
                  const end = minute + selectedDuration;
                  const selected = draftSlots.some(
                    (slot) =>
                      slot.dayOfWeek === selectedDayOfWeek &&
                      slot.startMinuteOfDay === minute &&
                      slot.durationMinutes === selectedDuration,
                  );
                  const overlap = draftSlots.some(
                    (slot) =>
                      slot.dayOfWeek === selectedDayOfWeek &&
                      minute < slot.endMinuteOfDay &&
                      end > slot.startMinuteOfDay &&
                      !(slot.startMinuteOfDay === minute && slot.durationMinutes === selectedDuration),
                  );

                  return (
                    <TouchableOpacity
                      key={`${selectedDayOfWeek}-${selectedDuration}-${minute}`}
                      style={[
                        styles.gridSlotButton,
                        {
                          backgroundColor: selected
                            ? theme.colors.primaryLight
                            : theme.colors.surface,
                          borderColor: selected
                            ? theme.colors.primary
                            : overlap
                              ? theme.colors.borderStrong
                              : theme.colors.borderLight,
                        },
                      ]}
                      disabled={isSaving}
                      onPress={() => toggleSlot(minute)}
                    >
                      <Text
                        weight="600"
                        color={selected ? theme.colors.primary : theme.colors.textPrimary}
                      >
                        {formatMinutes(minute)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text weight="600" style={styles.subsectionTitle}>
                {t("practitioner.availability.selectedSlots", {
                  defaultValue: "الأوقات المختارة",
                })}
              </Text>
              {selectedDaySlots.length ? (
                <View style={styles.selectedChips}>
                  {selectedDaySlots.map((slot) => (
                    <TouchableOpacity
                      key={slot.key}
                      style={[
                        styles.selectedChip,
                        {
                          backgroundColor: theme.colors.primaryLight,
                          borderColor: theme.colors.primary,
                        },
                      ]}
                      onPress={() =>
                        setDraftSlots((current) =>
                          current.filter((item) => item.key !== slot.key),
                        )
                      }
                    >
                      <Text color={theme.colors.primary} weight="600">
                        {t("practitioner.availability.slotRange", {
                          defaultValue: "{{start}} - {{end}}",
                          start: formatMinutes(slot.startMinuteOfDay),
                          end: formatMinutes(slot.endMinuteOfDay),
                        })}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <Text color={theme.colors.textSecondary}>
                  {t("practitioner.availability.selectedSlotsEmpty", {
                    defaultValue: "لم تحدد أوقاتًا لهذا اليوم بعد",
                  })}
                </Text>
              )}

              <Text weight="600" style={styles.subsectionTitle}>
                {t("practitioner.availability.weeklySummary", {
                  defaultValue: "ملخص الأسبوع",
                })}
              </Text>
              <View style={styles.weeklySummaryList}>
                {groupedDraftSlots.map((day) => (
                  <View
                    key={`summary-${day.weekday}`}
                    style={[
                      styles.summaryRow,
                      {
                        backgroundColor: theme.colors.surfaceSecondary,
                        borderColor: theme.colors.borderLight,
                      },
                    ]}
                  >
                    <Text weight="600">{t(`practitioner.weekday.${day.weekday}`)}</Text>
                    <Text color={theme.colors.textSecondary}>
                      {day.slots.length
                        ? t("practitioner.availability.daySlotsCount", {
                            defaultValue: "{{count}} أوقات",
                            count: day.slots.length,
                          })
                        : t("practitioner.availability.noSlots", {
                            defaultValue: "لا توجد أوقات",
                          })}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.footerActions}>
                <Button
                  title={
                    isSaving
                      ? t("practitioner.availability.saving")
                      : t("practitioner.availability.saveSchedule")
                  }
                  onPress={() => void handleSaveSchedule()}
                  disabled={!availabilityData.timezone || !isDirtyState || isSaving}
                  style={styles.compactButton}
                />
                <Button
                  title={t("practitioner.availability.resetChanges")}
                  variant="secondary"
                  onPress={handleResetSchedule}
                  disabled={!isDirtyState || isSaving}
                  style={styles.compactButton}
                />
              </View>

              <Text
                color={
                  slotSaveMessage ===
                  t("practitioner.availability.saveSuccess", {
                    defaultValue: "تم حفظ الجدول بنجاح.",
                  })
                    ? theme.colors.primary
                    : slotSaveMessage
                      ? theme.colors.error
                      : theme.colors.textMuted
                }
                style={styles.helperText}
              >
                {slotSaveMessage ??
                  t("practitioner.availability.saveHint", {
                    defaultValue: "اضغط حفظ التغييرات بعد تحديث الأوقات.",
                  })}
              </Text>
            </Card>

            <Card variant="outlined" padding="sm" style={styles.sectionCard}>
              <View style={[styles.exceptionHeader, { flexDirection: rowDirection }]}>
                <View style={styles.exceptionHeaderText}>
                  <Text weight="600" style={styles.sectionTitle}>
                    {t("practitioner.availability.exceptionsTitle")}
                  </Text>
                  <Text color={theme.colors.textSecondary} style={styles.sectionBody}>
                    {t("practitioner.availability.exceptionsBody")}
                  </Text>
                </View>
                {!exceptionFormOpen ? (
                  <TouchableOpacity
                    style={[
                      styles.inlineAction,
                      {
                        borderColor: theme.colors.borderLight,
                        backgroundColor: theme.colors.surfaceSecondary,
                      },
                    ]}
                    onPress={openAddException}
                  >
                    <Text color={theme.colors.textSecondary} weight="600">
                      {t("practitioner.availability.addException")}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              {exceptionFormOpen ? (
                <View
                  style={[
                    styles.editorBox,
                    {
                      backgroundColor: theme.colors.surfaceSecondary,
                      borderColor: theme.colors.borderLight,
                    },
                  ]}
                >
                  <View style={[styles.typeRow, { flexDirection: rowDirection }]}>
                    {(["BLOCK", "OPEN_EXTRA"] as AvailabilityExceptionType[]).map((type) => {
                      const active = exceptionForm.type === type;
                      return (
                        <TouchableOpacity
                          key={type}
                          style={[
                            styles.typeChip,
                            {
                              backgroundColor: active
                                ? theme.colors.primaryLight
                                : theme.colors.surface,
                              borderColor: active
                                ? theme.colors.primary
                                : theme.colors.borderLight,
                            },
                          ]}
                          onPress={() =>
                            setExceptionForm((current) => ({
                              ...current,
                              type,
                              error: null,
                            }))
                          }
                        >
                          <Text
                            color={active ? theme.colors.primary : theme.colors.textSecondary}
                            weight="600"
                          >
                            {t(`practitioner.availability.exceptionType.${type}`)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Input
                    label={t("practitioner.availability.exceptionStartsAt")}
                    value={exceptionForm.startsAt}
                    onChangeText={(value) =>
                      setExceptionForm((current) => ({
                        ...current,
                        startsAt: value,
                        error: null,
                      }))
                    }
                    placeholder="2026-04-25T14:00"
                    helperText={t("practitioner.availability.exceptionTimeHint")}
                    keyboardType="numbers-and-punctuation"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Input
                    label={t("practitioner.availability.exceptionEndsAt")}
                    value={exceptionForm.endsAt}
                    onChangeText={(value) =>
                      setExceptionForm((current) => ({
                        ...current,
                        endsAt: value,
                        error: null,
                      }))
                    }
                    placeholder="2026-04-25T16:00"
                    keyboardType="numbers-and-punctuation"
                    autoCapitalize="none"
                    autoCorrect={false}
                    error={exceptionForm.error ?? undefined}
                  />
                  <Input
                    label={t("practitioner.availability.exceptionReason")}
                    value={exceptionForm.reason}
                    onChangeText={(value) =>
                      setExceptionForm((current) => ({ ...current, reason: value }))
                    }
                    placeholder={t(
                      "practitioner.availability.exceptionReasonPlaceholder",
                    )}
                  />

                  <View style={styles.editorActions}>
                    <Button
                      title={
                        exceptionForm.targetId
                          ? updateException.isPending
                            ? t("practitioner.availability.saving")
                            : t("practitioner.availability.editException")
                          : createException.isPending
                            ? t("practitioner.availability.saving")
                            : t("practitioner.availability.saveException")
                      }
                      onPress={() => void handleCreateOrUpdateException()}
                      style={styles.compactButton}
                    />
                    <Button
                      title={t("common.cancel")}
                      variant="secondary"
                      onPress={() => {
                        setExceptionFormOpen(false);
                        setExceptionForm(EMPTY_EXCEPTION_FORM);
                        setExceptionMessage(null);
                      }}
                      style={styles.compactButton}
                    />
                  </View>
                </View>
              ) : null}

              {activeExceptions.length ? (
                <View style={styles.exceptionList}>
                  {activeExceptions.map((exception) => (
                    <View
                      key={exception.id}
                      style={[
                        styles.exceptionRow,
                        {
                          backgroundColor: theme.colors.surfaceSecondary,
                          borderColor: theme.colors.borderLight,
                        },
                      ]}
                    >
                      <View style={styles.exceptionTextWrap}>
                        <View style={[styles.exceptionBadgeRow, { flexDirection: rowDirection }]}>
                          <View
                            style={[
                              styles.exceptionBadge,
                              {
                                backgroundColor:
                                  exception.type === "BLOCK"
                                    ? theme.colors.errorLight ?? "#FEE2E2"
                                    : theme.colors.primaryLight,
                                borderColor:
                                  exception.type === "BLOCK"
                                    ? theme.colors.error ?? "#EF4444"
                                    : theme.colors.primary,
                              },
                            ]}
                          >
                            <Text
                              color={
                                exception.type === "BLOCK"
                                  ? theme.colors.error ?? "#B91C1C"
                                  : theme.colors.primary
                              }
                              weight="600"
                            >
                              {t(`practitioner.availability.exceptionType.${exception.type}`)}
                            </Text>
                          </View>
                          <Text color={theme.colors.textSecondary} style={styles.exceptionMeta}>
                            {formatExceptionRange(exception.startsAt, exception.endsAt, locale)}
                          </Text>
                        </View>
                        {exception.reason ? (
                          <Text color={theme.colors.textMuted} style={styles.exceptionReason}>
                            {exception.reason}
                          </Text>
                        ) : null}
                      </View>
                      <View style={[styles.slotActions, { flexDirection: rowDirection }]}>
                        <TouchableOpacity
                          style={styles.slotActionButton}
                          onPress={() => openEditException(exception)}
                        >
                          <Text color={theme.colors.primary} weight="600">
                            {t("practitioner.availability.editException")}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.slotActionButton}
                          onPress={() => void handleDeleteException(exception)}
                          disabled={deleteException.isPending}
                        >
                          <Text color={theme.colors.error} weight="600">
                            {t("practitioner.availability.removeException")}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <Text color={theme.colors.textSecondary}>
                  {t("practitioner.availability.emptyExceptions", {
                    defaultValue: "لا توجد استثناءات حاليًا",
                  })}
                </Text>
              )}

              {exceptionMessage ? (
                <Text
                  color={
                    exceptionMessage.includes("تم")
                      ? theme.colors.primary
                      : theme.colors.error
                  }
                  style={styles.helperText}
                >
                  {exceptionMessage}
                </Text>
              ) : null}
            </Card>
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function StatChip({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: ReturnType<typeof useTheme>["theme"];
}) {
  return (
    <View
      style={[
        styles.summaryChip,
        {
          backgroundColor: theme.colors.surfaceSecondary,
          borderColor: theme.colors.borderLight,
        },
      ]}
    >
      <Text color={theme.colors.textMuted} style={styles.summaryChipLabel}>
        {label}
      </Text>
      <Text weight="600">{value}</Text>
    </View>
  );
}

function buildTimeGrid(startMinute: number, endMinute: number) {
  const items: number[] = [];
  for (let minute = startMinute; minute <= endMinute; minute += 30) {
    items.push(minute);
  }
  return items;
}

function buildDraftSlots(data: AvailabilityData): DraftSlot[] {
  const expanded: DraftSlot[] = [];

  for (const slot of data.weeklySlots) {
    if (!slot.isActive) {
      continue;
    }

    const durationMinutes: 30 | 60 = slot.durationMinutes === 60 ? 60 : 30;
    const rangeMinutes = slot.endMinuteOfDay - slot.startMinuteOfDay;

    if (rangeMinutes === durationMinutes) {
      expanded.push({
        key: slot.id,
        dayOfWeek: slot.dayOfWeek,
        durationMinutes,
        startMinuteOfDay: slot.startMinuteOfDay,
        endMinuteOfDay: slot.endMinuteOfDay,
      });
      continue;
    }

    // Legacy/seed windows can be longer than one booking slot.
    // Expand them into atomic slots so backend validation remains satisfied on save.
    if (
      rangeMinutes > durationMinutes &&
      rangeMinutes % durationMinutes === 0
    ) {
      let cursor = slot.startMinuteOfDay;
      let part = 0;
      while (cursor < slot.endMinuteOfDay) {
        expanded.push({
          key: `${slot.id}-part-${part}`,
          dayOfWeek: slot.dayOfWeek,
          durationMinutes,
          startMinuteOfDay: cursor,
          endMinuteOfDay: cursor + durationMinutes,
        });
        cursor += durationMinutes;
        part += 1;
      }
    }
  }

  return expanded.sort(
    (left, right) =>
      left.dayOfWeek - right.dayOfWeek ||
      left.startMinuteOfDay - right.startMinuteOfDay,
  );
}

function serializeSlot(slot: DraftSlot) {
  return `${slot.dayOfWeek}:${slot.durationMinutes}:${slot.startMinuteOfDay}:${slot.endMinuteOfDay}`;
}

function isDirty(data: AvailabilityData | null, draftSlots: DraftSlot[]) {
  if (!data) {
    return false;
  }
  const source = buildDraftSlots(data).map(serializeSlot).sort();
  const current = draftSlots.map(serializeSlot).sort();
  return source.join("|") !== current.join("|");
}

function formatMinutes(minutes: number) {
  const rawHour = Math.floor(minutes / 60);
  const rawMinute = minutes % 60;
  const hour = String(rawHour).padStart(2, "0");
  const minute = String(rawMinute).padStart(2, "0");
  return `${hour}:${minute}`;
}

function parseLocalDateTimeToIso(value: string) {
  const trimmed = normalizeDigits(value.trim());
  const match = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:T| )(\d{2}):(\d{2})$/,
  );
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hours = Number(match[4]);
  const minutes = Number(match[5]);
  if ([year, month, day, hours, minutes].some((part) => Number.isNaN(part))) {
    return null;
  }
  const date = new Date(year, month - 1, day, hours, minutes);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

function toLocalDateTimeInputValue(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function normalizeDigits(value: string) {
  const arabicIndic = "٠١٢٣٤٥٦٧٨٩";
  const easternArabicIndic = "۰۱۲۳۴۵۶۷۸۹";

  return value
    .split("")
    .map((character) => {
      const arabicIndex = arabicIndic.indexOf(character);
      if (arabicIndex >= 0) {
        return String(arabicIndex);
      }
      const easternIndex = easternArabicIndic.indexOf(character);
      if (easternIndex >= 0) {
        return String(easternIndex);
      }
      return character;
    })
    .join("");
}

function validateExceptionForm(
  exceptionForm: ExceptionFormState,
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  const startsAt = parseLocalDateTimeToIso(exceptionForm.startsAt);
  const endsAt = parseLocalDateTimeToIso(exceptionForm.endsAt);
  if (!startsAt || !endsAt) {
    return {
      ok: false as const,
      error: t("practitioner.availability.validation.exceptionDatesRequired"),
    };
  }
  if (new Date(endsAt) <= new Date(startsAt)) {
    return {
      ok: false as const,
      error: t("practitioner.availability.validation.invalidDateTime"),
    };
  }
  return { ok: true as const, startsAt, endsAt };
}

function formatExceptionRange(isoStart: string, isoEnd: string, locale: string) {
  const formatter = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: !locale.startsWith("ar"),
  });
  return `${formatter.format(new Date(isoStart))} - ${formatter.format(
    new Date(isoEnd),
  )}`;
}

function formatCount(count: number, locale: string) {
  return new Intl.NumberFormat(locale, { useGrouping: false }).format(count);
}

function formatTimezoneLabel(timezone: string, language?: string) {
  if (!timezone) {
    return "-";
  }
  const cityToken = timezone.split("/").pop()?.replace(/_/g, " ") ?? timezone;
  const arabicMap = {
    Cairo: "القاهرة",
    Riyadh: "الرياض",
    Dubai: "دبي",
    Kuwait: "الكويت",
    Doha: "الدوحة",
  } as const;
  if (language?.startsWith("ar")) {
    return arabicMap[cityToken as keyof typeof arabicMap] ?? cityToken;
  }
  return cityToken;
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 22,
    gap: 8,
  },
  sectionCard: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
  },
  sectionBody: {
    fontSize: 11,
    lineHeight: 16,
  },
  summaryChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  summaryChip: {
    borderWidth: 1,
    borderRadius: 11,
    paddingHorizontal: 8,
    paddingVertical: 6,
    minWidth: "48%",
  },
  summaryChipLabel: {
    fontSize: 10,
    marginBottom: 1,
  },
  timezoneRow: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    justifyContent: "space-between",
    alignItems: "center",
  },
  timezoneValue: {
    fontSize: 12,
  },
  eyebrow: {
    fontSize: 10,
  },
  statusGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  statusChip: {
    width: "48%",
    borderWidth: 1,
    borderRadius: 11,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  instantRow: {
    borderTopWidth: 1,
    borderTopColor: "#D9E0E6",
    paddingTop: 8,
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  instantTextWrap: {
    flex: 1,
  },
  instantBody: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 16,
  },
  toggle: {
    width: 54,
    borderRadius: 999,
    padding: 4,
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
  },
  subsectionTitle: {
    fontSize: 13,
    marginTop: 2,
  },
  typeRow: {
    gap: 6,
  },
  typeChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  weekdayScroll: {
    gap: 5,
    paddingVertical: 2,
  },
  dayChip: {
    borderWidth: 1,
    borderRadius: 11,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 80,
    alignItems: "center",
    gap: 2,
  },
  dayChipCount: {
    fontSize: 10,
  },
  slotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 6,
  },
  gridSlotButton: {
    width: "48.5%",
    borderWidth: 1,
    borderRadius: 11,
    paddingVertical: 7,
    alignItems: "center",
  },
  selectedChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  selectedChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  weeklySummaryList: {
    gap: 5,
  },
  summaryRow: {
    borderWidth: 1,
    borderRadius: 11,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerActions: {
    gap: 5,
    marginTop: 4,
  },
  compactButton: {
    minHeight: 46,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  helperText: {
    fontSize: 10,
    lineHeight: 15,
  },
  exceptionHeader: {
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  exceptionHeaderText: {
    flex: 1,
    gap: 2,
  },
  inlineAction: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  editorBox: {
    borderWidth: 1,
    borderRadius: 11,
    padding: 10,
    gap: 5,
  },
  editorActions: {
    gap: 5,
  },
  exceptionList: {
    gap: 5,
  },
  exceptionRow: {
    borderWidth: 1,
    borderRadius: 11,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 5,
  },
  exceptionTextWrap: {
    gap: 4,
  },
  exceptionBadgeRow: {
    alignItems: "center",
    gap: 5,
    flexWrap: "wrap",
  },
  exceptionBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  exceptionMeta: {
    fontSize: 10,
  },
  exceptionReason: {
    fontSize: 11,
    lineHeight: 16,
  },
  slotActions: {
    gap: 8,
  },
  slotActionButton: {
    paddingVertical: 2,
  },
});
