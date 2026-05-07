import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  Button,
  Card,
  ErrorState,
  Header,
  LoadingState,
  Screen,
  Text,
} from "../../../../src/components/ui";
import { useTheme } from "../../../../src/providers/ThemeProvider";
import { usePractitionerCareChatRequest } from "../../../../src/features/practitioner/care-chat/hooks";
import type { CareChatRequestStatus } from "../../../../src/features/practitioner/care-chat/types";

function requestColor(
  status: CareChatRequestStatus,
  theme: ReturnType<typeof useTheme>["theme"],
) {
  switch (status) {
    case "PENDING":
      return theme.colors.warning ?? "#f59e0b";
    case "APPROVED":
      return theme.colors.success ?? "#16a34a";
    case "REJECTED":
      return theme.colors.error;
    case "EXPIRED":
    case "CANCELLED":
    case "REVOKED":
    default:
      return theme.colors.textMuted;
  }
}

export default function PractitionerCareChatRequestDetailScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();

  const requestQuery = usePractitionerCareChatRequest(id ?? null);
  const request = requestQuery.data;

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString(
      i18n.language?.startsWith("ar") ? "ar-SA" : "en-US",
      {
        day: "numeric",
        month: "long",
        year: "numeric",
      },
    );
  }

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

  const color = requestColor(request.status, theme);
  const isApproved = request.status === "APPROVED";

  return (
    <Screen bg="background">
      <Header
        title={t("practitioner.careChat.requestDetail.title")}
        showBack
        onBack={() => router.back()}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.card}>
          <View style={styles.row}>
            <Ionicons
              name="person-circle-outline"
              size={40}
              color={theme.colors.primary}
            />
            <View style={styles.personInfo}>
              <Text weight="600" style={styles.name}>
                {request.patient.displayName ?? t("practitioner.careChat.fallbackPatient")}
              </Text>
              <Text color={theme.colors.textMuted} style={styles.date}>
                {formatDate(request.requestedAt)}
              </Text>
            </View>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: `${color}20` }]}>
            <Text style={[styles.statusText, { color }]}>
              {t(
                `practitioner.careChat.requestStatus.${request.status}`,
                request.status,
              )}
            </Text>
          </View>

          {request.reason ? (
            <View style={styles.field}>
              <Text weight="600" style={styles.fieldLabel}>
                {t("practitioner.careChat.requestDetail.reason")}
              </Text>
              <Text color={theme.colors.textSecondary} style={styles.fieldValue}>
                {request.reason}
              </Text>
            </View>
          ) : null}

          {request.relatedSessionId ? (
            <View style={styles.field}>
              <Text weight="600" style={styles.fieldLabel}>
                {t("practitioner.careChat.requestDetail.session")}
              </Text>
              <Text color={theme.colors.textSecondary} style={styles.fieldValue}>
                {request.relatedSessionId}
              </Text>
            </View>
          ) : null}

          {request.expiresAt ? (
            <View style={styles.field}>
              <Text weight="600" style={styles.fieldLabel}>
                {t("practitioner.careChat.requestDetail.expiresAt")}
              </Text>
              <Text color={theme.colors.textSecondary} style={styles.fieldValue}>
                {formatDate(request.expiresAt)}
              </Text>
            </View>
          ) : null}
        </Card>

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
              {t("practitioner.careChat.requestDetail.pendingNotice")}
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
              {t("practitioner.careChat.requestDetail.rejectedNotice")}
            </Text>
          </View>
        ) : null}

        {request.status === "EXPIRED" ? (
          <View
            style={[
              styles.notice,
              { backgroundColor: theme.colors.textMuted + "10" },
            ]}
          >
            <Ionicons
              name="alert-circle-outline"
              size={18}
              color={theme.colors.textMuted}
            />
            <Text style={[styles.noticeText, { color: theme.colors.textMuted }]}>
              {t("practitioner.careChat.requestDetail.expiredNotice")}
            </Text>
          </View>
        ) : null}

        {request.status === "CANCELLED" || request.status === "REVOKED" ? (
          <View
            style={[
              styles.notice,
              { backgroundColor: theme.colors.textMuted + "10" },
            ]}
          >
            <Ionicons
              name="information-circle-outline"
              size={18}
              color={theme.colors.textMuted}
            />
            <Text style={[styles.noticeText, { color: theme.colors.textMuted }]}>
              {t("practitioner.careChat.inactiveNotice.default")}
            </Text>
          </View>
        ) : null}

        {isApproved && request.linkedConversationId ? (
          <Button
            title={t("practitioner.careChat.requestDetail.openConversation")}
            onPress={() =>
              router.push(
                `/(practitioner)/care-chat/${request.linkedConversationId}` as never,
              )
            }
          />
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 20,
    paddingBottom: 36,
    gap: 14,
  },
  card: {
    gap: 14,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  personInfo: {
    flex: 1,
  },
  name: {
    fontSize: 16,
  },
  date: {
    fontSize: 12,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
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
});
