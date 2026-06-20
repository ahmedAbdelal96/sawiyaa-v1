import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { Button } from './Button';
import { useTheme } from '../../providers/ThemeProvider';

export interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export const EmptyState = ({
  title,
  description,
  actionLabel,
  onAction,
  icon,
}: EmptyStateProps) => {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor: theme.colors.iconContainerMuted,
            borderColor: theme.colors.border,
          },
        ]}
      >
        {icon || (
          <Ionicons name="document-text-outline" size={28} color={theme.colors.primary} />
        )}
      </View>

      <Text variant="title" weight="700" style={styles.title} color={theme.colors.textPrimary}>
        {title}
      </Text>

      {description ? (
        <Text style={styles.description} color={theme.colors.textSecondary}>
          {description}
        </Text>
      ) : null}

      {actionLabel && onAction ? (
        <View style={styles.action}>
          <Button title={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 28,
    gap: 12,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 320,
  },
  action: {
    marginTop: 4,
    width: '100%',
    maxWidth: 320,
  },
});
