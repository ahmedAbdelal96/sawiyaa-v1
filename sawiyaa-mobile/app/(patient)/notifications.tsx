import React, { useMemo, useState } from "react";
import {
  Alert,
  SectionList,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  EmptyState,
  ErrorState,
  Header,
  Screen,
  Skeleton,
  Text,
} from "../../src/components/ui";
import { useTheme } from "../../src/providers/ThemeProvider";
import { getDirectionalIcon } from "../../src/i18n/direction";
import {
  useMarkAllPatientNotificationsRead,
  useMarkPatientNotificationRead,
  usePatientNotifications,
  usePatientUnreadNotificationCount,
} from "../../src/features/patient/notifications/hooks";
import { resolvePatientNotificationRoute } from "../../src/features/patient/notifications/routes";
import { resolvePatientNotificationPresentation } from "../../src/features/patient/notifications/presentation";
import type { UserNotificationItem } from "../../src/features/patient/notifications/types";
import {
  formatViewerDate,
  formatViewerDateTime,
  getDatePartsInTimeZone,
  getEffectiveViewerTimeZone,
} from "../../src/lib/time-formatting";

type NotificationSection = {
  title: string;
  data: UserNotificationItem[];
};

type NotificationFilter = "all" | "unread" | "read";

function formatNotificationDateTime(dateString: string, locale: string) {
  return formatViewerDateTime(dateString, {
    locale,
    dateStyle: "medium",
    timeStyle: "short",
    fallbackText: "-",
  });
}

function getNotificationTimestamp(value: string) {
  const date = new Date(value);
  const time = date.getTime();
  return Number.isNaN(time) ? null : time;
}

function getSectionLabel(date: Date, locale: string) {
  const timeZone = getEffectiveViewerTimeZone();
  const today = getDatePartsInTimeZone(new Date(), timeZone);
  const target = getDatePartsInTimeZone(date, timeZone);
  const todayUtc = today
    ? Date.UTC(today.year, today.month - 1, today.day)
    : Date.now();
  const targetUtc = target
    ? Date.UTC(target.year, target.month - 1, target.day)
    : date.getTime();
  const diffDays = Math.round((todayUtc - targetUtc) / 86_400_000);

  if (diffDays === 0) {
    return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(
      0,
      "day",
    );
  }

  if (diffDays === 1) {
    return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(
      -1,
      "day",
    );
  }

  return formatViewerDate(date, {
    locale,
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
    fallbackText: "-",
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
    const parts = getDatePartsInTimeZone(date, getEffectiveViewerTimeZone());
    const key = parts
      ? `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`
      : "invalid";
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
  const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US";
  const isRTL = i18n.language?.startsWith("ar");
  const [filter, setFilter] = useState<NotificationFilter>("all");

  const unreadCountQuery = usePatientUnreadNotificationCount();
  const listQuery = usePatientNotifications({ page: 1, limit: 20 });
  const markReadMutation = useMarkPatientNotificationRead();
  const markAllReadMutation = useMarkAllPatientNotificationsRead();

  const unreadCount = unreadCountQuery.data?.item.unreadCount ?? 0;
  const items = useMemo(
    () => listQuery.data?.items ?? [],
    [listQuery.data?.items],
  );
  const filteredItems = useMemo(() => {
    if (filter === "unread") {
      return items.filter((item) => !item.readAt);
    }
    if (filter === "read") {
      return items.filter((item) => Boolean(item.readAt));
    }
    return items;
  }, [filter, items]);
  const sections = useMemo(
    () => buildNotificationSections(filteredItems, locale),
    [filteredItems, locale],
  );

  const handleOpenNotification = async (item: UserNotificationItem) => {
    try {
      if (!item.readAt) {
        await markReadMutation.mutateAsync(item.id);
      }

      const targetRoute = resolvePatientNotificationRoute(
        item.action?.href ?? "/",
        item.typeSlug,
        {
          payload: item.payload,
          context: item.context,
          primaryAction: item.primaryAction,
        },
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
    if (slug.includes("message") || slug.includes("chat")) {
      return "chatbubble-ellipses-outline" as const;
    }
    if (slug.includes("session")) {
      return "calendar-outline" as const;
    }
    if (slug.includes("payment") || slug.includes("wallet")) {
      return "card-outline" as const;
    }
    return "notifications-outline" as const;
  };

  return (
    <Screen bg="background" testID="notifications-screen">
      <Header
        title={t("patientNotifications.title")}
      />

      {listQuery.isLoading && !listQuery.data ? <NotificationFeedSkeleton /> : null}

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
              <View
                style={[
                  styles.summaryRowContainer,
                  isRTL ? styles.rowRtl : styles.rowLtr,
                ]}
              >
                <View style={[styles.summaryTextWrap, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
                  <Text
                    color={theme.colors.textSecondary}
                    style={styles.summaryBody}
                  >
                    {t("patientNotifications.summaryBody", {
                      count: unreadCount,
                    })}
                  </Text>
                </View>
                {unreadCount > 0 ? (
                  <View
                    style={[
                      styles.summaryBadge,
                      { backgroundColor: theme.colors.primary },
                    ]}
                  >
                    <Text
                      weight="700"
                      color="#FFFFFF"
                      style={styles.summaryCount}
                    >
                      {String(unreadCount)}
                    </Text>
                  </View>
                ) : null}
              </View>
              {unreadCount > 0 ? (
                <TouchableOpacity
                  onPress={() => void markAllReadMutation.mutateAsync()}
                  disabled={markAllReadMutation.isPending}
                  accessibilityRole="button"
                  accessibilityLabel={
                    markAllReadMutation.isPending
                      ? t("patientNotifications.markAllLoading")
                      : t("patientNotifications.markAll")
                  }
                  style={[styles.markAllButton, isRTL ? styles.rowRtl : styles.rowLtr]}
                  activeOpacity={0.82}
                >
                  <Ionicons
                    name="checkmark-done-outline"
                    size={16}
                    color={theme.colors.primary}
                    style={{ marginRight: isRTL ? 0 : 4, marginLeft: isRTL ? 4 : 0 }}
                  />
                  <Text color={theme.colors.primary} weight="700" style={{ fontSize: 13 }}>
                    {markAllReadMutation.isPending
                      ? t("patientNotifications.markAllLoading")
                      : t("patientNotifications.markAll")}
                  </Text>
                </TouchableOpacity>
              ) : null}
              {items.length > 0 ? (
                <View
                  style={[
                    styles.filterRow,
                    { flexDirection: isRTL ? "row-reverse" : "row" },
                  ]}
                >
                  {(["all", "unread", "read"] as const).map((value) => {
                    const selected = filter === value;
                    return (
                      <TouchableOpacity
                        key={value}
                        testID={`notification-filter-${value}`}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        onPress={() => setFilter(value)}
                        style={[
                          styles.filterButton,
                          {
                            backgroundColor: selected
                              ? theme.colors.primary
                              : "transparent",
                            borderColor: selected
                              ? theme.colors.primary
                              : theme.colors.borderLight,
                          },
                        ]}
                      >
                        <Text
                          weight={selected ? "700" : "600"}
                          color={selected ? theme.colors.onPrimary : theme.colors.textSecondary}
                          style={styles.filterText}
                        >
                          {t(`patientNotifications.filters.${value}`)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : null}
            </View>
          }
          renderSectionHeader={({ section }) => (
            <View
              style={[
                styles.sectionHeader,
                isRTL ? styles.sectionHeaderRtl : styles.sectionHeaderLtr,
              ]}
            >
              <Text
                weight="700"
                color={theme.colors.textSecondary}
                style={styles.sectionTitle}
              >
                {section.title}
              </Text>
            </View>
          )}
          renderItem={({ item }) => {
            const isUnread = !item.readAt;
            const presentation = resolvePatientNotificationPresentation(
              item,
              locale,
              t,
            );
            const targetRoute = resolvePatientNotificationRoute(
              item.action?.href ?? "/",
              item.typeSlug,
              {
                payload: item.payload,
                context: item.context,
                primaryAction: item.primaryAction,
              },
            );

            return (
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() => void handleOpenNotification(item)}
                testID={`patient-notification-${item.id}`}
                accessibilityRole="button"
                accessibilityLabel={`${isUnread ? t("patientNotifications.statusUnread") : t("patientNotifications.statusRead")}. ${presentation.title}. ${presentation.body}`}
                style={[
                  styles.itemRowWrapper,
                  { borderBottomColor: theme.colors.borderLight },
                ]}
              >
                <View
                  style={[
                    styles.itemContentLayout,
                    isRTL ? styles.rowRtl : styles.rowLtr,
                  ]}
                >
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
                    <View
                      style={[
                        styles.itemHeaderRow,
                        isRTL ? styles.rowRtl : styles.rowLtr,
                      ]}
                    >
                      <Text
                        weight="700"
                        color={theme.colors.textPrimary}
                        style={styles.itemTitle}
                      >
                        {presentation.title}
                      </Text>
                      <Text
                        color={theme.colors.textMuted}
                        style={styles.itemDate}
                      >
                        {formatNotificationDateTime(item.createdAt, locale)}
                      </Text>
                    </View>

                    <Text
                      color={theme.colors.textSecondary}
                      numberOfLines={2}
                      style={styles.itemBody}
                    >
                      {presentation.body}
                    </Text>

                    {targetRoute ? (
                      <View
                        style={[
                          styles.actionRow,
                          isRTL ? styles.rowRtl : styles.rowLtr,
                        ]}
                      >
                        <Text
                          color={theme.colors.primary}
                          weight="700"
                          style={styles.actionLabel}
                        >
                          {t("patientNotifications.openAction")}
                        </Text>
                        <Ionicons
                          name={getDirectionalIcon("disclosure", Boolean(isRTL))}
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
    padding: 16,
    paddingBottom: 40,
  },
  markAllButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: "center",
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
  filterRow: {
    gap: 8,
    paddingTop: 12,
  },
  filterButton: {
    minHeight: 34,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  filterText: {
    fontSize: 12,
    lineHeight: 16,
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
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 2,
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
    fontSize: 14.5,
    lineHeight: 19,
  },
  itemBody: {
    fontSize: 13,
    lineHeight: 19,
  },
  itemDate: {
    fontSize: 10,
    lineHeight: 14,
    marginTop: 2,
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
    display: "none",
  },
  skeletonList: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  skeletonRow: {
    minHeight: 84,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E8DED0",
  },
  skeletonCopy: {
    flex: 1,
    gap: 8,
  },
  skeletonHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
});

function NotificationFeedSkeleton() {
  return (
    <View style={styles.skeletonList} testID="notifications-loading">
      {["one", "two", "three", "four"].map((key) => (
        <View key={key} style={styles.skeletonRow}>
          <Skeleton width={36} height={36} borderRadius={12} />
          <View style={styles.skeletonCopy}>
            <View style={styles.skeletonHeader}>
              <Skeleton width="58%" height={15} />
              <Skeleton width={54} height={11} />
            </View>
            <Skeleton width="82%" height={13} />
          </View>
        </View>
      ))}
    </View>
  );
}
