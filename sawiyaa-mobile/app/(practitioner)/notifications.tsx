import React from "react";
import {
  ActivityIndicator,
  Alert,
  I18nManager,
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

const getNotificationIcon = (typeSlug: string) => {
  const slug = typeSlug.toLowerCase();
  if (slug.includes("session")) {
    return "calendar-outline" as const;
  }
  if (slug.includes("message") || slug.includes("chat")) {
    return "chatbubble-ellipses-outline" as const;
  }
  if (slug.includes("payment") || slug.includes("wallet")) {
    return "card-outline" as const;
  }
  return "notifications-outline" as const;
};

export default function PractitionerNotificationsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language?.startsWith("ar");
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
            <View style={[styles.summaryRow, isRTL ? styles.rowRtl : styles.rowLtr]}>
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

              <View style={[styles.summaryTextWrap, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
                <Text weight="700" style={[styles.summaryTitle, { textAlign: isRTL ? "right" : "left" }]}>
                  {t("practitionerNotifications.centerTitle")}
                </Text>
                <Text
                  color={theme.colors.textSecondary}
                  style={[styles.summaryBody, { textAlign: isRTL ? "right" : "left" }]}
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
            <View style={styles.filterTabsRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setFilter("all")}
                style={[
                  styles.filterTabButton,
                  filter === "all" ? styles.filterTabButtonSelected : null,
                ]}
              >
                <Text
                  weight={filter === "all" ? "700" : "600"}
                  color={filter === "all" ? "#FFFFFF" : theme.colors.textSecondary}
                  style={styles.filterTabText}
                >
                  {t("practitionerNotifications.filters.all")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setFilter("unread")}
                style={[
                  styles.filterTabButton,
                  filter === "unread" ? styles.filterTabButtonSelected : null,
                ]}
              >
                <Text
                  weight={filter === "unread" ? "700" : "600"}
                  color={filter === "unread" ? "#FFFFFF" : theme.colors.textSecondary}
                  style={styles.filterTabText}
                >
                  {t("practitionerNotifications.filters.unread")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setFilter("read")}
                style={[
                  styles.filterTabButton,
                  filter === "read" ? styles.filterTabButtonSelected : null,
                ]}
              >
                <Text
                  weight={filter === "read" ? "700" : "600"}
                  color={filter === "read" ? "#FFFFFF" : theme.colors.textSecondary}
                  style={styles.filterTabText}
                >
                  {t("practitionerNotifications.filters.read")}
                </Text>
              </TouchableOpacity>
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
                const isRTL = i18n.language?.startsWith("ar");
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
                        isUnread
                          ? {
                              backgroundColor: "#EEF4EF",
                              borderColor: theme.colors.primary + "28",
                            }
                          : {
                              backgroundColor: "#FFFFFF",
                              borderColor: "#E8DED0",
                            },
                        { opacity: isPending ? 0.72 : 1 },
                      ]}
                    >
                      <View style={[styles.itemContentLayout, isRTL ? styles.rowRtl : styles.rowLtr]}>
                        {/* Leading Icon wrapper */}
                        <View style={styles.iconContainerWrap}>
                          <View
                            style={[
                              styles.iconWrap,
                              {
                                backgroundColor: isUnread
                                  ? theme.colors.primarySoft
                                  : theme.colors.iconContainerMuted,
                              },
                            ]}
                          >
                            <Ionicons
                              name={getNotificationIcon(notification.typeSlug)}
                              size={18}
                              color={
                                isUnread
                                  ? theme.colors.primary
                                  : theme.colors.textMuted
                              }
                            />
                          </View>
                          {isUnread ? (
                            <View
                              style={[
                                styles.unreadDotIndicator,
                                { backgroundColor: theme.colors.primary },
                              ]}
                            />
                          ) : null}
                        </View>

                        {/* Content column */}
                        <View style={styles.itemTextWrap}>
                          <View style={[styles.itemTitleRow, isRTL ? styles.rowRtl : styles.rowLtr]}>
                            <Text
                              weight={isUnread ? "700" : "600"}
                              style={[
                                styles.itemTitle,
                                {
                                  color: isUnread
                                    ? theme.colors.textPrimary
                                    : theme.colors.textSecondary,
                                  textAlign: isRTL ? "right" : "left",
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
                              style={[styles.itemBody, { textAlign: isRTL ? "right" : "left" }]}
                              numberOfLines={3}
                            >
                              {presentation.body}
                            </Text>
                          ) : null}
                        </View>
                      </View>

                      <View style={[styles.itemFooter, isRTL ? styles.rowRtl : styles.rowLtr]}>
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
                          name={isRTL ? "chevron-back" : "chevron-forward"}
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
    paddingTop: 16,
    paddingBottom: 32,
  },
  summaryCard: {
    marginBottom: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#E8DED0",
    backgroundColor: "#FFFFFF",
    padding: 14,
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
    borderWidth: 1.5,
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
    borderWidth: 1.5,
  },
  summaryCountText: {
    fontSize: 13,
    lineHeight: 18,
  },
  summaryAction: {
    marginTop: 12,
    minHeight: 36,
    borderRadius: 12,
    borderWidth: 1.5,
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
  filterTabsRow: {
    flexDirection: "row",
    backgroundColor: "#FCFAF6",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#E8DED0",
    padding: 4,
    gap: 4,
    marginBottom: 14,
  },
  filterTabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "transparent",
  },
  filterTabButtonSelected: {
    backgroundColor: "#24564F",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  filterTabText: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  list: {
    gap: 12,
  },
  notificationCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 14,
    gap: 10,
  },
  itemContentLayout: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  iconContainerWrap: {
    position: "relative",
    flexShrink: 0,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadDotIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: "absolute",
    top: -2,
    right: -2,
    borderWidth: 1.5,
    borderColor: "#EEF4EF",
  },
  itemTextWrap: {
    flex: 1,
    gap: 4,
  },
  itemTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  rowLtr: {
    flexDirection: "row",
  },
  rowRtl: {
    flexDirection: "row-reverse",
  },
  itemTitle: {
    fontSize: 14.5,
    lineHeight: 19,
    flexShrink: 1,
  },
  itemBody: {
    fontSize: 13,
    lineHeight: 19,
  },
  itemFooter: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  itemDate: {
    fontSize: 10,
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
