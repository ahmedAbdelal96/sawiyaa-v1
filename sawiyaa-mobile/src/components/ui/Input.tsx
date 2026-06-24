import React, { useState } from 'react';
import {
  View,
  TextInput,
  TextInputProps,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from './Text';
import { useTheme } from '../../providers/ThemeProvider';
import { getAppDirection } from '../../i18n/direction';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  labelDirection?: "left" | "right";
  placeholderDirection?: "left" | "right";
}

export const Input = ({
  label,
  error,
  helperText,
  style,
  containerStyle,
  leftElement,
  rightElement,
  onFocus,
  onBlur,
  labelDirection,
  placeholderDirection,
  ...props
}: InputProps) => {
  const { theme } = useTheme();
  const { i18n } = useTranslation();
  const [isFocused, setIsFocused] = useState(false);
  const direction = getAppDirection(i18n.language);
  const isRTL = direction === 'rtl';
  const resolvedLabelDir = labelDirection ?? (isRTL ? "right" : "left");
  const resolvedPlaceholderDir = placeholderDirection ?? (isRTL ? "right" : "left");

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
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text
          weight="500"
          style={[
            styles.label,
            { textAlign: resolvedLabelDir, writingDirection: direction },
          ]}
          color={theme.colors.textSecondary}
        >
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
              textAlign: resolvedPlaceholderDir,
              writingDirection: direction,
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
        <Text
          style={[
            styles.errorText,
            { textAlign: resolvedLabelDir, writingDirection: direction },
          ]}
          color="#ef4444"
        >
          {error}
        </Text>
      ) : helperText ? (
        <Text
          style={[
            styles.helperText,
            { textAlign: resolvedLabelDir, writingDirection: direction },
          ]}
          color={theme.colors.textMuted}
        >
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
    minWidth: 0,
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
