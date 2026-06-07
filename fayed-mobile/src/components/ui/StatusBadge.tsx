import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './Text';
import { useTheme } from '../../providers/ThemeProvider';

export type BadgeStatus = 'success' | 'warning' | 'error' | 'info' | 'default';

export interface StatusBadgeProps {
  label: string;
  status?: BadgeStatus;
}

export const StatusBadge = ({ label, status = 'default' }: StatusBadgeProps) => {
  const { theme } = useTheme();
  const colors = resolveColors(theme, status);

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
        },
      ]}
    >
      <Text style={styles.label} weight="600" color={colors.text}>
        {label}
      </Text>
    </View>
  );
};

function resolveColors(
  theme: ReturnType<typeof useTheme>["theme"],
  status: BadgeStatus,
) {
  switch (status) {
    case 'success':
      return {
        bg: theme.colors.successLight ?? '#dcfce7',
        border: theme.colors.successLight ?? '#bbf7d0',
        text: theme.colors.success ?? '#166534',
      };
    case 'warning':
      return {
        bg: theme.colors.warningLight ?? '#fef9c3',
        border: theme.colors.warningLight ?? '#fde68a',
        text: theme.colors.warning ?? '#854d0e',
      };
    case 'error':
      return {
        bg: theme.colors.errorLight ?? '#fee2e2',
        border: theme.colors.errorLight ?? '#fecaca',
        text: theme.colors.error ?? '#991b1b',
      };
    case 'info':
      return {
        bg: theme.colors.infoLight ?? '#dbeafe',
        border: theme.colors.infoLight ?? '#bfdbfe',
        text: theme.colors.info ?? '#1e40af',
      };
    case 'default':
    default:
      return {
        bg: theme.colors.surfaceSecondary,
        border: theme.colors.borderLight,
        text: theme.colors.textSecondary,
      };
  }
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    borderWidth: 1,
  },
  label: {
    fontSize: 12,
    textTransform: 'none',
  },
});
