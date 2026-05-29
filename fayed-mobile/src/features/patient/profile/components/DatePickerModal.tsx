import React, { useMemo, useState } from "react";
import {
  Modal,
  View,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  I18nManager,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../../../providers/ThemeProvider";
import { Button, Text } from "../../../../components/ui";

interface DatePickerModalProps {
  visible: boolean;
  value: Date | null;
  onClose: () => void;
  onConfirm: (date: Date) => void;
}

const MONTHS_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const MONTHS_AR = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

export function DatePickerModal({
  visible,
  value,
  onClose,
  onConfirm,
}: DatePickerModalProps) {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const isRtl = i18n.language?.startsWith("ar") ?? false;

  const currentYear = new Date().getFullYear();
  const MIN_YEAR = 1900;
  const MAX_DATE = new Date();
  MAX_DATE.setHours(23, 59, 59, 999);

  const initialYear = value?.getFullYear() ?? Math.min(1980, currentYear);
  const initialMonth = value?.getMonth() ?? 0;
  const initialDay = value?.getDate() ?? 1;

  const [selectedYear, setSelectedYear] = useState(initialYear);
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [selectedDay, setSelectedDay] = useState(initialDay);

  const years = useMemo(
    () =>
      Array.from({ length: currentYear - MIN_YEAR + 1 }, (_, i) => currentYear - i),
    [currentYear],
  );

  const months = useMemo(
    () =>
      MONTHS_EN.map((label, index) => ({
        value: index,
        label: isRtl ? MONTHS_AR[index] : label,
      })),
    [isRtl],
  );

  const days = useMemo(() => {
    const dim = getDaysInMonth(selectedYear, selectedMonth);
    return Array.from({ length: dim }, (_, i) => i + 1);
  }, [selectedYear, selectedMonth]);

  // Clamp day when month/year changes
  const safeDay = Math.min(selectedDay, days.length);

  const handleConfirm = () => {
    const d = new Date(selectedYear, selectedMonth, safeDay, 12, 0, 0);
    onConfirm(d);
  };

  const itemHeight = 44;
  const visibleItems = 5;
  const pickerHeight = itemHeight * visibleItems;
  const halfVisible = Math.floor(visibleItems / 2);

  const renderPickerColumn = <T extends { value: number; label: string }>({
    items,
    selected,
    onSelect,
    renderLabel,
    columnKey,
  }: {
    items: T[];
    selected: number;
    onSelect: (v: number) => void;
    renderLabel: (v: number) => string;
    columnKey: string;
  }) => (
    <View style={[styles.pickerColumn, { height: pickerHeight }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        snapToInterval={itemHeight}
        decelerationRate="fast"
        contentContainerStyle={{ paddingVertical: itemHeight * halfVisible }}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(
            e.nativeEvent.contentOffset.y / itemHeight,
          );
          const clamped = Math.max(0, Math.min(items.length - 1, index));
          onSelect(items[clamped].value);
        }}
        onScrollBeginDrag={() => {}}
      >
        {items.map((item) => {
          const isSelected = item.value === selected;
          return (
            <TouchableOpacity
              key={item.value}
              onPress={() => onSelect(item.value)}
              activeOpacity={0.7}
              style={[styles.pickerItem, { height: itemHeight }]}
            >
              <Text
                weight={isSelected ? "700" : "400"}
                style={[
                  styles.pickerItemText,
                  {
                    color: isSelected
                      ? theme.colors.primary
                      : theme.colors.textMuted,
                  },
                ]}
              >
                {renderLabel(item.value)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <View
        style={[
          styles.pickerIndicator,
          {
            top: halfVisible * itemHeight,
            borderColor: theme.colors.borderLight,
          },
        ]}
        pointerEvents="none"
      />
    </View>
  );

  // RTL: reverse column order (year-month-day → day-month-year)
  const dayCol = renderPickerColumn({
    items: days.map((d) => ({ value: d, label: pad(d) })),
    selected: safeDay,
    onSelect: (v) => setSelectedDay(v),
    renderLabel: (v) => pad(v),
    columnKey: "day",
  });
  const monthCol = renderPickerColumn({
    items: months,
    selected: selectedMonth,
    onSelect: (v) => setSelectedMonth(v),
    renderLabel: (v) => months.find((m) => m.value === v)?.label ?? "",
    columnKey: "month",
  });
  const yearCol = renderPickerColumn({
    items: years.map((y) => ({ value: y, label: y.toString() })),
    selected: selectedYear,
    onSelect: (v) => setSelectedYear(v),
    renderLabel: (v) => v.toString(),
    columnKey: "year",
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.container,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.borderLight,
            },
          ]}
        >
          {/* Header */}
          <View
            style={[
              styles.header,
              {
                borderBottomColor: theme.colors.borderLight,
                flexDirection: isRtl ? "row-reverse" : "row",
              },
            ]}
          >
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Text color={theme.colors.textMuted}>{t("profileScreen.edit.datePicker.cancel")}</Text>
            </TouchableOpacity>
            <Text weight="600" style={styles.headerTitle}>
              {t("profileScreen.edit.fields.dateOfBirth")}
            </Text>
            <TouchableOpacity onPress={handleConfirm} activeOpacity={0.7}>
              <Text weight="600" color={theme.colors.primary}>
                {t("profileScreen.edit.datePicker.confirm")}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Pickers — always day | month | year left to right */}
          <View
            style={[
              styles.pickersRow,
              { flexDirection: isRtl ? "row-reverse" : "row" },
            ]}
          >
            {dayCol}
            {monthCol}
            {yearCol}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingBottom: 34,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 16,
  },
  pickersRow: {
    flexDirection: "row",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  pickerColumn: {
    flex: 1,
    maxWidth: 140,
    overflow: "hidden",
  },
  pickerItem: {
    alignItems: "center",
    justifyContent: "center",
  },
  pickerItemText: {
    fontSize: 17,
  },
  pickerIndicator: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    borderTopWidth: 1,
    top: 88,
  },
});
