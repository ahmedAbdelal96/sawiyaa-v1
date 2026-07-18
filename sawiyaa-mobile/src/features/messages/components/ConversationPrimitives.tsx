import React from "react";
import { useTranslation } from "react-i18next";
import {
  StyleSheet,
  TouchableOpacity,
  View,
  TextInput,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "../../../components/ui";
import { useTheme } from "../../../providers/ThemeProvider";
import { useAppDirection } from "../../../i18n/direction";

type AttachmentItem = {
  key: string;
  label: string;
};

// Helper function to check if text starts with English letters
function isTextEnglish(text?: string | null): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  if (trimmed.length === 0) return false;
  const firstAlpha = trimmed.match(/[a-zA-Z]/);
  const firstArabic = trimmed.match(/[\u0600-\u06FF]/);
  if (firstAlpha) {
    if (!firstArabic) return true;
    return trimmed.indexOf(firstAlpha[0]) < trimmed.indexOf(firstArabic[0]);
  }
  return false;
}

export function ConversationBubble({
  isMine,
  text,
  timeLabel,
  statusLabel,
  header,
  attachments,
  avatarUrl,
  senderLabel: _senderLabel,
  onRetry,
  retryLabel,
}: {
  isMine: boolean;
  text: string;
  timeLabel: string;
  statusLabel?: string | null;
  header?: React.ReactNode;
  attachments?: AttachmentItem[];
  avatarUrl?: string | null;
  senderLabel?: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  const { isRtl } = useAppDirection();

  // Clinical Warmth Colors
  const outgoingBg = "#24564F"; // Deep Teal
  const incomingBg = "#FFFFFF"; // Pure White
  const incomingBorder = "#E8DED0"; // Soft Border
  const textPrimary = "#1F332F"; // Main Text
  const textMuted = "#6F7E78"; // Muted Text

  const isEng = isTextEnglish(text);
  const textAlignment = isEng ? "left" : (isRtl ? "right" : "left");
  const textDir = isEng ? "ltr" : (isRtl ? "rtl" : "ltr");

  // Sender Avatar Rendering
  const avatarComponent = (
    <View style={bubbleStyles.avatarContainer}>
      <Image
        source={avatarUrl ? { uri: avatarUrl } : require("../../../../assets/user.avif")}
        style={bubbleStyles.avatarImage}
        resizeMode="cover"
        accessible={false}
      />
    </View>
  );

  const bubbleComponent = (
    <View
      style={[
        bubbleStyles.bubble,
        isMine
          ? [
              bubbleStyles.bubbleMine,
              {
                backgroundColor: outgoingBg,
                borderTopLeftRadius: 18,
                borderTopRightRadius: 18,
                borderBottomLeftRadius: 18,
                borderBottomRightRadius: 4,
              },
            ]
          : [
              bubbleStyles.bubbleTheirs,
              {
                backgroundColor: incomingBg,
                borderColor: incomingBorder,
                borderTopLeftRadius: 18,
                borderTopRightRadius: 18,
                borderBottomLeftRadius: 4,
                borderBottomRightRadius: 18,
                borderWidth: 1,
              },
            ],
      ]}
    >
      <Text
        style={[
          bubbleStyles.text,
          {
            color: isMine ? "#FFFFFF" : textPrimary,
            textAlign: textAlignment,
            writingDirection: textDir,
          },
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
                    ? "rgba(255, 255, 255, 0.15)"
                    : "#EEF4EF",
                  borderColor: isMine ? "transparent" : "#D9E4DB",
                  borderWidth: isMine ? 0 : 1,
                  direction: textDir,
                },
              ]}
            >
              <Ionicons
                name="attach-outline"
                size={14}
                color={isMine ? "#FFFFFF" : textMuted}
              />
              <Text
                style={[
                  bubbleStyles.attachmentText,
                  { color: isMine ? "#FFFFFF" : textPrimary },
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
          {
            flexDirection: "row" as const,
            justifyContent: isMine ? "flex-end" : "flex-start",
            direction: "ltr" as const,
          },
        ]}
      >
        <Text
          style={[
            bubbleStyles.metaText,
            { color: isMine ? "rgba(255, 255, 255, 0.7)" : textMuted },
          ]}
        >
          {timeLabel}
        </Text>
        {statusLabel ? (
          <>
            <Text
              style={[
                bubbleStyles.metaText,
                { color: isMine ? "rgba(255, 255, 255, 0.7)" : textMuted },
              ]}
            >
              •
            </Text>
            <Text
              style={[
                bubbleStyles.metaText,
                { color: isMine ? "rgba(255, 255, 255, 0.7)" : textMuted },
              ]}
            >
              {statusLabel}
            </Text>
          </>
        ) : null}
      </View>
    </View>
  );

  const bubbleColumn = (
    <View
      style={[
        bubbleStyles.bubbleColumn,
        {
          alignItems: isMine ? "flex-end" : "flex-start",
        },
      ]}
    >
      {header ? (
        <View style={bubbleStyles.headerWrap}>
          {header}
        </View>
      ) : null}
      {bubbleComponent}
      {onRetry && retryLabel ? (
        <TouchableOpacity onPress={onRetry} style={bubbleStyles.retryButton} accessibilityRole="button">
          <Text color="#8A5A22" style={bubbleStyles.retryText}>{retryLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );

  return (
    <View
      style={[
        bubbleStyles.row,
        {
          flexDirection: "row" as const,
          justifyContent: isMine ? "flex-end" : "flex-start",
          direction: "ltr" as const,
        },
      ]}
    >
      {isMine ? (
        <>
          {bubbleColumn}
          {avatarComponent}
        </>
      ) : (
        <>
          {avatarComponent}
          {bubbleColumn}
        </>
      )}
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
          { backgroundColor: "#EEF4EF" },
        ]}
      >
        <Ionicons
          name="chatbubble-ellipses-outline"
          size={20}
          color="#24564F"
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
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { isRtl, rowDirection, arrowForward } = useAppDirection();

  const isEng = isTextEnglish(value);
  const inputAlign = value.trim() ? (isEng ? "left" : "right") : (isRtl ? "right" : "left");
  const inputDir = value.trim() ? (isEng ? "ltr" : "rtl") : (isRtl ? "rtl" : "ltr");

  return (
    <View
      style={[
        composerStyles.wrap,
        {
          borderTopColor: "#E8DED0",
          backgroundColor: "#FFFFFF",
        },
      ]}
    >
      {error ? (
        <View
          style={[
            composerStyles.errorRow,
            {
              backgroundColor: `${theme.colors.error}12`,
              flexDirection: rowDirection,
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
          { flexDirection: rowDirection },
        ]}
      >
        <TouchableOpacity
          disabled={true}
          style={{
            opacity: 0.4,
            padding: 8,
            justifyContent: "center",
            alignItems: "center",
            alignSelf: "center",
          }}
          accessibilityRole="button"
          accessibilityLabel={t("messages.thread.attachmentComingSoon", "File sharing will be available soon.")}
        >
          <Ionicons name="attach-outline" size={24} color="#6F7E78" />
        </TouchableOpacity>

        <View
          style={[
            composerStyles.inputContainer,
            {
              borderColor: "#E8DED0",
              backgroundColor: "#FCFAF6",
              flexDirection: rowDirection,
            },
          ]}
        >
          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor="#6F7E78"
            multiline
            maxLength={4000}
            style={[
              composerStyles.input,
              {
                color: "#1F332F",
                textAlign: inputAlign,
                writingDirection: inputDir,
              },
            ]}
          />
        </View>

        <TouchableOpacity
          onPress={onSend}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={isRtl ? "إرسال" : "Send"}
          style={[
            composerStyles.sendBtn,
            {
              backgroundColor: "#24564F",
              opacity: disabled ? 0.35 : 1,
            },
          ]}
          activeOpacity={0.8}
        >
          <Ionicons
            name={arrowForward as any}
            size={18}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      </View>

      {hint ? (
        <Text
          color={theme.colors.textMuted}
          style={[
            composerStyles.hint,
            { textAlign: isRtl ? "right" : "left" },
          ]}
        >
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
    paddingHorizontal: 8,
    alignItems: "flex-end",
    gap: 6,
  },
  bubbleColumn: {
    maxWidth: "80%",
    flexDirection: "column",
  },
  rowMine: {
    alignItems: "flex-end",
  },
  rowTheirs: {
    alignItems: "flex-start",
  },
  headerWrap: {
    marginBottom: 4,
    width: "100%",
  },
  bubbleAndAvatarRow: {
    alignItems: "flex-end",
    gap: 8,
    maxWidth: "80%",
  },
  avatarContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: "hidden",
    alignSelf: "flex-end",
  },
  avatarImage: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  avatarFallback: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#EEF4EF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#D9E4DB",
  },
  avatarFallbackText: {
    fontSize: 10,
    color: "#24564F",
    fontWeight: "700",
  },
  bubble: {
    flexShrink: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
  },
  bubbleMine: {
    elevation: 2,
    shadowColor: "#24564F",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  bubbleTheirs: {
    elevation: 2,
    shadowColor: "#24564F",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
  },
  attachmentsWrap: {
    gap: 6,
    marginTop: 4,
  },
  attachmentChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: "100%",
  },
  attachmentText: {
    fontSize: 13,
    lineHeight: 18,
    flexShrink: 1,
  },
  metaRow: {
    alignItems: "center",
    gap: 5,
    flexWrap: "wrap",
    marginTop: 2,
  },
  metaText: {
    fontSize: 11,
    lineHeight: 15,
  },
  retryButton: {
    marginTop: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    alignSelf: "flex-end",
  },
  retryText: {
    fontSize: 12,
    lineHeight: 17,
  },
});

const emptyStyles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    paddingTop: 48,
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
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
    paddingBottom: 10,
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
    gap: 10,
  },
  inputContainer: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 22,
    minHeight: 40,
    maxHeight: 120,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  input: {
    flex: 1,
    minHeight: 38,
    maxHeight: 110,
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 4,
    fontSize: 15,
    lineHeight: 20,
    textAlignVertical: "center",
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    elevation: 2,
    shadowColor: "#24564F",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  hint: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
});
