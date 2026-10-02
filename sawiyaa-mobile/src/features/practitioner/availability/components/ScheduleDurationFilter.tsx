import React, { memo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "../../../../components/ui";
import { useTheme } from "../../../../providers/ThemeProvider";
import { useAppDirection } from "../../../../i18n/direction";
import type { ScheduleDurationFilter as ScheduleFilterValue } from "../schedule-view-model";

type Option = {
  value: ScheduleFilterValue;
  label: string;
};

type Props = {
  value: ScheduleFilterValue;
  options: Option[];
  onChange: (value: ScheduleFilterValue) => void;
};

export const ScheduleDurationFilter = memo(function ScheduleDurationFilter({ value, options, onChange }: Props) {
  const { theme } = useTheme();
  const { isRtl } = useAppDirection();

  return (
    <View style={[styles.container, { flexDirection: isRtl ? "row-reverse" : "row", borderColor: theme.colors.divider, backgroundColor: theme.colors.surfaceRaised }]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            accessibilityRole="tab"
            accessibilityLabel={option.label}
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.option,
              { backgroundColor: selected ? theme.colors.primary : theme.colors.surfaceRaised, borderColor: selected ? theme.colors.primary : theme.colors.divider, borderWidth: selected ? 1 : StyleSheet.hairlineWidth },
              pressed && styles.pressed,
            ]}
          >
            <Text variant="caption" weight="700" color={selected ? theme.colors.onPrimary : theme.colors.textPrimary} style={styles.label}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 2, gap: 2, width: "100%" },
  option: { flex: 1, minHeight: 36, borderRadius: 8, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
  label: { textAlign: "center" },
  pressed: { opacity: 0.72 },
});
