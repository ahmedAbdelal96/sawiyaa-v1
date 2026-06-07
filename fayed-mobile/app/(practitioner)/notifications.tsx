import React from "react";
import {
  ActivityIndicator,
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
  Card,
  EmptyState,
  ErrorState,
  FilterChip,
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
import type { UserNotificationItem } from "../../src/features/patient/notifications/types";
import {
  formatPractitionerNotificationDateTime,
  resolvePractitionerNotificationPresentation,
  resolvePractitionerNotificationRoute,
} from "../../src/features/practitioner/notifications/utils";

type NotificationFilter = "all" | "unread" | "read";

export default function PractitionerNotificationsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [filter, setFilter] = React.useState<NotificationFilter>("all");
  const [pendingNotificationId, setPendingNotificationId] = React.useState<
    string | null
  >(null);

  const notificationsQuery = usePractitionerNotifications(
    { page: 1, limit: 20 },
    { enabled: !!user },
  );
  const unreadCountQuery = usePractitionerUnreadNotificationCount({
    enabled: !!user,
  });
  const markReadMutation = useMarkPractitionerNotificationRead();
  const markAllReadMutation = useMarkAllPractitionerNotificationsRead();

  const notifications = React.useMemo(
    () => notificationsQuery.data?.items ?? [],
    [notificationsQuery.data?.items],
  );
  const unreadCount = unreadCountQuery.data?.item?.unreadCount ?? 0;

  const filteredNotifications = React.useMemo(() => {
    if (filter === "unread") {
      return notifications.filter((notification) => notification.readAt === null);
    }

    if (filter === "read") {
      return notifications.filter((notification) => notification.readAt !== null);
    }

    return notifications;
  }, [filter, notifications]);

  const hasNotifications = notifications.length > 0;

  async function handleMarkRead(notification: UserNotificationItem) {
    if (notification.readAt !== null) {
      return;
    }

    await markReadMutation.mutateAsync(notification.id);
  }

  async function handleMarkAllRead() {
    try {
      await markAllReadMutation.mutateAsync();
      await Promise.all([
        notificationsQuery.refetch(),
        unreadCountQuery.refetch(),
      ]);
    } catch {
      Alert.alert(
        t("practitionerNotifications.actionFailedTitle"),
        t("practitionerNotifications.actionFailedBody"),
      );
    }
  }

  async function handleNotificationPress(notification: UserNotificationItem) {
    if (
      pendingNotificationId ||
      markReadMutation.isPending ||
      markAllReadMutation.isPending
    ) {
      return;
    }

    setPendingNotificationId(notification.id);

    try {
      await handleMarkRead(notification);

      const route = resolvePractitionerNotificationRoute(
        notification.action?.href ?? "/",
        notification.typeSlug,
      );

      if (!route) {
        Alert.alert(
          t("practitionerNotifications.unsupportedAlertTitle"),
          t("practitionerNotifications.unsupportedAlertBody"),
        );
        return;
      }

      router.push(route as any);
    } catch {
      Alert.alert(
        t("practitionerNotifications.actionFailedTitle"),
        t("practitionerNotifications.actionFailedBody"),
      );
    } finally {
      setPendingNotificationId(null);
    }
  }

  return (
    <Screen safeArea bg="background">
      <Header title={t("practitionerNotifications.title")} showBack />

      {notificationsQuery.isLoading && !notifications.length ? (
        <LoadingState />
      ) : notificationsQuery.isError ? (
        <ErrorState
          title={t("practitionerNotifications.errorTitle")}
          message={t("practitionerNotifications.errorBody")}
          onRetry={() => notificationsQuery.refetch()}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Card variant="outlined" padding="sm" style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View
                style={[
                  styles.summaryIcon,
                  {
                    backgroundColor:
                      unreadCount > 0
                        ? theme.colors.primaryLight
                        : theme.colors.surfaceSecondary,
                    borderColor: theme.colors.borderLight,
                  },
                ]}
              >
                <Ionicons
                  name="notifications-outline"
                  size={20}
                  color={theme.colors.primary}
                />
              </View>

              <View style={styles.summaryTextWrap}>
                <Text weight="700" style={styles.summaryTitle}>
                  {t("practitionerNotifications.centerTitle")}
                </Text>
                <Text
                  color={theme.colors.textSecondary}
                  style={styles.summaryBody}
                >
                  {unreadCount > 0
                    ? t("practitionerNotifications.summaryBody", {
                        count: unreadCount,
                      })
                    : t("practitionerNotifications.summaryEmptyBody")}
                </Text>
              </View>

              <View
                style={[
                  styles.summaryCountPill,
                  {
                    backgroundColor:
                      unreadCount > 0
                        ? theme.colors.primaryLight
                        : theme.colors.surfaceSecondary,
                    borderColor: theme.colors.borderLight,
                  },
                ]}
              >
                <Text
                  weight="700"
                  color={
                    unreadCount > 0
                      ? theme.colors.primary
                      : theme.colors.textSecondary
                  }
                  style={styles.summaryCountText}
                >
                  {unreadCount}
                </Text>
              </View>
            </View>

            {unreadCount > 0 ? (
              <TouchableOpacity
                onPress={() => void handleMarkAllRead()}
                disabled={markAllReadMutation.isPending}
                activeOpacity={0.84}
                style={[
                  styles.summaryAction,
                  {
                    borderColor: theme.colors.borderStrong,
                    backgroundColor: theme.colors.surface,
                  },
                  markAllReadMutation.isPending ? styles.summaryActionDisabled : null,
                ]}
              >
                {markAllReadMutation.isPending ? (
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                ) : null}
                <Text
                  color={theme.colors.primary}
                  weight="600"
                  style={styles.summaryActionText}
                >
                  {markAllReadMutation.isPending
                    ? t("practitionerNotifications.markAllLoading")
                    : t("practitionerNotifications.markAll")}
                </Text>
              </TouchableOpacity>
            ) : null}
          </Card>

          {hasNotifications ? (
            <View style={styles.filterRow}>
              <FilterChip
                label={t("practitionerNotifications.filters.all")}
                selected={filter === "all"}
                onPress={() => setFilter("all")}
              />
              <FilterChip
                label={t("practitionerNotifications.filters.unread")}
                selected={filter === "unread"}
                onPress={() => setFilter("unread")}
              />
              <FilterChip
                label={t("practitionerNotifications.filters.read")}
                selected={filter === "read"}
                onPress={() => setFilter("read")}
              />
            </View>
          ) : null}

          {!hasNotifications ? (
            <EmptyState
              title={t("practitionerNotifications.emptyTitle")}
              description={t("practitionerNotifications.emptyBody")}
              icon={
                <Ionicons
                  name="notifications-outline"
                  size={48}
                  color={theme.colors.textMuted}
                />
              }
            />
          ) : filteredNotifications.length === 0 ? (
            <EmptyState
              title={
                filter === "read"
                  ? t("practitionerNotifications.emptyReadTitle")
                  : t("practitionerNotifications.emptyUnreadTitle")
              }
              description={
                filter === "read"
                  ? t("practitionerNotifications.emptyReadBody")
                  : t("practitionerNotifications.emptyUnreadBody")
              }
              icon={
                <Ionicons
                  name="checkmark-done-outline"
                  size={48}
                  color={theme.colors.textMuted}
                />
              }
            />
          ) : (
            <View style={styles.list}>
              {filteredNotifications.map((notification) => {
                const isUnread = notification.readAt === null;
                const presentation =
                  resolvePractitionerNotificationPresentation(
                    notification,
                    i18n.language,
                    t,
                  );
                const actionRoute = notification.action?.href
                  ? resolvePractitionerNotificationRoute(
                      notification.action.href,
                      notification.typeSlug,
                    )
                  : resolvePractitionerNotificationRoute(
                      "/",
                      notification.typeSlug,
                    );
                const isPending = pendingNotificationId === notification.id;
                const isDisabled =
                  Boolean(pendingNotificationId) ||
                  markReadMutation.isPending ||
                  markAllReadMutation.isPending;

                return (
                  <TouchableOpacity
                    key={notification.id}
                    activeOpacity={0.88}
                    disabled={isDisabled}
                    onPress={() => void handleNotificationPress(notification)}
                  >
                    <Card
                      variant="outlined"
                      padding="sm"
                      style={[
                        styles.notificationCard,
                        {
                          borderColor: isUnread
                            ? theme.colors.primary + "38"
                            : theme.colors.borderLight,
                          backgroundColor: isUnread
                            ? theme.colors.primaryLight + "18"
                            : theme.colors.surface,
                          opacity: isPending ? 0.72 : 1,
                        },
                      ]}
                    >
                      <View style={styles.itemTopRow}>
                        <View style={styles.itemTextWrap}>
                          <View style={styles.itemTitleRow}>
                            <Text
                              weight={isUnread ? "700" : "600"}
                              style={[
                                styles.itemTitle,
                                {
                                  color: isUnread
                                    ? theme.colors.textPrimary
                                    : theme.colors.textSecondary,
                                },
                              ]}
                            >
                              {presentation.title}
                            </Text>

                            {isUnread ? (
                              <View
                                style={[
                                  styles.unreadPill,
                                  {
                                    backgroundColor: theme.colors.primaryLight,
                                    borderColor: theme.colors.primary + "28",
                                  },
                                ]}
                              >
                                <View
                                  style={[
                                    styles.unreadDot,
                                    { backgroundColor: theme.colors.primary },
                                  ]}
                                />
                                <Text
                                  color={theme.colors.primary}
                                  weight="600"
                                  style={styles.unreadPillText}
                                >
                                  {t("practitionerNotifications.statusUnread")}
                                </Text>
                              </View>
                            ) : null}
                          </View>

                          {presentation.body ? (
                            <Text
                              color={
                                isUnread
                                  ? theme.colors.textSecondary
                                  : theme.colors.textMuted
                              }
                              style={styles.itemBody}
                              numberOfLines={3}
                            >
                              {presentation.body}
                            </Text>
                          ) : null}
                        </View>
                      </View>

                      <View style={styles.itemFooter}>
                        <Text
                          color={theme.colors.textMuted}
                          style={styles.itemDate}
                        >
                          {formatPractitionerNotificationDateTime(
                            notification.createdAt,
                            i18n.language,
                          )}
                        </Text>

                        <Ionicons
                          name="chevron-forward"
                          size={16}
                          color={actionRoute ? theme.colors.primary : theme.colors.textMuted}
                        />
                      </View>
                    </Card>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
  },
  summaryCard: {
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  summaryIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  summaryTextWrap: {
    flex: 1,
    gap: 4,
  },
  summaryTitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  summaryBody: {
    fontSize: 13,
    lineHeight: 20,
  },
  summaryCountPill: {
    minWidth: 42,
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  summaryCountText: {
    fontSize: 13,
    lineHeight: 18,
  },
  summaryAction: {
    marginTop: 10,
    minHeight: 36,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  summaryActionDisabled: {
    opacity: 0.72,
  },
  summaryActionText: {
    fontSize: 12,
    lineHeight: 16,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 6,
  },
  list: {
    gap: 10,
    paddingTop: 4,
  },
  notificationCard: {
    borderRadius: 18,
  },
  itemTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  itemTextWrap: {
    flex: 1,
    gap: 6,
  },
  itemTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  itemTitle: {
    fontSize: 15,
    lineHeight: 22,
    flexShrink: 1,
  },
  itemBody: {
    fontSize: 13,
    lineHeight: 20,
  },
  itemFooter: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  itemDate: {
    fontSize: 11,
    lineHeight: 14,
  },
  unreadPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 24,
    borderRadius: 999,
    paddingHorizontal: 8,
    borderWidth: 1,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
  },
  unreadPillText: {
    fontSize: 12,
    lineHeight: 16,
  },
});
