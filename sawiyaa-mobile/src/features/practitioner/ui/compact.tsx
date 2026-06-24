import React from "react";
import { I18nManager, StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text, Button } from "../../../components/ui";
import { useTheme } from "../../../providers/ThemeProvider";
import type { ThemeShape } from "../../../constants/theme";

export type PractitionerTone =
  | "daily"
  | "finance"
  | "support"
  | "account"
  | "messages"
  | "warning"
  | "danger"
  | "success"
  | "neutral"
  | "info";

export function resolvePractitionerTone(
  theme: ThemeShape,
  tone: PractitionerTone,
) {
  const palette = {
    daily: {
      surface: theme.colors.surface,
      border: theme.colors.borderLight,
      iconBackground: theme.colors.infoLight ?? theme.colors.primaryLight,
      iconColor: theme.colors.info ?? theme.colors.primary,
      accent: theme.colors.info ?? theme.colors.primary,
    },
    finance: {
      surface: theme.colors.surface,
      border: theme.colors.borderLight,
      iconBackground: theme.colors.successLight ?? theme.colors.primaryLight,
      iconColor: theme.colors.success ?? theme.colors.primary,
      accent: theme.colors.success ?? theme.colors.primary,
    },
    support: {
      surface: theme.colors.surface,
      border: theme.colors.borderLight,
      iconBackground: theme.colors.warningLight ?? theme.colors.primaryLight,
      iconColor: theme.colors.warning ?? theme.colors.primary,
      accent: theme.colors.warning ?? theme.colors.primary,
    },
    account: {
      surface: theme.colors.surface,
      border: theme.colors.borderLight,
      iconBackground: theme.colors.surfaceSecondary,
      iconColor: theme.colors.textSecondary,
      accent: theme.colors.textSecondary,
    },
    messages: {
      surface: theme.colors.surface,
      border: theme.colors.borderLight,
      iconBackground: theme.colors.infoLight ?? theme.colors.primaryLight,
      iconColor: theme.colors.info ?? theme.colors.primary,
      accent: theme.colors.info ?? theme.colors.primary,
    },
    warning: {
      surface: theme.colors.surface,
      border: theme.colors.borderLight,
      iconBackground: theme.colors.warningLight ?? theme.colors.surfaceSecondary,
      iconColor: theme.colors.warning ?? theme.colors.textSecondary,
      accent: theme.colors.warning ?? theme.colors.textSecondary,
    },
    danger: {
      surface: theme.colors.surface,
      border: theme.colors.borderLight,
      iconBackground: theme.colors.errorLight ?? theme.colors.surfaceSecondary,
      iconColor: theme.colors.error ?? theme.colors.textSecondary,
      accent: theme.colors.error ?? theme.colors.textSecondary,
    },
    success: {
      surface: theme.colors.surface,
      border: theme.colors.borderLight,
      iconBackground: theme.colors.successLight ?? theme.colors.surfaceSecondary,
      iconColor: theme.colors.success ?? theme.colors.textSecondary,
      accent: theme.colors.success ?? theme.colors.textSecondary,
    },
    neutral: {
      surface: theme.colors.surface,
      border: theme.colors.borderLight,
      iconBackground: theme.colors.surfaceSecondary,
      iconColor: theme.colors.textMuted,
      accent: theme.colors.textMuted,
    },
    info: {
      surface: theme.colors.surface,
      border: theme.colors.borderLight,
      iconBackground: theme.colors.infoLight ?? theme.colors.surfaceSecondary,
      iconColor: theme.colors.info ?? theme.colors.textSecondary,
      accent: theme.colors.info ?? theme.colors.textSecondary,
    },
  } satisfies Record<
    PractitionerTone,
    {
      surface: string;
      border: string;
      iconBackground: string;
      iconColor: string;
      accent: string;
    }
  >;

  return palette[tone];
}

export function CompactSectionHeader({
  title,
  subtitle,
  action,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}) {
  const { theme } = useTheme();

  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderText}>
        <Text weight="600" style={styles.sectionTitle} color={theme.colors.textPrimary}>
          {title}
        </Text>
        {subtitle ? (
          <Text color={theme.colors.textSecondary} style={styles.sectionSubtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action ? <View style={styles.sectionAction}>{action}</View> : null}
    </View>
  );
}

export function CompactEmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}) {
  const { theme } = useTheme();

  return (
    <View style={[styles.emptyShell, { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.borderLight }]}>
      <View style={styles.emptyIconWrap}>
        {icon ?? <Ionicons name="document-text-outline" size={28} color={theme.colors.textMuted} />}
      </View>
      <Text weight="600" style={styles.emptyTitle} color={theme.colors.textPrimary}>
        {title}
      </Text>
      {description ? (
        <Text color={theme.colors.textSecondary} style={styles.emptyDescription}>
          {description}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button title={actionLabel} onPress={onAction} variant="secondary" style={styles.emptyAction} />
      ) : null}
    </View>
  );
}

export function CompactActionLink({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  const { theme } = useTheme();

  return (
    <TouchableOpacity onPress={onPress} style={styles.actionLink}>
      <Text weight="600" color={theme.colors.textBrand} style={styles.actionLinkText}>
        {label}
      </Text>
      <Ionicons
        name={I18nManager.isRTL ? "arrow-back" : "arrow-forward"}
        size={14}
        color={theme.colors.textBrand}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  sectionHeaderText: {
    flex: 1,
    gap: 2,
  },
  sectionTitle: {
    fontSize: 14,
    lineHeight: 19,
  },
  sectionSubtitle: {
    fontSize: 10,
    lineHeight: 14,
  },
  sectionAction: {
    alignItems: "flex-end",
    justifyContent: "center",
  },
  emptyShell: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 14,
    alignItems: "center",
    gap: 5,
  },
  emptyIconWrap: {
    marginBottom: 0,
  },
  emptyTitle: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
  emptyDescription: {
    fontSize: 10,
    lineHeight: 15,
    textAlign: "center",
  },
  emptyAction: {
    marginTop: 4,
    minHeight: 46,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  actionLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  actionLinkText: {
    fontSize: 11,
  },
});
