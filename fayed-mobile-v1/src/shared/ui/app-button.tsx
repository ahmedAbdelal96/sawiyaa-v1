import { LinearGradient } from "expo-linear-gradient";
import type { StyleProp, ViewStyle } from "react-native";
import { ActivityIndicator, Pressable, StyleSheet } from "react-native";

import { useAppTheme } from "@/core/theme/theme-provider";
import { AppText } from "@/shared/ui/app-text";

type AppButtonProps = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "ghost";
  style?: StyleProp<ViewStyle>;
};

export function AppButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = "primary",
  style,
}: AppButtonProps) {
  const { colors, radii, spacing } = useAppTheme();
  const isPrimary = variant === "primary";
  const isSecondary = variant === "secondary";
  const isGhost = variant === "ghost";

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: isPrimary
            ? "transparent"
            : isSecondary
              ? colors.surfaceLow
              : "transparent",
          borderColor: isGhost ? "transparent" : "rgba(194,198,211,0.24)",
          borderRadius: radii.pill,
          opacity: disabled ? 0.5 : 1,
          minHeight: 60,
          paddingHorizontal: spacing.xl,
          paddingVertical: spacing.md + 1,
        },
        pressed && !disabled ? { transform: [{ scale: 0.98 }] } : null,
        style,
      ]}
    >
      {isPrimary ? (
        <LinearGradient
          colors={[colors.primary, colors.primaryContainer]}
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={[StyleSheet.absoluteFillObject, { borderRadius: radii.pill }]}
        />
      ) : null}
      {loading ? (
        <ActivityIndicator color={isPrimary ? "#FFFFFF" : colors.primary} />
      ) : (
        <AppText
          color={isPrimary ? "#FFFFFF" : isGhost ? colors.textSecondary : colors.primary}
          style={styles.label}
          align="center"
        >
          {label}
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    borderWidth: 1,
    justifyContent: "center",
  },
  label: {
    fontWeight: "700",
  },
});
