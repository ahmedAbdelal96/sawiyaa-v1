import React from 'react';
import { Text as RNText, TextProps as RNTextProps } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../providers/ThemeProvider';
import { getAppDirection } from '../../i18n/direction';

type TextVariant =
  | 'display'
  | 'h1'
  | 'h2'
  | 'title'
  | 'subtitle'
  | 'body'
  | 'bodySmall'
  | 'caption'
  | 'button'
  | 'tabLabel';

export interface TextProps extends RNTextProps {
  color?: string;
  weight?: 'normal' | 'bold' | '700' | '600' | '500' | '400';
  variant?: TextVariant;
}

export const Text = ({ style, color, weight, variant = 'body', ...props }: TextProps) => {
  const { theme } = useTheme();
  const { i18n } = useTranslation();
  const direction = getAppDirection(i18n.language);
  const textAlign = direction === 'rtl' ? 'right' : 'left';
  const writingDirection = direction;
  const variantStyle = theme.typography[variant];
  const resolvedWeight = weight || (variantStyle.fontWeight as TextProps['weight']) || 'normal';

  return (
    <RNText
      style={[
        {
          color: color || theme.colors.textPrimary,
          fontSize: variantStyle.fontSize,
          lineHeight: variantStyle.lineHeight,
          fontWeight: resolvedWeight,
          textAlign,
          writingDirection,
        },
        style,
      ]}
      {...props}
    />
  );
};
