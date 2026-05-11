import React from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Header,
  LoadingState,
  Screen,
  Text,
} from "../../src/components/ui";
import { useAuth } from "../../src/providers/AuthProvider";
import { useTheme } from "../../src/providers/ThemeProvider";
import {
  useMarkAllPatientNotificationsRead,
  useMarkPatientNotificationRead,
  usePatientNotifications,
  usePatientUnreadNotificationCount,
} from "../../src/features/patient/notifications/hooks";
import { resolvePatientNotificationRoute } from "../../src/features/patient/notifications/routes";
import type { UserNotificationItem } from "../../src/features/patient/notifications/types";

function formatNotificationDateTime(dateString: string, locale: string) {
  return new Date(dateString).toLocaleString(locale, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: !locale.startsWith("ar"),
  });
}

export default function PatientNotificationsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const {
    enablePushNotifications,
    isPushRegistrationPending,
    pushRegistrationStatus,
    refreshPushRegistrationState,
  } = useAuth();
  const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US";

  const unreadCountQuery = usePatientUnreadNotificationCount();
  const listQuery = usePatientNotifications({ page: 1, limit: 50 });
  const markReadMutation = useMarkPatientNotificationRead();
  const markAllReadMutation = useMarkAllPatientNotificationsRead();

  const unreadCount = unreadCountQuery.data?.item.unreadCount ?? 0;
  const items = listQuery.data?.items ?? [];

  const handleOpenNotification = async (item: UserNotificationItem) => {
    try {
      if (!item.readAt) {
        await markReadMutation.mutateAsync(item.id);
      }

      if (!item.action?.href) {
        return;
      }

      const targetRoute = resolvePatientNotificationRoute(item.action.href);
      if (!targetRoute) {
        Alert.alert(
          t("patientNotifications.unsupportedAlertTitle"),
          t("patientNotifications.unsupportedAlertBody"),
        );
        return;
      }

      router.push(targetRoute as any);
    } catch {
      Alert.alert(
        t("patientNotifications.actionFailedTitle"),
        t("patientNotifications.actionFailedBody"),
      );
    }
  };

  return (
    <Screen bg="background">
      <Header
        title={t("patientNotifications.title")}
        showBack
        rightElement={
          unreadCount > 0 ? (
            <TouchableOpacity
              onPress={() => void markAllReadMutation.mutateAsync()}
              disabled={markAllReadMutation.isPending}
            >
              <Text color={theme.colors.primary} weight="600">
                {markAllReadMutation.isPending
                  ? t("patientNotifications.markAllLoading")
                  : t("patientNotifications.markAll")}
              </Text>
            </TouchableOpacity>
          ) : null
        }
      />

      {listQuery.isLoading ? <LoadingState fullScreen /> : null}

      {listQuery.isError && !listQuery.isLoading ? (
        <ErrorState
          fullScreen
          title={t("patientNotifications.errorTitle")}
          message={t("patientNotifications.errorBody")}
          onRetry={() => {
            void unreadCountQuery.refetch();
            void listQuery.refetch();
          }}
        />
      ) : null}

      {!listQuery.isLoading && !listQuery.isError ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Card variant="flat" padding="md" style={styles.summaryCard}>
            <Text weight="600" style={styles.summaryTitle}>
              {t("patientNotifications.summaryTitle")}
            </Text>
            <Text color={theme.colors.textSecondary} style={styles.summaryBody}>
              {t("patientNotifications.summaryBody", { count: unreadCount })}
            </Text>
          </Card>

          <Card variant="flat" padding="md" style={styles.summaryCard}>
            <View style={styles.pushCardHeader}>
              <View style={styles.itemTextWrap}>
                <Text weight="600" style={styles.summaryTitle}>
                  {t("patientNotifications.pushCardTitle")}
                </Text>
                <Text
                  color={theme.colors.textSecondary}
                  style={styles.summaryBody}
                >
                  {t("patientNotifications.pushCardBody")}
                </Text>
              </View>
              <View
                style={[
                  styles.pushStatusDot,
                  {
                    backgroundColor:
                      pushRegistrationStatus === "registered"
                        ? theme.colors.success
                        : pushRegistrationStatus === "failed" ||
                            pushRegistrationStatus === "denied"
                          ? theme.colors.error
                          : theme.colors.primary,
                  },
                ]}
              />
            </View>
            <Text
              color={theme.colors.textSecondary}
              style={styles.pushStatusText}
            >
              {t(`patientNotifications.pushStatus.${pushRegistrationStatus}`)}
            </Text>
            <View style={styles.pushActions}>
              <Button
                title={
                  pushRegistrationStatus === "registered"
                    ? t("patientNotifications.pushRefreshAction")
                    : t("patientNotifications.pushEnableAction")
                }
                onPress={() => {
                  void (pushRegistrationStatus === "registered"
                    ? refreshPushRegistrationState()
                    : enablePushNotifications());
                }}
                disabled={isPushRegistrationPending}
              />
            </View>
          </Card>

          {items.length === 0 ? (
            <EmptyState
              title={t("patientNotifications.emptyTitle")}
              description={t("patientNotifications.emptyBody")}
              icon={
                <Ionicons
                  name="notifications-outline"
                  size={48}
                  color={theme.colors.textMuted}
                />
              }
            />
          ) : (
            <View style={styles.list}>
              {items.map((item) => {
                const isUnread = !item.readAt;
                return (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.86}
                    onPress={() => void handleOpenNotification(item)}
                  >
                    <Card
                      variant="elevated"
                      padding="md"
                      style={[
                        styles.itemCard,
                        {
                          borderColor: isUnread
                            ? theme.colors.primary + "30"
                            : theme.colors.borderLight,
                          backgroundColor: isUnread
                            ? theme.colors.primaryLight + "22"
                            : theme.colors.surface,
                        },
                      ]}
                    >
                      <View style={styles.itemTopRow}>
                        <View style={styles.itemTextWrap}>
                          <Text weight="600" style={styles.itemTitle}>
                            {item.title}
                          </Text>
                          <Text
                            color={theme.colors.textSecondary}
                            style={styles.itemBody}
                          >
                            {item.body}
                          </Text>
                        </View>
                        <View style={styles.metaWrap}>
                          {isUnread ? (
                            <View
                              style={[
                                styles.unreadDot,
                                { backgroundColor: theme.colors.primary },
                              ]}
                            />
                          ) : null}
                          <Text
                            color={theme.colors.textMuted}
                            style={styles.itemDate}
                          >
                            {formatNotificationDateTime(item.createdAt, locale)}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.itemFooter}>
                        <Text
                          color={theme.colors.textMuted}
                          style={styles.statusText}
                        >
                          {isUnread
                            ? t("patientNotifications.statusUnread")
                            : t("patientNotifications.statusRead")}
                        </Text>
                        {item.action ? (
                          <Text color={theme.colors.primary} weight="600">
                            {item.action.label ??
                              t("patientNotifications.openAction")}
                          </Text>
                        ) : null}
                      </View>
                    </Card>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  summaryCard: {
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 16,
    marginBottom: 4,
  },
  summaryBody: {
    fontSize: 14,
    lineHeight: 22,
  },
  list: {
    gap: 10,
  },
  pushActions: {
    marginTop: 16,
  },
  pushCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  pushStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 6,
  },
  pushStatusText: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 12,
  },
  itemCard: {
    borderWidth: 1,
  },
  itemTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  itemTextWrap: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 15,
    marginBottom: 6,
  },
  itemBody: {
    fontSize: 13,
    lineHeight: 20,
  },
  metaWrap: {
    alignItems: "flex-end",
    gap: 8,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  itemDate: {
    fontSize: 11,
  },
  itemFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
  },
  statusText: {
    fontSize: 12,
  },
});

