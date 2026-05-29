/**
 * Mobile Shell — shared layout constants for the Fayed mobile app.
 * All spacing, sizing, and color references flow through this file.
 * Do NOT hardcode pixel values in screen components — use these tokens.
 */
import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { I18nManager } from 'react-native';
import { useTheme } from '../../providers/ThemeProvider';

export { useTheme };

/** Compact header height after safe-area top */
export const MOBILE_HEADER_HEIGHT = 56;

/** Standard horizontal page padding */
export const MOBILE_HORIZONTAL_PADDING = 18;

/** Gap between major sections */
export const MOBILE_SECTION_GAP = 16;

/** Card internal padding */
export const MOBILE_CARD_PADDING = 20;

/** Card border radius */
export const MOBILE_CARD_RADIUS = 18;

/** Bottom tab bar height base (before safe-area) */
export const MOBILE_TAB_BAR_HEIGHT = 76;

/** Bottom tab icon size */
export const MOBILE_TAB_ICON_SIZE = 23;

/** Active tab pill background */
// Use theme.colors.primaryLight in runtime; keep this as a legacy fallback.
export const ACTIVE_TAB_BG = '#E0F2EF';

/** Compact screen shell — for screens that don't use scaffold/pageScaffold */
export function MobileScreenShell({
  children,
  style,
  contentStyle,
  safeArea = true,
  edges = ['top', 'left', 'right', 'bottom'] as const,
  bg = 'background' as 'background' | 'surface' | 'surfaceSecondary',
  ...props
}: {
  children: React.ReactNode;
  style?: ViewProps['style'];
  contentStyle?: ViewProps['style'];
  safeArea?: boolean;
  edges?: readonly ('top' | 'right' | 'bottom' | 'left')[];
  bg?: 'background' | 'surface' | 'surfaceSecondary';
} & ViewProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const isRTL = I18nManager.isRTL;

  const bgColor = theme.colors[bg] ?? theme.colors.background;
  const startInset = isRTL ? insets.right : insets.left;
  const endInset = isRTL ? insets.left : insets.right;

  const dynamicPadding = safeArea
    ? {
        paddingTop: edges.includes('top') ? insets.top : 0,
        paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
        paddingStart: edges.includes('left') ? startInset : 0,
        paddingEnd: edges.includes('right') ? endInset : 0,
      }
    : {};

  return (
    <View style={[{ flex: 1, backgroundColor: bgColor }, dynamicPadding, style]} {...props}>
      <View style={[{ flex: 1, paddingHorizontal: MOBILE_HORIZONTAL_PADDING }, contentStyle]}>
        {children}
      </View>
    </View>
  );
}

/** Scrollable content wrapper with bottom padding for bottom tabs */
export function MobileScrollContent({
  children,
  style,
  contentContainerStyle,
}: {
  children: React.ReactNode;
  style?: ViewProps['style'];
  contentContainerStyle?: ViewProps['style'];
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.scrollContent,
        { paddingBottom: Math.max(insets.bottom, 12) + MOBILE_TAB_BAR_HEIGHT + 16 },
        style,
      ]}
    >
      <View style={contentContainerStyle}>{children}</View>
    </View>
  );
}

/** Bottom tab bar shared styles */
export const mobileTabBarStyles = StyleSheet.create({
  bar: {
    backgroundColor: '#ffffff',
    borderTopColor: '#d9e0e6',
    borderTopWidth: 1,
    elevation: 0,
    shadowOpacity: 0,
    shadowColor: 'transparent',
    height: MOBILE_TAB_BAR_HEIGHT,
    paddingTop: 8,
    paddingHorizontal: 8,
  },
  item: {
    paddingVertical: 6,
    borderRadius: 14,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
  },
});

const styles = StyleSheet.create({
  scrollContent: {
    flex: 1,
    paddingTop: MOBILE_HEADER_HEIGHT + MOBILE_SECTION_GAP,
  },
});
