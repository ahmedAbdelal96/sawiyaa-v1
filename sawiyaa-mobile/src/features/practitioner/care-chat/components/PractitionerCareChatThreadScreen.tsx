import React, { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  Button,
  Card,
  ErrorState,
  Header,
  LoadingState,
  Screen,
  StatusChip,
  Text,
} from "../../../../components/ui";
import { useTheme } from "../../../../providers/ThemeProvider";
import { useAuth } from "../../../../providers/AuthProvider";
import { extractApiErrorMessage } from "../../../../lib/api";
import {
  usePractitionerCareChatConversation,
  useSendPractitionerCareChatMessage,
} from "../hooks";
import { localizeCareChatMessageText } from "../../../../features/care-chat/message-utils";
import type { CareChatMessageDto } from "../types";
import {
  ConversationBubble,
  ConversationComposer,
  ConversationEmptyState,
} from "../../../../features/messages/components/ConversationPrimitives";

type PractitionerCareChatThreadScreenProps = {
  conversationId: string;
};

export function PractitionerCareChatThreadScreen({
  conversationId,
}: PractitionerCareChatThreadScreenProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();

  const convQuery = usePractitionerCareChatConversation(conversationId);
  const sendMessage = useSendPractitionerCareChatMessage(conversationId);

  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const conversation = convQuery.data;
  const canSend = conversation?.canSendMessage ?? false;
  const isActive = conversation?.activityState === "ACTIVE";
  const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US";

  const headerTitle = t("practitioner.careChat.title");
  const patientName =
    conversation?.patient.displayName ??
    t("practitioner.careChat.fallbackPatient");
  const practitionerName =
    conversation?.practitioner.displayName ??
    t("practitioner.careChat.unknownPractitioner");
  const sessionLabel = conversation?.relatedSessionId
    ? t("practitioner.careChat.conversation.sessionLinked")
    : null;
  const conversationStateLabel = conversation
    ? t(`practitioner.careChat.activityState.${conversation.activityState}`)
    : null;
  const lastActivityAt = conversation
    ? conversation.messages[conversation.messages.length - 1]?.createdAt ??
      conversation.expiresAt ??
      null
    : null;

  const detailStatusTone =
    conversation?.activityState === "ACTIVE" ? "success" : "default";

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString(locale, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  async function handleSend() {
    if (!draft.trim()) return;
    setSendError(null);
    const text = draft.trim();
    setDraft("");
    try {
      await sendMessage.mutateAsync(text);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (error) {
      setSendError(extractApiErrorMessage(error));
      setDraft(text);
    }
  }

  if (convQuery.isLoading) {
    return (
      <Screen bg="background">
        <Header showBack title={headerTitle} />
        <LoadingState fullScreen />
      </Screen>
    );
  }

  if (convQuery.isError || !conversation) {
    return (
      <Screen bg="background">
        <Header showBack title={headerTitle} />
        <ErrorState fullScreen onRetry={convQuery.refetch} />
      </Screen>
    );
  }

  const noSendReason = !canSend
    ? isActive
      ? t("practitioner.careChat.conversation.sendDisabledNotice")
      : t("practitioner.careChat.inactiveNotice.default")
    : null;

  return (
    <Screen bg="background">
      <Header title={headerTitle} showBack />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={90}
      >
        <View style={styles.stack}>
          <Card variant="outlined" padding="sm" style={styles.summaryCard}>
            <View style={styles.summaryTop}>
              <View style={styles.patientBlock}>
                <View style={styles.avatarWrap}>
                  <Ionicons
                    name="person-circle-outline"
                    size={24}
                    color={theme.colors.primary}
                  />
                </View>
                <View style={styles.patientInfo}>
                  <Text weight="600" style={styles.patientName} numberOfLines={1}>
                    {patientName}
                  </Text>
                  <Text
                    color={theme.colors.textMuted}
                    style={styles.subtitle}
                    numberOfLines={1}
                  >
                    {practitionerName}
                  </Text>
                </View>
              </View>
              {conversationStateLabel ? (
                <StatusChip
                  label={conversationStateLabel}
                  tone={detailStatusTone}
                  showDot={false}
                />
              ) : null}
            </View>

            <View style={styles.summaryChips}>
              {sessionLabel ? (
                <StatusChip label={sessionLabel} tone="info" showDot={false} />
              ) : null}
              {conversation.expiresAt && isActive ? (
                <StatusChip
                  label={t("practitioner.careChat.conversation.expiresAt", {
                    date: formatDate(conversation.expiresAt),
                  })}
                  tone="warning"
                  showDot={false}
                />
              ) : null}
            </View>

            {noSendReason ? (
              <View
                style={[
                  styles.notice,
                  {
                    backgroundColor: isActive
                      ? theme.colors.warning + "10"
                      : theme.colors.textMuted + "10",
                  },
                ]}
              >
                <Ionicons
                  name={isActive ? "information-circle-outline" : "alert-circle-outline"}
                  size={16}
                  color={isActive ? theme.colors.warning ?? "#f59e0b" : theme.colors.textMuted}
                />
                <Text
                  style={[
                    styles.noticeText,
                    {
                      color: isActive
                        ? theme.colors.warning ?? "#f59e0b"
                        : theme.colors.textMuted,
                    },
                  ]}
                >
                  {noSendReason}
                </Text>
              </View>
            ) : null}

            <TouchableOpacity
              onPress={() => setShowDetails((value) => !value)}
              activeOpacity={0.85}
              style={styles.detailsToggle}
            >
              <Text weight="600" style={styles.detailsToggleText}>
                {t("practitioner.careChat.conversation.detailsTitle")}
              </Text>
              <Ionicons
                name={showDetails ? "chevron-up" : "chevron-down"}
                size={16}
                color={theme.colors.textMuted}
              />
            </TouchableOpacity>

            {showDetails ? (
              <View style={styles.detailsBlock}>
                {conversation.linkedRequestId ? (
                  <Button
                    title={t("practitioner.careChat.conversation.openRequest")}
                    variant="secondary"
                    onPress={() =>
                      router.push(
                        `/(practitioner)/care-chat/request/${conversation.linkedRequestId}` as never,
                      )
                    }
                  />
                ) : null}

                <View style={styles.detailRows}>
                  <DetailRow
                    label={t("practitioner.careChat.conversation.statusLabel")}
                    value={conversationStateLabel ?? "-"}
                  />
                  {lastActivityAt ? (
                    <DetailRow
                      label={t("practitioner.careChat.conversation.lastUpdated")}
                      value={formatDate(lastActivityAt)}
                    />
                  ) : null}
                  {conversation.activityState !== "ACTIVE" ? (
                    <DetailRow
                      label={t("practitioner.careChat.conversation.activity")}
                      value={t(
                        `practitioner.careChat.activityState.${conversation.activityState}`,
                      )}
                    />
                  ) : null}
                </View>
              </View>
            ) : null}
          </Card>

          {conversation.activityState === "ACTIVE" && conversation.expiresAt ? (
            <View
              style={[
                styles.expiryBar,
                { backgroundColor: `${theme.colors.warning ?? "#f59e0b"}12` },
              ]}
            >
              <Text
                style={[
                  styles.expiryText,
                  { color: theme.colors.warning ?? "#f59e0b" },
                ]}
              >
                {t("practitioner.careChat.expiresOn", {
                  date: new Date(conversation.expiresAt).toLocaleDateString(locale, {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  }),
                })}
              </Text>
            </View>
          ) : null}

          <ScrollView
            ref={scrollRef}
            style={styles.messagesArea}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() =>
              scrollRef.current?.scrollToEnd({ animated: false })
            }
          >
            {conversation.messages.length === 0 ? (
              <ConversationEmptyState
                title={t("practitioner.careChat.conversation.empty")}
              />
            ) : (
              conversation.messages.map((msg: CareChatMessageDto, idx: number) => {
                const isMine =
                  msg.senderRole === "PRACTITIONER" ||
                  (msg.senderUserId && msg.senderUserId === user?.id);

                return (
                  <ConversationBubble
                    key={msg.id ?? idx}
                    isMine={Boolean(isMine)}
                    text={localizeCareChatMessageText(msg, t)}
                    timeLabel={formatTime(msg.createdAt)}
                  />
                );
              })
            )}
          </ScrollView>
        </View>

        {canSend ? (
          <ConversationComposer
            value={draft}
            onChangeText={setDraft}
            onSend={() => void handleSend()}
            disabled={sendMessage.isPending || !draft.trim()}
            placeholder={t("practitioner.careChat.conversation.inputPlaceholder")}
            error={sendError}
          />
        ) : null}
      </KeyboardAvoidingView>
    </Screen>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const { theme } = useTheme();
  return (
    <View style={styles.detailRow}>
      <Text color={theme.colors.textMuted} style={styles.detailLabel}>
        {label}
      </Text>
      <Text color={theme.colors.textSecondary} style={styles.detailValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  stack: {
    flex: 1,
    padding: 20,
    paddingBottom: 8,
    gap: 12,
  },
  summaryCard: {
    gap: 12,
  },
  summaryTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  patientBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  avatarWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(68, 161, 148, 0.1)",
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  summaryChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 10,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  detailsToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingTop: 2,
  },
  detailsToggleText: {
    fontSize: 13,
  },
  detailsBlock: {
    gap: 10,
    paddingTop: 2,
  },
  detailRows: {
    gap: 10,
  },
  detailRow: {
    gap: 2,
  },
  detailLabel: {
    fontSize: 12,
  },
  detailValue: {
    fontSize: 13,
    lineHeight: 19,
  },
  expiryBar: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  expiryText: {
    fontSize: 12,
    textAlign: "center",
  },
  messagesArea: {
    flex: 1,
  },
  messagesContent: {
    paddingBottom: 12,
  },
});
