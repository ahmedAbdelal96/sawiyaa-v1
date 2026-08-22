import React, { memo, useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";
import { Text } from "../../../../components/ui";
import { useTheme } from "../../../../providers/ThemeProvider";
import { useAppDirection } from "../../../../i18n/direction";
import { groupAvailabilityPeriods, type AvailabilityPeriodState } from "../availability-periods";
import { getScheduleSlotStatus, type ScheduleSlotStatus } from "../schedule-view-model";
import type { AvailabilityWeekSlot } from "../types";
import { formatMinuteRangeParts } from "../utils";

type Props = {
  slots: AvailabilityWeekSlot[];
  title: string;
  periodMetaLabel: (count: number, duration: number) => string;
  statusLabel: (status: ScheduleSlotStatus) => string;
};

function getStatusIcon(status: ScheduleSlotStatus): keyof typeof Ionicons.glyphMap {
  switch (status) {
    case "booked":
      return "calendar-outline";
    case "notEditable":
      return "lock-closed-outline";
    default:
      return "checkmark-circle-outline";
  }
}

function getPeriodState(status: ScheduleSlotStatus): AvailabilityPeriodState {
  if (status === "booked") return "booked";
  if (status === "notEditable") return "protected";
  return "editable";
}

export const ScheduleSlotList = memo(function ScheduleSlotList({ slots, title, periodMetaLabel, statusLabel }: Props) {
  const { theme } = useTheme();
  const { isRtl } = useAppDirection();
  const periods = useMemo(() => groupAvailabilityPeriods(slots.map((slot) => ({
    startMinuteOfDay: slot.startMinuteOfDay,
    durationMinutes: slot.durationMinutes,
    state: getPeriodState(getScheduleSlotStatus(slot)),
  }))), [slots]);

  return (
    <View style={[styles.section, { backgroundColor: theme.colors.surfaceRaised, borderColor: theme.colors.divider }]}>
      <View style={[styles.header, { flexDirection: isRtl ? "row-reverse" : "row", borderBottomColor: theme.colors.divider }]}>
        <Text variant="subtitle" weight="700" style={styles.headerTitle}>{title}</Text>
      </View>
      <View style={styles.rows}>
        {periods.map((period, index) => {
          const status: ScheduleSlotStatus = period.state === "booked" ? "booked" : period.state === "protected" ? "notEditable" : "available";
          const statusColor = status === "available"
            ? theme.colors.statusSuccessText
            : status === "booked"
              ? theme.colors.statusInfoText
              : theme.colors.textSecondary;
          const range = formatMinuteRangeParts(period.startMinuteOfDay, period.endMinuteOfDay - period.startMinuteOfDay, isRtl);
          const rowLabel = `${range.start} – ${range.end} ${periodMetaLabel(period.slotStarts.length, period.durationMinutes)} ${statusLabel(status)}`;
          return (
            <View key={period.id} accessible accessibilityLabel={rowLabel} style={[styles.row, { flexDirection: isRtl ? "row-reverse" : "row", borderBottomColor: index < periods.length - 1 ? theme.colors.divider : "transparent" }]}>
              <View style={styles.timeColumn}>
                <Text variant="subtitle" weight="700" style={styles.range}>{range.start} – {range.end}</Text>
                <Text variant="caption" color={theme.colors.textSecondary} style={styles.meta}>{periodMetaLabel(period.slotStarts.length, period.durationMinutes)}</Text>
              </View>
              <View style={[styles.status, { backgroundColor: status === "available" ? theme.colors.statusSuccessBg : status === "booked" ? theme.colors.statusInfoBg : theme.colors.surfaceMuted, flexDirection: isRtl ? "row-reverse" : "row" }]}>
                <Ionicons name={getStatusIcon(status)} size={14} color={statusColor} />
                <Text variant="caption" weight="600" color={statusColor} style={styles.statusLabel} numberOfLines={1}>{statusLabel(status)}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  section: { width: "100%", borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, overflow: "hidden" },
  header: { alignItems: "center", justifyContent: "space-between", gap: 8, paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle: { flex: 1 },
  rows: { width: "100%" },
  row: { minHeight: 64, alignItems: "center", justifyContent: "space-between", gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  timeColumn: { flex: 1, minWidth: 0 },
  range: { writingDirection: "ltr", textAlign: "left" },
  meta: { marginTop: 2 },
  status: { alignItems: "center", justifyContent: "center", gap: 4, minHeight: 30, maxWidth: 118, paddingHorizontal: 8, borderRadius: 8 },
  statusLabel: { flexShrink: 1 },
});
