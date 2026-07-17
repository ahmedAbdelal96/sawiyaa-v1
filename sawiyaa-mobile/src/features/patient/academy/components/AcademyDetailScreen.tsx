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
  Text,
} from "../../../../components/ui";
import { useTheme } from "../../../../providers/ThemeProvider";
import { useAuth } from "../../../../providers/AuthProvider";
import { useAppDirection } from "../../../../i18n/direction";
import { resolveMediaUrl } from "../../../../lib/resolve-media-url";
import { formatViewerDate } from "../../../../lib/time-formatting";
import { usePublicAcademyProgram } from "../hooks";
import { formatAcademySessionDateRange, formatAcademyProgramPrice, isAcademyProgramFree } from "../display";

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
  const { rowDirection, textAlign } = useAppDirection();
  const { user, role, isLoading: isAuthLoading } = useAuth();
  const authScopeKey = useMemo(() => {
    if (isAuthLoading) {
      return "bootstrapping";
    }
    if (!user) {
      return "guest";
    }
    return `auth:${user.id}:${role ?? "unknown"}`;
  }, [isAuthLoading, role, user]);
  const courseQuery = usePublicAcademyProgram(slug, { cacheScopeKey: authScopeKey });
  const course = courseQuery.data ?? null;
  const coverUri = resolveMediaUrl(course?.coverImageUrl);
  const startLabel = course?.startAt ? formatViewerDate(course.startAt, { locale }) : null;
  const hasPrice = course?.priceEgp !== null || course?.priceUsd !== null;
  const isFreeCourse = hasPrice && isAcademyProgramFree(course?.priceEgp, course?.priceUsd);
  const priceLabel = hasPrice
    ? (isFreeCourse
      ? t("academy.detail.free")
      : formatAcademyProgramPrice(course?.priceEgp, course?.priceUsd, i18n.language))
    : null;
  const lectures = course?.sessions ?? [];
  const contentBlocks = useMemo(
    () => (course?.description ? splitCourseContent(course.description) : []),
    [course?.description],
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
            <View style={[styles.heroLayout, { flexDirection: rowDirection }]}>
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
                <View style={[styles.heroTopRow, { flexDirection: rowDirection }]}>
                  {priceLabel ? (
                    <View style={[styles.priceTag, { backgroundColor: theme.colors.primaryLight }]}>
                      <Text color={theme.colors.primary} weight="700" style={styles.price}>
                        {priceLabel}
                      </Text>
                    </View>
                  ) : <View />}
                </View>

                <Text weight="600" style={[styles.title, { textAlign }]} numberOfLines={2}>
                  {course.title}
                </Text>

                {course.description ? (
                  <Text
                    color={theme.colors.textSecondary}
                    style={[styles.description, { textAlign }]}
                    numberOfLines={3}
                  >
                    {course.description}
                  </Text>
                ) : null}

                <View style={[styles.metaRow, { flexDirection: rowDirection }]}>
                  {startLabel ? (
                    <View style={[styles.metaBadge, { backgroundColor: theme.colors.surfaceMuted }]}>
                      <Ionicons name="calendar-outline" size={13} color={theme.colors.textSecondary} />
                      <Text color={theme.colors.textSecondary} style={styles.metaText}>
                        {startLabel}
                      </Text>
                    </View>
                  ) : null}
                  {course.sessions?.length ? (
                    <View style={[styles.metaBadge, { backgroundColor: theme.colors.surfaceMuted }]}>
                      <Ionicons name="book-outline" size={13} color={theme.colors.textSecondary} />
                      <Text color={theme.colors.textSecondary} style={styles.metaText}>
                        {t("academy.detail.lectures", {
                          count: course.sessions.length,
                        })}
                      </Text>
                    </View>
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
                    style={[styles.paragraph, { textAlign }]}
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
                        { flexDirection: rowDirection },
                      ]}
                    >
                      <View style={styles.timelineLeftCol}>
                        <View
                          style={[
                            styles.lessonIndexBubble,
                            { backgroundColor: theme.colors.primaryLight },
                          ]}
                        >
                          <Text weight="600" style={[styles.lessonIndex, { color: theme.colors.primary }]}>
                            {index + 1}
                          </Text>
                        </View>
                        {!isLast && (
                          <View
                            style={[
                              styles.timelineLine,
                              { backgroundColor: theme.colors.primaryLight },
                            ]}
                          />
                        )}
                      </View>
                      <View style={styles.lessonMeta}>
                        <Text weight="600" style={[styles.lessonTitle, { textAlign }]} numberOfLines={1}>
                          {lecture.title || t("academy.detail.unnamedLesson")}
                        </Text>
                        <Text
                          color={theme.colors.textSecondary}
                          style={[styles.lessonSchedule, { textAlign }]}
                          numberOfLines={1}
                        >
                          {formatAcademySessionDateRange(
                            lecture.startsAt,
                            lecture.endsAt,
                            locale,
                          )}
                        </Text>
                        {durationLabel ? (
                          <Text
                            color={theme.colors.textMuted}
                            style={[styles.lessonDuration, { textAlign }]}
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
            <View style={styles.ctaVerticalStack}>
              {priceLabel ? (
                <View style={[styles.priceRow, { flexDirection: rowDirection }]}>
                  <Text color={theme.colors.textSecondary} style={[styles.priceLabelSub, { textAlign }]}>
                    {t("academy.detail.priceTitle")}
                  </Text>
                  <Text color={theme.colors.primary} weight="700" style={[styles.priceValue, { textAlign }]}>
                    {priceLabel}
                  </Text>
                </View>
              ) : null}
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
            </View>
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
    gap: 12,
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
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
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
  timelineLeftCol: {
    alignItems: "center",
    width: 30,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 24,
    marginTop: 4,
    marginBottom: -16,
  },
  ctaVerticalStack: {
    gap: 16,
    marginTop: 8,
  },
  priceRow: {
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E8DED0",
  },
  priceLabelSub: {
    fontSize: 13,
    opacity: 0.85,
  },
  priceValue: {
    fontSize: 16,
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
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 12,
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
