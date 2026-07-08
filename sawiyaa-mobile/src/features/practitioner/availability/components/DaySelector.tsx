import React from "react";
import { ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../../../providers/ThemeProvider";
import { Text } from "../../../../components/ui";

interface DaySelectorProps {
  selectedDay: number; // 0 Sunday, 6 Saturday
  onSelectDay: (day: number) => void;
}

const DAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

export function DaySelector({ selectedDay, onSelectDay }: DaySelectorProps) {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const isRtl = i18n.dir() === "rtl";

  const days = [0, 1, 2, 3, 4, 5, 6];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={[
        styles.container,
        {
          flexDirection: isRtl ? "row-reverse" : "row",
        },
      ]}
    >
      {days.map((day) => {
        const isSelected = selectedDay === day;
        const key = DAY_KEYS[day];
        const label = t(`practitioner.availability.weeks.days.${key}`);

        return (
          <TouchableOpacity
            key={day}
            activeOpacity={0.7}
            onPress={() => onSelectDay(day)}
            style={[
              styles.chip,
              {
                backgroundColor: isSelected ? theme.colors.primary : theme.colors.surface,
                borderColor: isSelected ? theme.colors.primary : theme.colors.border,
              },
            ]}
          >
            <Text
              style={[
                theme.typography.bodySmall,
                {
                  color: isSelected ? "#FFFFFF" : theme.colors.textPrimary,
                  fontWeight: isSelected ? "700" : "500",
                },
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    maxHeight: 56,
    marginVertical: 4,
  },
  container: {
    alignItems: "center",
    paddingVertical: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginHorizontal: 4,
    minHeight: 38,
    justifyContent: "center",
    alignItems: "center",
  },
});
