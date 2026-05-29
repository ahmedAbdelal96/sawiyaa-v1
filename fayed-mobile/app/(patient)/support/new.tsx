import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Header, Text, Input } from "../../../src/components/ui";
import { useTheme } from "../../../src/providers/ThemeProvider";
import { useCreateSupportTicket } from "../../../src/features/patient/support/hooks";
import { extractApiErrorMessage } from "../../../src/lib/api";
import type { SupportTicketType } from "../../../src/features/patient/support/types";

export default function NewSupportChatScreen() {
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language?.startsWith("ar") ?? false;

  const [message, setMessage] = useState("");
  const [category, setCategory] = useState<SupportTicketType>("GENERAL");
  const [showCategory, setShowCategory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createMutation = useCreateSupportTicket();

  async function handleSend() {
    setError(null);
    if (!message.trim() || message.trim().length < 10) {
      setError(t("support.new.descriptionRequired"));
      return;
    }

    try {
      const subjectText = message.trim().slice(0, 60);
      const res = await createMutation.mutateAsync({
        category,
        subject: subjectText,
        description: message.trim(),
      });
      router.replace({
        pathname: "/(patient)/support/[id]",
        params: { id: res.item.id, returnTo: returnTo ?? "" },
      } as any);
    } catch (err) {
      setError(extractApiErrorMessage(err));
    }
  }

  const CATEGORIES: SupportTicketType[] = [
    "GENERAL",
    "BOOKING",
    "PAYMENT",
    "SESSION",
    "TECHNICAL",
    "ACCOUNT",
    "CHAT",
    "OTHER",
  ];

  return (
    <Screen bg="background">
      <Header
        title={t("messages.inbox.newSupportTitle", "Message Support")}
        showBack
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={90}
      >
        {/* Body: empty chat-like area */}
        <View style={styles.body}>
          <Text
            color={theme.colors.textSecondary}
            style={[styles.subtitle, isRTL ? styles.subtitleRtl : null]}
          >
            {t(
              "messages.inbox.newSupportCardDesc",
              "Describe your issue and we will get back to you shortly.",
            )}
          </Text>

          {/* Category selector — compact, hidden by default */}
          <TouchableOpacity
            onPress={() => setShowCategory((v) => !v)}
            style={[
              styles.categoryToggle,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.borderLight,
                flexDirection: isRTL ? "row-reverse" : "row",
              },
            ]}
            activeOpacity={0.7}
          >
            <Ionicons
              name="folder-outline"
              size={14}
              color={theme.colors.textMuted}
            />
            <Text style={[styles.categoryToggleText, { color: theme.colors.textSecondary }]}>
              {t(`support.categories.${category}`, category)}
            </Text>
            <Ionicons
              name={showCategory ? "chevron-up" : "chevron-down"}
              size={13}
              color={theme.colors.textMuted}
            />
          </TouchableOpacity>

          {showCategory ? (
            <View
              style={[
                styles.categorySheet,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.borderLight,
                  flexDirection: isRTL ? "row-reverse" : "row",
                },
              ]}
            >
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => {
                    setCategory(cat);
                    setShowCategory(false);
                  }}
                  style={[
                    styles.categoryItem,
                    cat === category && {
                      backgroundColor: theme.colors.primary + "15",
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.categoryItemText,
                      { color: cat === category ? theme.colors.primary : theme.colors.textSecondary },
                    ]}
                  >
                    {t(`support.categories.${cat}`, cat)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </View>

        {/* Error */}
        {error ? (
          <View
            style={[
              styles.errorBox,
              {
                backgroundColor: theme.colors.error + "15",
                marginHorizontal: 16,
                flexDirection: isRTL ? "row-reverse" : "row",
              },
            ]}
          >
            <Ionicons name="warning" size={14} color={theme.colors.error} />
            <Text style={[styles.errorText, { color: theme.colors.error }]}>
              {error}
            </Text>
          </View>
        ) : null}

        {/* Composer */}
        <View
          style={[
            styles.composer,
            {
              borderTopColor: theme.colors.borderLight,
              backgroundColor: theme.colors.surface,
              flexDirection: isRTL ? "row-reverse" : "row",
            },
          ]}
        >
          <View style={styles.inputWrap}>
            <Input
              value={message}
              onChangeText={setMessage}
              placeholder={t("messages.inbox.composerPlaceholder", "اكتب رسالتك...")}
              placeholderTextColor={theme.colors.textMuted}
              multiline
              style={[
                styles.input,
                isRTL ? styles.inputRtl : null,
              ]}
              containerStyle={styles.inputContainer}
              maxLength={2000}
            />
          </View>
          <TouchableOpacity
            onPress={handleSend}
            disabled={!message.trim() || createMutation.isPending}
            style={[
              styles.sendBtn,
              {
                backgroundColor: theme.colors.primary,
                opacity: !message.trim() || createMutation.isPending ? 0.45 : 1,
              },
            ]}
            activeOpacity={0.8}
            accessibilityLabel={t("support.detail.sendMessage", "Send message")}
          >
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 10,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
  },
  subtitleRtl: {
    textAlign: "right",
  },
  categoryToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryToggleText: {
    fontSize: 12,
  },
  categorySheet: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  categoryItem: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  categoryItemText: {
    fontSize: 12,
    fontWeight: "500",
  },
  errorBox: {
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  errorText: {
    fontSize: 13,
    flex: 1,
  },
  composer: {
    borderTopWidth: 1,
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  inputWrap: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
  },
  inputContainer: {
    flex: 1,
    marginBottom: 0,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingTop: 10,
    paddingHorizontal: 12,
    fontSize: 15,
    lineHeight: 21,
  },
  inputRtl: {
    textAlign: "right",
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
});
