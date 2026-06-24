import React from "react";
import { I18nManager, StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Card, Text } from "../../../../components/ui";
import { useTheme } from "../../../../providers/ThemeProvider";

export type AssessmentCardStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";

interface AssessmentStatusCardProps {
  title: string;
  description: string;
  durationMinutes: number | null;
  questionCount?: number | null;
  status: AssessmentCardStatus;
  statusLabel: string;
  actionLabel: string;
  onPress: () => void;
  footerNote?: string | null;
  disabled?: boolean;
}

export function AssessmentStatusCard({
  title,
  description,
  durationMinutes,
  questionCount,
  status,
  statusLabel,
  actionLabel,
  onPress,
  footerNote,
  disabled = false,
}: AssessmentStatusCardProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const isRTL = I18nManager.isRTL;

  const statusColor =
    status === "COMPLETED"
      ? "#0f7a45"
      : status === "IN_PROGRESS"
        ? "#a86500"
        : theme.colors.textSecondary;

  const statusBackground =
    status === "COMPLETED"
      ? "rgba(15, 122, 69, 0.12)"
      : status === "IN_PROGRESS"
        ? "rgba(168, 101, 0, 0.12)"
        : theme.colors.surfaceTertiary;

  const borderAccent =
    status === "COMPLETED"
      ? "#0f7a45"
      : status === "IN_PROGRESS"
        ? "#a86500"
        : theme.colors.borderStrong;

  const statusIconName =
    status === "COMPLETED"
      ? "checkmark-circle"
      : status === "IN_PROGRESS"
        ? "time"
        : "ellipse-outline";

  return (
    <Card
      style={[styles.card, { borderColor: theme.colors.borderLight }]}
      variant="elevated"
    >
      <View style={[styles.topAccent, { backgroundColor: borderAccent }]} />
      {/* Status pill row — aligned to the reading-start side */}
      <View
        style={[
          styles.pillRow,
          { justifyContent: isRTL ? "flex-start" : "flex-end" },
        ]}
      >
        <View
          style={[styles.statusPill, { backgroundColor: statusBackground }]}
        >
          <Ionicons name={statusIconName} size={14} color={statusColor} />
          <Text color={statusColor} style={styles.statusText} weight="600">
            {statusLabel}
          </Text>
        </View>
      </View>

      {/* Title on its own row */}
      <Text
        weight="bold"
        style={[styles.title, { textAlign: isRTL ? "right" : "left" }]}
      >
        {title}
      </Text>

      <Text
        color={theme.colors.textSecondary}
        style={[styles.description, { textAlign: isRTL ? "right" : "left" }]}
      >
        {description}
      </Text>

      <View
        style={[
          styles.metaRow,
          {
            flexDirection: isRTL ? "row" : "row-reverse",
            justifyContent: "flex-end",
          },
        ]}
      >
        {durationMinutes != null ? (
          <View style={styles.metaItem}>
            <Ionicons
              name="time-outline"
              size={15}
              color={theme.colors.textMuted}
            />
            <Text color={theme.colors.textSecondary} style={styles.metaText}>
              {t("assessments.card.duration", { value: durationMinutes })}
            </Text>
          </View>
        ) : null}

        {typeof questionCount === "number" ? (
          <View style={styles.metaItem}>
            <Ionicons
              name="list-outline"
              size={15}
              color={theme.colors.textMuted}
            />
            <Text color={theme.colors.textSecondary} style={styles.metaText}>
              {t("assessments.card.questionCount", { value: questionCount })}
            </Text>
          </View>
        ) : null}

        {footerNote ? (
          <View style={styles.metaItem}>
            <Ionicons
              name="calendar-outline"
              size={15}
              color={theme.colors.textMuted}
            />
            <Text color={theme.colors.textSecondary} style={styles.metaText}>
              {footerNote}
            </Text>
          </View>
        ) : null}
      </View>

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        disabled={disabled}
        style={[
          styles.actionButton,
          {
            backgroundColor:
              status === "IN_PROGRESS" ? "#a86500" : theme.colors.primary,
            opacity: disabled ? 0.45 : 1,
          },
        ]}
      >
        <Text color="#ffffff" weight="600" style={styles.actionText}>
          {actionLabel}
        </Text>
      </TouchableOpacity>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 10,
    paddingTop: 14,
  },
  topAccent: {
    height: 4,
    borderRadius: 999,
    marginBottom: 8,
  },
  pillRow: {
    flexDirection: "row",
  },
  title: {
    fontSize: 26,
    lineHeight: 31,
  },
  description: {
    fontSize: 15,
    lineHeight: 23,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 12,
  },
  metaRow: {
    alignItems: "center",
    gap: 16,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metaText: {
    fontSize: 13,
  },
  actionButton: {
    marginTop: 4,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  actionText: {
    fontSize: 15,
  },
});
