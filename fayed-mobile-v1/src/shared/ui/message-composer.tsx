import { useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, TextInput, View } from "react-native";

import { useAppTheme } from "@/core/theme/theme-provider";
import { AppButton } from "@/shared/ui/app-button";

type MessageComposerProps = {
  onSend: (message: string) => void;
  loading?: boolean;
  placeholder?: string;
};

export function MessageComposer({
  onSend,
  loading = false,
  placeholder,
}: MessageComposerProps) {
  const { t } = useTranslation();
  const { colors, radii, spacing } = useAppTheme();
  const [value, setValue] = useState("");
  const trimmed = value.trim();

  return (
    <View style={[styles.wrapper, { gap: spacing.sm }]}>
      <TextInput
        value={value}
        onChangeText={setValue}
        placeholder={placeholder || t("messageComposerPlaceholder")}
        placeholderTextColor={colors.textMuted}
        multiline
        style={[
          styles.input,
          {
            backgroundColor: colors.surfaceLow,
            borderColor: "rgba(194,198,211,0.24)",
            borderRadius: radii.md,
            color: colors.text,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.md,
          },
        ]}
      />
      <AppButton
        label={t("messageComposerSend")}
        loading={loading}
        disabled={!trimmed}
        onPress={() => {
          if (!trimmed) return;
          onSend(trimmed);
          setValue("");
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
  },
  input: {
    borderWidth: 1,
    minHeight: 72,
    textAlignVertical: "top",
  },
});
