import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
  View,
  ViewProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../providers/ThemeProvider';
import { getAppDirection } from '../../i18n/direction';
import { useTranslation } from 'react-i18next';

type ScreenBackground =
  | 'background'
  | 'surface'
  | 'surfaceRaised'
  | 'surfaceMuted'
  | 'surfaceSecondary';

export interface ScreenProps extends ViewProps {
  safeArea?: boolean;
  edges?: ('top' | 'right' | 'bottom' | 'left')[];
  bg?: ScreenBackground;
  scrollable?: boolean;
  keyboardAvoiding?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

export const AppScreen = ({
  children,
  style,
  safeArea = true,
  edges = ['top', 'left', 'right', 'bottom'],
  bg = 'background',
  scrollable = false,
  keyboardAvoiding = false,
  contentContainerStyle,
  ...props
}: ScreenProps) => {
  const { theme } = useTheme();
  const { i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const direction = getAppDirection(i18n.language);
  const isRTL = direction === 'rtl';

  const backgroundColor =
    theme.colors[bg] || theme.colors.background;
  const startInset = isRTL ? insets.right : insets.left;
  const endInset = isRTL ? insets.left : insets.right;

  const safeAreaStyle = safeArea
    ? {
        paddingTop: edges.includes('top') ? insets.top : 0,
        paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
        paddingStart: edges.includes('left') ? startInset : 0,
        paddingEnd: edges.includes('right') ? endInset : 0,
      }
    : null;

  const containerStyle = [
    styles.container,
    {
      backgroundColor,
      paddingHorizontal: theme.spacing.page,
    },
    safeAreaStyle,
    style,
  ];

  if (scrollable) {
    const content = (
      <ScrollView
        contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    );

    return keyboardAvoiding ? (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={containerStyle}
        {...props}
      >
        {content}
      </KeyboardAvoidingView>
    ) : (
      <View style={containerStyle} {...props}>
        {content}
      </View>
    );
  }

  return (
    <View style={containerStyle} {...props}>
      {children}
    </View>
  );
};

export const Screen = AppScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
