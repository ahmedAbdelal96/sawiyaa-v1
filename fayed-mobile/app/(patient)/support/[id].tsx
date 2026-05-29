import React, { useRef, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  Screen,
  Header,
  Text,
  LoadingState,
  ErrorState,
  Input,
} from "../../../src/components/ui";
import { useTheme } from "../../../src/providers/ThemeProvider";
import {
  usePatientSupportTicket,
  useAddSupportMessage,
} from "../../../src/features/patient/support/hooks";
import { extractApiErrorMessage } from "../../../src/lib/api";
import type {
  SupportMessageDto,
  SupportTicketStatus,
} from "../../../src/features/patient/support/types";
import { useAuth } from "../../../src/providers/AuthProvider";

const CLOSED_STATUSES: SupportTicketStatus[] = ["RESOLVED", "CLOSED"];

const STATUS_LABELS: Record<SupportTicketStatus, { ar: string; en: string }> = {
  OPEN: { ar: "مفتوحة", en: "Open" },
  IN_PROGRESS: { ar: "قيد المعالجة", en: "In progress" },
  WAITING_FOR_USER: { ar: "في انتظار الرد", en: "Waiting for reply" },
  ESCALATED: { ar: "عالية الأولوية", en: "Escalated" },
  RESOLVED: { ar: "تم الحل", en: "Resolved" },
  CLOSED: { ar: "مغلقة", en: "Closed" },
};

function statusColor(
  status: SupportTicketStatus,
  theme: ReturnType<typeof useTheme>["theme"],
): string {
  switch (status) {
    case "OPEN":
      return theme.colors.primary;
    case "IN_PROGRESS":
      return theme.colors.warning ?? "#f59e0b";
    case "WAITING_FOR_USER":
      return theme.colors.info ?? "#6366f1";
    case "ESCALATED":
      return theme.colors.error;
    case "RESOLVED":
      return theme.colors.success ?? "#22c55e";
    case "CLOSED":
      return theme.colors.textMuted;
    default:
      return theme.colors.textMuted;
  }
}

export default function SupportTicketDetailScreen() {
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const isRTL = i18n.language?.startsWith("ar") ?? false;
  const { id } = useLocalSearchParams<{ id: string }>();
  useLocalSearchParams<{ returnTo?: string }>();

  const ticketQuery = usePatientSupportTicket(id ?? null);
  const addMessage = useAddSupportMessage(id ?? "");

  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const ticket = ticketQuery.data;
  const isClosed = ticket ? CLOSED_STATUSES.includes(ticket.status) : false;
  const canReply = ticket && !isClosed;

  function formatTime(dateStr: string): string {
    return new Date(dateStr).toLocaleTimeString(
      i18n.language?.startsWith("ar") ? "ar-SA" : "en-US",
      { hour: "2-digit", minute: "2-digit" },
    );
  }

  async function handleSend() {
    if (!draft.trim()) return;
    setSendError(null);
    const text = draft.trim();
    setDraft("");
    try {
      await addMessage.mutateAsync(text);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
    } catch (err) {
      setSendError(extractApiErrorMessage(err));
      setDraft(text);
    }
  }

  function renderMessage(msg: SupportMessageDto, idx: number) {
    const isPatient =
      msg.senderRole === "PATIENT" ||
      (msg.senderUserId && msg.senderUserId === user?.id);

    return (
      <View
        key={msg.id ?? idx}
        style={[
          styles.messageRow,
          isRTL
            ? isPatient
              ? styles.rowLtr
              : styles.rowRtl
            : isPatient
            ? styles.rowRtl
            : styles.rowLtr,
        ]}
      >
        <View
          style={[
            styles.bubble,
            isPatient
              ? [styles.bubbleMine, { backgroundColor: theme.colors.primary }]
              : [
                  styles.bubbleTheirs,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.borderLight,
                  },
                ],
          ]}
        >
          <Text
            style={[
              styles.bubbleText,
              { color: isPatient ? "#fff" : theme.colors.textPrimary },
              isRTL && !isPatient ? styles.bubbleTextRtl : null,
            ]}
          >
            {msg.message}
          </Text>
          <Text
            style={[
              styles.bubbleTime,
              { color: isPatient ? "rgba(255,255,255,0.65)" : theme.colors.textMuted },
            ]}
          >
            {formatTime(msg.createdAt)}
          </Text>
        </View>
      </View>
    );
  }

  if (ticketQuery.isLoading) {
    return (
      <Screen bg="background">
        <Header showBack />
        <LoadingState fullScreen />
      </Screen>
    );
  }

  if (ticketQuery.isError || !ticket) {
    return (
      <Screen bg="background">
        <Header showBack />
        <ErrorState fullScreen onRetry={ticketQuery.refetch} />
      </Screen>
    );
  }

  const statusLabel = STATUS_LABELS[ticket.status]?.[isRTL ? "ar" : "en"] ?? ticket.status;
  const statusClr = statusColor(ticket.status, theme);

  return (
    <Screen bg="background">
      <Header title={t("support.detail.title")} showBack />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={90}
      >
        {/* Conversation info strip */}
        <View style={styles.infoStrip}>
          <Text
            weight="600"
            style={[styles.subjectText, isRTL ? styles.textRtl : null]}
            numberOfLines={1}
          >
            {ticket.subject}
          </Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusClr + "18" },
            ]}
          >
            <Text style={[styles.statusBadgeText, { color: statusClr }]}>
              {statusLabel}
            </Text>
          </View>
        </View>

        {/* Message thread */}
        <ScrollView
          ref={scrollRef}
          style={styles.thread}
          contentContainerStyle={styles.threadContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            scrollRef.current?.scrollToEnd({ animated: false })
          }
        >
          {(ticket.messages ?? []).length === 0 ? (
            <View style={styles.emptyThread}>
              <Ionicons
                name="chatbubbles-outline"
                size={28}
                color={theme.colors.textMuted}
              />
              <Text color={theme.colors.textMuted} style={styles.emptyText}>
                {t("support.detail.noMessages")}
              </Text>
            </View>
          ) : (
            ticket.messages.map((msg, idx) => renderMessage(msg, idx))
          )}
        </ScrollView>

        {/* Closed notice */}
        {isClosed ? (
          <View
            style={[
              styles.closedBanner,
              { backgroundColor: theme.colors.textMuted + "12" },
            ]}
          >
            <Text color={theme.colors.textMuted} style={styles.closedText}>
              {t("support.detail.closedNotice")}
            </Text>
          </View>
        ) : null}

        {/* Composer */}
        {canReply ? (
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
            <View style={styles.composerInputWrap}>
              <Input
                value={draft}
                onChangeText={setDraft}
                placeholder={t("support.detail.replyPlaceholder")}
                placeholderTextColor={theme.colors.textMuted}
                multiline
                style={[styles.composerInput, isRTL ? styles.composerInputRtl : null]}
                containerStyle={styles.composerInputContainer}
                maxLength={4000}
              />
            </View>
            <TouchableOpacity
              onPress={handleSend}
              disabled={addMessage.isPending || !draft.trim()}
              style={[
                styles.sendBtn,
                {
                  backgroundColor: theme.colors.primary,
                  opacity: !draft.trim() || addMessage.isPending ? 0.45 : 1,
                },
              ]}
              activeOpacity={0.8}
              accessibilityLabel={t("support.detail.sendMessage", "Send message")}
            >
              <Ionicons name="send" size={17} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Send error */}
        {sendError ? (
          <View
            style={[
              styles.sendErrorBar,
              {
                backgroundColor: theme.colors.error + "12",
                flexDirection: isRTL ? "row-reverse" : "row",
              },
            ]}
          >
            <Ionicons name="warning" size={13} color={theme.colors.error} />
            <Text style={[styles.sendErrorText, { color: theme.colors.error }]}>
              {sendError}
            </Text>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  infoStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.04)",
  },
  subjectText: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  textRtl: {
    textAlign: "right",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    flexShrink: 0,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  thread: {
    flex: 1,
  },
  threadContent: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 6,
  },
  emptyThread: {
    alignItems: "center",
    paddingTop: 48,
    gap: 10,
  },
  emptyText: {
    fontSize: 13,
    textAlign: "center",
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  rowRtl: {
    justifyContent: "flex-end",
  },
  rowLtr: {
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: "82%",
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 16,
    gap: 4,
  },
  bubbleMine: {
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    borderWidth: 1,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  bubbleTextRtl: {
    textAlign: "right",
  },
  bubbleTime: {
    fontSize: 10,
    lineHeight: 14,
  },
  closedBanner: {
    marginHorizontal: 14,
    marginBottom: 6,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  closedText: {
    fontSize: 12,
    textAlign: "center",
  },
  composer: {
    borderTopWidth: 1,
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  composerInputWrap: {
    flex: 1,
    minHeight: 44,
    maxHeight: 80,
  },
  composerInputContainer: {
    flex: 1,
    marginBottom: 0,
  },
  composerInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 80,
    paddingTop: 10,
    paddingHorizontal: 12,
    fontSize: 15,
    lineHeight: 21,
  },
  composerInputRtl: {
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
  sendErrorBar: {
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  sendErrorText: {
    fontSize: 12,
    flex: 1,
  },
});
