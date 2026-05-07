import React, { useState } from 'react';
import { View, TextInput, TextInputProps, StyleSheet, I18nManager } from 'react-native';
import { Text } from './Text';
import { useTheme } from '../../providers/ThemeProvider';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const Input = ({
  label,
  error,
  helperText,
  style,
  leftElement,
  rightElement,
  onFocus,
  onBlur,
  ...props
}: InputProps) => {
  const { theme } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const isRTL = I18nManager.isRTL;

  const handleFocus = (e: any) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const borderColor = error
    ? '#ef4444' // Error red
    : isFocused
    ? theme.colors.primary
    : theme.colors.borderStrong;

  const bgColor = theme.colors.surface;

  return (
    <View style={styles.container}>
      {label && (
        <Text weight="500" style={styles.label} color={theme.colors.textSecondary}>
          {label}
        </Text>
      )}
      <View
        style={[
          styles.inputContainer,
          {
            borderColor,
            backgroundColor: bgColor,
            flexDirection: isRTL ? 'row-reverse' : 'row',
          },
        ]}
      >
        {leftElement && <View style={styles.leftElement}>{leftElement}</View>}
        <TextInput
          style={[
            styles.input,
            {
              color: theme.colors.textPrimary,
              textAlign: isRTL ? 'right' : 'left',
            },
            style,
          ]}
          placeholderTextColor={theme.colors.textMuted}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
        {rightElement && <View style={styles.rightElement}>{rightElement}</View>}
      </View>
      {error ? (
        <Text style={styles.errorText} color="#ef4444">
          {error}
        </Text>
      ) : helperText ? (
        <Text style={styles.helperText} color={theme.colors.textMuted}>
          {helperText}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
  },
  inputContainer: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 60,
    alignItems: 'center',
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    minHeight: 60,
    paddingHorizontal: 16,
    fontSize: 16,
    paddingVertical: 16,
  },
  leftElement: {
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightElement: {
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
  helperText: {
    fontSize: 12,
    marginTop: 4,
  },
});
