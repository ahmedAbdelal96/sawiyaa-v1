import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  Screen,
  Header,
  Text,
  Card,
  Button,
  LoadingState,
  ErrorState,
} from "../../../../src/components/ui";
import { useTheme } from "../../../../src/providers/ThemeProvider";
import { useMyCareChatRequest } from "../../../../src/features/patient/care-chat/hooks";
import type { ChatApprovalStatus } from "../../../../src/features/patient/care-chat/types";

function statusColor(
  status: ChatApprovalStatus,
  theme: ReturnType<typeof useTheme>["theme"],
) {
  switch (status) {
    case "PENDING":
      return theme.colors.warning ?? "#f59e0b";
    case "APPROVED":
      return theme.colors.success ?? "#22c55e";
    case "REJECTED":
      return theme.colors.error;
    default:
      return theme.colors.textMuted;
  }
}

export default function CareChatRequestDetailScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();

  const requestQuery = useMyCareChatRequest(id ?? null);
  const request = requestQuery.data;

  if (requestQuery.isLoading) {
    return (
      <Screen bg="background">
        <Header showBack onBack={() => router.back()} />
        <LoadingState fullScreen />
      </Screen>
    );
  }

  if (requestQuery.isError || !request) {
    return (
      <Screen bg="background">
        <Header showBack onBack={() => router.back()} />
        <ErrorState fullScreen onRetry={requestQuery.refetch} />
      </Screen>
    );
  }

  const color = statusColor(request.status, theme);
  const isApproved = request.status === "APPROVED";

  return (
    <Screen bg="background">
      <Header
        title={t("careChat.requestDetail.title")}
        showBack
        onBack={() => router.back()}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.card}>
          {/* Practitioner */}
          <View style={styles.row}>
            <Ionicons
              name="person-circle-outline"
              size={40}
              color={theme.colors.primary}
            />
            <View style={styles.practitionerInfo}>
              <Text weight="bold" style={styles.practitionerName}>
                {request.practitioner.displayName ??
                  t("careChat.unknownPractitioner")}
              </Text>
              <Text color={theme.colors.textMuted} style={styles.dateText}>
                {new Date(request.requestedAt).toLocaleDateString(
                  i18n.language?.startsWith("ar") ? "ar-SA" : "en-US",
                  { day: "numeric", month: "long", year: "numeric" },
                )}
              </Text>
            </View>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: color + "18" }]}>
            <Text style={[styles.statusText, { color }]}>
              {t(`careChat.requestStatus.${request.status}`, request.status)}
            </Text>
          </View>

          {request.reason ? (
            <View style={styles.field}>
              <Text weight="600" style={styles.fieldLabel}>
                {t("careChat.requestDetail.reason")}
              </Text>
              <Text
                color={theme.colors.textSecondary}
                style={styles.fieldValue}
              >
                {request.reason}
              </Text>
            </View>
          ) : null}

          {request.expiresAt ? (
            <View style={styles.field}>
              <Text weight="600" style={styles.fieldLabel}>
                {t("careChat.requestDetail.expiresAt")}
              </Text>
              <Text
                color={theme.colors.textSecondary}
                style={styles.fieldValue}
              >
                {new Date(request.expiresAt).toLocaleDateString(
                  i18n.language?.startsWith("ar") ? "ar-SA" : "en-US",
                  { day: "numeric", month: "long", year: "numeric" },
                )}
              </Text>
            </View>
          ) : null}
        </Card>

        {/* Status-specific guidance */}
        {request.status === "PENDING" ? (
          <View
            style={[
              styles.notice,
              { backgroundColor: theme.colors.warning + "10" },
            ]}
          >
            <Ionicons
              name="time-outline"
              size={18}
              color={theme.colors.warning ?? "#f59e0b"}
            />
            <Text
              style={[
                styles.noticeText,
                { color: theme.colors.warning ?? "#f59e0b" },
              ]}
            >
              {t("careChat.requestDetail.pendingNotice")}
            </Text>
          </View>
        ) : null}

        {request.status === "REJECTED" ? (
          <View
            style={[
              styles.notice,
              { backgroundColor: theme.colors.error + "10" },
            ]}
          >
            <Ionicons
              name="close-circle-outline"
              size={18}
              color={theme.colors.error}
            />
            <Text style={[styles.noticeText, { color: theme.colors.error }]}>
              {t("careChat.requestDetail.rejectedNotice")}
            </Text>
          </View>
        ) : null}

        {/* Open conversation if approved */}
        {isApproved && request.linkedConversationId ? (
          <Button
            title={t("careChat.requestDetail.openConversation")}
            onPress={() =>
              router.push(
                `/(patient)/care-chat/${request.linkedConversationId}` as any,
              )
            }
            style={styles.openConvBtn}
          />
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  card: {
    padding: 16,
    gap: 14,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  practitionerInfo: {
    flex: 1,
  },
  practitionerName: {
    fontSize: 16,
  },
  dateText: {
    fontSize: 12,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  statusText: {
    fontSize: 13,
    fontWeight: "600",
  },
  field: {
    gap: 4,
  },
  fieldLabel: {
    fontSize: 13,
  },
  fieldValue: {
    fontSize: 14,
    lineHeight: 20,
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
  openConvBtn: {
    marginTop: 4,
  },
});
