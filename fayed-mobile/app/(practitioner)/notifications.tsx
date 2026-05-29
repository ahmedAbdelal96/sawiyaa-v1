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
  useMarkAllPractitionerNotificationsRead,
  useMarkPractitionerNotificationRead,
  usePractitionerNotifications,
  usePractitionerUnreadNotificationCount,
} from "../../src/features/practitioner/notifications/hooks";
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

export default function PractitionerNotificationsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [showUnreadOnly, setShowUnreadOnly] = React.useState(false);

  const notificationsQuery = usePractitionerNotifications(
    { page: 1, limit: 20 },
    { enabled: !!user },
  );
  const unreadCountQuery = usePractitionerUnreadNotificationCount({
    enabled: !!user,
  });
  const markReadMutation = useMarkPractitionerNotificationRead();
  const markAllReadMutation = useMarkAllPractitionerNotificationsRead();

  const notifications = notificationsQuery.data?.items ?? [];
  const unreadCount = unreadCountQuery.data?.item?.unreadCount ?? 0;
  const filteredNotifications = showUnreadOnly
    ? notifications.filter((n: UserNotificationItem) => n.readAt === null)
    : notifications;

  async function handleMarkRead(notification: UserNotificationItem) {
    if (notification.readAt === null) {
      try {
        await markReadMutation.mutateAsync(notification.id);
      } catch (error) {
        Alert.alert(
          t("notifications.error.title"),
          t("notifications.error.markReadFailed"),
        );
      }
    }
  }

  async function handleMarkAllRead() {
    try {
      await markAllReadMutation.mutateAsync(undefined);
    } catch (error) {
      Alert.alert(
        t("notifications.error.title"),
        t("notifications.error.markAllReadFailed"),
      );
    }
  }

  function handleNotificationPress(notification: UserNotificationItem) {
    if (notification.readAt === null) {
      handleMarkRead(notification);
    }

    if (notification.action?.href) {
      try {
        const route = resolvePatientNotificationRoute(notification.action.href);
        if (route) {
          router.push(route);
        }
      } catch (error) {
        console.warn("Invalid notification href:", notification.action?.href);
      }
    }
  }

  return (
    <Screen safeArea bg="background">
      <Header
        title={t("practitioner.notifications.title")}
        showBack
        rightElement={
          unreadCount > 0 ? (
            <TouchableOpacity
              onPress={() => void handleMarkAllRead()}
              disabled={markAllReadMutation.isPending}
            >
              <Text color={theme.colors.primary} weight="600">
                {markAllReadMutation.isPending
                  ? t("notifications.markAllLoading")
                  : t("notifications.markAll")}
              </Text>
            </TouchableOpacity>
          ) : null
        }
      />

      {filteredNotifications.length > 0 && (
        <View style={styles.actionBar}>
          <TouchableOpacity
            onPress={() => setShowUnreadOnly(!showUnreadOnly)}
            style={styles.filterButton}
          >
            <Text
              color={
                showUnreadOnly ? theme.colors.primary : theme.colors.textMuted
              }
              style={styles.filterText}
            >
              {showUnreadOnly
                ? t("notifications.filter.unread")
                : t("notifications.filter.all")}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {notificationsQuery.isLoading && !notifications.length ? (
        <LoadingState />
      ) : notificationsQuery.isError ? (
        <ErrorState
          title={t("notifications.error.title")}
          message={t("notifications.error.loadFailed")}
          onRetry={() => notificationsQuery.refetch()}
        />
      ) : filteredNotifications.length === 0 ? (
        <EmptyState
          title={t("notifications.empty.title")}
          description={t("notifications.empty.message")}
          icon={
            <Ionicons
              name="notifications-outline"
              size={48}
              color={theme.colors.textMuted}
            />
          }
        />
      ) : (
        <ScrollView style={styles.list}>
          {filteredNotifications.map((notification: UserNotificationItem) => (
            <TouchableOpacity
              key={notification.id}
              onPress={() => handleNotificationPress(notification)}
              activeOpacity={0.7}
            >
              <Card
                style={[
                  styles.notificationCard,
                  {
                    backgroundColor:
                      notification.readAt !== null
                        ? theme.colors.surface
                        : theme.colors.primary + "08",
                  },
                ]}
              >
                <View style={styles.notificationContent}>
                  <View style={styles.notificationHeader}>
                    <Text
                      style={[
                        styles.notificationTitle,
                        { color: theme.colors.textPrimary },
                      ]}
                      weight={notification.readAt !== null ? "normal" : "bold"}
                    >
                      {notification.title}
                    </Text>

                    {notification.readAt === null && (
                      <View
                        style={[
                          styles.unreadBadge,
                          { backgroundColor: theme.colors.primary },
                        ]}
                      />
                    )}
                  </View>

                  {notification.body && (
                    <Text
                      style={[
                        styles.notificationMessage,
                        { color: theme.colors.textSecondary },
                      ]}
                      numberOfLines={2}
                    >
                      {notification.body}
                    </Text>
                  )}

                  <Text
                    style={[
                      styles.notificationTime,
                      { color: theme.colors.textMuted },
                    ]}
                  >
                    {formatNotificationDateTime(
                      notification.createdAt,
                      i18n.language,
                    )}
                  </Text>
                </View>

                {notification.action?.href && (
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={theme.colors.textMuted}
                  />
                )}
              </Card>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actionBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
  },
  filterText: {
    fontSize: 14,
    fontWeight: "500",
  },
  markAllButton: {
    paddingHorizontal: 12,
  },
  list: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  notificationCard: {
    marginVertical: 8,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  notificationContent: {
    flex: 1,
    gap: 6,
  },
  notificationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  notificationTitle: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  unreadBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
    marginTop: 6,
  },
  notificationMessage: {
    fontSize: 13,
    lineHeight: 18,
  },
  notificationTime: {
    fontSize: 11,
    lineHeight: 14,
  },
});
