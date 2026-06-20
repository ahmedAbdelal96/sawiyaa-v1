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
      <Text variant="caption" style={styles.label} weight="600" color={colors.text}>
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
        bg: theme.colors.statusSuccessBg,
        border: theme.colors.statusSuccessBg,
        text: theme.colors.statusSuccessText,
      };
    case 'warning':
      return {
        bg: theme.colors.statusWarningBg,
        border: theme.colors.statusWarningBg,
        text: theme.colors.statusWarningText,
      };
    case 'error':
      return {
        bg: theme.colors.statusErrorBg,
        border: theme.colors.statusErrorBg,
        text: theme.colors.statusErrorText,
      };
    case 'info':
      return {
        bg: theme.colors.statusInfoBg,
        border: theme.colors.statusInfoBg,
        text: theme.colors.statusInfoText,
      };
    case 'default':
    default:
      return {
        bg: theme.colors.surfaceContainer,
        border: theme.colors.border,
        text: theme.colors.textSecondary,
      };
  }
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    alignSelf: 'flex-start',
    borderWidth: StyleSheet.hairlineWidth,
  },
  label: {
    textTransform: 'none',
  },
});
