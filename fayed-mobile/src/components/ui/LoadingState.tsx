import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { useTheme } from '../../providers/ThemeProvider';

export interface LoadingStateProps {
  message?: string;
  fullScreen?: boolean;
}

export const LoadingState = ({ message, fullScreen = false }: LoadingStateProps) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, fullScreen ? styles.fullScreen : null]}>
      <View
        style={[
          styles.spinnerWrap,
          {
            backgroundColor: theme.colors.iconContainerMuted,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
      {message ? (
        <Text style={styles.message} color={theme.colors.textSecondary}>
          {message}
        </Text>
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
  spinnerWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 320,
  },
});
