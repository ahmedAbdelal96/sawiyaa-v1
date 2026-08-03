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
import { useAppDirection } from '../../i18n/direction';

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
  const { theme, isDark } = useTheme();
  const { i18n } = useTranslation();
  const [isFocused, setIsFocused] = useState(false);
  const { isRTL, textAlign, writingDirection, rowDirection } = useAppDirection();

  const resolvedLabelDir = labelDirection ?? textAlign;
  const resolvedPlaceholderDir = placeholderDirection ?? textAlign;

  const handleFocus = (e: any) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  // High contrast input borders and background colors
  const borderColor = error
    ? '#DC2626' // Crisp Error Red
    : isFocused
    ? theme.colors.primary // Brand Teal Active Border
    : isDark
    ? '#2D3A37'
    : '#CBD5D1'; // Clean Crisp Soft Border

  const bgColor = isDark ? '#1A2422' : '#FFFFFF'; // Crisp Pure White in Light Mode

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text
          weight="600"
          style={[
            styles.label,
            { textAlign: resolvedLabelDir, writingDirection, color: isDark ? '#E0ECE8' : '#053F38' },
          ]}
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
            flexDirection: rowDirection,
          },
          isFocused ? styles.focusedShadow : null,
        ]}
      >
        {leftElement && <View style={styles.elementSlot}>{leftElement}</View>}
        <TextInput
          style={[
            styles.input,
            {
              color: isDark ? '#F5FBF9' : '#053F38',
              textAlign: resolvedPlaceholderDir,
              writingDirection,
            },
            style,
          ]}
          placeholderTextColor={isDark ? '#7E918B' : '#71857F'}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
        {rightElement && <View style={styles.elementSlot}>{rightElement}</View>}
      </View>
      {error ? (
        <Text
          style={[
            styles.errorText,
            { textAlign: resolvedLabelDir, writingDirection },
          ]}
          color="#DC2626"
        >
          {error}
        </Text>
      ) : helperText ? (
        <Text
          style={[
            styles.helperText,
            { textAlign: resolvedLabelDir, writingDirection },
          ]}
          color={isDark ? '#9EB2AB' : '#5C6E68'}
        >
          {helperText}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
    width: '100%',
    minWidth: 0,
  },
  label: {
    fontSize: 13.5,
    marginBottom: 6,
    letterSpacing: -0.1,
  },
  inputContainer: {
    borderWidth: 1.5,
    borderRadius: 14,
    minHeight: 48,
    alignItems: 'center',
    overflow: 'hidden',
  },
  focusedShadow: {
    shadowColor: 'rgba(5, 63, 56, 0.15)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  input: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 14,
    fontSize: 14.5,
    paddingVertical: 10,
  },
  elementSlot: {
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 48,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  helperText: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 17,
  },
});
