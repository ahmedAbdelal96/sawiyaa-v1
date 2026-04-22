import React from 'react';
import { TouchableOpacity, StyleSheet, TouchableOpacityProps } from 'react-native';
import { Text } from './Text';
import { useTheme } from '../../providers/ThemeProvider';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary';
}

export const Button = ({ title, variant = 'primary', style, ...props }: ButtonProps) => {
  const { theme } = useTheme();

  const isPrimary = variant === 'primary';
  const backgroundColor = isPrimary ? theme.colors.primary : theme.colors.surfaceSecondary;
  const textColor = isPrimary ? '#ffffff' : theme.colors.textPrimary;
  const borderColor = isPrimary ? 'transparent' : theme.colors.borderStrong;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor, borderColor, borderWidth: isPrimary ? 0 : 1 },
        style,
      ]}
      activeOpacity={0.8}
      {...props}
    >
      <Text color={textColor} weight="600" style={styles.text}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  text: {
    fontSize: 16,
    textAlign: 'center',
  },
});
