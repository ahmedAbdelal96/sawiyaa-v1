import React, { useMemo } from "react";
import { Image, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  Card,
  CompactActionRow,
  ListPageScaffold,
  SectionHeader,
  StatusChip,
  Text,
  formatDate,
} from "../../../../components/ui";
import { useTheme } from "../../../../providers/ThemeProvider";
import { usePublicAcademyCourses } from "../hooks";
import type { AcademyCourseItem } from "../types";
import { resolveMediaUrl } from "../../../../lib/resolve-media-url";

function formatCurrency(amount: string | null, currency: string | null, locale: string) {
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

function CourseCard({
  course,
}: {
  course: AcademyCourseItem;
}) {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const locale = i18n.language?.startsWith("ar") ? "ar-EG" : "en-US";
  const coverUri = resolveMediaUrl(course.coverImageUrl ?? course.thumbnailUrl);
  const priceLabel =
    formatCurrency(course.priceAmount, course.currencyCode, locale) ||
    t("academy.browse.free", "Free");
  const lectureCount = course.plannedLectureCount ?? course.lectures?.length ?? null;
  const durationLabel = course.plannedDurationDays
    ? t("academy.browse.durationDays", {
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
                ? t("academy.browse.published", "Published")
                : t("academy.browse.draft", "Draft")
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
              {t("academy.browse.lectureCount", {
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
          label={t("academy.browse.open", "View details")}
          onPress={() => router.push(`/(patient)/academy/${course.slug}` as any)}
          accessibilityLabel={t("academy.browse.open", "View details")}
          style={styles.actionRow}
        />
      </View>
    </Card>
  );
}

export default function AcademyBrowseScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const query = useMemo(() => ({ page: 1, limit: 12 }), []);

  const coursesQuery = usePublicAcademyCourses(query);
  const items = coursesQuery.data?.items ?? [];

  return (
    <ListPageScaffold
      title={t("academy.browse.title", "Academy")}
      showBack
      onBack={() => router.back()}
      loading={coursesQuery.isLoading}
      loadingMessage={t("academy.browse.loading", "Loading academy programs...")}
      error={coursesQuery.isError}
      errorTitle={t("academy.browse.errorTitle", "We could not load the academy right now")}
      errorMessage={t(
        "academy.browse.errorMessage",
        "Please try again in a moment.",
      )}
      onRetry={() => coursesQuery.refetch()}
      retryText={t("academy.browse.retry", "Try again")}
      empty={items.length === 0}
      emptyTitle={t("academy.browse.emptyTitle", "No programs found")}
      emptyDescription={t(
        "academy.browse.emptyDefault",
        "There are no public academy programs available right now.",
      )}
      contentContainerStyle={styles.scaffold}
    >
      <View style={styles.headerStack}>
        <SectionHeader
          title={t("academy.browse.sectionTitle", "Programs")}
          subtitle={t(
            "academy.browse.sectionSubtitle",
            "Browse public programs, prices, and schedules at a calm pace.",
          )}
        />
      </View>

      <View style={styles.grid}>
        {items.map((course) => (
          <CourseCard key={course.id} course={course} />
        ))}
      </View>
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
  grid: {
    gap: 14,
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
});
