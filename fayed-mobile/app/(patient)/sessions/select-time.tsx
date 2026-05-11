import React, { useEffect, useMemo, useRef, useState } from "react";
import { Image, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Header, Screen, Text, Card, Button } from "../../../src/components/ui";
import { useTheme } from "../../../src/providers/ThemeProvider";
import { usePublicAvailabilityWindows } from "../../../src/features/patient/sessions/hooks";
import {
  buildSlotsFromWindows,
  formatLocalizedDateRange,
  formatLocalizedTime,
  getWeekRange,
  groupSlotsByDay,
  splitDaySlotsByPart,
} from "../../../src/features/patient/sessions/slot-utils";
import { trackAnalyticsEvent } from "../../../src/lib/analytics";

export default function SelectSessionTimeScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language?.startsWith("ar") ?? false;
  const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US";
  const params = useLocalSearchParams<{
    slug: string;
    practitionerName?: string;
    practitionerTitle?: string;
    practitionerAvatarUrl?: string;
  }>();

  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [selectedSlotStartAt, setSelectedSlotStartAt] = useState<string | null>(
    null,
  );
  const [selectedSlotMaxDuration, setSelectedSlotMaxDuration] = useState<
    30 | 60
  >(60);
  const continueLockRef = useRef(false);

  const weekRange = useMemo(() => getWeekRange(weekOffset), [weekOffset]);
  const windowsQuery = usePublicAvailabilityWindows(
    params.slug ?? null,
    weekRange.fromIso,
    weekRange.toIso,
  );

  const dayGroups = useMemo(() => {
    const windows = windowsQuery.data?.windows ?? [];
    const slots = buildSlotsFromWindows(windows);
    return groupSlotsByDay(slots, locale);
  }, [windowsQuery.data, locale]);

  useEffect(() => {
    if (dayGroups.length === 0) {
      if (selectedDayKey !== null) {
        setSelectedDayKey(null);
      }
      if (selectedSlotStartAt !== null) {
        setSelectedSlotStartAt(null);
      }
      return;
    }

    const currentDay = dayGroups.find(
      (group) => group.dayKey === selectedDayKey,
    );

    if (!currentDay) {
      const firstDay = dayGroups[0];
      const firstSlot = firstDay.slots[0] ?? null;
      setSelectedDayKey(firstDay.dayKey);
      setSelectedSlotStartAt(firstSlot?.startsAt ?? null);
      if (firstSlot) {
        setSelectedSlotMaxDuration(firstSlot.maxDuration);
      }
      return;
    }

    if (
      !selectedSlotStartAt ||
      !currentDay.slots.some((slot) => slot.startsAt === selectedSlotStartAt)
    ) {
      const firstSlot = currentDay.slots[0] ?? null;
      setSelectedSlotStartAt(firstSlot?.startsAt ?? null);
      if (firstSlot) {
        setSelectedSlotMaxDuration(firstSlot.maxDuration);
      }
    }
  }, [dayGroups, selectedDayKey, selectedSlotStartAt]);

  const selectedDay =
    dayGroups.find((group) => group.dayKey === selectedDayKey) ??
    dayGroups[0] ??
    null;

  const selectedSlot = selectedDay?.slots.find(
    (slot) => slot.startsAt === selectedSlotStartAt,
  );

  const parts = splitDaySlotsByPart(selectedDay?.slots ?? []);

  const selectedSlotLabel = selectedSlot
    ? `${selectedDay?.dayLabel ?? ""} • ${formatLocalizedTime(selectedSlot.startsAt, locale)}`
    : t("patientSessionsFlow.selectTime.noSelectedSlot");

  const continueToConfirmation = () => {
    if (continueLockRef.current || !selectedDay || !selectedSlot) {
      return;
    }

    continueLockRef.current = true;

    router.push({
      pathname: "/(patient)/sessions/confirm",
      params: {
        slug: params.slug,
        practitionerName: params.practitionerName,
        practitionerTitle: params.practitionerTitle,
        practitionerAvatarUrl: params.practitionerAvatarUrl,
        selectedStartAt: selectedSlot.startsAt,
        maxDuration: String(selectedSlot.maxDuration),
      },
    });
  };

  const handleSelectSlot = (
    startAt: string,
    maxDuration: 30 | 60,
  ) => {
    trackAnalyticsEvent("slot_selected", {
      practitionerSlug: params.slug || undefined,
      dayKey: selectedDay?.dayKey || undefined,
      selectedStartAt: startAt,
      maxDuration,
      weekOffset,
    });
    setSelectedSlotStartAt(startAt);
    setSelectedSlotMaxDuration(maxDuration);
  };

  return (
    <Screen bg="background">
      <Header
        showBack
        title={t("patientSessionsFlow.selectTime.title")}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card
          variant="elevated"
          padding="md"
          style={[
            styles.practitionerCard,
            isRtl
              ? {
                  borderLeftWidth: 3,
                  borderLeftColor: theme.colors.primary,
                  borderRightWidth: 0,
                }
              : { borderRightColor: theme.colors.primary },
          ]}
        >
          <View style={styles.practitionerHeaderRow}>
            <View
              style={[
                styles.avatarWrap,
                { backgroundColor: theme.colors.surfaceTertiary },
              ]}
            >
              {params.practitionerAvatarUrl ? (
                <Image
                  source={{ uri: params.practitionerAvatarUrl }}
                  style={styles.avatar}
                />
              ) : (
                <Ionicons
                  name="person"
                  size={28}
                  color={theme.colors.textMuted}
                />
              )}
            </View>
            <View style={styles.practitionerTextCol}>
              <Text weight="600" style={styles.practitionerName}>
                {params.practitionerName ??
                  t("patientSessionsFlow.common.practitionerFallback")}
              </Text>
              <Text
                color={theme.colors.textSecondary}
                style={styles.practitionerTitle}
              >
                {params.practitionerTitle ??
                  t("patientSessionsFlow.common.professionalFallback")}
              </Text>
            </View>
          </View>
        </Card>

        <View style={styles.monthRow}>
          <Text weight="600" style={styles.monthLabel}>
            {formatLocalizedDateRange(
              weekRange.fromIso,
              weekRange.toIso,
              locale,
            )}
          </Text>
          <View style={styles.weekNavRow}>
            <TouchableOpacity
              disabled={weekOffset === 0}
              onPress={() => setWeekOffset((prev) => Math.max(0, prev - 1))}
              style={[
                styles.navButton,
                { opacity: weekOffset === 0 ? 0.35 : 1 },
              ]}
            >
              <Ionicons
                name={isRtl ? "chevron-forward" : "chevron-back"}
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setWeekOffset((prev) => prev + 1)}
              style={styles.navButton}
            >
              <Ionicons
                name={isRtl ? "chevron-back" : "chevron-forward"}
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {windowsQuery.isLoading ? (
          <Card variant="flat" padding="md">
            <Text color={theme.colors.textSecondary}>
              {t("patientSessionsFlow.common.loading")}
            </Text>
          </Card>
        ) : windowsQuery.isError ? (
          <Card variant="flat" padding="md">
            <Text color={theme.colors.textSecondary}>
              {t("patientSessionsFlow.common.loadError")}
            </Text>
            <Button
              title={t("patientSessionsFlow.common.retry")}
              onPress={() => windowsQuery.refetch()}
              style={styles.retryButton}
            />
          </Card>
        ) : dayGroups.length === 0 ? (
          <Card variant="flat" padding="md">
            <Text color={theme.colors.textSecondary}>
              {t("patientSessionsFlow.selectTime.noSlots")}
            </Text>
          </Card>
        ) : (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.daysRow}
            >
              {dayGroups.map((group) => {
                const selected = selectedDay?.dayKey === group.dayKey;
                return (
                  <TouchableOpacity
                    key={group.dayKey}
                    onPress={() => {
                      setSelectedDayKey(group.dayKey);
                      const firstSlot = group.slots[0] ?? null;
                      setSelectedSlotStartAt(firstSlot?.startsAt ?? null);
                      if (firstSlot) {
                        setSelectedSlotMaxDuration(firstSlot.maxDuration);
                      }
                    }}
                    style={[
                      styles.dayCard,
                      {
                        backgroundColor: selected
                          ? theme.colors.primary
                          : theme.colors.surface,
                        borderColor: selected
                          ? theme.colors.primary
                          : theme.colors.borderLight,
                      },
                    ]}
                  >
                    <Text
                      color={selected ? "#ffffff" : theme.colors.textSecondary}
                      style={styles.dayLabel}
                    >
                      {group.dayLabel}
                    </Text>
                    <Text
                      weight="600"
                      color={selected ? "#ffffff" : theme.colors.textPrimary}
                      style={styles.dayCount}
                    >
                      {group.slots.length}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.slotSectionsWrap}>
              <SlotSection
                title={t("patientSessionsFlow.selectTime.morning")}
                icon="sunny-outline"
                slots={parts.morning}
                selectedSlotStartAt={selectedSlotStartAt}
                locale={locale}
                onSelectSlot={handleSelectSlot}
              />
              <SlotSection
                title={t("patientSessionsFlow.selectTime.afternoon")}
                icon="partly-sunny-outline"
                slots={parts.afternoon}
                selectedSlotStartAt={selectedSlotStartAt}
                locale={locale}
                onSelectSlot={handleSelectSlot}
              />
              <SlotSection
                title={t("patientSessionsFlow.selectTime.evening")}
                icon="moon-outline"
                slots={parts.evening}
                selectedSlotStartAt={selectedSlotStartAt}
                locale={locale}
                onSelectSlot={handleSelectSlot}
              />
            </View>

            <Text color={theme.colors.textMuted} style={styles.timezoneHint}>
              {t("patientSessionsFlow.selectTime.timezoneHint", {
                timezone:
                  windowsQuery.data?.timezone ??
                  t("patientSessionsFlow.common.unknown"),
              })}
            </Text>
            <Text color={theme.colors.textMuted} style={styles.selectionHint}>
              {selectedSlot
                ? t("patientSessionsFlow.selectTime.selectedSlot")
                : t("patientSessionsFlow.selectTime.noSelectedSlot")}
            </Text>
          </>
        )}
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.borderLight,
          },
        ]}
      >
        <Text color={theme.colors.textSecondary} style={styles.bottomLabel}>
          {t("patientSessionsFlow.selectTime.selectedSlot")}
        </Text>
        <Text
          weight="600"
          color={theme.colors.primary}
          style={styles.bottomValue}
        >
          {selectedSlotLabel}
        </Text>
        <Button
          title={t("patientSessionsFlow.selectTime.continue")}
          onPress={continueToConfirmation}
          disabled={!selectedSlot || !selectedDay || !params.slug}
          style={styles.ctaButton}
        />
      </View>
    </Screen>
  );
}

type SlotSectionProps = {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  slots: Array<{ startsAt: string; maxDuration: 30 | 60 }>;
  selectedSlotStartAt: string | null;
  locale: string;
  onSelectSlot: (startAt: string, maxDuration: 30 | 60) => void;
};

function SlotSection({
  title,
  icon,
  slots,
  selectedSlotStartAt,
  locale,
  onSelectSlot,
}: SlotSectionProps) {
  const { theme } = useTheme();

  if (slots.length === 0) {
    return null;
  }

  return (
    <View style={styles.slotSection}>
      <View style={styles.slotSectionTitleRow}>
        <Ionicons name={icon} size={18} color={theme.colors.textSecondary} />
        <Text
          color={theme.colors.textSecondary}
          weight="600"
          style={styles.slotSectionTitle}
        >
          {title}
        </Text>
      </View>
      <View style={styles.slotGrid}>
        {slots.map((slot) => {
          const selected = selectedSlotStartAt === slot.startsAt;
          return (
            <TouchableOpacity
              key={slot.startsAt}
              onPress={() => onSelectSlot(slot.startsAt, slot.maxDuration)}
              style={[
                styles.slotButton,
                {
                  backgroundColor: selected
                    ? theme.colors.primaryLight
                    : theme.colors.surface,
                  borderColor: selected
                    ? theme.colors.primary
                    : theme.colors.borderLight,
                },
              ]}
            >
              <Text
                weight={selected ? "600" : "normal"}
                color={
                  selected ? theme.colors.primary : theme.colors.textPrimary
                }
                style={styles.slotText}
              >
                {formatLocalizedTime(slot.startsAt, locale)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 170,
    gap: 16,
  },
  practitionerCard: {
    borderRightWidth: 3,
    borderRightColor: "#3f7dcf",
  },
  practitionerHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  practitionerTextCol: {
    flex: 1,
  },
  practitionerName: {
    fontSize: 28,
    marginBottom: 4,
  },
  practitionerTitle: {
    fontSize: 16,
  },
  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  monthLabel: {
    fontSize: 22,
  },
  weekNavRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  navButton: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  retryButton: {
    marginTop: 10,
  },
  daysRow: {
    gap: 10,
    paddingVertical: 4,
  },
  dayCard: {
    minWidth: 94,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  dayLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  dayCount: {
    fontSize: 24,
  },
  slotSectionsWrap: {
    gap: 16,
  },
  slotSection: {
    gap: 10,
  },
  slotSectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  slotSectionTitle: {
    fontSize: 18,
  },
  slotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  slotButton: {
    width: "31%",
    minWidth: 98,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  slotText: {
    fontSize: 18,
  },
  timezoneHint: {
    fontSize: 12,
    marginTop: 6,
  },
  selectionHint: {
    fontSize: 12,
    marginTop: -8,
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 22,
  },
  bottomLabel: {
    fontSize: 13,
    marginBottom: 2,
  },
  bottomValue: {
    fontSize: 20,
    marginBottom: 10,
  },
  ctaButton: {
    borderRadius: 12,
  },
});




