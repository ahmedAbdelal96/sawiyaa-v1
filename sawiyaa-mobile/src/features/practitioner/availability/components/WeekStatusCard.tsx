import React from "react";
import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../../../providers/ThemeProvider";
import { Text, Card, StatusBadge } from "../../../../components/ui";
import { Ionicons } from "@expo/vector-icons";
import type { AvailabilityWeek } from "../types";

interface WeekStatusCardProps {
  week: AvailabilityWeek;
  selectedDay: number;
  selectedDuration: 30 | 60;
}

function formatLocalDateRange(startDateStr: string, endDateStr: string, isRtl: boolean): string {
  const parse = (s: string) => {
    const parts = s.split("-");
    if (parts.length !== 3) return null;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day);
  };

  const start = parse(startDateStr);
  const end = parse(endDateStr);
  if (!start || !end) return `${startDateStr} — ${endDateStr}`;

  const monthsAr = [
    "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
    "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
  ];
  const monthsEn = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  const startDay = start.getDate();
  const endDay = end.getDate();
  const startMonth = start.getMonth();
  const endMonth = end.getMonth();
  const startYear = start.getFullYear();

  if (isRtl) {
    if (startMonth === endMonth) {
      return `${startDay} – ${endDay} ${monthsAr[startMonth]} ${startYear}`;
    }
    return `${startDay} ${monthsAr[startMonth]} – ${endDay} ${monthsAr[endMonth]} ${startYear}`;
  } else {
    if (startMonth === endMonth) {
      return `${monthsEn[startMonth]} ${startDay} – ${endDay}, ${startYear}`;
    }
    return `${monthsEn[startMonth]} ${startDay} – ${monthsEn[endMonth]} ${endDay}, ${startYear}`;
  }
}

export function WeekStatusCard({ week, selectedDay, selectedDuration }: WeekStatusCardProps) {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const isRtl = i18n.dir() === "rtl";

  let badgeStatus: "success" | "warning" | "error" | "info" | "default" = "default";
  let iconName: keyof typeof Ionicons.glyphMap = "information-circle-outline";
  let cardBg = theme.colors.surfaceRaised;
  let borderColor = theme.colors.border;

  switch (week.status) {
    case "NOT_SET":
      badgeStatus = "default";
      iconName = "alert-circle-outline";
      cardBg = theme.colors.surfaceMuted;
      break;
    case "DRAFT":
      badgeStatus = "warning";
      iconName = "create-outline";
      break;
    case "PUBLISHED":
      badgeStatus = "success";
      iconName = "lock-closed-outline";
      cardBg = theme.colors.primarySoft;
      borderColor = theme.colors.primary;
      break;
    case "ARCHIVED":
      badgeStatus = "default";
      iconName = "archive-outline";
      break;
  }

  const rowDirection = isRtl ? "row-reverse" : "row";
  const dateRangeStr = formatLocalDateRange(week.weekStartDate, week.weekEndDate, isRtl);

  const getSelectedDayDateStr = () => {
    try {
      const [year, month, day] = week.weekStartDate.split("-").map(Number);
      const weekStartUtc = new Date(Date.UTC(year, month - 1, day));
      const targetDate = new Date(weekStartUtc.getTime() + selectedDay * 24 * 60 * 60 * 1000);

      const weekdayAr = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
      const weekdayEn = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

      const monthsAr = [
        "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
        "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
      ];
      const monthsEn = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
      ];

      const dayName = isRtl ? weekdayAr[targetDate.getUTCDay()] : weekdayEn[targetDate.getUTCDay()];
      const dayNum = targetDate.getUTCDate();
      const monthName = isRtl ? monthsAr[targetDate.getUTCMonth()] : monthsEn[targetDate.getUTCMonth()];
      const yearNum = targetDate.getUTCFullYear();

      if (isRtl) {
        return `${dayName}، ${dayNum} ${monthName} ${yearNum}`;
      } else {
        return `${dayName}, ${monthName} ${dayNum} ${yearNum}`;
      }
    } catch (e) {
      return "";
    }
  };

  const daySlots = week.slots.filter((s) => s.dayOfWeek === selectedDay);
  const totalCount = daySlots.length;
  const lockedCount = daySlots.filter((s) => s.canEdit === false).length;

  return (
    <View style={styles.outerContainer}>
      <Card variant="outlined" style={[styles.card, { borderColor, backgroundColor: cardBg }]} padding="sm">
        <View style={[styles.headerRow, { flexDirection: rowDirection }]}>
          <View style={styles.headerInfo}>
            <Text style={[styles.dateText, { color: theme.colors.textPrimary, textAlign: isRtl ? "right" : "left" }]}>
              {getSelectedDayDateStr()}
            </Text>
            <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 2, textAlign: isRtl ? "right" : "left" }}>
              {isRtl ? `من ضمن جدول ${dateRangeStr}` : `From schedule ${dateRangeStr}`}
            </Text>
          </View>
          <StatusBadge
            status={badgeStatus}
            label={t(`practitioner.availability.status.${week.status}`)}
          />
        </View>

        <View style={styles.summaryContainer}>
          <View style={[styles.explainRow, { flexDirection: rowDirection }]}>
            <Ionicons
              name="time-outline"
              size={16}
              color={theme.colors.primary}
              style={isRtl ? styles.iconRtl : styles.iconLtr}
            />
            <Text style={[styles.explainText, { color: theme.colors.textPrimary, textAlign: isRtl ? "right" : "left" }]}>
              {isRtl ? `${totalCount} وقت متاح اليوم` : `${totalCount} times available today`}
            </Text>
          </View>

          {lockedCount > 0 && (
            <View style={[styles.explainRow, { flexDirection: rowDirection, marginTop: 6 }]}>
              <Ionicons
                name="lock-closed-outline"
                size={16}
                color={theme.colors.textMuted}
                style={isRtl ? styles.iconRtl : styles.iconLtr}
              />
              <Text style={[styles.explainText, { color: theme.colors.textMuted, textAlign: isRtl ? "right" : "left" }]}>
                {isRtl
                  ? `${lockedCount} أوقات غير قابلة للتعديل لأنها محجوزة أو منتهية`
                  : `${lockedCount} locked times (booked or past)`}
              </Text>
            </View>
          )}
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    width: "100%",
  },
  card: {
    width: "100%",
    borderRadius: 16,
  },
  headerRow: {
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    flexWrap: "nowrap",
    gap: 8,
  },
  headerInfo: {
    flex: 1,
  },
  dateText: {
    fontSize: 15,
    fontWeight: "700",
  },
  summaryContainer: {
    marginTop: 12,
  },
  explainRow: {
    alignItems: "flex-start",
    marginTop: 2,
  },
  explainText: {
    fontSize: 13,
    lineHeight: 18,
  },
  iconLtr: {
    marginRight: 6,
    marginTop: 1,
  },
  iconRtl: {
    marginLeft: 6,
    marginTop: 1,
  },
});
