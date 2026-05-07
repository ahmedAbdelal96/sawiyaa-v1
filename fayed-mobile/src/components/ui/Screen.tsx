import React from 'react';
import { View, ViewProps, StyleSheet, I18nManager } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../providers/ThemeProvider';

export interface ScreenProps extends ViewProps {
  safeArea?: boolean;
  edges?: ('top' | 'right' | 'bottom' | 'left')[];
  bg?: 'background' | 'surface' | 'surfaceSecondary';
}

export const Screen = ({
  children,
  style,
  safeArea = true,
  edges = ['top', 'left', 'right', 'bottom'],
  bg = 'background',
  ...props
}: ScreenProps) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const isRTL = I18nManager.isRTL;

  const backgroundColor = theme.colors[bg] || theme.colors.background;
  const startInset = isRTL ? insets.right : insets.left;
  const endInset = isRTL ? insets.left : insets.right;

  const dynamicStyle = safeArea
    ? {
        paddingTop: edges.includes('top') ? insets.top : 0,
        paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
        paddingStart: edges.includes('left') ? startInset : 0,
        paddingEnd: edges.includes('right') ? endInset : 0,
      }
    : {};

  return (
    <View style={[styles.container, { backgroundColor }, dynamicStyle, style]} {...props}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
});
