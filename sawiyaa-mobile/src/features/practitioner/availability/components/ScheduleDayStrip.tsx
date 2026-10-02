import React, { memo } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "../../../../components/ui";
import { useTheme } from "../../../../providers/ThemeProvider";
import { useAppDirection } from "../../../../i18n/direction";
import type { DayOfWeek } from "../utils";
import type { ScheduleDay } from "../schedule-view-model";

type Props = {
  days: ScheduleDay[];
  selectedDay: DayOfWeek;
  todayLabel: string;
  onSelectDay: (day: DayOfWeek) => void;
};

export const ScheduleDayStrip = memo(function ScheduleDayStrip({
  days,
  selectedDay,
  todayLabel,
  onSelectDay,
}: Props) {
  const { theme } = useTheme();
  const { isRtl } = useAppDirection();

  return (
    <View accessibilityRole="tablist">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.container, { flexDirection: isRtl ? "row-reverse" : "row" }]}
      >
      {days.map((day) => {
        const selected = day.dayOfWeek === selectedDay;
        return (
          <Pressable
            key={day.date}
            accessibilityRole="tab"
            accessibilityLabel={`${day.weekdayLabel} ${day.dayNumber}`}
            accessibilityState={{ selected }}
            onPress={() => onSelectDay(day.dayOfWeek)}
            style={({ pressed }) => [
              styles.day,
              {
                backgroundColor: selected ? theme.colors.primarySoft : theme.colors.surfaceRaised,
                borderColor: selected ? theme.colors.primary : theme.colors.divider,
              },
              pressed && styles.pressed,
            ]}
          >
            <Text
              variant="caption"
              weight="600"
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.78}
              color={selected ? theme.colors.primary : theme.colors.textSecondary}
              style={styles.weekday}
            >
              {day.weekdayLabel}
            </Text>
            <Text
              variant="subtitle"
              weight="700"
              color={selected ? theme.colors.primary : theme.colors.textPrimary}
              style={styles.dayNumber}
            >
              {day.dayNumber}
            </Text>
            {day.isToday ? (
              <Text variant="caption" numberOfLines={1} color={theme.colors.primary} style={styles.today}>
                {todayLabel}
              </Text>
            ) : <View style={styles.todayPlaceholder} />}
            {selected ? <View style={[styles.selectedIndicator, { backgroundColor: theme.colors.primary }]} /> : null}
          </Pressable>
        );
      })}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { gap: 8, paddingHorizontal: 1 },
  day: { minWidth: 88, minHeight: 64, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  weekday: { textAlign: "center" },
  dayNumber: { textAlign: "center", marginTop: 2 },
  today: { textAlign: "center", marginTop: 1, fontSize: 9, lineHeight: 11 },
  todayPlaceholder: { height: 12, marginTop: 1 },
  selectedIndicator: { width: 14, height: 3, borderRadius: 2, marginTop: 3 },
  pressed: { opacity: 0.72 },
});
