import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './Text';
import { Button } from './Button';
import { useTheme } from '../../providers/ThemeProvider';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

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
    <View style={[styles.container, fullScreen && styles.fullScreen]}>
      <View style={styles.iconPlaceholder}>
        <Ionicons name="warning-outline" size={48} color="#ef4444" />
      </View>
      <Text weight="bold" style={styles.title} color={theme.colors.textPrimary}>
        {title || t('error_title', 'Something went wrong')}
      </Text>
      <Text style={styles.message} color={theme.colors.textSecondary}>
        {message || t('error_message', 'We are having trouble loading this data. Please try again.')}
      </Text>
      {onRetry && (
        <View style={styles.buttonContainer}>
          <Button title={retryText || t('retry', 'Retry')} onPress={onRetry} variant="secondary" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    maxWidth: 360,
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: "center",
  },
  fullScreen: {
    flex: 1,
  },
  iconPlaceholder: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: '100%',
    lineHeight: 22,
  },
  buttonContainer: {
    width: '100%',
  },
});
