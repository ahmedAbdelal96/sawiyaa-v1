import React, { useMemo } from "react";
import {
  Alert,
  I18nManager,
  SectionList,
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

type NotificationSection = {
  title: string;
  data: UserNotificationItem[];
};

function formatNotificationDateTime(dateString: string, locale: string) {
  return new Date(dateString).toLocaleString(locale, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: !locale.startsWith("ar"),
  });
}

function getNotificationTimestamp(value: string) {
  const date = new Date(value);
  const time = date.getTime();
  return Number.isNaN(time) ? null : time;
}

function getSectionLabel(date: Date, locale: string) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round(
    (startOfToday.getTime() - startOfDate.getTime()) / 86_400_000,
  );

  if (diffDays === 0) {
    return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(0, "day");
  }

  if (diffDays === 1) {
    return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(-1, "day");
  }

  return date.toLocaleDateString(locale, {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function buildNotificationSections(
  items: UserNotificationItem[],
  locale: string,
): NotificationSection[] {
  const grouped = new Map<
    string,
    { sortAt: number; title: string; items: UserNotificationItem[] }
  >();

  const sortedItems = [...items].sort((left, right) => {
    const leftTime = getNotificationTimestamp(left.createdAt) ?? 0;
    const rightTime = getNotificationTimestamp(right.createdAt) ?? 0;
    return rightTime - leftTime;
  });

  for (const item of sortedItems) {
    const timestamp = getNotificationTimestamp(item.createdAt);
    if (timestamp === null) {
      continue;
    }

    const date = new Date(timestamp);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
      date.getDate(),
    ).padStart(2, "0")}`;
    const existing = grouped.get(key);

    if (existing) {
      existing.items.push(item);
      continue;
    }

    grouped.set(key, {
      sortAt: timestamp,
      title: getSectionLabel(date, locale),
      items: [item],
    });
  }

  return [...grouped.values()]
    .sort((left, right) => right.sortAt - left.sortAt)
    .map((section) => ({
      title: section.title,
      data: section.items,
    }));
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
  const isRTL = I18nManager.isRTL;

  const unreadCountQuery = usePatientUnreadNotificationCount();
  const listQuery = usePatientNotifications({ page: 1, limit: 20 });
  const markReadMutation = useMarkPatientNotificationRead();
  const markAllReadMutation = useMarkAllPatientNotificationsRead();

  const unreadCount = unreadCountQuery.data?.item.unreadCount ?? 0;
  const items = useMemo(() => listQuery.data?.items ?? [], [listQuery.data?.items]);
  const sections = useMemo(
    () => buildNotificationSections(items, locale),
    [items, locale],
  );

  const handleOpenNotification = async (item: UserNotificationItem) => {
    try {
      if (!item.readAt) {
        await markReadMutation.mutateAsync(item.id);
      }

      const targetRoute = resolvePatientNotificationRoute(
        item.action?.href ?? "/",
        item.typeSlug,
      );
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

  const resolveNotificationTitle = (item: UserNotificationItem) => {
    if (!locale.startsWith("ar")) {
      return item.title || item.typeSlug;
    }

    switch (item.typeSlug) {
      case "sessions.session-confirmed":
        return t("patientNotifications.feedTypes.sessionConfirmedTitle");
      case "sessions.session-join-available":
        return t("patientNotifications.feedTypes.sessionJoinAvailableTitle");
      default:
        return item.title || item.typeSlug;
    }
  };

  const resolveNotificationBody = (item: UserNotificationItem) => {
    if (!locale.startsWith("ar")) {
      return item.body;
    }

    const payload = item.payload ?? {};
    const packageSessionIndex = payload.packageSessionIndex;
    const packageSessionCount = payload.packageSessionCount;
    let packageContext = "";
    if (
      packageSessionIndex !== undefined &&
      packageSessionCount !== undefined &&
      Number(packageSessionCount) > 0
    ) {
      packageContext = " " + t("patientNotifications.feedTypes.packageSessionContext", {
        packageSessionIndex,
        packageSessionCount,
      });
    }

    switch (item.typeSlug) {
      case "sessions.session-confirmed":
        return t("patientNotifications.feedTypes.sessionConfirmedBody", {
          packageContext,
        });
      case "sessions.session-join-available":
        return t("patientNotifications.feedTypes.sessionJoinAvailableBody", {
          packageContext,
        });
      default:
        return item.body;
    }
  };

  return (
    <Screen bg="background">
      <Header
        title={t("patientNotifications.title")}
        rightElement={
          unreadCount > 0 ? (
            <TouchableOpacity
              onPress={() => void markAllReadMutation.mutateAsync()}
              disabled={markAllReadMutation.isPending}
              style={styles.markAllButton}
            >
              <Text color={theme.colors.primary} weight="700">
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
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          ListHeaderComponent={
            <View style={styles.headerStack}>
              {/* Compact Unread Summary Row */}
              <View style={[styles.summaryRowContainer, isRTL ? styles.rowRtl : styles.rowLtr]}>
                <View style={styles.summaryTextWrap}>
                  <Text weight="700" variant="title" color={theme.colors.textPrimary}>
                    {t("patientNotifications.summaryTitle")}
                  </Text>
                  <Text color={theme.colors.textSecondary} style={styles.summaryBody}>
                    {t("patientNotifications.summaryBody", { count: unreadCount })}
                  </Text>
                </View>
                {unreadCount > 0 ? (
                  <View style={[styles.summaryBadge, { backgroundColor: theme.colors.primary }]}>
                    <Text weight="700" color="#FFFFFF" style={styles.summaryCount}>
                      {String(unreadCount)}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Compact Push Notifications Banner */}
              <Card variant="flat" padding="none" style={styles.pushCard}>
                <View style={[styles.pushCardHeader, isRTL ? styles.rowRtl : styles.rowLtr]}>
                  <View style={styles.pushTextWrap}>
                    <Text weight="700" style={styles.pushTitle}>
                      {t("patientNotifications.pushCardTitle")}
                    </Text>
                    <Text color={theme.colors.textSecondary} style={styles.pushBody}>
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
                <View style={[styles.pushFooterRow, isRTL ? styles.rowRtl : styles.rowLtr]}>
                  <Text color={theme.colors.textMuted} style={styles.pushStatusText}>
                    {t(`patientNotifications.pushStatus.${pushRegistrationStatus}`)}
                  </Text>
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
                    style={styles.pushBtn}
                  />
                </View>
              </Card>
            </View>
          }
          renderSectionHeader={({ section }) => (
            <View style={[styles.sectionHeader, isRTL ? styles.sectionHeaderRtl : styles.sectionHeaderLtr]}>
              <Text weight="700" color={theme.colors.textSecondary} style={styles.sectionTitle}>
                {section.title}
              </Text>
            </View>
          )}
          renderItem={({ item }) => {
            const isUnread = !item.readAt;
            const itemTitle = resolveNotificationTitle(item);
            const itemBody = resolveNotificationBody(item);

            return (
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() => void handleOpenNotification(item)}
                accessibilityRole="button"
                accessibilityLabel={`${isUnread ? t("patientNotifications.statusUnread") : t("patientNotifications.statusRead")}. ${itemTitle}. ${itemBody}`}
                style={[
                  styles.itemRowWrapper,
                  isUnread ? styles.itemRowUnread : null,
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
                        name={getNotificationIcon(item.typeSlug)}
                        size={18}
                        color={isUnread ? theme.colors.primary : theme.colors.textMuted}
                      />
                    </View>
                    {isUnread ? <View style={[styles.unreadDotIndicator, { backgroundColor: theme.colors.primary }]} /> : null}
                  </View>

                  {/* Content column */}
                  <View style={styles.itemTextWrap}>
                    <View style={[styles.itemHeaderRow, isRTL ? styles.rowRtl : styles.rowLtr]}>
                      <Text weight="700" color={theme.colors.textPrimary} style={styles.itemTitle}>
                        {itemTitle}
                      </Text>
                      <Text color={theme.colors.textMuted} style={styles.itemDate}>
                        {formatNotificationDateTime(item.createdAt, locale)}
                      </Text>
                    </View>

                    <Text color={theme.colors.textSecondary} numberOfLines={2} style={styles.itemBody}>
                      {itemBody}
                    </Text>

                    {item.action ? (
                      <View style={[styles.actionRow, isRTL ? styles.rowRtl : styles.rowLtr]}>
                        <Text color={theme.colors.primary} weight="700" style={styles.actionLabel}>
                          {item.action.label ?? t("patientNotifications.openAction")}
                        </Text>
                        <Ionicons
                          name={isRTL ? "chevron-back" : "chevron-forward"}
                          size={14}
                          color={theme.colors.primary}
                        />
                      </View>
                    ) : null}
                  </View>
                </View>
                <View style={styles.rowDivider} />
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
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
          }
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  markAllButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  headerStack: {
    gap: 16,
    marginBottom: 20,
  },
  summaryRowContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  rowLtr: {
    flexDirection: "row",
  },
  rowRtl: {
    flexDirection: "row-reverse",
  },
  summaryTextWrap: {
    flex: 1,
    gap: 2,
  },
  summaryBody: {
    fontSize: 13,
  },
  summaryBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryCount: {
    fontSize: 12,
    lineHeight: 16,
  },
  pushCard: {
    borderRadius: 16,
    backgroundColor: "#FCFAF6",
    borderWidth: 1,
    borderColor: "#E8DED0",
    padding: 12,
    gap: 8,
  },
  pushCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  pushTextWrap: {
    flex: 1,
    gap: 2,
  },
  pushTitle: {
    fontSize: 14,
  },
  pushBody: {
    fontSize: 12,
    lineHeight: 18,
  },
  pushStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  pushFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginTop: 4,
  },
  pushStatusText: {
    fontSize: 11,
    flex: 1,
  },
  pushBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    minHeight: 32,
    width: "auto",
  },
  pushBtnText: {
    fontSize: 11,
  },
  sectionHeader: {
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: "#F7F4EE",
  },
  sectionHeaderLtr: {
    alignItems: "flex-start",
  },
  sectionHeaderRtl: {
    alignItems: "flex-end",
  },
  sectionTitle: {
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  itemRowWrapper: {
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  itemRowUnread: {
    backgroundColor: "#EEF4EF",
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
  itemHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  itemTitle: {
    flex: 1,
    fontSize: 14,
    lineHeight: 18,
  },
  itemBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  itemDate: {
    fontSize: 10,
    lineHeight: 14,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  actionLabel: {
    fontSize: 12,
    lineHeight: 16,
  },
  rowDivider: {
    height: 0,
  },
});
