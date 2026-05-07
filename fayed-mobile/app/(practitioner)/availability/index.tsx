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
  startMinuteOfDay: number;
  endMinuteOfDay: number;
};

type SlotFormState = {
  dayOfWeek: number;
  mode: "add" | "edit";
  targetKey?: string;
  startTime: string;
  endTime: string;
  error: string | null;
};

type ExceptionFormState = {
  type: AvailabilityExceptionType;
  startsAt: string;
  endsAt: string;
  reason: string;
  error: string | null;
};

const EMPTY_EXCEPTION_FORM: ExceptionFormState = {
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

  const [draftSlots, setDraftSlots] = useState<DraftSlot[]>([]);
  const [slotForm, setSlotForm] = useState<SlotFormState | null>(null);
  const [slotSaveMessage, setSlotSaveMessage] = useState<string | null>(null);
  const [exceptionFormOpen, setExceptionFormOpen] = useState(false);
  const [exceptionForm, setExceptionForm] = useState<ExceptionFormState>(
    EMPTY_EXCEPTION_FORM,
  );
  const [exceptionMessage, setExceptionMessage] = useState<string | null>(null);

  const hasLoadError = presenceQuery.isError || availabilityQuery.isError;
  const availabilityData = availabilityQuery.data ?? null;
  const activeSlots = useMemo(
    () => draftSlots.length,
    [draftSlots.length],
  );
  const activeExceptions = useMemo(
    () =>
      (availabilityData?.exceptions ?? []).filter((item) => item.isActive),
    [availabilityData?.exceptions],
  );

  useEffect(() => {
    if (!availabilityData) {
      return;
    }

    setDraftSlots(buildDraftSlots(availabilityData));
    setSlotForm(null);
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

  const openAddSlot = (dayOfWeek: number) => {
    setSlotForm({
      dayOfWeek,
      mode: "add",
      startTime: "09:00",
      endTime: "17:00",
      error: null,
    });
    setSlotSaveMessage(null);
  };

  const openEditSlot = (slot: DraftSlot) => {
    setSlotForm({
      dayOfWeek: slot.dayOfWeek,
      mode: "edit",
      targetKey: slot.key,
      startTime: minutesToTime(slot.startMinuteOfDay, locale),
      endTime: minutesToTime(slot.endMinuteOfDay, locale),
      error: null,
    });
    setSlotSaveMessage(null);
  };

  const cancelSlotForm = () => {
    setSlotForm(null);
  };

  const saveSlotForm = () => {
    if (!slotForm) {
      return;
    }

    const parsed = validateSlotForm(slotForm, draftSlots, t);
    if (!parsed.ok) {
      setSlotForm((current) =>
        current ? { ...current, error: parsed.error } : current,
      );
      return;
    }

    setDraftSlots((current) => {
      const next =
        slotForm.mode === "edit"
          ? current.filter((item) => item.key !== slotForm.targetKey)
          : [...current];

      next.push({
        key:
          slotForm.mode === "edit" && slotForm.targetKey
            ? slotForm.targetKey
            : `${slotForm.dayOfWeek}-${parsed.startMinuteOfDay}`,
        dayOfWeek: slotForm.dayOfWeek,
        startMinuteOfDay: parsed.startMinuteOfDay,
        endMinuteOfDay: parsed.endMinuteOfDay,
      });

      return next.sort(
        (left, right) =>
          left.dayOfWeek - right.dayOfWeek ||
          left.startMinuteOfDay - right.startMinuteOfDay,
      );
    });

    setSlotForm(null);
    setSlotSaveMessage(null);
  };

  const removeSlot = (slotKey: string) => {
    setDraftSlots((current) => current.filter((item) => item.key !== slotKey));
    setSlotSaveMessage(null);
  };

  const handleSaveSchedule = async () => {
    if (!availabilityData?.timezone) {
      setSlotSaveMessage(t("practitioner.availability.saveError"));
      return;
    }

    try {
      await replaceWeeklyAvailability.mutateAsync({
        timezone: availabilityData.timezone,
        slots: draftSlots.map((slot) => ({
          dayOfWeek: slot.dayOfWeek,
          startMinuteOfDay: slot.startMinuteOfDay,
          endMinuteOfDay: slot.endMinuteOfDay,
        })),
      });
      setSlotSaveMessage(t("practitioner.availability.saveSuccess"));
    } catch {
      setSlotSaveMessage(t("practitioner.availability.saveError"));
    }
  };

  const handleResetSchedule = () => {
    if (!availabilityData) {
      return;
    }

    setDraftSlots(buildDraftSlots(availabilityData));
    setSlotForm(null);
    setSlotSaveMessage(null);
  };

  const handleCreateException = async () => {
    const validated = validateExceptionForm(exceptionForm, t);
    if (!validated.ok) {
      setExceptionForm((current) => ({ ...current, error: validated.error }));
      return;
    }

    try {
      await createException.mutateAsync({
        type: exceptionForm.type,
        startsAt: validated.startsAt,
        endsAt: validated.endsAt,
        reason: exceptionForm.reason.trim() || undefined,
      });
      setExceptionFormOpen(false);
      setExceptionForm(EMPTY_EXCEPTION_FORM);
      setExceptionMessage(t("practitioner.availability.exceptionSaveSuccess"));
    } catch {
      setExceptionMessage(t("practitioner.availability.exceptionSaveError"));
    }
  };

  const handleDeleteException = async (exception: AvailabilityException) => {
    try {
      await deleteException.mutateAsync(exception.id);
      setExceptionMessage(t("practitioner.availability.exceptionDeleteSuccess"));
    } catch {
      setExceptionMessage(t("practitioner.availability.exceptionDeleteError"));
    }
  };

  const currentStatus = presenceQuery.data?.presence.status ?? null;
  const instantBookingEnabled =
    presenceQuery.data?.presence.isInstantBookingEnabled ?? false;

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
            <Card variant="outlined" padding="lg" style={styles.sectionCard}>
              <Text weight="600" style={styles.sectionTitle}>
                {t("practitioner.availability.overviewTitle")}
              </Text>
              <Text
                color={theme.colors.textSecondary}
                style={styles.sectionBody}
              >
                {t("practitioner.availability.overviewBody")}
              </Text>

              <View style={styles.summaryList}>
                <SummaryRow
                  label={t("practitioner.availability.currentStatus")}
                  value={
                    currentStatus
                      ? t(`practitioner.presence.status.${currentStatus}`)
                      : "-"
                  }
                  theme={theme}
                />
                <SummaryRow
                  label={t("practitioner.availability.weeklyWindows")}
                  value={formatCount(activeSlots, locale)}
                  theme={theme}
                />
                <SummaryRow
                  label={t("practitioner.availability.temporaryChanges")}
                  value={formatCount(activeExceptions.length, locale)}
                  theme={theme}
                />
              </View>

              <View
                style={[
                  styles.badgeRow,
                  { flexDirection: rowDirection },
                ]}
              >
                {availabilityData.timezone ? (
                  <View
                    style={[
                      styles.badge,
                      {
                        backgroundColor: theme.colors.surfaceSecondary,
                        borderColor: theme.colors.borderLight,
                      },
                    ]}
                  >
                    <Text color={theme.colors.textSecondary} style={styles.badgeText}>
                      {formatTimezoneLabel(availabilityData.timezone, i18n.language)}
                    </Text>
                  </View>
                ) : null}
              </View>

              {!availabilityData.timezone ? (
                <View
                  style={[
                    styles.warningBox,
                    {
                      backgroundColor: theme.colors.warningLight ?? "#FEF3C7",
                      borderColor: theme.colors.warning ?? "#F59E0B",
                    },
                  ]}
                >
                  <Text weight="600" color={theme.colors.warning ?? "#B45309"}>
                    {t("practitioner.availability.noTimezone")}
                  </Text>
                </View>
              ) : null}
            </Card>

            <Card variant="outlined" padding="lg" style={styles.sectionCard}>
              <Text weight="600" style={styles.sectionTitle}>
                {t("practitioner.availability.presenceTitle")}
              </Text>
              <Text
                color={theme.colors.textSecondary}
                style={styles.sectionBody}
              >
                {t("practitioner.availability.presenceBody")}
              </Text>

              <View
                style={[
                  styles.currentStateBox,
                  {
                    backgroundColor: theme.colors.surfaceSecondary,
                    borderColor: theme.colors.borderLight,
                  },
                ]}
              >
                <Text color={theme.colors.textMuted} style={styles.eyebrow}>
                  {t("practitioner.availability.currentStatus")}
                </Text>
                <Text weight="600" style={styles.currentStatusValue}>
                  {currentStatus
                    ? t(`practitioner.presence.status.${currentStatus}`)
                    : "-"}
                </Text>
                <Text
                  color={theme.colors.textSecondary}
                  style={styles.helperText}
                >
                  {t("practitioner.availability.presenceBody")}
                </Text>
              </View>

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
                        color={
                          active
                            ? theme.colors.primary
                            : theme.colors.textSecondary
                        }
                        weight="600"
                        style={styles.statusChipLabel}
                      >
                        {t(`practitioner.presence.status.${status}`)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View
                style={[
                  styles.instantRow,
                  {
                    flexDirection: rowDirection,
                    borderTopColor: theme.colors.borderLight,
                  },
                ]}
              >
                <View style={styles.instantTextWrap}>
                  <Text weight="600">{t("practitioner.availability.instantBooking")}</Text>
                  <Text
                    color={theme.colors.textSecondary}
                    style={styles.instantBody}
                  >
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
                      {
                        alignSelf: instantBookingEnabled
                          ? "flex-end"
                          : "flex-start",
                      },
                    ]}
                  />
                </TouchableOpacity>
              </View>
            </Card>

            <Card variant="outlined" padding="lg" style={styles.sectionCard}>
              <Text weight="600" style={styles.sectionTitle}>
                {t("practitioner.availability.scheduleTitle")}
              </Text>
              <Text
                color={theme.colors.textSecondary}
                style={styles.sectionBody}
              >
                {t("practitioner.availability.scheduleBody")}
              </Text>

              <View
                style={[
                  styles.timezoneRow,
                  {
                    backgroundColor: theme.colors.surfaceSecondary,
                    borderColor: theme.colors.borderLight,
                    flexDirection: rowDirection,
                  },
                ]}
              >
                <Text color={theme.colors.textMuted} style={styles.eyebrow}>
                  {t("practitioner.availability.timezoneLabel")}
                </Text>
                <Text weight="600" style={styles.timezoneValue}>
                  {formatTimezoneLabel(availabilityData.timezone, i18n.language)}
                </Text>
              </View>

              <View style={styles.dayList}>
                {groupedDraftSlots.map((day) => {
                  const isEditingThisDay =
                    slotForm?.dayOfWeek === day.dayOfWeek;
                  return (
                    <View
                      key={day.weekday}
                      style={[
                        styles.dayCard,
                        {
                          borderColor: theme.colors.borderLight,
                          backgroundColor: theme.colors.surface,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.dayHeader,
                          { flexDirection: rowDirection },
                        ]}
                      >
                        <View style={styles.dayHeaderText}>
                          <Text weight="600" style={styles.dayTitle}>
                            {t(`practitioner.weekday.${day.weekday}`)}
                          </Text>
                          <Text
                            color={theme.colors.textSecondary}
                            style={styles.daySubtitle}
                          >
                            {describeDaySlots(day.slots, locale, t)}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={[
                            styles.inlineAction,
                            {
                              borderColor: theme.colors.borderLight,
                              backgroundColor: theme.colors.surfaceSecondary,
                            },
                          ]}
                          onPress={() =>
                            isEditingThisDay
                              ? cancelSlotForm()
                              : openAddSlot(day.dayOfWeek)
                          }
                          disabled={replaceWeeklyAvailability.isPending}
                        >
                          <Text color={theme.colors.textSecondary} weight="600">
                            {isEditingThisDay
                              ? t("common.cancel")
                              : day.slots.length
                                ? t("practitioner.availability.editSlot")
                                : t("practitioner.availability.addSlot")}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {day.slots.length ? (
                        <View style={styles.slotList}>
                          {day.slots.map((slot) => (
                            <View
                              key={slot.key}
                              style={[
                                styles.slotRow,
                                {
                                  backgroundColor:
                                    theme.colors.surfaceSecondary,
                                  flexDirection: rowDirection,
                                },
                              ]}
                            >
                              <View style={styles.slotTextWrap}>
                                <Text weight="600">
                                  {t("practitioner.availability.slotRange", {
                                    start: formatMinutes(
                                      slot.startMinuteOfDay,
                                      locale,
                                    ),
                                    end: formatMinutes(
                                      slot.endMinuteOfDay,
                                      locale,
                                    ),
                                  })}
                                </Text>
                              </View>
                              <View style={styles.slotActions}>
                                <TouchableOpacity
                                  style={styles.slotActionButton}
                                  onPress={() => openEditSlot(slot)}
                                  disabled={replaceWeeklyAvailability.isPending}
                                >
                                  <Text
                                    color={theme.colors.primary}
                                    weight="600"
                                  >
                                    {t("practitioner.availability.editSlot")}
                                  </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={styles.slotActionButton}
                                  onPress={() => removeSlot(slot.key)}
                                  disabled={replaceWeeklyAvailability.isPending}
                                >
                                  <Text color={theme.colors.error} weight="600">
                                    {t("practitioner.availability.removeSlot")}
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          ))}
                        </View>
                      ) : null}

                      {isEditingThisDay ? (
                        <View
                          style={[
                            styles.editorBox,
                            {
                              backgroundColor: theme.colors.surfaceSecondary,
                              borderColor: theme.colors.borderLight,
                            },
                          ]}
                        >
                          <Input
                            label={t("practitioner.availability.startTime")}
                            value={slotForm?.startTime ?? ""}
                            onChangeText={(value) =>
                              setSlotForm((current) =>
                                current
                                  ? { ...current, startTime: value, error: null }
                                  : current,
                              )
                            }
                            placeholder="09:00"
                            helperText={t("practitioner.availability.timeHint")}
                            autoCapitalize="none"
                            autoCorrect={false}
                            keyboardType="numbers-and-punctuation"
                            maxLength={5}
                            style={styles.timeInput}
                          />
                          <Input
                            label={t("practitioner.availability.endTime")}
                            value={slotForm?.endTime ?? ""}
                            onChangeText={(value) =>
                              setSlotForm((current) =>
                                current
                                  ? { ...current, endTime: value, error: null }
                                  : current,
                              )
                            }
                            placeholder="17:00"
                            error={slotForm?.error ?? undefined}
                            autoCapitalize="none"
                            autoCorrect={false}
                            keyboardType="numbers-and-punctuation"
                            maxLength={5}
                            style={styles.timeInput}
                          />

                          <View style={styles.editorActions}>
                            <Button
                              title={t("practitioner.availability.confirmSlot")}
                              onPress={() => saveSlotForm()}
                            />
                            <Button
                              title={t("common.cancel")}
                              variant="secondary"
                              onPress={() => cancelSlotForm()}
                            />
                          </View>
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>

              <View style={styles.footerActions}>
                <Button
                  title={
                    replaceWeeklyAvailability.isPending
                      ? t("practitioner.availability.saving")
                      : t("practitioner.availability.saveSchedule")
                  }
                  onPress={() => void handleSaveSchedule()}
                  disabled={
                    !availabilityData.timezone ||
                    !isDirty(availabilityData, draftSlots) ||
                    replaceWeeklyAvailability.isPending
                  }
                />
                <Button
                  title={t("practitioner.availability.resetChanges")}
                  variant="secondary"
                  onPress={() => handleResetSchedule()}
                  disabled={
                    !isDirty(availabilityData, draftSlots) ||
                    replaceWeeklyAvailability.isPending
                  }
                />
              </View>

              {slotSaveMessage ? (
                <Text
                  color={
                    slotSaveMessage ===
                    t("practitioner.availability.saveSuccess")
                      ? theme.colors.primary
                      : theme.colors.error
                  }
                  style={styles.helperText}
                >
                  {slotSaveMessage}
                </Text>
              ) : (
                <Text color={theme.colors.textMuted} style={styles.helperText}>
                  {t("practitioner.availability.saveHint")}
                </Text>
              )}
            </Card>

            <Card variant="outlined" padding="lg" style={styles.sectionCard}>
              <View style={styles.exceptionHeader}>
                <View style={styles.dayHeaderText}>
                  <Text weight="600" style={styles.sectionTitle}>
                    {t("practitioner.availability.exceptionsTitle")}
                  </Text>
                  <Text
                    color={theme.colors.textSecondary}
                    style={styles.sectionBody}
                  >
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
                    onPress={() => {
                      setExceptionFormOpen(true);
                      setExceptionMessage(null);
                    }}
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
                  <View
                    style={[
                      styles.typeRow,
                      { flexDirection: rowDirection },
                    ]}
                  >
                    {(["BLOCK", "OPEN_EXTRA"] as AvailabilityExceptionType[]).map(
                      (type) => {
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
                              color={
                                active
                                  ? theme.colors.primary
                                  : theme.colors.textSecondary
                              }
                              weight="600"
                              style={styles.typeChipLabel}
                            >
                              {t(
                                `practitioner.availability.exceptionType.${type}`,
                              )}
                            </Text>
                          </TouchableOpacity>
                        );
                      },
                    )}
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
                    placeholder="2026-04-25 14:00"
                    helperText={t("practitioner.availability.exceptionTimeHint")}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="numbers-and-punctuation"
                    maxLength={16}
                    style={styles.timeInput}
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
                    placeholder="2026-04-25 16:00"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="numbers-and-punctuation"
                    maxLength={16}
                    error={exceptionForm.error ?? undefined}
                    style={styles.timeInput}
                  />
                  <Input
                    label={t("practitioner.availability.exceptionReason")}
                    value={exceptionForm.reason}
                    onChangeText={(value) =>
                      setExceptionForm((current) => ({
                        ...current,
                        reason: value,
                      }))
                    }
                    placeholder={t(
                      "practitioner.availability.exceptionReasonPlaceholder",
                    )}
                  />

                  <View style={styles.editorActions}>
                    <Button
                      title={
                        createException.isPending
                          ? t("practitioner.availability.saving")
                          : t("practitioner.availability.saveException")
                      }
                      onPress={() => void handleCreateException()}
                    />
                    <Button
                      title={t("common.cancel")}
                      variant="secondary"
                      onPress={() => {
                        setExceptionFormOpen(false);
                        setExceptionForm(EMPTY_EXCEPTION_FORM);
                        setExceptionMessage(null);
                      }}
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
                          flexDirection: rowDirection,
                        },
                      ]}
                    >
                      <View style={styles.exceptionTextWrap}>
                        <View
                          style={[
                            styles.exceptionBadgeRow,
                            { flexDirection: rowDirection },
                          ]}
                        >
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
                              style={styles.exceptionBadgeText}
                            >
                              {t(
                                `practitioner.availability.exceptionType.${exception.type}`,
                              )}
                            </Text>
                          </View>
                          <Text
                            color={theme.colors.textSecondary}
                            style={styles.exceptionMeta}
                          >
                            {formatExceptionRange(exception.startsAt, exception.endsAt, locale)}
                          </Text>
                        </View>
                        {exception.reason ? (
                          <Text
                            color={theme.colors.textMuted}
                            style={styles.exceptionReason}
                          >
                            {exception.reason}
                          </Text>
                        ) : null}
                      </View>
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
                  ))}
                </View>
              ) : (
                <Text color={theme.colors.textSecondary}>
                  {t("practitioner.availability.emptyExceptions")}
                </Text>
              )}

              {exceptionMessage ? (
                <Text
                  color={
                    exceptionMessage ===
                      t("practitioner.availability.exceptionSaveSuccess") ||
                    exceptionMessage ===
                      t("practitioner.availability.exceptionDeleteSuccess")
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

function SummaryRow({
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
        styles.summaryRow,
        {
          backgroundColor: theme.colors.surfaceSecondary,
          borderColor: theme.colors.borderLight,
        },
      ]}
    >
      <Text color={theme.colors.textMuted} style={styles.summaryLabel}>
        {label}
      </Text>
      <Text weight="600" style={styles.summaryValue}>
        {value}
      </Text>
    </View>
  );
}

function describeDaySlots(
  slots: DraftSlot[],
  locale: string,
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  if (!slots.length) {
    return t("practitioner.availability.noSlots");
  }

  return slots
    .map((slot) =>
      t("practitioner.availability.slotRange", {
        start: formatMinutes(slot.startMinuteOfDay, locale),
        end: formatMinutes(slot.endMinuteOfDay, locale),
      }),
    )
    .join(" · ");
}

function buildDraftSlots(data: AvailabilityData): DraftSlot[] {
  return data.weeklySlots
    .filter((slot) => slot.isActive)
    .map((slot) => ({
      key: slot.id,
      dayOfWeek: slot.dayOfWeek,
      startMinuteOfDay: slot.startMinuteOfDay,
      endMinuteOfDay: slot.endMinuteOfDay,
    }))
    .sort(
      (left, right) =>
        left.dayOfWeek - right.dayOfWeek ||
        left.startMinuteOfDay - right.startMinuteOfDay,
    );
}

function isDirty(data: AvailabilityData | null, draftSlots: DraftSlot[]) {
  if (!data) {
    return false;
  }

  const source = buildDraftSlots(data).map(serializeSlot).sort();
  const current = draftSlots.map(serializeSlot).sort();
  return source.join("|") !== current.join("|");
}

function serializeSlot(slot: DraftSlot) {
  return `${slot.dayOfWeek}:${slot.startMinuteOfDay}:${slot.endMinuteOfDay}`;
}

function minutesToTime(minutes: number, locale: string) {
  const rawHour = Math.floor(minutes / 60);
  const rawMinute = minutes % 60;
  const hour = String(rawHour).padStart(2, "0");
  const minute = String(rawMinute).padStart(2, "0");
  return `${hour}:${minute}`;
}

function formatMinutes(minutes: number, locale: string) {
  return minutesToTime(minutes, locale);
}

function parseTimeToMinutes(value: string) {
  const trimmed = normalizeDigits(value.trim());
  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  if (hours < 0 || hours > 24 || minutes < 0 || minutes > 59) {
    return null;
  }

  if (hours === 24 && minutes !== 0) {
    return null;
  }

  return hours * 60 + minutes;
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

  if (
    [year, month, day, hours, minutes].some((part) => Number.isNaN(part))
  ) {
    return null;
  }

  const date = new Date(year, month - 1, day, hours, minutes);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
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

function validateSlotForm(
  slotForm: SlotFormState,
  draftSlots: DraftSlot[],
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  const startMinuteOfDay = parseTimeToMinutes(slotForm.startTime);
  const endMinuteOfDay = parseTimeToMinutes(slotForm.endTime);

  if (startMinuteOfDay === null || endMinuteOfDay === null) {
    return {
      ok: false as const,
      error: t("practitioner.availability.validation.invalidTime"),
    };
  }

  if (endMinuteOfDay <= startMinuteOfDay) {
    return {
      ok: false as const,
      error: t("practitioner.availability.validation.endAfterStart"),
    };
  }

  const compareSlots = draftSlots.filter(
    (slot) =>
      slot.dayOfWeek === slotForm.dayOfWeek &&
      slot.key !== slotForm.targetKey,
  );

  const overlaps = compareSlots.some(
    (slot) =>
      startMinuteOfDay < slot.endMinuteOfDay &&
      endMinuteOfDay > slot.startMinuteOfDay,
  );

  if (overlaps) {
    return {
      ok: false as const,
      error: t("practitioner.availability.validation.overlap"),
    };
  }

  return {
    ok: true as const,
    startMinuteOfDay,
    endMinuteOfDay,
  };
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

  return {
    ok: true as const,
    startsAt,
    endsAt,
  };
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

  return `${formatter.format(new Date(isoStart))} — ${formatter.format(
    new Date(isoEnd),
  )}`;
}

function formatCount(count: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    useGrouping: false,
  }).format(count);
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
    return `${arabicMap[cityToken as keyof typeof arabicMap] ?? cityToken}`;
  }

  return cityToken;
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 28,
    gap: 14,
  },
  sectionCard: {
    gap: 14,
  },
  sectionTitle: {
    fontSize: 18,
  },
  sectionBody: {
    lineHeight: 22,
  },
  summaryList: {
    gap: 10,
  },
  summaryRow: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  summaryLabel: {
    fontSize: 12,
  },
  summaryValue: {
    fontSize: 16,
  },
  badgeRow: {
    flexWrap: "wrap",
    gap: 8,
  },
  badge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  badgeText: {
    fontSize: 12,
  },
  warningBox: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  currentStateBox: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 6,
  },
  eyebrow: {
    fontSize: 12,
  },
  currentStatusValue: {
    fontSize: 18,
  },
  helperText: {
    lineHeight: 20,
  },
  statusGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statusChip: {
    flexBasis: "48%",
    minHeight: 58,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  statusChipLabel: {
    textAlign: "center",
  },
  instantRow: {
    marginTop: 2,
    paddingTop: 14,
    borderTopWidth: 1,
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  instantTextWrap: {
    flex: 1,
  },
  instantBody: {
    marginTop: 4,
    lineHeight: 20,
  },
  toggle: {
    width: 56,
    borderRadius: 999,
    padding: 4,
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 999,
    backgroundColor: "#ffffff",
  },
  timezoneRow: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  timezoneValue: {
    fontSize: 14,
  },
  dayList: {
    gap: 10,
  },
  dayCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 10,
  },
  dayHeader: {
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  dayHeaderText: {
    flex: 1,
    gap: 4,
  },
  dayTitle: {
    fontSize: 16,
  },
  daySubtitle: {
    lineHeight: 20,
  },
  inlineAction: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  slotList: {
    gap: 8,
  },
  slotRow: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  slotTextWrap: {
    flex: 1,
    gap: 4,
  },
  slotActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  slotActionButton: {
    paddingVertical: 2,
  },
  editorBox: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 10,
  },
  editorActions: {
    gap: 10,
  },
  footerActions: {
    gap: 10,
  },
  exceptionHeader: {
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  typeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 4,
  },
  typeChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  typeChipLabel: {
    textAlign: "center",
  },
  exceptionList: {
    gap: 10,
  },
  exceptionRow: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  exceptionTextWrap: {
    flex: 1,
    gap: 8,
  },
  exceptionBadgeRow: {
    gap: 8,
    flexWrap: "wrap",
    alignItems: "center",
  },
  exceptionBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  exceptionBadgeText: {
    fontSize: 12,
  },
  exceptionMeta: {
    fontSize: 13,
  },
  exceptionReason: {
    lineHeight: 20,
  },
  timeInput: {
    textAlign: "center",
  },
});
