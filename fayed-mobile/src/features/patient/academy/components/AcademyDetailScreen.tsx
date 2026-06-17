import React, { useMemo } from "react";
import { Image, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  Button,
  Card,
  DetailPageScaffold,
  EmptyState,
  SectionHeader,
  StatusChip,
  Text,
} from "../../../../components/ui";
import { useTheme } from "../../../../providers/ThemeProvider";
import { getAppDirection } from "../../../../i18n/direction";
import { resolveMediaUrl } from "../../../../lib/resolve-media-url";
import { resolveSupportedCurrencyCode } from "../../../../lib/currency";
import { formatViewerDate } from "../../../../lib/time-formatting";
import { usePublicAcademyCourse } from "../hooks";
import { formatAcademyLectureDateRange, formatAcademyMoney, isAcademyCourseFree } from "../display";

export default function AcademyDetailScreen({
  slug,
  locale,
}: {
  slug: string;
  locale: string;
}) {
  const router = useRouter();
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const courseQuery = usePublicAcademyCourse(slug, { cacheScopeKey: "guest" });
  const course = courseQuery.data ?? null;
  const isRtl = getAppDirection(i18n.language) === "rtl";
  const coverUri = resolveMediaUrl(course?.coverImageUrl ?? course?.thumbnailUrl);
  const startLabel = course?.startsAt ? formatViewerDate(course.startsAt, { locale }) : null;
  const displayCurrency = resolveSupportedCurrencyCode({
    currencyCode: course?.currencyCode,
    regionalPricingMode: course?.regionalPricingMode,
    resolvedCountryIsoCode: course?.resolvedCountryIsoCode,
  });
  const isFreeCourse = isAcademyCourseFree(course);
  const priceLabel =
    isFreeCourse
      ? t("academy.detail.free")
      : formatAcademyMoney(course?.priceAmount ?? null, displayCurrency, i18n.language) ??
        t("academy.detail.paid");
  const lectures = course?.lectures ?? [];
  const contentBlocks = useMemo(
    () => (course?.fullDescription ? splitCourseContent(course.fullDescription) : []),
    [course?.fullDescription],
  );

  const isNotFound = courseQuery.isSuccess && !course;

  return (
    <DetailPageScaffold
      title={t("academy.detail.title")}
      showBack
      loading={courseQuery.isLoading}
      loadingMessage={t("academy.detail.loading")}
      error={courseQuery.isError}
      errorTitle={t("academy.detail.errorTitle")}
      errorMessage={t("academy.detail.errorMessage")}
      onRetry={() => courseQuery.refetch()}
      retryText={t("academy.detail.retry")}
      contentContainerStyle={styles.scaffold}
    >
      {isNotFound ? (
        <EmptyState
          title={t("academy.detail.notFoundTitle")}
          description={t("academy.detail.notFoundDescription")}
          actionLabel={t("academy.detail.backToAcademy")}
          onAction={() => router.replace("/(patient)/academy" as never)}
        />
      ) : course ? (
        <View style={styles.stack}>
          <Card variant="outlined" padding="sm" style={styles.heroCard}>
            <View style={[styles.heroLayout, isRtl && styles.heroLayoutRtl]}>
              <View
                style={[
                  styles.heroMedia,
                  { backgroundColor: theme.colors.primaryLight },
                  !coverUri && styles.heroMediaPlaceholder,
                ]}
              >
                {coverUri ? (
                  <Image source={{ uri: coverUri }} style={styles.heroImage} resizeMode="cover" />
                ) : (
                  <Ionicons name="library-outline" size={24} color={theme.colors.primary} />
                )}
              </View>

              <View style={styles.heroContent}>
                <View style={[styles.heroTopRow, isRtl && styles.heroTopRowRtl]}>
                  <StatusChip
                    label={t("academy.detail.available")}
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

                {course.shortDescription ? (
                  <Text
                    color={theme.colors.textSecondary}
                    style={styles.description}
                    numberOfLines={3}
                  >
                    {course.shortDescription}
                  </Text>
                ) : null}

                <View style={styles.metaRow}>
                  {startLabel ? (
                    <Text color={theme.colors.textMuted} style={styles.metaText}>
                      {startLabel}
                    </Text>
                  ) : null}
                  {course.plannedLectureCount ? (
                    <Text color={theme.colors.textMuted} style={styles.metaText}>
                      {t("academy.detail.lectures", {
                        count: course.plannedLectureCount,
                      })}
                    </Text>
                  ) : null}
                  {course.plannedDurationDays ? (
                    <Text color={theme.colors.textMuted} style={styles.metaText}>
                      {t("academy.detail.durationDays", {
                        count: course.plannedDurationDays,
                      })}
                    </Text>
                  ) : null}
                </View>
              </View>
            </View>
          </Card>

          {contentBlocks.length > 0 ? (
            <Card variant="outlined" padding="sm" style={styles.sectionCard}>
              <SectionHeader
                title={t("academy.detail.descriptionTitle")}
                subtitle={t("academy.detail.descriptionSubtitle")}
              />
              <View style={styles.contentStack}>
                {contentBlocks.slice(0, 5).map((block, index) => (
                  <Text
                    key={`${index}-${block.slice(0, 24)}`}
                    color={theme.colors.textSecondary}
                    style={styles.paragraph}
                  >
                    {block}
                  </Text>
                ))}
              </View>
            </Card>
          ) : null}

          {lectures.length > 0 ? (
            <Card variant="outlined" padding="sm" style={styles.sectionCard}>
              <SectionHeader
                title={t("academy.detail.scheduleTitle")}
                subtitle={t("academy.detail.scheduleSubtitle")}
              />
              <View style={styles.lessonList}>
                {lectures.map((lecture, index) => {
                  const startTime = new Date(lecture.startsAt).getTime();
                  const endTime = new Date(lecture.endsAt).getTime();
                  const durationMinutes =
                    Number.isFinite(startTime) && Number.isFinite(endTime) && endTime > startTime
                      ? Math.max(1, Math.round((endTime - startTime) / 60000))
                      : null;
                  const durationLabel = durationMinutes
                    ? t("academy.detail.minutes", {
                        count: durationMinutes,
                      })
                    : null;
                  const isLast = index === lectures.length - 1;

                  return (
                    <View
                      key={lecture.id}
                      style={[
                        styles.lessonRow,
                        !isLast && {
                          borderBottomColor: theme.colors.borderLight,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.lessonIndexBubble,
                          { backgroundColor: theme.colors.primaryLight },
                        ]}
                      >
                        <Text weight="600" style={styles.lessonIndex}>
                          {lecture.lectureOrder}
                        </Text>
                      </View>
                      <View style={styles.lessonMeta}>
                        <Text weight="600" style={styles.lessonTitle} numberOfLines={1}>
                          {lecture.lectureTitle ?? t("academy.detail.unnamedLesson")}
                        </Text>
                        <Text
                          color={theme.colors.textSecondary}
                          style={styles.lessonSchedule}
                          numberOfLines={1}
                        >
                          {formatAcademyLectureDateRange(
                            lecture.startsAt,
                            lecture.endsAt,
                            locale,
                          )}
                        </Text>
                        {durationLabel ? (
                          <Text
                            color={theme.colors.textMuted}
                            style={styles.lessonDuration}
                            numberOfLines={1}
                          >
                            {durationLabel}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </View>
            </Card>
          ) : null}

          <Card variant="outlined" padding="sm" style={styles.sectionCard}>
            <SectionHeader
              title={t("academy.detail.enrollTitle")}
              subtitle={t("academy.detail.enrollSubtitle")}
            />
            <Button
              title={
                isFreeCourse
                  ? t("academy.detail.registerFree")
                  : t("academy.detail.subscribeNow")
              }
              onPress={() =>
                router.push({
                  pathname: "/(patient)/academy/enroll/[slug]",
                  params: { slug },
                } as never)
              }
              style={styles.ctaButton}
            />
          </Card>
        </View>
      ) : null}
    </DetailPageScaffold>
  );
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

const styles = StyleSheet.create({
  scaffold: {
    paddingBottom: 24,
  },
  stack: {
    gap: 12,
  },
  heroCard: {
    marginHorizontal: 0,
  },
  heroLayout: {
    flexDirection: "row",
    gap: 12,
  },
  heroLayoutRtl: {
    flexDirection: "row-reverse",
  },
  heroMedia: {
    width: 76,
    height: 76,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  heroMediaPlaceholder: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroContent: {
    flex: 1,
    gap: 8,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  heroTopRowRtl: {
    flexDirection: "row-reverse",
  },
  price: {
    fontSize: 13,
  },
  title: {
    fontSize: 20,
    lineHeight: 26,
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
  sectionCard: {
    marginHorizontal: 0,
    gap: 8,
  },
  contentStack: {
    gap: 10,
  },
  paragraph: {
    fontSize: 13,
    lineHeight: 20,
  },
  lessonList: {
    gap: 0,
  },
  lessonRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  lessonIndexBubble: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  lessonIndex: {
    fontSize: 12,
  },
  lessonMeta: {
    flex: 1,
    gap: 4,
  },
  lessonTitle: {
    fontSize: 15,
    lineHeight: 21,
  },
  lessonSchedule: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  lessonDuration: {
    fontSize: 12,
    lineHeight: 16,
  },
  ctaButton: {
    marginTop: 2,
  },
});
