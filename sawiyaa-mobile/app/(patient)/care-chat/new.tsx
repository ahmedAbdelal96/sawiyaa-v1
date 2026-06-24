import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  Header,
  Screen,
  Text,
  Card,
  Button,
  Input,
} from "../../../src/components/ui";
import { useTheme } from "../../../src/providers/ThemeProvider";
import {
  useCreateCareChatRequest,
  useMyCareChatRequests,
} from "../../../src/features/patient/care-chat/hooks";
import type { CareChatRequestItemDto } from "../../../src/features/patient/care-chat/types";

type ExistingRequestState =
  | { found: false }
  | {
      found: true;
      item: CareChatRequestItemDto;
      kind: "pending" | "approved_with_conversation" | "approved_no_conversation";
    };

export default function NewCareChatRequestScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language?.startsWith("ar") ?? false;

  const { practitionerSlug, relatedSessionId, practitionerId, practitionerName } =
    useLocalSearchParams<{
      practitionerSlug: string;
      relatedSessionId: string;
      practitionerId?: string;
      practitionerName?: string;
    }>();

  const createMutation = useCreateCareChatRequest();
  const existingRequestsQuery = useMyCareChatRequests({ limit: 50 });

  const [reason, setReason] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Stable duplicate detection: match by practitionerId + relatedSessionId
  // practitioner.id is the practitioner profile UUID — stable, unique, not translatable
  const existingState = useMemo((): ExistingRequestState => {
    if (!practitionerId && !relatedSessionId) return { found: false };

    const items = existingRequestsQuery.data?.items ?? [];
    const match = items.find((item) => {
      const isRelevant =
        item.practitioner.id === practitionerId &&
        (relatedSessionId ? item.relatedSessionId === relatedSessionId : true);
      return isRelevant;
    });

    if (!match) return { found: false };

    if (match.status === "PENDING") {
      return { found: true, item: match, kind: "pending" };
    }

    if (match.status === "APPROVED") {
      if (match.linkedConversationId) {
        return { found: true, item: match, kind: "approved_with_conversation" };
      }
      return { found: true, item: match, kind: "approved_no_conversation" };
    }

    return { found: false };
  }, [existingRequestsQuery.data?.items, practitionerId, relatedSessionId]);

  const canSubmit =
    existingState.found === false &&
    Boolean(reason.trim()) &&
    !createMutation.isPending;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitError(null);

    try {
      const result = await createMutation.mutateAsync({
        practitionerSlug: practitionerSlug.trim(),
        relatedSessionId: relatedSessionId?.trim() || undefined,
        reason: reason.trim() || undefined,
      });
      router.replace(
        `/(patient)/care-chat/request/${result.item.id}` as any,
      );
    } catch (err) {
      setSubmitError(extractApiErrorMessage(err));
    }
  }

  function renderExistingState() {
    if (existingState.found === false) return null;

    const { item, kind } = existingState;

    if (kind === "pending") {
      return (
        <Card style={[styles.noticeCard, { backgroundColor: theme.colors.warning + "12" }]}>
          <View style={styles.noticeRow}>
            <Ionicons
              name="time-outline"
              size={20}
              color={theme.colors.warning ?? "#f59e0b"}
            />
            <Text weight="600" style={styles.noticeTitle}>
              {t("careChat.sessionFollowUp.existing.pending.title")}
            </Text>
          </View>
          <Text color={theme.colors.textSecondary} style={styles.noticeBody}>
            {t("careChat.sessionFollowUp.existing.pending.body")}
          </Text>
          <Button
            title={t("careChat.sessionFollowUp.existing.pending.action")}
            variant="secondary"
            onPress={() =>
              router.push(
                `/(patient)/care-chat/request/${item.id}` as any,
              )
            }
            style={styles.noticeAction}
          />
        </Card>
      );
    }

    if (kind === "approved_with_conversation") {
      return (
        <Card style={[styles.noticeCard, { backgroundColor: theme.colors.success + "12" }]}>
          <View style={styles.noticeRow}>
            <Ionicons
              name="chatbubbles"
              size={20}
              color={theme.colors.success ?? "#22c55e"}
            />
            <Text weight="600" style={styles.noticeTitle}>
              {t("careChat.sessionFollowUp.existing.approvedWithConv.title")}
            </Text>
          </View>
          <Text color={theme.colors.textSecondary} style={styles.noticeBody}>
            {t("careChat.sessionFollowUp.existing.approvedWithConv.body")}
          </Text>
          <Button
            title={t("careChat.sessionFollowUp.existing.approvedWithConv.action")}
            onPress={() =>
              router.push(
                `/(patient)/care-chat/${item.linkedConversationId}` as any,
              )
            }
            style={styles.noticeAction}
          />
        </Card>
      );
    }

    // approved_no_conversation
    return (
      <Card style={[styles.noticeCard, { backgroundColor: theme.colors.primary + "12" }]}>
        <View style={styles.noticeRow}>
          <Ionicons
            name="checkmark-circle"
            size={20}
            color={theme.colors.primary}
          />
          <Text weight="600" style={styles.noticeTitle}>
            {t("careChat.sessionFollowUp.existing.approvedNoConv.title")}
          </Text>
        </View>
        <Text color={theme.colors.textSecondary} style={styles.noticeBody}>
          {t("careChat.sessionFollowUp.existing.approvedNoConv.body")}
        </Text>
        <Button
          title={t("careChat.sessionFollowUp.existing.approvedNoConv.action")}
          variant="secondary"
          onPress={() =>
            router.push(
              `/(patient)/care-chat/request/${item.id}` as any,
            )
          }
          style={styles.noticeAction}
        />
      </Card>
    );
  }

  return (
    <Screen bg="background">
      <Header title={t("careChat.sessionFollowUp.title")} showBack />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Practitioner info block */}
        <Card style={styles.practitionerCard}>
          <View style={styles.practitionerRow}>
            <View
              style={[
                styles.practitionerAvatar,
                { backgroundColor: theme.colors.primaryLight },
              ]}
            >
              <Ionicons name="person" size={22} color={theme.colors.primary} />
            </View>
            <View style={styles.practitionerInfo}>
              <Text weight="600" style={styles.practitionerLabel}>
                {t("careChat.sessionFollowUp.practitionerLabel")}
              </Text>
              <Text style={styles.practitionerName}>
                {practitionerName ?? practitionerSlug}
              </Text>
            </View>
          </View>
        </Card>

        {/* Existing request state */}
        {renderExistingState()}

        {/* Helper text — only shown when no existing request */}
        {!existingState.found ? (
          <View
            style={[
              styles.infoBlock,
              { backgroundColor: theme.colors.primary + "12" },
            ]}
          >
            <Ionicons
              name="information-circle-outline"
              size={20}
              color={theme.colors.primary}
            />
            <Text color={theme.colors.primary} style={styles.infoText}>
              {t("careChat.sessionFollowUp.approvalNote")}
            </Text>
          </View>
        ) : null}

        {/* Reason field — hidden when existing request found */}
        {existingState.found === false ? (
          <Card style={styles.formCard}>
            <View style={styles.field}>
              <Text weight="600" style={styles.label}>
                {t("careChat.sessionFollowUp.reasonLabel")}
              </Text>
              <Input
                value={reason}
                onChangeText={setReason}
                placeholder={t("careChat.sessionFollowUp.reasonPlaceholder")}
                multiline
                numberOfLines={4}
                style={styles.textArea}
                maxLength={1000}
              />
              <Text
                color={theme.colors.textMuted}
                style={[styles.charCount, isRtl ? styles.charCountRtl : null]}
              >
                {reason.length}/1000
              </Text>
            </View>

            {submitError ? (
              <View
                style={[
                  styles.errorBox,
                  { backgroundColor: theme.colors.error + "15" },
                ]}
              >
                <Ionicons
                  name="close-circle"
                  size={15}
                  color={theme.colors.error}
                />
                <Text style={{ color: theme.colors.error, fontSize: 13, flex: 1 }}>
                  {submitError}
                </Text>
              </View>
            ) : null}

            <Button
              title={
                createMutation.isPending
                  ? t("careChat.sessionFollowUp.submitting")
                  : t("careChat.sessionFollowUp.submit")
              }
              onPress={handleSubmit}
              disabled={!canSubmit}
            />
          </Card>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

// inline import to avoid circular deps — extractApiErrorMessage is pure lib
function extractApiErrorMessage(err: unknown): string {
  if (typeof err === "object" && err !== null && "message" in err) {
    const e = err as { message: string };
    return e.message;
  }
  return "An error occurred. Please try again.";
}

const styles = StyleSheet.create({
  scroll: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  practitionerCard: {
    padding: 16,
  },
  practitionerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  practitionerAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  practitionerInfo: {
    flex: 1,
    gap: 2,
  },
  practitionerLabel: {
    fontSize: 12,
    color: "#6b7280",
  },
  practitionerName: {
    fontSize: 17,
  },
  noticeCard: {
    padding: 16,
    gap: 10,
  },
  noticeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  noticeTitle: {
    fontSize: 15,
  },
  noticeBody: {
    fontSize: 13,
    lineHeight: 19,
  },
  noticeAction: {
    marginTop: 2,
  },
  infoBlock: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  formCard: {
    padding: 16,
    gap: 14,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 14,
  },
  textArea: {
    minHeight: 110,
    textAlignVertical: "top",
  },
  charCount: {
    fontSize: 11,
    textAlign: "right",
    marginTop: 2,
  },
  charCountRtl: {
    textAlign: "left",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 8,
    padding: 12,
  },
});