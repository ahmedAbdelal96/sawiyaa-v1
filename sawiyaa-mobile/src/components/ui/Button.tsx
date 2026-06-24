import React from 'react';
import {
  ActivityIndicator,
  I18nManager,
  StyleSheet,
  TouchableOpacity,
  TouchableOpacityProps,
  View,
} from 'react-native';
import { useTheme } from '../../providers/ThemeProvider';
import { Text } from './Text';

type ButtonVariant = 'primary' | 'secondary';

export interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: ButtonVariant;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  accessibilityLabel?: string;
}

function ButtonBase({
  title,
  variant = 'primary',
  loading = false,
  leftIcon,
  rightIcon,
  style,
  disabled,
  accessibilityLabel,
  ...props
}: ButtonProps) {
  const { theme } = useTheme();
  const isRTL = I18nManager.isRTL;
  const isPrimary = variant === 'primary';
  const isDisabled = Boolean(disabled || loading);

  const backgroundColor = isPrimary ? theme.colors.primary : theme.colors.surfaceRaised;
  const borderColor = isPrimary ? theme.colors.primary : theme.colors.border;
  const textColor = isPrimary ? theme.colors.onPrimary : theme.colors.textPrimary;

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      activeOpacity={0.85}
      disabled={isDisabled}
      style={[
        styles.button,
        {
          minHeight: theme.touchTargets.lg,
          borderRadius: theme.radius.md,
          backgroundColor,
          borderColor,
          borderWidth: isPrimary ? 0 : StyleSheet.hairlineWidth,
          flexDirection: isRTL ? 'row-reverse' : 'row',
        },
        isDisabled ? { opacity: 0.56 } : null,
        style,
      ]}
      {...props}
    >
      {loading ? (
        <View style={[styles.contentRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <ActivityIndicator size="small" color={textColor} />
          <Text variant="button" color={textColor} style={styles.label}>
            {title}
          </Text>
        </View>
      ) : (
        <View style={[styles.contentRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {leftIcon ? <View style={styles.iconSlot}>{leftIcon}</View> : null}
          <Text variant="button" color={textColor} style={styles.label}>
            {title}
          </Text>
          {rightIcon ? <View style={styles.iconSlot}>{rightIcon}</View> : null}
        </View>
      )}
    </TouchableOpacity>
  );
}

export const Button = ButtonBase;
export const PrimaryButton = (props: Omit<ButtonProps, 'variant'>) => (
  <ButtonBase {...props} variant="primary" />
);
export const SecondaryButton = (props: Omit<ButtonProps, 'variant'>) => (
  <ButtonBase {...props} variant="secondary" />
);

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    width: '100%',
  },
  contentRow: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  iconSlot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    textAlign: 'center',
  },
});
