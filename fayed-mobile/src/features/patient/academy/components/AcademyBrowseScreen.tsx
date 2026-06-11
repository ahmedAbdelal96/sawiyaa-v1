import React, { useMemo } from "react";
import { Image, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  Card,
  ListPageScaffold,
  SectionHeader,
  StatusChip,
  Text,
} from "../../../../components/ui";
import { useTheme } from "../../../../providers/ThemeProvider";
import { useAuth } from "../../../../providers/AuthProvider";
import { getAppDirection } from "../../../../i18n/direction";
import { resolveSupportedCurrencyCode } from "../../../../lib/currency";
import { resolveMediaUrl } from "../../../../lib/resolve-media-url";
import { useInfinitePublicAcademyCourses } from "../hooks";
import type { AcademyCourseItem } from "../types";
import { formatAcademyMoney, isAcademyCourseFree } from "../display";

function CourseCard({ course }: { course: AcademyCourseItem }) {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const locale = i18n.language?.startsWith("ar") ? "ar-EG" : "en-US";
  const isRtl = getAppDirection(i18n.language) === "rtl";
  const coverUri = resolveMediaUrl(course.coverImageUrl ?? course.thumbnailUrl);
  const displayCurrency = resolveSupportedCurrencyCode({
    currencyCode: course.currencyCode,
    regionalPricingMode: course.regionalPricingMode,
    resolvedCountryIsoCode: course.resolvedCountryIsoCode,
  });
  const isFreeCourse = isAcademyCourseFree(course);
  const priceLabel =
    isFreeCourse
      ? t("academyMobile.free")
      : formatAcademyMoney(course.priceAmount, displayCurrency, locale) ??
        t("academyMobile.paid");
  const lectureCount = course.plannedLectureCount ?? course.lectures?.length ?? null;
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
      padding="sm"
      style={styles.card}
      onPress={() => router.push(`/(patient)/academy/${course.slug}` as never)}
      accessibilityRole="button"
      accessibilityLabel={t("academyMobile.card.accessibilityLabel", {
        title: course.title,
      })}
    >
      <View style={[styles.cardLayout, isRtl && styles.cardLayoutRtl]}>
        <View
          style={[
            styles.mediaBox,
            { backgroundColor: theme.colors.primaryLight },
            !coverUri && styles.mediaPlaceholder,
          ]}
        >
          {coverUri ? (
            <Image source={{ uri: coverUri }} style={styles.mediaImage} resizeMode="cover" />
          ) : (
            <Ionicons name="library-outline" size={22} color={theme.colors.primary} />
          )}
        </View>

        <View style={styles.content}>
          <View style={[styles.topRow, isRtl && styles.topRowRtl]}>
            <StatusChip
              label={t("academyMobile.available")}
              tone="success"
              showDot={false}
            />
            <Text color={theme.colors.textMuted} style={styles.price}>
              {priceLabel}
            </Text>
          </View>

          <Text weight="600" style={styles.title} numberOfLines={2}>
            {course.title}
          </Text>

          {description ? (
            <Text
              color={theme.colors.textSecondary}
              style={styles.description}
              numberOfLines={2}
            >
              {description}
            </Text>
          ) : null}

          <View style={styles.metaRow}>
            {durationLabel ? (
              <Text color={theme.colors.textMuted} style={styles.metaText}>
                {durationLabel}
              </Text>
            ) : null}
            {lectureCount ? (
              <Text color={theme.colors.textMuted} style={styles.metaText}>
                {t("academyMobile.lectureCount", {
                  count: lectureCount,
                })}
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      <View style={[styles.actionHint, isRtl && styles.actionHintRtl]}>
        <Text color={theme.colors.primary} weight="600" style={styles.actionHintText}>
          {detailsLabel}
        </Text>
        <Ionicons
          name={isRtl ? "chevron-back" : "chevron-forward"}
          size={16}
          color={theme.colors.primary}
        />
      </View>
    </Card>
  );
}

export default function AcademyBrowseScreen() {
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
        <SectionHeader
          title={t("academyMobile.sectionTitle")}
          subtitle={t("academyMobile.sectionSubtitle")}
        />
      </View>

      <View style={styles.listStack}>
        {items.map((course) => (
          <CourseCard key={course.id} course={course} />
        ))}
      </View>

      <Text color={theme.colors.textSecondary} style={styles.resultsCount}>
        {latestPage
          ? t("academyMobile.resultsCount", {
              shown: items.length,
              total: latestPage.pagination.totalItems,
            })
          : " "}
      </Text>

      {coursesQuery.isFetchingNextPage ? (
        <View style={styles.footerState}>
          <Text color={theme.colors.textSecondary} style={styles.footerText}>
            {t("academyMobile.loadingMore")}
          </Text>
        </View>
      ) : coursesQuery.isFetchNextPageError ? (
        <View style={styles.footerState}>
          <Text weight="bold" style={styles.footerTitle} color={theme.colors.textPrimary}>
            {t("academyMobile.loadMoreErrorTitle")}
          </Text>
          <Text color={theme.colors.textSecondary} style={styles.footerText}>
            {t("academyMobile.loadMoreErrorSubtitle")}
          </Text>
          <View style={styles.footerButton}>
            <Text
              color={theme.colors.primary}
              weight="600"
              style={styles.retryLink}
              onPress={() => coursesQuery.fetchNextPage()}
            >
              {t("retry")}
            </Text>
          </View>
        </View>
      ) : coursesQuery.hasNextPage === false && items.length > 0 ? (
        <View style={styles.footerState}>
          <Text color={theme.colors.textSecondary} style={styles.footerText}>
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
  listStack: {
    gap: 12,
  },
  card: {
    marginHorizontal: 0,
  },
  cardLayout: {
    flexDirection: "row",
    gap: 12,
  },
  cardLayoutRtl: {
    flexDirection: "row-reverse",
  },
  mediaBox: {
    width: 68,
    height: 68,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  mediaPlaceholder: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  mediaImage: {
    width: "100%",
    height: "100%",
  },
  content: {
    flex: 1,
    gap: 8,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  topRowRtl: {
    flexDirection: "row-reverse",
  },
  price: {
    fontSize: 13,
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
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metaText: {
    fontSize: 11.5,
    lineHeight: 16,
  },
  actionHint: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
  },
  actionHintRtl: {
    flexDirection: "row-reverse",
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
    textAlign: "center",
  },
  footerText: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginBottom: 12,
  },
  retryLink: {
    textAlign: "center",
  },
});
