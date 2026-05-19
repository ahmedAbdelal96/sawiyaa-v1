import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  TouchableOpacityProps,
  View,
} from 'react-native';
import { Text } from './Text';
import { useTheme } from '../../providers/ThemeProvider';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary';
  loading?: boolean;
}

export const Button = ({
  title,
  variant = 'primary',
  loading = false,
  style,
  disabled,
  ...props
}: ButtonProps) => {
  const { theme } = useTheme();

  const isPrimary = variant === 'primary';
  const backgroundColor = isPrimary ? theme.colors.primary : theme.colors.surfaceSecondary;
  const textColor = isPrimary ? '#ffffff' : theme.colors.textPrimary;
  const borderColor = isPrimary ? 'transparent' : theme.colors.borderStrong;
  const isDisabled = disabled || loading;

  return (
      <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor, borderColor, borderWidth: isPrimary ? 0 : 1 },
        isDisabled ? styles.buttonDisabled : null,
        style,
      ]}
      activeOpacity={0.8}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={textColor} />
          <Text color={textColor} weight="600" style={styles.text}>
            {title}
          </Text>
        </View>
      ) : (
        <Text color={textColor} weight="600" style={styles.text}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    minHeight: 60,
    paddingVertical: 17,
    paddingHorizontal: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  text: {
    fontSize: 16,
    textAlign: 'center',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
