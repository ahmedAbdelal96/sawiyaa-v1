import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Header, Input, Screen, Text } from "../../../src/components/ui";
import { useTheme } from "../../../src/providers/ThemeProvider";
import { extractApiErrorMessage } from "../../../src/lib/api";
import { useCreatePractitionerSupportTicket } from "../../../src/features/practitioner/support/hooks";
import type { SupportTicketType } from "../../../src/features/practitioner/support/types";

export default function PractitionerSupportNewScreen() {
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language?.startsWith("ar") ?? false;
  const returnToRoute =
    typeof returnTo === "string" && returnTo.trim().length > 0
      ? returnTo
      : "/(practitioner)/messages?tab=support";

  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const supportCategory: SupportTicketType = "CHAT";

  const createMutation = useCreatePractitionerSupportTicket();

  async function handleSend() {
    setError(null);

    if (!message.trim()) {
      setError(
        t("support.new.messageRequired", "اكتب رسالة واحدة على الأقل قبل الإرسال."),
      );
      return;
    }

    try {
      const cleanMessage = message.trim();
      const subjectText = cleanMessage.slice(0, 60);
      const res = await createMutation.mutateAsync({
        category: supportCategory,
        subject: subjectText,
        description: cleanMessage,
      });

      router.replace({
        pathname: "/(practitioner)/support/[id]",
        params: {
          id: res.item.id,
          returnTo: returnToRoute,
        },
      } as any);
    } catch (err) {
      setError(extractApiErrorMessage(err));
    }
  }

  return (
    <Screen bg="background">
      <Header
        title={t("messages.inbox.newSupportTitle", "راسل الدعم")}
        showBack
        onBack={() => router.replace(returnToRoute as any)}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.heroCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.borderLight,
              },
            ]}
          >
            <View
              style={[
                styles.heroIconWrap,
                { backgroundColor: theme.colors.primaryLight },
              ]}
            >
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={18}
                color={theme.colors.primary}
              />
            </View>

            <Text
              weight="700"
              color={theme.colors.textPrimary}
              style={[styles.heroTitle, isRTL ? styles.textRtl : null]}
            >
              {t("messages.inbox.newSupportTitle", "راسل الدعم")}
            </Text>

            <Text
              color={theme.colors.textSecondary}
              style={[styles.heroSubtitle, isRTL ? styles.textRtl : null]}
            >
              {t(
                "messages.inbox.newSupportCardDesc",
                "سيظهر تواصلك مع فريق الدعم هنا.",
              )}
            </Text>

            <View style={styles.bubbleLane}>
              <View
                style={[
                  styles.helperBubble,
                  {
                    backgroundColor: theme.colors.surfaceTertiary,
                    borderColor: theme.colors.borderLight,
                    alignSelf: isRTL ? "flex-end" : "flex-start",
                  },
                ]}
              >
                <Text
                  color={theme.colors.textSecondary}
                  style={[styles.helperBubbleText, isRTL ? styles.textRtl : null]}
                >
                  {t(
                    "support.new.samplePrompt",
                    "اكتب سؤالك أو مشكلتك مباشرة، وسيرد عليك فريق الدعم داخل نفس المحادثة.",
                  )}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {error ? (
          <View
            style={[
              styles.errorBox,
              {
                backgroundColor: theme.colors.error + "12",
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
              onChangeText={(value) => {
                setMessage(value);
                if (error) setError(null);
              }}
              placeholder={t(
                "messages.thread.composerPlaceholder",
                "اكتب رسالة قصيرة وواضحة",
              )}
              placeholderTextColor={theme.colors.textMuted}
              multiline
              style={[styles.input, isRTL ? styles.textRtl : null]}
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
            activeOpacity={0.85}
            accessibilityLabel={t("support.detail.sendMessage", "إرسال الرسالة")}
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    gap: 10,
  },
  heroIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  heroTitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  heroSubtitle: {
    fontSize: 13,
    lineHeight: 20,
  },
  bubbleLane: {
    width: "100%",
    marginTop: 4,
  },
  helperBubble: {
    maxWidth: "88%",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  helperBubbleText: {
    fontSize: 12,
    lineHeight: 18,
  },
  textRtl: {
    textAlign: "right",
  },
  errorBox: {
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
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
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
});
