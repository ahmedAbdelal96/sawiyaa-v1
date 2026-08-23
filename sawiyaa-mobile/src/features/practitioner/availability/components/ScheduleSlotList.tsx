import React, { memo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";
import { Text } from "../../../../components/ui";
import { useTheme } from "../../../../providers/ThemeProvider";
import { useAppDirection } from "../../../../i18n/direction";
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

export const ScheduleSlotList = memo(function ScheduleSlotList({
  slots,
  title,
  periodMetaLabel,
  statusLabel,
}: Props) {
  const { theme } = useTheme();
  const { isRtl } = useAppDirection();

  return (
    <View
      style={[
        styles.section,
        {
          backgroundColor: theme.colors.surfaceRaised,
          borderColor: theme.colors.divider,
        },
      ]}
    >
      <View
        style={[
          styles.header,
          {
            flexDirection: isRtl ? "row-reverse" : "row",
            borderBottomColor: theme.colors.divider,
          },
        ]}
      >
        <Text variant="subtitle" weight="700" style={styles.headerTitle}>
          {title}
        </Text>
        <View style={[styles.countBadge, { backgroundColor: theme.colors.primaryLight }]}>
          <Text variant="caption" weight="700" color={theme.colors.primary}>
            {slots.length} {isRtl ? "موعد" : "slots"}
          </Text>
        </View>
      </View>

      <View style={styles.grid}>
        {slots.map((slot) => {
          const status = getScheduleSlotStatus(slot);
          const statusColor =
            status === "available"
              ? theme.colors.statusSuccessText
              : status === "booked"
                ? theme.colors.statusInfoText
                : theme.colors.textSecondary;
          const statusBg =
            status === "available"
              ? theme.colors.statusSuccessBg
              : status === "booked"
                ? theme.colors.statusInfoBg
                : theme.colors.surfaceMuted;
          const range = formatMinuteRangeParts(slot.startMinuteOfDay, slot.durationMinutes, isRtl);
          const rowLabel = `${range.start} – ${range.end} ${periodMetaLabel(1, slot.durationMinutes)} ${statusLabel(status)}`;

          return (
            <View
              key={`${slot.dayOfWeek}:${slot.startMinuteOfDay}:${slot.durationMinutes}`}
              accessible
              accessibilityLabel={rowLabel}
              style={[
                styles.slotTile,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: status === "booked" ? theme.colors.primary : theme.colors.borderLight,
                },
              ]}
            >
              <Text variant="subtitle" weight="700" style={styles.tileRange} numberOfLines={1}>
                {range.start} – {range.end}
              </Text>

              <View style={[styles.tileFooter, { flexDirection: isRtl ? "row-reverse" : "row" }]}>
                <View
                  style={[
                    styles.durationBadge,
                    { backgroundColor: theme.colors.surfaceSecondary },
                  ]}
                >
                  <Ionicons name="time-outline" size={11} color={theme.colors.textMuted} />
                  <Text
                    variant="caption"
                    color={theme.colors.textSecondary}
                    style={styles.durationText}
                  >
                    {slot.durationMinutes} د
                  </Text>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: statusBg, flexDirection: isRtl ? "row-reverse" : "row" },
                  ]}
                >
                  <Ionicons name={getStatusIcon(status)} size={11} color={statusColor} />
                  <Text
                    variant="caption"
                    weight="600"
                    color={statusColor}
                    style={styles.statusText}
                    numberOfLines={1}
                  >
                    {statusLabel(status)}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  section: {
    width: "100%",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    overflow: "hidden",
  },
  header: {
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    flex: 1,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    padding: 10,
  },
  slotTile: {
    width: "48.7%",
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    justifyContent: "space-between",
  },
  tileRange: {
    fontSize: 12.5,
    lineHeight: 16,
    writingDirection: "ltr",
    textAlign: "left",
  },
  tileFooter: {
    alignItems: "center",
    justifyContent: "space-between",
    gap: 4,
  },
  durationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
  },
  durationText: {
    fontSize: 10,
    lineHeight: 13,
  },
  statusBadge: {
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    lineHeight: 13,
  },
});
