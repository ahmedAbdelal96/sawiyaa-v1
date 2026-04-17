import { forwardRef, useState } from "react";
import type { TextInputProps} from "react-native";
import { I18nManager } from "react-native";
import { StyleSheet, TextInput, View } from "react-native";

import { useAppTheme } from "@/core/theme/theme-provider";
import { AppText } from "@/shared/ui/app-text";

type AppInputProps = TextInputProps & {
  label?: string;
  error?: string;
};

export const AppInput = forwardRef<TextInput, AppInputProps>(function AppInput(
  { label, error, style, ...props },
  ref,
) {
  const { colors, radii, spacing } = useAppTheme();
  const [focused, setFocused] = useState(false);
  const isRtl = I18nManager.isRTL;

  return (
    <View style={styles.wrapper}>
      {label ? (
        <AppText variant="bodySmall" color={colors.textSecondary} style={styles.label}>
          {label}
        </AppText>
      ) : null}
      <TextInput
        ref={ref}
        placeholderTextColor={colors.textMuted}
        style={[
          styles.input,
          {
            backgroundColor: colors.surfaceLow,
            borderColor: error ? colors.danger : focused ? "rgba(11,92,172,0.2)" : "transparent",
            borderRadius: radii.md - 2,
            color: colors.text,
            minHeight: 58,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.md,
            textAlign: isRtl ? "right" : "left",
            fontFamily: isRtl ? "IBM_Plex_Sans_Arabic_500Medium" : "IBM_Plex_Sans_Arabic_400Regular",
          },
          focused ? styles.focused : null,
          style,
        ]}
        onBlur={(event) => {
          setFocused(false);
          props.onBlur?.(event);
        }}
        onFocus={(event) => {
          setFocused(true);
          props.onFocus?.(event);
        }}
        {...props}
      />
      {error ? (
        <AppText color={colors.danger} variant="caption" style={styles.error}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
  },
  label: {
    fontWeight: "700",
  },
  input: {
    borderWidth: 1,
    fontSize: 16,
  },
  focused: {
    shadowColor: "#0B5CAC",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  error: {
    marginTop: 2,
  },
});
