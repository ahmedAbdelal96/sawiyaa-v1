import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
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

export default function PractitionerAvailabilityScreen() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US";

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
  const [exceptionForm, setExceptionForm] = useState<ExceptionFormState>({
    type: "BLOCK",
    startsAt: "",
    endsAt: "",
    reason: "",
    error: null,
  });
  const [exceptionMessage, setExceptionMessage] = useState<string | null>(null);

  const hasLoadError = presenceQuery.isError || availabilityQuery.isError;
  const availabilityData = availabilityQuery.data ?? null;

  useEffect(() => {
    if (!availabilityData) {
      return;
    }

    setDraftSlots(buildDraftSlots(availabilityData));
    setSlotForm(null);
    setSlotSaveMessage(null);
    setExceptionMessage(null);
    setExceptionForm({
      type: "BLOCK",
      startsAt: "",
      endsAt: "",
      reason: "",
      error: null,
    });
  }, [
    availabilityData?.weeklySlots,
    availabilityData?.exceptions,
    availabilityData?.timezone,
  ]);

  const isDirty = useMemo(() => {
    if (!availabilityData) {
      return false;
    }

    const source = buildDraftSlots(availabilityData).map(serializeSlot).sort();
    const current = draftSlots.map(serializeSlot).sort();

    return source.join("|") !== current.join("|");
  }, [availabilityData, draftSlots]);

  const groupedDraftSlots = useMemo(() => {
    return DAY_KEYS.map((weekday, dayOfWeek) => ({
      weekday,
      dayOfWeek,
      slots: draftSlots
        .filter((slot) => slot.dayOfWeek === dayOfWeek)
        .sort((left, right) => left.startMinuteOfDay - right.startMinuteOfDay),
    }));
  }, [draftSlots]);

  const activeExceptions = useMemo(() => {
    return (availabilityData?.exceptions ?? []).filter((item) => item.isActive);
  }, [availabilityData?.exceptions]);

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
      startTime: minutesToTime(slot.startMinuteOfDay),
      endTime: minutesToTime(slot.endMinuteOfDay),
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
        current
          ? {
              ...current,
              error: parsed.error,
            }
          : current,
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
      return;
    }

    setSlotSaveMessage(null);
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

    setExceptionMessage(null);
    try {
      await createException.mutateAsync({
        type: exceptionForm.type,
        startsAt: validated.startsAt,
        endsAt: validated.endsAt,
        reason: exceptionForm.reason.trim() || undefined,
      });
      setExceptionFormOpen(false);
      setExceptionForm({
        type: "BLOCK",
        startsAt: "",
        endsAt: "",
        reason: "",
        error: null,
      });
      setExceptionMessage(t("practitioner.availability.exceptionSaveSuccess"));
    } catch {
      setExceptionMessage(t("practitioner.availability.exceptionSaveError"));
    }
  };

  const handleDeleteException = async (exception: AvailabilityException) => {
    setExceptionMessage(null);
    try {
      await deleteException.mutateAsync(exception.id);
      setExceptionMessage(
        t("practitioner.availability.exceptionDeleteSuccess"),
      );
    } catch {
      setExceptionMessage(t("practitioner.availability.exceptionDeleteError"));
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
                  { backgroundColor: theme.colors.surfaceSecondary },
                ]}
              >
                <Text color={theme.colors.textMuted} style={styles.eyebrow}>
                  {t("practitioner.availability.currentStatus")}
                </Text>
                <Text weight="600" style={styles.currentStatusValue}>
                  {t(
                    `practitioner.presence.status.${presenceQuery.data.presence.status}`,
                  )}
                </Text>
                <Text
                  color={theme.colors.textSecondary}
                  style={styles.helperText}
                >
                  {presenceQuery.data.presence.isInstantBookingEnabled
                    ? t("practitioner.availability.instantBookingEnabled")
                    : t("practitioner.availability.instantBookingDisabled")}
                </Text>
              </View>

              <View style={styles.statusGrid}>
                {STATUS_OPTIONS.map((status) => {
                  const active = presenceQuery.data?.presence.status === status;
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
                  { borderTopColor: theme.colors.borderLight },
                ]}
              >
                <View style={styles.instantTextWrap}>
                  <Text weight="600">
                    {t("practitioner.availability.instantBooking")}
                  </Text>
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
                      backgroundColor: presenceQuery.data?.presence
                        .isInstantBookingEnabled
                        ? theme.colors.primary
                        : theme.colors.borderLight,
                    },
                  ]}
                  disabled={setInstantBooking.isPending}
                  onPress={() =>
                    setInstantBooking.mutate({
                      isInstantBookingEnabled:
                        !presenceQuery.data?.presence.isInstantBookingEnabled,
                    })
                  }
                >
                  <View
                    style={[
                      styles.toggleKnob,
                      {
                        alignSelf: presenceQuery.data?.presence
                          .isInstantBookingEnabled
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
                  styles.currentStateBox,
                  { backgroundColor: theme.colors.surfaceSecondary },
                ]}
              >
                <Text color={theme.colors.textMuted} style={styles.eyebrow}>
                  {t("practitioner.availability.timezoneLabel")}
                </Text>
                <Text weight="600" style={styles.currentStatusValue}>
                  {formatTimezoneLabel(
                    availabilityData.timezone,
                    i18n.language,
                  )}
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
                        { borderColor: theme.colors.borderLight },
                      ]}
                    >
                      <View style={styles.dayHeader}>
                        <View style={styles.dayHeaderText}>
                          <Text weight="600" style={styles.dayTitle}>
                            {t(`practitioner.weekday.${day.weekday}`)}
                          </Text>
                          <Text color={theme.colors.textMuted}>
                            {day.slots.length
                              ? t("practitioner.availability.slotCount", {
                                  count: day.slots.length,
                                })
                              : t("practitioner.availability.noSlots")}
                          </Text>
                        </View>
                        {!isEditingThisDay ? (
                          <TouchableOpacity
                            style={[
                              styles.addChip,
                              { borderColor: theme.colors.borderLight },
                            ]}
                            onPress={() => openAddSlot(day.dayOfWeek)}
                            disabled={replaceWeeklyAvailability.isPending}
                          >
                            <Text
                              color={theme.colors.textSecondary}
                              weight="600"
                            >
                              {t("practitioner.availability.addSlot")}
                            </Text>
                          </TouchableOpacity>
                        ) : null}
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
                            { backgroundColor: theme.colors.surfaceSecondary },
                          ]}
                        >
                          <Input
                            label={t("practitioner.availability.startTime")}
                            value={slotForm.startTime}
                            onChangeText={(value) =>
                              setSlotForm((current) =>
                                current
                                  ? {
                                      ...current,
                                      startTime: value,
                                      error: null,
                                    }
                                  : current,
                              )
                            }
                            placeholder="09:00"
                            helperText={t("practitioner.availability.timeHint")}
                            autoCapitalize="none"
                            autoCorrect={false}
                          />
                          <Input
                            label={t("practitioner.availability.endTime")}
                            value={slotForm.endTime}
                            onChangeText={(value) =>
                              setSlotForm((current) =>
                                current
                                  ? { ...current, endTime: value, error: null }
                                  : current,
                              )
                            }
                            placeholder="17:00"
                            error={slotForm.error ?? undefined}
                            autoCapitalize="none"
                            autoCorrect={false}
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
                    !isDirty ||
                    replaceWeeklyAvailability.isPending
                  }
                />
                <Button
                  title={t("practitioner.availability.resetChanges")}
                  variant="secondary"
                  onPress={() => handleResetSchedule()}
                  disabled={!isDirty || replaceWeeklyAvailability.isPending}
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
                      styles.addChip,
                      { borderColor: theme.colors.borderLight },
                    ]}
                    onPress={() => setExceptionFormOpen(true)}
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
                    { backgroundColor: theme.colors.surfaceSecondary },
                  ]}
                >
                  <View style={styles.typeRow}>
                    {(
                      ["BLOCK", "OPEN_EXTRA"] as AvailabilityExceptionType[]
                    ).map((type) => {
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
                          >
                            {t(
                              `practitioner.availability.exceptionType.${type}`,
                            )}
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
                    helperText={t(
                      "practitioner.availability.exceptionTimeHint",
                    )}
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
                    autoCapitalize="none"
                    autoCorrect={false}
                    error={exceptionForm.error ?? undefined}
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
                      disabled={createException.isPending}
                    />
                    <Button
                      title={t("common.cancel")}
                      variant="secondary"
                      onPress={() => setExceptionFormOpen(false)}
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
                        { backgroundColor: theme.colors.surfaceSecondary },
                      ]}
                    >
                      <View style={styles.exceptionTextWrap}>
                        <Text weight="600">
                          {t(
                            `practitioner.availability.exceptionType.${exception.type}`,
                          )}
                        </Text>
                        <Text
                          color={theme.colors.textSecondary}
                          style={styles.exceptionMeta}
                        >
                          {t("practitioner.availability.exceptionRange", {
                            start: new Date(exception.startsAt).toLocaleString(
                              locale,
                              {
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                                hour12: !locale.startsWith("ar"),
                              },
                            ),
                            end: new Date(exception.endsAt).toLocaleString(
                              locale,
                              {
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                                hour12: !locale.startsWith("ar"),
                              },
                            ),
                          })}
                        </Text>
                        {exception.reason ? (
                          <Text
                            color={theme.colors.textMuted}
                            style={styles.exceptionMeta}
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

function serializeSlot(slot: DraftSlot) {
  return `${slot.dayOfWeek}:${slot.startMinuteOfDay}:${slot.endMinuteOfDay}`;
}

function minutesToTime(minutes: number) {
  const hour = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const minute = (minutes % 60).toString().padStart(2, "0");
  return `${hour}:${minute}`;
}

function parseTimeToMinutes(value: string) {
  const trimmed = value.trim();
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
      slot.dayOfWeek === slotForm.dayOfWeek && slot.key !== slotForm.targetKey,
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
  form: ExceptionFormState,
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  if (!form.startsAt.trim() || !form.endsAt.trim()) {
    return {
      ok: false as const,
      error: t("practitioner.availability.validation.exceptionDatesRequired"),
    };
  }

  const startsAt = normalizeLocalDateTime(form.startsAt);
  const endsAt = normalizeLocalDateTime(form.endsAt);

  if (!startsAt || !endsAt) {
    return {
      ok: false as const,
      error: t("practitioner.availability.validation.invalidDateTime"),
    };
  }

  if (new Date(endsAt) <= new Date(startsAt)) {
    return {
      ok: false as const,
      error: t("practitioner.availability.validation.endAfterStart"),
    };
  }

  return {
    ok: true as const,
    startsAt,
    endsAt,
  };
}

function normalizeLocalDateTime(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const normalized = trimmed.replace(" ", "T");
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(normalized)) {
    return null;
  }

  return `${normalized}:00Z`;
}

function formatMinutes(minutes: number, locale: string) {
  const date = new Date();
  date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return date.toLocaleTimeString(locale, {
    hour: "numeric",
    minute: "2-digit",
    hour12: !locale.startsWith("ar"),
  });
}

function formatTimezoneLabel(timezone: string | null, language: string) {
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
    paddingBottom: 24,
    gap: 14,
  },
  sectionCard: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
  },
  sectionBody: {
    lineHeight: 22,
  },
  currentStateBox: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  eyebrow: {
    fontSize: 12,
  },
  currentStatusValue: {
    fontSize: 16,
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
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  instantRow: {
    marginTop: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    flexDirection: "row",
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
    width: 54,
    borderRadius: 999,
    padding: 4,
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 999,
    backgroundColor: "#ffffff",
  },
  dayList: {
    gap: 10,
  },
  dayCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    gap: 10,
  },
  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  dayHeaderText: {
    flex: 1,
    gap: 2,
  },
  dayTitle: {
    fontSize: 16,
  },
  addChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  slotList: {
    gap: 8,
  },
  slotRow: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  slotTextWrap: {
    gap: 4,
  },
  slotActions: {
    flexDirection: "row",
    gap: 16,
  },
  slotActionButton: {
    paddingVertical: 2,
  },
  editorBox: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  editorActions: {
    gap: 10,
  },
  footerActions: {
    gap: 10,
  },
  exceptionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
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
  exceptionList: {
    gap: 8,
  },
  exceptionRow: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  exceptionTextWrap: {
    gap: 4,
  },
  exceptionMeta: {
    fontSize: 13,
  },
});
