import React from "react";
import { I18nManager, Image, StyleSheet, Switch, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Button, Card, Text } from "../../../../components/ui";
import type { PackagePlanQuotedItem } from "../../package-plans/types";
import { formatLocalizedDateRange, formatLocalizedTime } from "../slot-utils";

const FALLBACK_AVATAR = require("../../../../../assets/user.avif");

export type DurationValue = 30 | 60;
export type BookingTypeValue = "appointment" | "package";

export type SelectTimeDateColumn = {
  dayKey: string;
  dayLabelShort: string;
  dayNumber: string;
  slots: {
    startsAt: string;
    kind?: "AVAILABLE" | "BOOKED" | "RESERVED";
  }[];
};

type ThemeLike = {
  colors: {
    primary: string;
    primaryLight: string;
    surface: string;
    surfaceTertiary: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    borderLight: string;
  };
};

type RollingDateScheduleTableProps = {
  theme: ThemeLike;
  locale: string;
  isRtl: boolean;
  fromIso: string;
  toIso: string;
  dateColumns: SelectTimeDateColumn[];
  onPrevWindow: () => void;
  onNextWindow: () => void;
  selectedSlots: string[];
  onToggleSlot: (slot: string) => void;
  maxSelectedCount: number;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  showBooked: boolean;
  onToggleShowBooked: (value: boolean) => void;
  canShowBookedSlots: boolean;
  timezone: string;
};

export function RollingDateScheduleTable({
  theme,
  locale,
  isRtl,
  fromIso,
  toIso,
  dateColumns,
  onPrevWindow,
  onNextWindow,
  selectedSlots,
  onToggleSlot,
  maxSelectedCount,
  isLoading,
  isError,
  onRetry,
  showBooked,
  onToggleShowBooked,
  canShowBookedSlots,
  timezone,
}: RollingDateScheduleTableProps) {
  const { t } = useTranslation();
  const renderedColumns = isRtl ? [...dateColumns].reverse() : dateColumns;

  return (
    <Card variant="elevated" padding="sm" style={styles.scheduleCard}>
      <View style={[styles.dateWindowTopRow, { flexDirection: isRtl ? "row-reverse" : "row" }]}>
        <Text weight="600" style={styles.dateWindowRangeText}>
          {formatLocalizedDateRange(fromIso, toIso, locale)}
        </Text>
        <View style={[styles.dateWindowNavRow, { flexDirection: isRtl ? "row-reverse" : "row" }]}>
          <TouchableOpacity onPress={onPrevWindow} style={styles.navButton}>
            <Ionicons
              name={isRtl ? "chevron-forward" : "chevron-back"}
              size={16}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={onNextWindow} style={styles.navButton}>
            <Ionicons
              name={isRtl ? "chevron-back" : "chevron-forward"}
              size={16}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.inlineState}>
          <Text color={theme.colors.textSecondary}>{t("patientSessionsFlow.common.loading")}</Text>
        </View>
      ) : isError ? (
        <View style={styles.inlineState}>
          <Text color={theme.colors.textSecondary}>{t("patientSessionsFlow.selectTime.loadError")}</Text>
          <Button title={t("patientSessionsFlow.common.retry")} onPress={onRetry} style={styles.retryButton} />
        </View>
      ) : (
        <View style={[styles.dateTableWrap, { borderColor: theme.colors.borderLight, backgroundColor: theme.colors.surface }]}>
          <View style={[styles.dateHeaderRow, { borderBottomColor: theme.colors.borderLight }]}>
            {renderedColumns.map((day, idx) => (
              <View
                key={day.dayKey}
                style={[
                  styles.dateHeaderCell,
                  idx !== 0
                    ? { borderLeftWidth: 1, borderLeftColor: theme.colors.borderLight }
                    : null,
                ]}
              >
                <Text style={styles.dayHeaderText} color={theme.colors.textSecondary}>
                  {day.dayLabelShort}
                </Text>
                <Text weight="600" style={styles.dayHeaderNumber} color={theme.colors.textPrimary}>
                  {day.dayNumber}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.dateBodyRow}>
            {renderedColumns.map((day, idx) => (
              <View
                key={day.dayKey}
                style={[
                  styles.dateBodyCell,
                  idx !== 0
                    ? { borderLeftWidth: 1, borderLeftColor: theme.colors.borderLight }
                    : null,
                ]}
              >
                {day.slots.length === 0 ? (
                  <View style={styles.emptyDayState}>
                    <Text style={styles.noSlotsText} color={theme.colors.textMuted}>
                      {t("patientSessionsFlow.selectTime.noSlotsThisDay")}
                    </Text>
                  </View>
                ) : (
                  day.slots.map((slot) => {
                    const selected = selectedSlots.includes(slot.startsAt);
                    const isBooked = slot.kind === "BOOKED" || slot.kind === "RESERVED";
                    const disabled =
                      isBooked || (!selected && selectedSlots.length >= maxSelectedCount);
                    return (
                      <TouchableOpacity
                        key={slot.startsAt}
                        onPress={() => {
                          if (isBooked) return;
                          onToggleSlot(slot.startsAt);
                        }}
                        disabled={disabled}
                        style={[
                          styles.timeCell,
                          {
                            opacity: disabled ? 0.4 : 1,
                            backgroundColor: selected
                              ? theme.colors.primary
                              : isBooked
                                ? "#fff5f5"
                                : theme.colors.surface,
                            borderColor: selected
                              ? theme.colors.primary
                              : isBooked
                                ? "#f04438"
                                : theme.colors.borderLight,
                          },
                        ]}
                      >
                        <Text
                          style={styles.timeCellText}
                          weight={selected ? "600" : "normal"}
                          color={
                            selected
                              ? theme.colors.surface
                              : isBooked
                                ? "#b42318"
                                : theme.colors.textPrimary
                          }
                        >
                          {formatLocalizedTime(slot.startsAt, locale)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            ))}
          </View>
        </View>
      )}

      <View
        style={[
          styles.toggleRow,
          { borderTopColor: theme.colors.borderLight, flexDirection: isRtl ? "row-reverse" : "row" },
        ]}
      >
        <View style={[styles.timezoneRow, { flexDirection: isRtl ? "row-reverse" : "row" }]}>
          <Ionicons name="earth-outline" size={14} color={theme.colors.textSecondary} />
          <Text style={styles.timezoneCodeText} color={theme.colors.textSecondary}>
            {timezone}
          </Text>
        </View>

        <View style={[styles.bookedToggleSide, { flexDirection: isRtl ? "row-reverse" : "row" }]}>
          <Text style={styles.bookedToggleLabel} color={theme.colors.textPrimary}>
            {t("patientSessionsFlow.selectTime.showBookedToggle")}
          </Text>
          <Switch
            value={showBooked}
            onValueChange={onToggleShowBooked}
            disabled={!canShowBookedSlots}
            trackColor={{ false: theme.colors.borderLight, true: theme.colors.primaryLight }}
            thumbColor={showBooked ? theme.colors.primary : theme.colors.surface}
          />
        </View>
      </View>
      {!canShowBookedSlots ? (
        <Text style={styles.bookedHint} color={theme.colors.textMuted}>
          {t("patientSessionsFlow.selectTime.bookedSlotsUnavailable")}
        </Text>
      ) : null}
    </Card>
  );
}

type PractitionerSummaryCardProps = {
  theme: ThemeLike;
  isRtl: boolean;
  practitionerName: string;
  practitionerTitle: string;
  practitionerAvatarUrl?: string;
  avatarFailed: boolean;
  setAvatarFailed: (value: boolean) => void;
};

export function PractitionerSummaryCard({
  theme,
  isRtl,
  practitionerName,
  practitionerTitle,
  practitionerAvatarUrl,
  avatarFailed,
  setAvatarFailed,
}: PractitionerSummaryCardProps) {
  return (
    <Card variant="elevated" padding="sm" style={styles.practitionerCard}>
      <View style={[styles.practitionerRow, { flexDirection: isRtl ? "row-reverse" : "row" }]}>
        <View style={[styles.avatarWrap, { backgroundColor: theme.colors.surfaceTertiary }]}>
          {practitionerAvatarUrl && practitionerAvatarUrl.trim() && !avatarFailed ? (
            <Image source={{ uri: practitionerAvatarUrl }} style={styles.avatar} onError={() => setAvatarFailed(true)} />
          ) : (
            <Image source={FALLBACK_AVATAR} style={styles.avatar} />
          )}
        </View>
        <View style={styles.practitionerTextCol}>
          <Text weight="600" style={styles.practitionerName}>
            {practitionerName}
          </Text>
          <Text color={theme.colors.textSecondary} style={styles.practitionerTitle}>
            {practitionerTitle}
          </Text>
        </View>
      </View>
    </Card>
  );
}

type BookingTypeTabsProps = {
  theme: ThemeLike;
  isRtl: boolean;
  value: BookingTypeValue;
  onChange: (value: BookingTypeValue) => void;
  showPackageTab: boolean;
  isPackageSupportChecking?: boolean;
};

export function BookingTypeTabs({
  theme,
  isRtl,
  value,
  onChange,
  showPackageTab,
  isPackageSupportChecking,
}: BookingTypeTabsProps) {
  const { t } = useTranslation();
  const tabs: { id: BookingTypeValue; label: string }[] = [{ id: "appointment", label: t("patientSessionsFlow.selectTime.bookingTypeNow") }];
  if (showPackageTab) {
    tabs.push({ id: "package", label: t("patientSessionsFlow.selectTime.bookingTypePackage") });
  }

  return (
    <Card variant="elevated" padding="sm" style={styles.compactCard}>
      <Text weight="600" style={styles.blockTitle}>
        {t("patientSessionsFlow.selectTime.bookingTypeTitle")}
      </Text>
      <View style={[styles.segmentRow, { flexDirection: isRtl ? "row-reverse" : "row" }]}>
        {tabs.map((tab) => {
          const active = tab.id === value;
          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => onChange(tab.id)}
              style={[
                styles.segmentItem,
                {
                  backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                  borderColor: active ? theme.colors.primary : theme.colors.borderLight,
                },
              ]}
            >
              <Text weight={active ? "600" : "normal"} color={active ? theme.colors.surface : theme.colors.textPrimary}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {isPackageSupportChecking ? (
        <Text style={styles.helperText} color={theme.colors.textMuted}>
          {t("patientSessionsFlow.common.loading")}
        </Text>
      ) : !showPackageTab ? (
        <Text style={styles.helperText} color={theme.colors.textMuted}>
          {t("patientSessionsFlow.selectTime.packagesUnavailable")}
        </Text>
      ) : null}
    </Card>
  );
}

type DurationSegmentProps = {
  theme: ThemeLike;
  isRtl: boolean;
  title: string;
  value: DurationValue;
  onChange: (value: DurationValue) => void;
};

export function DurationSegment({ theme, isRtl, title, value, onChange }: DurationSegmentProps) {
  const { t } = useTranslation();
  return (
    <>
      <Text weight="600" style={[styles.blockTitle, styles.blockTitleSpaced]}>
        {title}
      </Text>
      <View style={[styles.segmentRow, { flexDirection: isRtl ? "row-reverse" : "row" }]}>
        {[30, 60].map((minutes) => {
          const active = value === minutes;
          return (
            <TouchableOpacity
              key={minutes}
              onPress={() => onChange(minutes as DurationValue)}
              style={[
                styles.segmentItem,
                {
                  backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                  borderColor: active ? theme.colors.primary : theme.colors.borderLight,
                },
              ]}
            >
              <Text weight={active ? "600" : "normal"} color={active ? theme.colors.surface : theme.colors.textPrimary}>
                {minutes === 30 ? t("patientSessionsFlow.confirmation.duration30") : t("patientSessionsFlow.confirmation.duration60")}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  );
}

type PackagePlanSelectorProps = {
  theme: ThemeLike;
  isRtl: boolean;
  plans: PackagePlanQuotedItem[];
  selectedPlanCode: string | null;
  onSelectPlan: (code: string) => void;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
};

export function PackagePlanSelector({
  theme,
  isRtl,
  plans,
  selectedPlanCode,
  onSelectPlan,
  isLoading,
  isError,
  onRetry,
}: PackagePlanSelectorProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US";
  const formatPercent = (value: string) => `${Number(value)}%`;

  if (isLoading) {
    return (
      <View style={styles.inlineState}>
        <Text color={theme.colors.textSecondary}>{t("patientSessionsFlow.common.loading")}</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.inlineState}>
        <Text color={theme.colors.textSecondary}>{t("patientSessionsFlow.selectTime.packageLoadError")}</Text>
        <Button title={t("patientSessionsFlow.common.retry")} onPress={onRetry} style={styles.retryButton} />
      </View>
    );
  }

  return (
    <View style={styles.packagePlansStack}>
      {plans.map((plan) => {
        const active = plan.item.code === selectedPlanCode;
        return (
          <TouchableOpacity
            key={plan.item.id}
            onPress={() => onSelectPlan(plan.item.code)}
            style={[
              styles.packagePlanItem,
              {
                borderColor: active ? theme.colors.primary : theme.colors.borderLight,
                backgroundColor: active ? theme.colors.primaryLight : theme.colors.surface,
              },
            ]}
          >
            <View style={[styles.packagePlanTopRow, { flexDirection: isRtl ? "row-reverse" : "row" }]}>
              <Text weight="600" style={styles.packagePlanTitle}>
                {plan.item.sessionCount} {t("patientSessionsFlow.selectTime.packageSessionsLabel")}
              </Text>
              <Text weight="600" color={theme.colors.primary} style={styles.packagePlanDiscount}>
                {formatPercent(plan.item.discountPercent)}
              </Text>
            </View>
            <Text color={theme.colors.textSecondary} style={styles.packagePlanSubTitle}>
              {plan.item.title}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  practitionerCard: { borderRadius: 12 },
  practitionerRow: { alignItems: "center", gap: 8 },
  avatarWrap: { width: 38, height: 38, borderRadius: 999, overflow: "hidden" },
  avatar: { width: 38, height: 38, borderRadius: 999 },
  practitionerTextCol: { flex: 1 },
  practitionerName: { fontSize: 15 },
  practitionerTitle: { fontSize: 11, lineHeight: 16 },
  compactCard: { borderRadius: 12 },
  blockTitle: { fontSize: 16 },
  blockTitleSpaced: { marginTop: 8 },
  segmentRow: { gap: 6, marginTop: 6 },
  segmentItem: {
    flex: 1,
    minHeight: 34,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  helperText: { fontSize: 11, marginTop: 6 },
  scheduleCard: { borderRadius: 12 },
  dateWindowTopRow: { alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  dateWindowRangeText: { fontSize: 12 },
  dateWindowNavRow: { gap: 4 },
  navButton: { width: 24, height: 24, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  inlineState: { paddingVertical: 10 },
  retryButton: { marginTop: 6, borderRadius: 10 },
  dateTableWrap: { borderWidth: 1, borderRadius: 10, overflow: "hidden" },
  dateHeaderRow: { flexDirection: "row", borderBottomWidth: 1 },
  dateHeaderCell: {
    flex: 1,
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  dayHeaderText: { fontSize: 10, lineHeight: 12 },
  dayHeaderNumber: { fontSize: 11, lineHeight: 13 },
  dateBodyRow: { flexDirection: "row", alignItems: "stretch" },
  dateBodyCell: { flex: 1, minHeight: 230, paddingHorizontal: 2, paddingVertical: 4 },
  emptyDayState: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 2 },
  noSlotsText: { fontSize: 10, lineHeight: 14, textAlign: "center" },
  timeCell: {
    minHeight: 30,
    borderRadius: 7,
    borderWidth: 1,
    marginBottom: 4,
    paddingHorizontal: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  timeCellText: { fontSize: 10, lineHeight: 12, writingDirection: "ltr" },
  toggleRow: { borderTopWidth: 1, marginTop: 8, paddingTop: 8, alignItems: "center", justifyContent: "space-between" },
  timezoneRow: { alignItems: "center", gap: 4 },
  timezoneCodeText: { fontSize: 11 },
  bookedToggleSide: { alignItems: "center", gap: 6 },
  bookedToggleLabel: { fontSize: 12 },
  bookedHint: { fontSize: 11, marginTop: 4 },
  packagePlansStack: { gap: 6, marginTop: 8 },
  packagePlanItem: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  packagePlanTopRow: { alignItems: "center", justifyContent: "space-between", gap: 8 },
  packagePlanTitle: { fontSize: 13 },
  packagePlanDiscount: { fontSize: 12 },
  packagePlanSubTitle: { fontSize: 11, marginTop: 4 },
});
