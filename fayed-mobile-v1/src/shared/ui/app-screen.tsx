import type { PropsWithChildren } from "react";
import type {
  StyleProp,
  ViewStyle} from "react-native";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppTheme } from "@/core/theme/theme-provider";

type AppScreenProps = PropsWithChildren<{
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}>;

export function AppScreen({ children, scroll = false, contentStyle }: AppScreenProps) {
  const { colors, spacing } = useAppTheme();

  const content = scroll ? (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        {
          backgroundColor: colors.background,
          paddingHorizontal: spacing.xl,
          paddingTop: spacing.lg,
          paddingBottom: spacing.xxxl,
        },
        contentStyle,
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View
      style={[
        styles.content,
        {
          backgroundColor: colors.background,
          paddingHorizontal: spacing.xl,
          paddingTop: spacing.lg,
          paddingBottom: spacing.xxxl,
        },
        contentStyle,
      ]}
    >
      {children}
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View
        pointerEvents="none"
        style={[
          styles.glow,
          {
            backgroundColor: "rgba(197,236,204,0.34)",
            right: -130,
            top: -80,
          },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.glow,
          {
            backgroundColor: "rgba(213,227,255,0.42)",
            bottom: -150,
            left: -120,
          },
        ]}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.safeArea}
      >
        {content}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    alignSelf: "center",
    flexGrow: 1,
    maxWidth: 480,
    width: "100%",
  },
  glow: {
    borderRadius: 999,
    height: 280,
    position: "absolute",
    width: 280,
    zIndex: 0,
  },
});
