import React from "react";
import { StyleProp, StyleSheet, TextStyle, View, ViewStyle } from "react-native";
import { Text } from "../../../../components/ui";
import { formatMinuteRangeParts, getAvailabilityRangeFlexDirection } from "../utils";

interface AvailabilityTimeRangeProps {
  startMinuteOfDay: number;
  durationMinutes: number;
  rtl: boolean;
  style?: StyleProp<ViewStyle>;
}

export function AvailabilityTimeRange({ startMinuteOfDay, durationMinutes, rtl, style }: AvailabilityTimeRangeProps) {
  const { start, end } = formatMinuteRangeParts(startMinuteOfDay, durationMinutes, rtl);

  return (
    <View style={[styles.range, { flexDirection: getAvailabilityRangeFlexDirection(rtl) }, style]}>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.9} style={styles.time}>{start}</Text>
      <Text numberOfLines={1} style={styles.separator}>–</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.9} style={styles.time}>{end}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  range: {
    alignItems: "center",
    flexShrink: 1,
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
