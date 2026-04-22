import React from 'react';
import { Text as RNText, TextProps as RNTextProps, I18nManager } from 'react-native';
import { useTheme } from '../../providers/ThemeProvider';

export interface TextProps extends RNTextProps {
  color?: string;
  weight?: 'normal' | 'bold' | '600' | '500';
}

export const Text = ({ style, color, weight, ...props }: TextProps) => {
  const { theme } = useTheme();

  const isRTL = I18nManager.isRTL;
  const textAlign = isRTL ? 'right' : 'left';

  return (
    <RNText
      style={[
        {
          color: color || theme.colors.textPrimary,
          fontWeight: weight || 'normal',
          textAlign, // Auto-align based on active layout
        },
        style,
      ]}
      {...props}
    />
  );
};
