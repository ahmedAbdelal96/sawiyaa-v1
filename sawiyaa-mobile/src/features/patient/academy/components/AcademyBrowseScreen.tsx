import React, { useMemo } from "react";
import { Image, StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  Card,
  ListPageScaffold,
  Text,
} from "../../../../components/ui";
import { useTheme } from "../../../../providers/ThemeProvider";
import { useAuth } from "../../../../providers/AuthProvider";
import { resolveSupportedCurrencyCode } from "../../../../lib/currency";
import { resolveMediaUrl } from "../../../../lib/resolve-media-url";
import { useInfinitePublicAcademyCourses } from "../hooks";
import type { AcademyCourseItem } from "../types";
import { formatAcademyMoney, isAcademyCourseFree } from "../display";
import { useAppDirection } from "../../../../i18n/direction";

function CourseCard({ course }: { course: AcademyCourseItem }) {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const locale = i18n.language?.startsWith("ar") ? "ar-EG" : "en-US";
  const { rowDirection, textAlign, chevronForward } = useAppDirection();
  const coverUri = resolveMediaUrl(course.coverImageUrl ?? course.thumbnailUrl);
  const displayCurrency = resolveSupportedCurrencyCode({
    currencyCode: course.currencyCode,
    regionalPricingMode: course.regionalPricingMode,
    resolvedCountryIsoCode: course.resolvedCountryIsoCode,
  });
  const hasPrice = course.priceAmount !== null && course.priceAmount !== undefined;
  const isFreeCourse = hasPrice && isAcademyCourseFree(course);
  const priceLabel = hasPrice
    ? (isFreeCourse
      ? t("academyMobile.free")
      : formatAcademyMoney(course.priceAmount, displayCurrency, locale))
    : null;
  const lectureCount = course.plannedLectureCount;
  const durationLabel = course.plannedDurationDays
    ? t("academyMobile.durationDays", {
        count: course.plannedDurationDays,
      })
    : null;
  const description = course.shortDescription?.trim();
  const detailsLabel = t("academyMobile.viewDetails");

  return (
    <Card
      variant="outlined"
      padding="none"
      style={styles.card}
    >
      <View
        style={[
          styles.imageContainer,
          { backgroundColor: theme.colors.primaryLight },
        ]}
      >
        {coverUri ? (
          <Image source={{ uri: coverUri }} style={styles.cardImage} resizeMode="cover" />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="library-outline" size={32} color={theme.colors.primary} />
          </View>
        )}
      </View>

      <View style={styles.cardDetails}>
        <Text weight="700" style={[styles.title, { textAlign, color: theme.colors.primary }]} numberOfLines={2}>
          {course.title}
        </Text>

        {description ? (
          <Text
            color={theme.colors.textSecondary}
            style={[styles.description, { textAlign }]}
            numberOfLines={2}
          >
            {description}
          </Text>
        ) : null}

        <View style={[styles.metaRow, { flexDirection: rowDirection }]}>
          {durationLabel ? (
            <View style={[styles.metaBadge, { backgroundColor: theme.colors.surfaceMuted }]}>
              <Ionicons name="time-outline" size={13} color={theme.colors.textSecondary} />
              <Text color={theme.colors.textSecondary} style={styles.metaText}>
                {durationLabel}
              </Text>
            </View>
          ) : null}
          {lectureCount ? (
            <View style={[styles.metaBadge, { backgroundColor: theme.colors.surfaceMuted }]}>
              <Ionicons name="book-outline" size={13} color={theme.colors.textSecondary} />
              <Text color={theme.colors.textSecondary} style={styles.metaText}>
                {t("academyMobile.lectureCount", {
                  count: lectureCount,
                })}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={[styles.bottomRow, { flexDirection: rowDirection }]}>
          {priceLabel ? (
            <View style={[styles.priceTag, { backgroundColor: theme.colors.primaryLight }]}>
              <Text color={theme.colors.primary} weight="700" style={styles.price}>
                {priceLabel}
              </Text>
            </View>
          ) : <View />}

          <TouchableOpacity
            activeOpacity={0.78}
            onPress={() => router.push(`/(patient)/academy/${course.slug}` as never)}
            accessibilityRole="button"
            accessibilityLabel={t("academyMobile.card.accessibilityLabel", {
              title: course.title,
            })}
            style={[
              styles.actionHint,
              {
                flexDirection: rowDirection,
                backgroundColor: theme.colors.surfaceSecondary,
                borderColor: theme.colors.borderLight,
              },
            ]}
          >
            <Text color={theme.colors.primary} weight="600" style={styles.actionHintText}>
              {detailsLabel}
            </Text>
            <Ionicons
              name={chevronForward}
              size={16}
              color={theme.colors.primary}
            />
          </TouchableOpacity>
        </View>
      </View>
    </Card>
  );
}

export default function AcademyBrowseScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { rowDirection, textAlign } = useAppDirection();
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
      title={t("academyMobile.title")}
      showBack
      loading={coursesQuery.isLoading}
      loadingMessage={t("academyMobile.loading")}
      error={coursesQuery.isError}
      errorTitle={t("academyMobile.errorTitle")}
      errorMessage={t("academyMobile.errorMessage")}
      onRetry={() => coursesQuery.refetch()}
      retryText={t("retry")}
      empty={items.length === 0}
      emptyTitle={t("academyMobile.emptyTitle")}
      emptyDescription={t("academyMobile.emptyDescription")}
      contentContainerStyle={styles.scaffold}
    >
      <View style={styles.headerStack}>
        <Card variant="outlined" padding="md" style={[styles.heroCard, { backgroundColor: theme.colors.surface }]} >
          <View style={[styles.heroRow, { flexDirection: rowDirection }]}>
            <View style={[styles.heroAccentLine, { backgroundColor: theme.colors.primary }]} />
            <View style={styles.heroContent}>
              <Text weight="bold" style={[styles.heroTitle, { textAlign, color: theme.colors.primary }]}>
                {t("academyMobile.sectionTitle")}
              </Text>
              <Text color={theme.colors.textSecondary} style={[styles.heroSubtitle, { textAlign }]}>
                {t("academyMobile.sectionSubtitle")}
              </Text>
            </View>
          </View>
        </Card>
      </View>

      <View style={styles.listStack}>
        {items.map((course) => (
          <CourseCard key={course.id} course={course} />
        ))}
      </View>

      <Text color={theme.colors.textSecondary} style={[styles.resultsCount, { textAlign }]}>
        {latestPage
          ? t("academyMobile.resultsCount", {
              shown: items.length,
              total: latestPage.pagination.totalItems,
            })
          : " "}
      </Text>

      {coursesQuery.isFetchingNextPage ? (
        <View style={styles.footerState}>
          <Text color={theme.colors.textSecondary} style={[styles.footerText, { textAlign: "center" }]}>
            {t("academyMobile.loadingMore")}
          </Text>
        </View>
      ) : coursesQuery.isFetchNextPageError ? (
        <View style={styles.footerState}>
          <Text weight="bold" style={[styles.footerTitle, { textAlign: "center" }]} color={theme.colors.textPrimary}>
            {t("academyMobile.loadMoreErrorTitle")}
          </Text>
          <Text color={theme.colors.textSecondary} style={[styles.footerText, { textAlign: "center" }]}>
            {t("academyMobile.loadMoreErrorSubtitle")}
          </Text>
          <View style={styles.footerButton}>
            <Text
              color={theme.colors.primary}
              weight="600"
              style={[styles.retryLink, { textAlign: "center" }]}
              onPress={() => coursesQuery.fetchNextPage()}
            >
              {t("retry")}
            </Text>
          </View>
        </View>
      ) : coursesQuery.hasNextPage === false && items.length > 0 ? (
        <View style={styles.footerState}>
          <Text color={theme.colors.textSecondary} style={[styles.footerText, { textAlign: "center" }]}>
            {t("academyMobile.endOfList")}
          </Text>
        </View>
      ) : null}
    </ListPageScaffold>
  );
}

const styles = StyleSheet.create({
  scaffold: {
    paddingBottom: 20,
  },
  headerStack: {
    gap: 10,
    marginBottom: 10,
  },
  heroCard: {
    marginHorizontal: 0,
    borderRadius: 20,
  },
  heroRow: {
    alignItems: "stretch",
    gap: 12,
  },
  heroAccentLine: {
    width: 4,
    borderRadius: 2,
  },
  heroContent: {
    flex: 1,
    gap: 2,
  },
  heroTitle: {
    fontSize: 17,
    lineHeight: 24,
  },
  heroSubtitle: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  listStack: {
    gap: 12,
  },
  card: {
    marginHorizontal: 0,
    borderRadius: 20,
    overflow: "hidden",
  },
  imageContainer: {
    width: "100%",
    height: 140,
    overflow: "hidden",
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cardDetails: {
    padding: 16,
    gap: 10,
  },
  bottomRow: {
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
  },
  price: {
    fontSize: 13,
  },
  priceTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  metaBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
  },
  description: {
    fontSize: 13,
    lineHeight: 19,
  },
  metaRow: {
    flexWrap: "wrap",
    gap: 8,
  },
  metaText: {
    fontSize: 11.5,
    lineHeight: 16,
  },
  actionHint: {
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  actionHintText: {
    fontSize: 13,
  },
  resultsCount: {
    fontSize: 13,
    marginTop: 8,
    marginBottom: 8,
  },
  footerState: {
    paddingTop: 4,
    paddingBottom: 12,
  },
  footerButton: {
    marginTop: 8,
  },
  footerTitle: {
    fontSize: 15,
    marginBottom: 6,
  },
  footerText: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  retryLink: {
    // Center alignment is handled in inline styles
  },
});
