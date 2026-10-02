import React, { memo, useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "../../../../components/ui";
import { useAppDirection } from "../../../../i18n/direction";
import { useTheme } from "../../../../providers/ThemeProvider";
import { formatScheduleWeekRange } from "../schedule-view-model";

export type ScheduleWeekOption = {
  weekStartDate: string;
  weekEndDate: string;
};

type Props = {
  weeks: ScheduleWeekOption[];
  selectedWeekStartDate: string;
  locale: string;
  previousLabel: string;
  nextLabel: string;
  onSelectWeek: (weekStartDate: string) => void;
};

export const ScheduleWeekNavigator = memo(function ScheduleWeekNavigator({
  weeks,
  selectedWeekStartDate,
  locale,
  previousLabel,
  nextLabel,
  onSelectWeek,
}: Props) {
  const { theme } = useTheme();
  const { isRtl, chevronBack, chevronForward } = useAppDirection();
  const selectedIndex = weeks.findIndex((week) => week.weekStartDate === selectedWeekStartDate);
  const safeIndex = selectedIndex >= 0 ? selectedIndex : 0;
  const selectedWeek = weeks[safeIndex];
  const rangeLabel = useMemo(
    () => selectedWeek ? formatScheduleWeekRange(selectedWeek.weekStartDate, selectedWeek.weekEndDate, locale) : "",
    [locale, selectedWeek],
  );

  if (!selectedWeek) return null;

  const canGoPrevious = safeIndex > 0;
  const canGoNext = safeIndex < weeks.length - 1;

  return (
    <View style={[styles.container, { flexDirection: isRtl ? "row-reverse" : "row" }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={previousLabel}
        accessibilityState={{ disabled: !canGoPrevious }}
        disabled={!canGoPrevious}
        onPress={() => onSelectWeek(weeks[safeIndex - 1].weekStartDate)}
        style={({ pressed }) => [
          styles.arrowButton,
          { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceRaised },
          !canGoPrevious && styles.disabled,
          pressed && canGoPrevious && styles.pressed,
        ]}
      >
        <Ionicons name={chevronBack} size={20} color={canGoPrevious ? theme.colors.textPrimary : theme.colors.disabled} />
      </Pressable>
      <View style={styles.rangeWrap} accessibilityRole="text">
        <Text variant="subtitle" weight="700" numberOfLines={1} style={styles.rangeLabel}>
          {rangeLabel}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={nextLabel}
        accessibilityState={{ disabled: !canGoNext }}
        disabled={!canGoNext}
        onPress={() => onSelectWeek(weeks[safeIndex + 1].weekStartDate)}
        style={({ pressed }) => [
          styles.arrowButton,
          { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceRaised },
          !canGoNext && styles.disabled,
          pressed && canGoNext && styles.pressed,
        ]}
      >
        <Ionicons name={chevronForward} size={20} color={canGoNext ? theme.colors.textPrimary : theme.colors.disabled} />
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { alignItems: "center", justifyContent: "space-between", gap: 10, minHeight: 48 },
  arrowButton: { width: 44, height: 44, borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  rangeWrap: { flex: 1, alignItems: "center", minWidth: 0 },
  rangeLabel: { textAlign: "center" },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.72 },
});
