import { StyleSheet, View } from "react-native";

import { useAppTheme } from "@/core/theme/theme-provider";
import { AppText } from "@/shared/ui/app-text";

type ConversationMessageBubbleProps = {
  message: string;
  createdAt: string;
  align: "left" | "right";
  roleLabel: string;
};

export function ConversationMessageBubble({
  message,
  createdAt,
  align,
  roleLabel,
}: ConversationMessageBubbleProps) {
  const { colors, radii, spacing } = useAppTheme();
  const isOwn = align === "right";

  return (
    <View
      style={[
        styles.row,
        {
          justifyContent: isOwn ? "flex-end" : "flex-start",
        },
      ]}
    >
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: isOwn ? colors.primaryContainer : colors.surfaceLow,
            borderRadius: radii.md,
            padding: spacing.md,
          },
        ]}
      >
        <AppText
          variant="caption"
          color={isOwn ? "#FFFFFF" : colors.textMuted}
          style={styles.role}
        >
          {roleLabel}
        </AppText>
        <AppText color={isOwn ? "#FFFFFF" : colors.text}>{message}</AppText>
        <AppText
          variant="caption"
          color={isOwn ? "rgba(255,255,255,0.8)" : colors.textMuted}
          style={styles.date}
        >
          {new Date(createdAt).toLocaleString()}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: "100%",
  },
  bubble: {
    maxWidth: "90%",
  },
  role: {
    fontWeight: "700",
    marginBottom: 6,
  },
  date: {
    marginTop: 6,
  },
});
