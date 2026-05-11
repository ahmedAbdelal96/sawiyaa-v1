import React, { useMemo } from "react";
import { FlatList, Image, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  Button,
  Card,
  CompactActionRow,
  ListPageScaffold,
  SectionHeader,
  StatusChip,
  Text,
  formatDate,
} from "../../../../components/ui";
import { useTheme } from "../../../../providers/ThemeProvider";
import { useAuth } from "../../../../providers/AuthProvider";
import { resolveSupportedCurrencyCode } from "../../../../lib/currency";
import { useInfinitePublicAcademyCourses } from "../hooks";
import type { AcademyCourseItem } from "../types";
import { resolveMediaUrl } from "../../../../lib/resolve-media-url";

function formatCurrency(
  amount: string | null,
  currency: string | null,
  locale: string,
) {
  if (!amount || !currency) {
    return null;
  }

  const numeric = Number(amount);
  if (!Number.isFinite(numeric)) {
    return `${amount} ${currency}`;
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(numeric);
}

function resolveStatusTone(status: AcademyCourseItem["status"]) {
  switch (status) {
    case "PUBLISHED":
      return "success" as const;
    case "DRAFT":
      return "warning" as const;
    case "ARCHIVED":
      return "default" as const;
    default:
      return "default" as const;
  }
}

function splitCourseContent(content: string) {
  return content
    .replace(/\r\n/g, "\n")
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<\/(p|div|section|article|header|blockquote|h[1-6]|ul|ol|li)>/gi, "\n")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .split(/\n{2,}/)
    .map((block) => block.replace(/\n+/g, "\n").trim())
    .filter(Boolean);
}

function CourseCard({ course }: { course: AcademyCourseItem }) {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const locale = i18n.language?.startsWith("ar") ? "ar-EG" : "en-US";
  const coverUri = resolveMediaUrl(course.coverImageUrl ?? course.thumbnailUrl);
  const displayCurrency = resolveSupportedCurrencyCode({
    currencyCode: course.currencyCode,
    regionalPricingMode: course.regionalPricingMode,
    resolvedCountryIsoCode: course.resolvedCountryIsoCode,
  });
  const priceLabel =
    formatCurrency(course.priceAmount, displayCurrency, locale) ||
    t("academyMobile.free", "Free");
  const lectureCount = course.plannedLectureCount ?? course.lectures?.length ?? null;
  const durationLabel = course.plannedDurationDays
    ? t("academyMobile.durationDays", {
        count: course.plannedDurationDays,
        defaultValue: `${course.plannedDurationDays} days`,
      })
    : null;
  const description = course.shortDescription?.trim();

  return (
    <Card variant="elevated" padding="none" style={styles.card}>
      {coverUri ? (
        <Image source={{ uri: coverUri }} style={styles.cover} resizeMode="cover" />
      ) : (
        <View style={[styles.cover, { backgroundColor: theme.colors.primaryLight }]} />
      )}

      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <StatusChip
            label={
              course.publishedAt
                ? t("academyMobile.published", "Published")
                : t("academyMobile.draft", "Draft")
            }
            tone={resolveStatusTone(course.status)}
            showDot={false}
          />
          <Text color={theme.colors.textMuted} style={styles.price}>
            {priceLabel}
          </Text>
        </View>

        <Text weight="bold" style={styles.title}>
          {course.title}
        </Text>

        {description ? (
          <Text color={theme.colors.textSecondary} style={styles.description}>
            {description}
          </Text>
        ) : null}

        <View style={styles.metaRow}>
          {lectureCount ? (
            <Text color={theme.colors.textMuted} style={styles.metaText}>
              {t("academyMobile.lectureCount", {
                count: lectureCount,
                defaultValue:
                  lectureCount === 1
                    ? "1 module/lesson"
                    : `${lectureCount} modules/lessons`,
              })}
            </Text>
          ) : null}
          {durationLabel ? (
            <Text color={theme.colors.textMuted} style={styles.metaText}>
              {durationLabel}
            </Text>
          ) : null}
          {course.startsAt ? (
            <Text color={theme.colors.textMuted} style={styles.metaText}>
              {formatDate(course.startsAt, i18n.language)}
            </Text>
          ) : null}
        </View>

        <CompactActionRow
          label={t("academyMobile.viewDetails", "View details")}
          onPress={() => router.push(`/(patient)/academy/${course.slug}` as any)}
          accessibilityLabel={t("academyMobile.viewDetails", "View details")}
          style={styles.actionRow}
        />
      </View>
    </Card>
  );
}

export default function AcademyBrowseScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { user, role, isLoading: isAuthLoading } = useAuth();
  const authScopeKey = useMemo(() => {
    if (isAuthLoading) {
      return "bootstrapping";
    }
    if (!user) {
      return "guest";
    }
    return `auth:${user.id}:${role}`;
  }, [isAuthLoading, role, user]);
  const coursesQuery = useInfinitePublicAcademyCourses(
    { limit: 12 },
    { cacheScopeKey: authScopeKey },
  );

  const items = useMemo(
    () => coursesQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [coursesQuery.data?.pages],
  );
  const latestPage = coursesQuery.data?.pages.at(-1);

  return (
    <ListPageScaffold
      title={t("academyMobile.title", "Academy")}
      showBack
      loading={coursesQuery.isLoading}
      loadingMessage={t(
        "academyMobile.loading",
        "Loading academy programs...",
      )}
      error={coursesQuery.isError}
      errorTitle={t(
        "academyMobile.errorTitle",
        "We could not load the academy right now",
      )}
      errorMessage={t(
        "academyMobile.errorMessage",
        "Please try again in a moment.",
      )}
      onRetry={() => coursesQuery.refetch()}
      retryText={t("retry", "Try again")}
      empty={items.length === 0}
      emptyTitle={t("academyMobile.emptyTitle", "No programs found")}
      emptyDescription={t(
        "academyMobile.emptyDescription",
        "There are no public academy programs available right now.",
      )}
      contentContainerStyle={styles.scaffold}
    >
      <View style={styles.headerStack}>
        <SectionHeader
          title={t("academyMobile.sectionTitle", "Programs")}
          subtitle={t(
            "academyMobile.sectionSubtitle",
            "Browse public programs, prices, and schedules at a calm pace.",
          )}
        />
      </View>

      <FlatList
        data={items}
        keyExtractor={(course) => course.id}
        renderItem={({ item: course }) => <CourseCard course={course} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={coursesQuery.isRefetching && !coursesQuery.isFetchingNextPage}
        onRefresh={() => coursesQuery.refetch()}
        onEndReached={() => {
          if (
            coursesQuery.hasNextPage &&
            !coursesQuery.isFetchingNextPage &&
            !coursesQuery.isLoading &&
            !coursesQuery.isError
          ) {
            coursesQuery.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.45}
        ListHeaderComponent={
          <Text color={theme.colors.textSecondary} style={styles.resultsCount}>
            {latestPage
              ? t("academyMobile.resultsCount", {
                  shown: items.length,
                  total: latestPage.pagination.totalItems,
                })
              : " "}
          </Text>
        }
        ListFooterComponent={
          coursesQuery.isFetchingNextPage ? (
            <View style={styles.footerState}>
              <Text color={theme.colors.textSecondary} style={styles.footerText}>
                {t(
                  "academyMobile.loadingMore",
                  "Loading more academy programs...",
                )}
              </Text>
            </View>
          ) : coursesQuery.isFetchNextPageError ? (
            <View style={styles.footerState}>
              <Text
                weight="bold"
                style={styles.footerTitle}
                color={theme.colors.textPrimary}
              >
                {t(
                  "academyMobile.loadMoreErrorTitle",
                  "Could not load more academy programs",
                )}
              </Text>
              <Text
                color={theme.colors.textSecondary}
                style={styles.footerText}
              >
                {t(
                  "academyMobile.loadMoreErrorSubtitle",
                  "Try again to load the next set of results.",
                )}
              </Text>
              <Button title={t("retry", "Retry")} onPress={() => coursesQuery.fetchNextPage()} />
            </View>
          ) : coursesQuery.hasNextPage === false && items.length > 0 ? (
            <View style={styles.footerState}>
              <Text
                color={theme.colors.textSecondary}
                style={styles.footerText}
              >
                {t(
                  "academyMobile.endOfList",
                  "You have reached the end of the list.",
                )}
              </Text>
            </View>
          ) : null
        }
      />
    </ListPageScaffold>
  );
}

const styles = StyleSheet.create({
  scaffold: {
    paddingBottom: 24,
  },
  headerStack: {
    gap: 12,
    marginBottom: 12,
  },
  listContent: {
    gap: 14,
    paddingBottom: 24,
  },
  separator: {
    height: 0,
  },
  card: {
    marginHorizontal: 0,
    overflow: "hidden",
  },
  cover: {
    width: "100%",
    height: 180,
    backgroundColor: "#eef2ff",
  },
  cardBody: {
    padding: 16,
    gap: 10,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  price: {
    fontSize: 13,
  },
  title: {
    fontSize: 20,
    lineHeight: 28,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metaText: {
    fontSize: 12,
  },
  actionRow: {
    marginTop: 6,
  },
  resultsCount: {
    fontSize: 14,
    marginBottom: 14,
    marginTop: 2,
  },
  footerState: {
    paddingTop: 8,
    paddingBottom: 20,
  },
  footerTitle: {
    fontSize: 16,
    marginBottom: 6,
    textAlign: "center",
  },
  footerText: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginBottom: 14,
  },
});

