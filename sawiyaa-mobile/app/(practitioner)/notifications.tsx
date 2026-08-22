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
  EmptyState,
  ErrorState,
  Header,
  LoadingState,
  Screen,
  Text,
} from "../../src/components/ui";
import { useAuth } from "../../src/providers/AuthProvider";
import { useTheme } from "../../src/providers/ThemeProvider";
import { useAppDirection } from "../../src/i18n/direction";
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

function getNotificationIcon(typeSlug: string) {
  const slug = typeSlug.toLowerCase();
  if (slug.includes("session") || slug.includes("booking")) {
    return "calendar-outline" as const;
  }
  if (slug.includes("message") || slug.includes("chat")) {
    return "chatbubble-ellipses-outline" as const;
  }
  if (slug.includes("availability")) {
    return "time-outline" as const;
  }
  return "notifications-outline" as const;
}

export default function PractitionerNotificationsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { isRtl: isRTL, chevronForward } = useAppDirection();
  const [filter, setFilter] = React.useState<NotificationFilter>("all");
  const [page, setPage] = React.useState(1);
  const [notifications, setNotifications] = React.useState<UserNotificationItem[]>([]);
  const [pendingNotificationId, setPendingNotificationId] = React.useState<string | null>(null);

  const notificationsQuery = usePractitionerNotifications(
    { page, limit: 20 },
    { enabled: !!user },
  );
  const unreadCountQuery = usePractitionerUnreadNotificationCount({
    enabled: !!user,
  });
  const markReadMutation = useMarkPractitionerNotificationRead();
  const markAllReadMutation = useMarkAllPractitionerNotificationsRead();

  React.useEffect(() => {
    const nextItems = notificationsQuery.data?.items;
    if (!nextItems) return;

    setNotifications((current) => {
      if (page === 1) return nextItems;
      const seen = new Set(current.map((item) => item.id));
      return [...current, ...nextItems.filter((item) => !seen.has(item.id))];
    });
  }, [notificationsQuery.data?.items, page]);

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
    if (notification.readAt !== null) return;
    await markReadMutation.mutateAsync(notification.id);
    setNotifications((current) =>
      current.map((item) =>
        item.id === notification.id
          ? { ...item, readAt: new Date().toISOString() }
          : item,
      ),
    );
  }

  async function handleMarkAllRead() {
    try {
      await markAllReadMutation.mutateAsync();
      setNotifications((current) =>
        current.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })),
      );
      setPage(1);
    } catch {
      Alert.alert(
        t("practitionerNotifications.actionFailedTitle"),
        t("practitionerNotifications.markAllFailedBody"),
      );
    }
  }

  async function handleNotificationPress(
    notification: UserNotificationItem,
    route: string | null,
  ) {
    if (!route || pendingNotificationId || markReadMutation.isPending || markAllReadMutation.isPending) {
      return;
    }

    setPendingNotificationId(notification.id);
    try {
      await handleMarkRead(notification);
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

  const retry = () => {
    setPage(1);
    void notificationsQuery.refetch();
  };

  return (
    <Screen safeArea bg="background" testID="notifications-screen">
      <Header title={t("practitionerNotifications.title")} showBack />

      {notificationsQuery.isLoading && !notifications.length ? (
        <LoadingState />
      ) : notificationsQuery.isError && !notifications.length ? (
        <ErrorState
          title={t("practitionerNotifications.errorTitle")}
          message={t("practitionerNotifications.errorBody")}
          onRetry={retry}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.feedHeader, { borderBottomColor: theme.colors.borderLight }]}>
            <View style={[styles.feedHeaderRow, isRTL ? styles.rowRtl : styles.rowLtr]}>
              <View
                style={[
                  styles.feedIcon,
                  {
                    backgroundColor: unreadCount > 0
                      ? theme.colors.primaryLight
                      : theme.colors.surfaceSecondary,
                    borderColor: theme.colors.borderLight,
                  },
                ]}
              >
                <Ionicons name="notifications-outline" size={20} color={theme.colors.primary} />
              </View>
              <View style={[styles.feedHeaderCopy, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
                <Text
                  color={theme.colors.textPrimary}
                  weight="700"
                  style={[styles.feedSubtitle, { textAlign: isRTL ? "right" : "left" }]}
                >
                  {unreadCount > 0
                    ? t("practitionerNotifications.summaryBody", { count: unreadCount })
                    : t("practitionerNotifications.summaryEmptyBody")}
                </Text>
              </View>
              <View
                accessible
                accessibilityLabel={t("practitionerNotifications.unreadCount", {
                  count: unreadCount,
                })}
                style={[
                  styles.countPill,
                  {
                    backgroundColor: unreadCount > 0
                      ? theme.colors.primaryLight
                      : theme.colors.surfaceSecondary,
                    borderColor: theme.colors.borderLight,
                  },
                ]}
              >
                <Text
                  weight="700"
                  color={unreadCount > 0 ? theme.colors.primary : theme.colors.textSecondary}
                  style={styles.countText}
                >
                  {unreadCount}
                </Text>
              </View>
            </View>

            {unreadCount > 0 ? (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t("practitionerNotifications.markAll")}
                onPress={() => void handleMarkAllRead()}
                disabled={markAllReadMutation.isPending}
                style={[
                  styles.markAllButton,
                  {
                    alignSelf: isRTL ? "flex-end" : "flex-start",
                  },
                ]}
              >
                {markAllReadMutation.isPending ? (
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                ) : null}
                <Text color={theme.colors.primary} weight="600" style={styles.markAllText}>
                  {markAllReadMutation.isPending
                    ? t("practitionerNotifications.markAllLoading")
                    : t("practitionerNotifications.markAll")}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {hasNotifications ? (
            <View
              style={[
                styles.filterRow,
                {
                  borderColor: theme.colors.borderLight,
                  flexDirection: isRTL ? "row-reverse" : "row",
                },
              ]}
            >
              {(["all", "unread", "read"] as const).map((value) => {
                const selected = filter === value;
                return (
                  <TouchableOpacity
                    key={value}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setFilter(value)}
                    style={[
                      styles.filterButton,
                      {
                        backgroundColor: selected ? theme.colors.primary : "transparent",
                        borderColor: selected ? theme.colors.primary : "transparent",
                      },
                    ]}
                  >
                    <Text
                      weight={selected ? "700" : "600"}
                      color={selected ? theme.colors.onPrimary : theme.colors.textSecondary}
                      style={styles.filterText}
                    >
                      {t("practitionerNotifications.filters." + value)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}

          {!hasNotifications ? (
            <EmptyState
              title={t("practitionerNotifications.emptyTitle")}
              description={t("practitionerNotifications.emptyBody")}
              icon={<Ionicons name="notifications-outline" size={44} color={theme.colors.textMuted} />}
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
              icon={<Ionicons name="checkmark-done-outline" size={44} color={theme.colors.textMuted} />}
            />
          ) : (
            <View style={styles.list}>
              {filteredNotifications.map((notification) => {
                const isUnread = notification.readAt === null;
                const presentation = resolvePractitionerNotificationPresentation(
                  notification,
                  i18n.language,
                  t,
                );
                const actionRoute = resolvePractitionerNotificationRoute(
                  notification.action?.href ?? "/",
                  notification.typeSlug,
                  notification.payload,
                  notification.primaryAction,
                );
                const isPending = pendingNotificationId === notification.id;
                const isDisabled =
                  Boolean(pendingNotificationId) ||
                  markReadMutation.isPending ||
                  markAllReadMutation.isPending;
                const accessibilityLabel = [
                  isUnread
                    ? t("practitionerNotifications.statusUnread")
                    : t("practitionerNotifications.statusRead"),
                  presentation.title,
                  presentation.body,
                  formatPractitionerNotificationDateTime(
                    notification.createdAt,
                    i18n.language,
                  ),
                ].join(". ");

                return (
                  <TouchableOpacity
                    key={notification.id}
                    activeOpacity={actionRoute ? 0.78 : 1}
                    disabled={!actionRoute || isDisabled}
                    onPress={() => void handleNotificationPress(notification, actionRoute)}
                    accessibilityRole={actionRoute ? "button" : undefined}
                    accessibilityLabel={accessibilityLabel}
                  >
                    <View
                      style={[
                        styles.notificationRow,
                        {
                          borderBottomColor: theme.colors.borderLight,
                          backgroundColor: isUnread ? theme.colors.primarySoft : "transparent",
                          opacity: isPending ? 0.68 : 1,
                        },
                      ]}
                    >
                      <View style={[styles.rowContent, isRTL ? styles.rowRtl : styles.rowLtr]}>
                        <View style={styles.iconColumn}>
                          <View
                            style={[
                              styles.itemIcon,
                              {
                                backgroundColor: isUnread
                                  ? theme.colors.primaryLight
                                  : theme.colors.surfaceSecondary,
                              },
                            ]}
                          >
                            <Ionicons
                              name={getNotificationIcon(notification.typeSlug)}
                              size={18}
                              color={isUnread ? theme.colors.primary : theme.colors.textMuted}
                            />
                          </View>
                          {isUnread ? (
                            <View style={[styles.unreadDot, { backgroundColor: theme.colors.primary }]} />
                          ) : null}
                        </View>
                        <View style={styles.itemCopy}>
                          <Text
                            weight={isUnread ? "700" : "600"}
                            color={theme.colors.textPrimary}
                            style={[styles.itemTitle, { textAlign: isRTL ? "right" : "left" }]}
                          >
                            {presentation.title}
                          </Text>
                          <Text
                            color={theme.colors.textSecondary}
                            style={[styles.itemBody, { textAlign: isRTL ? "right" : "left" }]}
                            numberOfLines={3}
                          >
                            {presentation.body}
                          </Text>
                        </View>
                      </View>
                      <View style={[styles.itemFooter, isRTL ? styles.rowRtl : styles.rowLtr]}>
                        <Text color={theme.colors.textMuted} style={styles.itemDate}>
                          {formatPractitionerNotificationDateTime(
                            notification.createdAt,
                            i18n.language,
                          )}
                        </Text>
                        {actionRoute ? (
                          <Ionicons
                            name={chevronForward}
                            size={16}
                            color={theme.colors.primary}
                          />
                        ) : null}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {notificationsQuery.data?.pagination.hasNextPage ? (
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => setPage((current) => current + 1)}
              disabled={notificationsQuery.isFetching}
              style={[styles.loadMoreButton, { borderColor: theme.colors.borderStrong }]}
            >
              {notificationsQuery.isFetching ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : null}
              <Text color={theme.colors.primary} weight="600" style={styles.loadMoreText}>
                {notificationsQuery.isFetching
                  ? t("practitionerNotifications.loadingMore")
                  : t("practitionerNotifications.loadMore")}
              </Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 32,
  },
  feedHeader: {
    paddingBottom: 14,
    marginBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  feedHeaderRow: {
    alignItems: "center",
    gap: 12,
  },
  rowLtr: {
    flexDirection: "row",
  },
  rowRtl: {
    flexDirection: "row-reverse",
  },
  feedIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  feedHeaderCopy: {
    flex: 1,
    gap: 3,
  },
  feedSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  countPill: {
    minWidth: 38,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  countText: {
    fontSize: 13,
    lineHeight: 18,
  },
  markAllButton: {
    minHeight: 44,
    marginTop: 4,
    paddingHorizontal: 4,
    borderWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  markAllText: {
    fontSize: 12,
    lineHeight: 16,
  },
  filterRow: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 14,
    padding: 3,
    marginBottom: 6,
  },
  filterButton: {
    flex: 1,
    minHeight: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  filterText: {
    fontSize: 12,
    lineHeight: 16,
  },
  list: {
    marginTop: 2,
  },
  notificationRow: {
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  rowContent: {
    alignItems: "flex-start",
    gap: 12,
  },
  iconColumn: {
    width: 32,
    alignItems: "center",
    position: "relative",
  },
  itemIcon: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    position: "absolute",
    top: -2,
    right: -2,
  },
  itemCopy: {
    flex: 1,
    gap: 3,
  },
  itemTitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  itemBody: {
    fontSize: 13,
    lineHeight: 19,
  },
  itemFooter: {
    minHeight: 20,
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingStart: 44,
  },
  itemDate: {
    fontSize: 11,
    lineHeight: 16,
  },
  loadMoreButton: {
    minHeight: 42,
    marginTop: 14,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  loadMoreText: {
    fontSize: 13,
  },
});
