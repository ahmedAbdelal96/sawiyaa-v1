import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Text } from './Text';
import { Button } from './Button';
import { useTheme } from '../../providers/ThemeProvider';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryText?: string;
  fullScreen?: boolean;
}

export const ErrorState = ({
  title,
  message,
  onRetry,
  retryText,
  fullScreen = false,
}: ErrorStateProps) => {
  const { theme } = useTheme();
  const { t } = useTranslation();

  return (
    <View style={[styles.container, fullScreen ? styles.fullScreen : null]}>
      <View
        style={[
          styles.iconWrap,
          {
            backgroundColor: theme.colors.statusErrorBg,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <Ionicons name="warning-outline" size={28} color={theme.colors.error} />
      </View>
      <Text variant="title" weight="700" style={styles.title} color={theme.colors.textPrimary}>
        {title || t('error_title', 'Something went wrong')}
      </Text>
      <Text style={styles.message} color={theme.colors.textSecondary}>
        {message || t('error_message', 'We could not load this content. Please try again.')}
      </Text>
      {onRetry ? (
        <View style={styles.action}>
          <Button title={retryText || t('retry', 'Retry')} onPress={onRetry} variant="secondary" />
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 28,
    gap: 12,
  },
  fullScreen: {
    flex: 1,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
  },
  message: {
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
