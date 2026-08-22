import React, { useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Button, Card, ErrorState, Header, LoadingState, Screen, Text } from "../../../src/components/ui";
import {
  useMyAvailabilityWeeks,
  usePreviewAvailabilityWeekRepeat,
} from "../../../src/features/practitioner/availability/hooks";
import { getRepeatTargetWindowState } from "../../../src/features/practitioner/availability/repeat-view-model";
import { formatWeekRange } from "../../../src/features/practitioner/availability/utils";
import { useTheme } from "../../../src/providers/ThemeProvider";

export default function RepeatTargetsScreen() {
  const { sourceWeekId } = useLocalSearchParams<{ sourceWeekId: string }>();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const weeksQuery = useMyAvailabilityWeeks();
  const preview = usePreviewAvailabilityWeekRepeat();
  const [selected, setSelected] = useState<string[]>([]);
  const [idempotencyKey] = useState(() => `mobile-repeat-${sourceWeekId}-${Date.now()}`);

  const weeks = useMemo(
    () => (weeksQuery.data?.weeks ?? [])
      .filter((week) => week.weekId !== sourceWeekId && week.relativeWeekIndex > 0)
      .sort((left, right) => left.weekStartDate.localeCompare(right.weekStartDate)),
    [sourceWeekId, weeksQuery.data?.weeks],
  );

  const toggle = (weekStartDate: string) => {
    const week = weeks.find((item) => item.weekStartDate === weekStartDate);
    if (!week || getRepeatTargetWindowState(week) !== "eligible") return;
    setSelected((current) => current.includes(weekStartDate)
      ? current.filter((value) => value !== weekStartDate)
      : [...current, weekStartDate]);
  };

  const openPreview = () => {
    if (!sourceWeekId || !selected.length) {
      Alert.alert(t("common.error"), t("practitioner.availability.selectRepeatTarget"));
      return;
    }

    preview.mutate(
      { sourceWeekId, targetWeekStartDates: selected, idempotencyKey },
      {
        onSuccess: (data) => router.push({
          pathname: "/(practitioner)/availability/repeat-review" as never,
          params: {
            sourceWeekId,
            targetWeekStartDates: JSON.stringify(selected),
            preview: JSON.stringify(data),
            idempotencyKey,
          },
        } as never),
        onError: () => Alert.alert(t("common.error"), t("practitioner.availability.repeatActionError")),
      },
    );
  };

  if (weeksQuery.isLoading) {
    return <Screen><Header showBack title={t("practitioner.availability.repeatTitle")} /><LoadingState message={t("practitioner.schedule.loading")} /></Screen>;
  }

  if (weeksQuery.isError || !weeksQuery.data) {
    return <Screen><Header showBack title={t("practitioner.availability.repeatTitle")} /><ErrorState title={t("practitioner.schedule.loadError")} message={t("practitioner.schedule.loadErrorBody")} retryText={t("common.retry")} onRetry={() => void weeksQuery.refetch()} /></Screen>;
  }

  return (
    <Screen>
      <Header showBack title={t("practitioner.availability.repeatTitle")} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text variant="caption" color={theme.colors.textSecondary} style={styles.body}>
          {t("practitioner.availability.repeatBody")}
        </Text>
        <Text variant="caption" color={theme.colors.textSecondary} style={styles.body}>
          {t("practitioner.availability.repeatSourceSummary")}
        </Text>

        <Text variant="caption" color={theme.colors.textMuted} style={styles.selectionCount}>
          {t("practitioner.availability.repeatSelectionCount", { count: selected.length })}
        </Text>

        {weeks.length ? weeks.map((week) => {
          const active = selected.includes(week.weekStartDate);
          const state = getRepeatTargetWindowState(week);
          const selectable = state === "eligible";
          const statusKey = active ? "selected" : state;
          const icon = active ? "checkmark-circle" : selectable ? "ellipse-outline" : "lock-closed";
          const iconColor = active ? theme.colors.primary : selectable ? theme.colors.textMuted : theme.colors.warning;

          return (
            <TouchableOpacity
              key={week.weekStartDate}
              onPress={() => toggle(week.weekStartDate)}
              disabled={!selectable}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: active, disabled: !selectable }}
              accessibilityLabel={formatWeekRange(week.weekStartDate, week.weekEndDate, i18n.language)}
              style={styles.targetPressable}
            >
              <Card
                variant="outlined"
                padding="sm"
                style={[
                  styles.card,
                  active && { borderColor: theme.colors.primary, backgroundColor: theme.colors.primarySoft },
                  !selectable && { borderColor: theme.colors.borderStrong, backgroundColor: theme.colors.surfaceContainerLow },
                ]}
              >
                <View style={styles.row}>
                  <Text weight="700" style={styles.range}>
                    {formatWeekRange(week.weekStartDate, week.weekEndDate, i18n.language)}
                  </Text>
                  <Ionicons name={icon} size={22} color={iconColor} />
                </View>
                <Text variant="caption" color={active ? theme.colors.primary : theme.colors.textSecondary}>
                  {t(`practitioner.availability.repeatTargetStatus.${statusKey}`)}
                </Text>
              </Card>
            </TouchableOpacity>
          );
        }) : (
          <Text variant="caption" color={theme.colors.textSecondary} style={styles.body}>
            {t("practitioner.availability.repeatNoEligibleTargets")}
          </Text>
        )}

        <Button
          title={t("practitioner.availability.reviewRepeat")}
          onPress={openPreview}
          loading={preview.isPending}
          disabled={!selected.length || preview.isPending}
          style={styles.reviewButton}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32, gap: 10 },
  body: { textAlign: "center", lineHeight: 20 },
  selectionCount: { textAlign: "center", marginTop: 4 },
  targetPressable: { minHeight: 44 },
  card: { marginBottom: 0, borderRadius: 14 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 6 },
  range: { flex: 1 },
  reviewButton: { marginTop: 6 },
});
