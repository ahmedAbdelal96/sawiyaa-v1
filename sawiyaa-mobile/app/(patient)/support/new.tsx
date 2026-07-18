import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Header, Text, Input } from "../../../src/components/ui";
import { useTheme } from "../../../src/providers/ThemeProvider";
import { createPatientSupportTicket } from "../../../src/features/messages/api";
import { useQueryClient } from "@tanstack/react-query";
import { extractApiErrorMessage } from "../../../src/lib/api";

export default function NewSupportChatScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language?.startsWith("ar") ?? false;
  const queryClient = useQueryClient();

  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSend() {
    setError(null);
    const trimmed = message.trim();
    if (!trimmed || trimmed.length < 10) {
      setError(
        isRTL
          ? "يرجى كتابة وصف المشكلة (10 أحرف على الأقل)"
          : "Please describe your issue (at least 10 characters)"
      );
      return;
    }

    setIsPending(true);
    try {
      const res = await createPatientSupportTicket({ description: trimmed });
      // Invalidate canonical conversations to fetch new support ticket
      await queryClient.invalidateQueries({ queryKey: ["canonical-conversations"] });

      const conversationId = res?.item?.conversationId || res?.item?.id;
      if (conversationId) {
        router.replace(`/(patient)/messages/${conversationId}`);
      } else {
        router.replace("/(patient)/messages?tab=support");
      }
    } catch (err) {
      setError(extractApiErrorMessage(err));
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Screen bg="background">
      <Header
        title={t("messages.inbox.newSupportTitle", "Message Support")}
        showBack
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <View style={styles.body}>
          <Text
            weight="600"
            color={theme.colors.textSecondary}
            style={[styles.label, { textAlign: isRTL ? "right" : "left" }]}
          >
            {isRTL ? "كيف يمكننا مساعدتك؟ *" : "How can we help you? *"}
          </Text>

          <Input
            value={message}
            onChangeText={setMessage}
            placeholder={
              isRTL
                ? "اكتب تفاصيل استفسارك أو مشكلتك هنا..."
                : "Type the details of your inquiry or issue here..."
            }
            placeholderTextColor={theme.colors.textMuted}
            multiline
            style={[styles.input, isRTL ? styles.inputRtl : null]}
            containerStyle={styles.inputContainer}
            maxLength={2000}
          />

          {error ? (
            <View
              style={[
                styles.errorBox,
                {
                  backgroundColor: theme.colors.error + "15",
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

          <TouchableOpacity
            onPress={handleSend}
            disabled={!message.trim() || isPending}
            style={[
              styles.submitBtn,
              {
                backgroundColor: theme.colors.primary,
                opacity: !message.trim() || isPending ? 0.6 : 1,
              },
            ]}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={isRTL ? "إرسال طلب الدعم" : "Submit Support Request"}
          >
            {isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="paper-plane-outline" size={18} color="#fff" style={styles.btnIcon} />
                <Text weight="700" style={styles.submitBtnText} color="#FFFFFF">
                  {isRTL ? "إرسال الطلب" : "Submit Request"}
                </Text>
              </>
            )}
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
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 16,
  },
  label: {
    fontSize: 15,
    lineHeight: 22,
  },
  inputContainer: {
    minHeight: 140,
    maxHeight: 240,
    borderWidth: 1,
    borderColor: "#E8DED0",
    borderRadius: 12,
    backgroundColor: "#FCFAF6",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    textAlignVertical: "top",
    color: "#1F332F",
  },
  inputRtl: {
    textAlign: "right",
  },
  errorBox: {
    alignItems: "center",
    gap: 8,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  errorText: {
    fontSize: 13,
    flex: 1,
  },
  submitBtn: {
    height: 48,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
  },
  btnIcon: {
    transform: [{ rotate: "0deg" }],
  },
  submitBtnText: {
    fontSize: 15,
  },
});
