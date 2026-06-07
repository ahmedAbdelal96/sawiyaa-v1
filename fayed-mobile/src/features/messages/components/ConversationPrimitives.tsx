import React from "react";
import {
  I18nManager,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Input, Text } from "../../../components/ui";
import { useTheme } from "../../../providers/ThemeProvider";

type AttachmentItem = {
  key: string;
  label: string;
};

export function ConversationBubble({
  isMine,
  text,
  timeLabel,
  statusLabel,
  header,
  attachments,
}: {
  isMine: boolean;
  text: string;
  timeLabel: string;
  statusLabel?: string | null;
  header?: React.ReactNode;
  attachments?: AttachmentItem[];
}) {
  const { theme } = useTheme();
  const isRTL = I18nManager.isRTL;

  return (
    <View
      style={[
        bubbleStyles.row,
        isMine ? bubbleStyles.rowMine : bubbleStyles.rowTheirs,
      ]}
    >
      {header ? <View style={bubbleStyles.headerWrap}>{header}</View> : null}
      <View
        style={[
          bubbleStyles.bubble,
          isMine
            ? [bubbleStyles.bubbleMine, { backgroundColor: theme.colors.primary }]
            : [
                bubbleStyles.bubbleTheirs,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.borderLight,
                },
              ],
        ]}
      >
        <Text
          style={[
            bubbleStyles.text,
            { color: isMine ? "#fff" : theme.colors.textPrimary },
            isRTL ? bubbleStyles.textRtl : null,
          ]}
        >
          {text}
        </Text>

        {attachments?.length ? (
          <View style={bubbleStyles.attachmentsWrap}>
            {attachments.map((attachment) => (
              <View
                key={attachment.key}
                style={[
                  bubbleStyles.attachmentChip,
                  {
                    backgroundColor: isMine
                      ? "rgba(255,255,255,0.14)"
                      : theme.colors.surfaceTertiary,
                  },
                ]}
              >
                <Ionicons
                  name="attach-outline"
                  size={14}
                  color={isMine ? "#fff" : theme.colors.textMuted}
                />
                <Text
                  style={[
                    bubbleStyles.attachmentText,
                    { color: isMine ? "#fff" : theme.colors.textSecondary },
                  ]}
                  numberOfLines={1}
                >
                  {attachment.label}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        <View
          style={[
            bubbleStyles.metaRow,
            isRTL ? bubbleStyles.metaRowRtl : null,
          ]}
        >
          <Text
            style={[
              bubbleStyles.metaText,
              { color: isMine ? "rgba(255,255,255,0.68)" : theme.colors.textMuted },
            ]}
          >
            {timeLabel}
          </Text>
          {statusLabel ? (
            <>
              <Text
                style={[
                  bubbleStyles.metaText,
                  { color: isMine ? "rgba(255,255,255,0.68)" : theme.colors.textMuted },
                ]}
              >
                •
              </Text>
              <Text
                style={[
                  bubbleStyles.metaText,
                  { color: isMine ? "rgba(255,255,255,0.68)" : theme.colors.textMuted },
                ]}
              >
                {statusLabel}
              </Text>
            </>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export function ConversationEmptyState({
  title,
}: {
  title: string;
}) {
  const { theme } = useTheme();

  return (
    <View style={emptyStyles.wrap}>
      <View
        style={[
          emptyStyles.iconWrap,
          { backgroundColor: theme.colors.primaryLight },
        ]}
      >
        <Ionicons
          name="chatbubble-ellipses-outline"
          size={20}
          color={theme.colors.primary}
        />
      </View>
      <Text color={theme.colors.textMuted} style={emptyStyles.text}>
        {title}
      </Text>
    </View>
  );
}

export function ConversationComposer({
  value,
  onChangeText,
  onSend,
  disabled,
  placeholder,
  error,
  hint,
}: {
  value: string;
  onChangeText: (value: string) => void;
  onSend: () => void;
  disabled: boolean;
  placeholder: string;
  error?: string | null;
  hint?: string | null;
}) {
  const { theme } = useTheme();
  const isRTL = I18nManager.isRTL;

  return (
    <View
      style={[
        composerStyles.wrap,
        {
          borderTopColor: theme.colors.borderLight,
          backgroundColor: theme.colors.surface,
        },
      ]}
    >
      {error ? (
        <View
          style={[
            composerStyles.errorRow,
            {
              backgroundColor: theme.colors.error + "12",
              flexDirection: isRTL ? "row-reverse" : "row",
            },
          ]}
        >
          <Ionicons name="warning" size={13} color={theme.colors.error} />
          <Text style={[composerStyles.errorText, { color: theme.colors.error }]}>
            {error}
          </Text>
        </View>
      ) : null}

      <View
        style={[
          composerStyles.row,
          { flexDirection: isRTL ? "row-reverse" : "row" },
        ]}
      >
        <View style={composerStyles.inputWrap}>
          <Input
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={theme.colors.textMuted}
            multiline
            style={[composerStyles.input, isRTL ? composerStyles.inputRtl : null]}
            containerStyle={composerStyles.inputContainer}
            maxLength={4000}
          />
        </View>

        <TouchableOpacity
          onPress={onSend}
          disabled={disabled}
          style={[
            composerStyles.sendBtn,
            {
              backgroundColor: theme.colors.primary,
              opacity: disabled ? 0.45 : 1,
            },
          ]}
          activeOpacity={0.85}
        >
          <Ionicons
            name={isRTL ? "arrow-back" : "arrow-forward"}
            size={19}
            color="#fff"
          />
        </TouchableOpacity>
      </View>

      {hint ? (
        <Text color={theme.colors.textMuted} style={composerStyles.hint}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const bubbleStyles = StyleSheet.create({
  row: {
    width: "100%",
    marginTop: 6,
  },
  rowMine: {
    alignItems: "flex-end",
  },
  rowTheirs: {
    alignItems: "flex-start",
  },
  headerWrap: {
    marginBottom: 4,
  },
  bubble: {
    maxWidth: "82%",
    borderRadius: 18,
    paddingHorizontal: 13,
    paddingVertical: 10,
    gap: 6,
  },
  bubbleMine: {
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    borderWidth: 1,
    borderBottomLeftRadius: 4,
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
  },
  textRtl: {
    textAlign: "right",
  },
  attachmentsWrap: {
    gap: 6,
  },
  attachmentChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    maxWidth: "100%",
  },
  attachmentText: {
    fontSize: 12,
    lineHeight: 16,
    flexShrink: 1,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flexWrap: "wrap",
  },
  metaRowRtl: {
    flexDirection: "row-reverse",
  },
  metaText: {
    fontSize: 10,
    lineHeight: 14,
  },
});

const emptyStyles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    paddingTop: 42,
    gap: 10,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontSize: 13,
    textAlign: "center",
  },
});

const composerStyles = StyleSheet.create({
  wrap: {
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 8,
  },
  errorRow: {
    alignItems: "center",
    gap: 7,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  errorText: {
    fontSize: 12,
    flex: 1,
  },
  row: {
    alignItems: "flex-end",
    gap: 8,
  },
  inputWrap: {
    flex: 1,
    minHeight: 44,
    maxHeight: 108,
  },
  inputContainer: {
    flex: 1,
    marginBottom: 0,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 108,
    paddingTop: 12,
    paddingHorizontal: 12,
    fontSize: 15,
    lineHeight: 21,
    textAlignVertical: "top",
  },
  inputRtl: {
    textAlign: "right",
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  hint: {
    fontSize: 12,
    lineHeight: 18,
  },
});
