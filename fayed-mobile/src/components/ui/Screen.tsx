import React from 'react';
import { View, ViewProps, StyleSheet, SafeAreaView, Platform, StatusBar } from 'react-native';
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

  const backgroundColor = theme.colors[bg] || theme.colors.background;

  const dynamicStyle = safeArea
    ? {
        paddingTop: edges.includes('top') ? insets.top : 0,
        paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
        paddingLeft: edges.includes('left') ? insets.left : 0,
        paddingRight: edges.includes('right') ? insets.right : 0,
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
  },
});
