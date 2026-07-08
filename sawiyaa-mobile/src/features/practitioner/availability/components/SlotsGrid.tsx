import React from "react";
import { Alert, StyleSheet, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../../../providers/ThemeProvider";
import { Text } from "../../../../components/ui";
import { Ionicons } from "@expo/vector-icons";

import { AvailabilityWeekSlot } from "../types";

interface SlotsGridProps {
  selectedDay: number;
  selectedDuration: 30 | 60;
  draftSchedule: Record<number, Record<number, number[]>>;
  onToggleSlot: (minute: number) => void;
  isEditable: boolean;
  weekSlots?: AvailabilityWeekSlot[];
  isSlotInPast?: (dayOfWeek: number, duration: number, startMinute: number) => boolean;
}

function formatMinuteLabel(minute: number): string {
  const hours = Math.floor(minute / 60);
  const mins = minute % 60;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}

export function SlotsGrid({
  selectedDay,
  selectedDuration,
  draftSchedule,
  onToggleSlot,
  isEditable,
  weekSlots,
  isSlotInPast,
}: SlotsGridProps) {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const isRtl = i18n.dir() === "rtl";

  // Generate minutes of day
  const stepsCount = selectedDuration === 60 ? 24 : 48;
  const timeSteps = Array.from({ length: stepsCount }, (_, i) => i * selectedDuration);
  
  // Group slots
  const groups = [
    {
      titleKey: "practitioner.availability.weeks.periods.night",
      iconName: "moon-outline" as const,
      minutes: timeSteps.filter((m) => m >= 0 && m < 360),
    },
    {
      titleKey: "practitioner.availability.weeks.periods.morning",
      iconName: "sunny-outline" as const,
      minutes: timeSteps.filter((m) => m >= 360 && m < 720),
    },
    {
      titleKey: "practitioner.availability.weeks.periods.afternoon",
      iconName: "partly-sunny-outline" as const,
      minutes: timeSteps.filter((m) => m >= 720 && m < 1080),
    },
    {
      titleKey: "practitioner.availability.weeks.periods.evening",
      iconName: "cloudy-night-outline" as const,
      minutes: timeSteps.filter((m) => m >= 1080 && m < 1440),
    },
  ];

  const selectedStarts = draftSchedule[selectedDay]?.[selectedDuration] || [];

  return (
    <View style={styles.container}>
      {groups.map((group) => {
        if (group.minutes.length === 0) return null;

        return (
          <View key={group.titleKey} style={styles.groupContainer}>
            <View
              style={[
                styles.groupHeader,
                { flexDirection: isRtl ? "row-reverse" : "row" },
              ]}
            >
              <Ionicons
                name={group.iconName}
                size={18}
                color={theme.colors.textSecondary}
                style={isRtl ? styles.iconRtl : styles.iconLtr}
              />
              <Text
                style={[
                  theme.typography.subtitle,
                  { color: theme.colors.textSecondary, fontWeight: "700" },
                ]}
              >
                {t(group.titleKey)}
              </Text>
            </View>

            <View
              style={[
                styles.gridRow,
                { flexDirection: isRtl ? "row-reverse" : "row" },
              ]}
            >
              {group.minutes.map((minute) => {
                const isSelected = selectedStarts.includes(minute);
                const originalSlot = weekSlots?.find(
                  (s) =>
                    s.dayOfWeek === selectedDay &&
                    s.durationMinutes === selectedDuration &&
                    s.startMinuteOfDay === minute,
                );
                const isLocked = originalSlot && originalSlot.canEdit === false;
                const isPast = isSlotInPast?.(selectedDay, selectedDuration, minute) ?? false;

                const isDisabledClick = !isEditable;

                const handlePress = () => {
                  if (isLocked) {
                    const alertTitle = t("practitioner.availability.weeks.alert.lockedTitle", "تعديل الوقت");
                    const alertMsg = originalSlot?.reasonCode === "PAST"
                      ? "لا يمكن تعديل وقت انتهى بالفعل."
                      : "لا يمكن تعديل هذا الوقت لأنه مرتبط بحجز.";
                    Alert.alert(alertTitle, alertMsg, [{ text: t("common.ok", "موافق") }]);
                    return;
                  }
                  if (isPast) {
                    Alert.alert(
                      t("practitioner.availability.weeks.alert.lockedTitle", "تعديل الوقت"),
                      "لا يمكن تعديل وقت انتهى بالفعل.",
                      [{ text: t("common.ok", "موافق") }]
                    );
                    return;
                  }
                  onToggleSlot(minute);
                };

                const getBgColor = () => {
                  if (isSelected) {
                    return isLocked ? theme.colors.primary + "20" : theme.colors.primary;
                  }
                  if (isPast) {
                    return theme.colors.surfaceSecondary || "#F1F5F9";
                  }
                  return theme.colors.surface;
                };

                const getBorderColor = () => {
                  if (isSelected) {
                    return isLocked ? theme.colors.primary + "40" : theme.colors.primary;
                  }
                  if (isPast) {
                    return theme.colors.borderLight || "#E2E8F0";
                  }
                  return theme.colors.border;
                };

                const getTextColor = () => {
                  if (isSelected) {
                    return isLocked ? theme.colors.primary : "#FFFFFF";
                  }
                  if (isPast || isLocked) {
                    return theme.colors.textMuted || "#94A3B8";
                  }
                  return theme.colors.textPrimary;
                };

                return (
                  <TouchableOpacity
                    key={minute}
                    activeOpacity={0.7}
                    disabled={isDisabledClick}
                    onPress={handlePress}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: getBgColor(),
                        borderColor: getBorderColor(),
                        opacity: (isDisabledClick || isPast || isLocked) && !isSelected ? 0.5 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        theme.typography.bodySmall,
                        {
                          color: getTextColor(),
                          fontWeight: isSelected ? "700" : "500",
                          fontSize: 13,
                        },
                      ]}
                    >
                      {formatMinuteLabel(minute)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 0,
    paddingBottom: 24,
  },
  groupContainer: {
    marginVertical: 6,
  },
  groupHeader: {
    alignItems: "center",
    marginBottom: 8,
  },
  iconLtr: {
    marginRight: 6,
  },
  iconRtl: {
    marginLeft: 6,
  },
  gridRow: {
    flexWrap: "wrap",
    marginHorizontal: -4,
  },
  chip: {
    minWidth: 72,
    height: 40, // More compact touch target 40
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 4,
    marginVertical: 4,
    justifyContent: "center",
    alignItems: "center",
  },
});
