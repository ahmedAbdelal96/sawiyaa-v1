import React from "react";
import { StyleProp, StyleSheet, TextStyle, View, ViewStyle } from "react-native";
import { Text } from "../../../../components/ui";
import { formatMinuteRangeParts, getAvailabilityRangeFlexDirection } from "../utils";

interface AvailabilityTimeRangeProps {
  startMinuteOfDay: number;
  durationMinutes: number;
  rtl: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function AvailabilityTimeRange({ startMinuteOfDay, durationMinutes, rtl, compact = false, style }: AvailabilityTimeRangeProps) {
  const { start, end } = formatMinuteRangeParts(startMinuteOfDay, durationMinutes, rtl);

  return (
    <View style={[styles.range, compact ? styles.compactRange : { flexDirection: getAvailabilityRangeFlexDirection(rtl) }, style]}>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={compact ? 0.8 : 0.9} style={[styles.time, compact && styles.compactTime]}>{start}</Text>
      <Text numberOfLines={1} style={[styles.separator, compact && styles.compactSeparator]}>–</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={compact ? 0.8 : 0.9} style={[styles.time, compact && styles.compactTime]}>{end}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  range: {
    alignItems: "center",
    flexShrink: 1,
  },
  compactRange: {
    flexDirection: "column",
    gap: 0,
  },
  compactTime: {
    fontSize: 11,
    lineHeight: 14,
    maxWidth: "100%",
  },
  compactSeparator: {
    lineHeight: 8,
    marginHorizontal: 0,
  },
  time: {
    direction: "ltr",
    writingDirection: "ltr",
    textAlign: "center",
    flexShrink: 1,
  } as TextStyle,
  separator: {
    direction: "ltr",
    writingDirection: "ltr",
    textAlign: "center",
    marginHorizontal: 4,
  } as TextStyle,
});
