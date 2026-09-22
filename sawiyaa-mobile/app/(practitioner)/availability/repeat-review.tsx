import React from "react";
import { Alert, ScrollView, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Button, Card, Header, Screen, Text } from "../../../src/components/ui";
import {
  useConfirmAvailabilityWeekRepeat,
  useMyAvailabilityWeeks,
} from "../../../src/features/practitioner/availability/hooks";
import { getRepeatPreviewCounts, getRepeatTargetReasonKey } from "../../../src/features/practitioner/availability/repeat-view-model";
import type { AvailabilityRepeatConfirmation, AvailabilityRepeatPreview } from "../../../src/features/practitioner/availability/types";
import { formatWeekRange } from "../../../src/features/practitioner/availability/utils";
import { useTheme } from "../../../src/providers/ThemeProvider";

function getWeekEndDate(weekStartDate: string) {
  const date = new Date(`${weekStartDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 6);
  return date.toISOString().slice(0, 10);
}

export default function RepeatReviewScreen() {
  const params = useLocalSearchParams<{ sourceWeekId: string; preview: string; idempotencyKey: string }>();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const confirm = useConfirmAvailabilityWeekRepeat();
  const weeksQuery = useMyAvailabilityWeeks();
  const [confirmation, setConfirmation] = React.useState<AvailabilityRepeatConfirmation | null>(null);
  const [isConfirming, setIsConfirming] = React.useState(false);

  let preview: AvailabilityRepeatPreview | null = null;
  try {
    preview = JSON.parse(params.preview) as AvailabilityRepeatPreview;
  } catch {
    // Route data is validated below.
  }

  if (!preview) {
    return <Screen><Header showBack title={t("practitioner.availability.repeatReviewTitle")} /><Text style={styles.center}>{t("practitioner.availability.previewUnavailable")}</Text></Screen>;
  }

  const counts = getRepeatPreviewCounts(preview.targets);
  const exceptions = preview.targets.filter((target) => target.classification !== "ELIGIBLE");

  const executeRepeat = () => confirm.mutate(
    {
      sourceWeekId: params.sourceWeekId,
      operationId: preview!.operationId,
      idempotencyKey: params.idempotencyKey,
    },
    {
      onSuccess: async (result) => {
        setConfirmation(result);
        if (result.status !== "COMPLETED") return;
        router.replace("/(practitioner)/availability?repeatSuccess=1" as never);
        void weeksQuery.refetch();
      },
      onError: () => Alert.alert(t("common.error"), t("practitioner.availability.repeatExpired")),
    },
  );

  return (
    <Screen>
      <Header showBack title={t("practitioner.availability.repeatReviewTitle")} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text weight="700" style={styles.heading}>
          {t("practitioner.availability.repeatPreviewSummary", { count: counts.eligibleWeeks })}
        </Text>
        <Text variant="caption" color={theme.colors.textSecondary} style={styles.center}>
          {t("practitioner.availability.repeatReviewBody")}
        </Text>

        {counts.eligibleWeeks > 0 ? (
          <Card variant="outlined" padding="sm" style={styles.summaryCard}>
            <Text weight="700" style={styles.center}>
              {t("practitioner.availability.repeatPreviewSlots", { count: counts.copiedSlots })}
            </Text>
          </Card>
        ) : (
          <Text variant="caption" color={theme.colors.warning} style={styles.center}>
            {t("practitioner.availability.repeatNoEligibleTargets")}
          </Text>
        )}

        {exceptions.length ? (
          <>
            <Text weight="700" style={styles.sectionTitle}>
              {t("practitioner.availability.repeatPreviewExceptions", { count: exceptions.length })}
            </Text>
            {exceptions.map((target) => {
              const reasonKey = getRepeatTargetReasonKey(target.reasonCode);
              return (
                <Card key={target.weekStartDate} variant="outlined" padding="sm" style={styles.exceptionCard}>
                  <Text weight="700">
                    {formatWeekRange(target.weekStartDate, getWeekEndDate(target.weekStartDate), i18n.language)}
                  </Text>
                  <Text variant="caption" color={theme.colors.warning} style={styles.exceptionText}>
                    {t(`practitioner.availability.repeatTargetStatus.${reasonKey}`)}
                  </Text>
                </Card>
              );
            })}
            <Text variant="caption" color={theme.colors.textSecondary} style={styles.center}>
              {t("practitioner.availability.repeatConflictHelp")}
            </Text>
          </>
        ) : null}

        {confirmation?.status === "COMPLETED" ? (
          <Text variant="caption" color={theme.colors.success} style={styles.center}>
            {t("practitioner.availability.repeatSuccess")}
          </Text>
        ) : isConfirming ? (
          <Card variant="outlined" padding="sm" style={styles.confirmationCard}>
            <Text weight="700" style={styles.center}>
              {t("practitioner.availability.confirmRepeatTitle")}
            </Text>
            <Text variant="caption" color={theme.colors.textSecondary} style={styles.confirmationBody}>
              {t("practitioner.availability.confirmRepeatBody")}
            </Text>
            <Button
              title={t("practitioner.availability.confirmRepeat")}
              onPress={executeRepeat}
              loading={confirm.isPending}
              disabled={confirm.isPending || !preview.confirmationAllowed}
            />
            <Button
              title={t("common.cancel")}
              variant="secondary"
              onPress={() => setIsConfirming(false)}
              disabled={confirm.isPending}
            />
          </Card>
        ) : (
          <Button
            title={t("practitioner.availability.confirmRepeat")}
            onPress={() => setIsConfirming(true)}
            loading={confirm.isPending}
            disabled={!preview.confirmationAllowed || confirm.isPending}
            style={styles.confirmButton}
          />
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32, gap: 10 },
  heading: { textAlign: "center", fontSize: 18, lineHeight: 24 },
  center: { textAlign: "center", lineHeight: 20 },
  summaryCard: { borderRadius: 14 },
  sectionTitle: { marginTop: 8 },
  exceptionCard: { borderRadius: 14 },
  exceptionText: { marginTop: 4 },
  confirmationCard: { borderRadius: 14, gap: 10, marginTop: 8 },
  confirmationBody: { textAlign: "center", lineHeight: 20 },
  confirmButton: { marginTop: 8 },
});
