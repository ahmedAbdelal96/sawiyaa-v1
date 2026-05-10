import React, { useMemo, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  Button,
  Card,
  DetailPageScaffold,
  EmptyState,
  Input,
  SectionHeader,
  StatusChip,
  SummaryRow,
  Text,
  formatDate,
  formatDateTime,
} from "../../../../components/ui";
import { useTheme } from "../../../../providers/ThemeProvider";
import { resolveMediaUrl } from "../../../../lib/resolve-media-url";
import { extractApiErrorMessage } from "../../../../lib/api";
import { useCreatePublicAcademyEnrollment, usePublicAcademyCourse } from "../hooks";
import type { CreateAcademyEnrollmentInput } from "../types";

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

function resolveStatusTone(status: string | null | undefined) {
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
  const courseQuery = usePublicAcademyCourse(slug);
  const enrollMutation = useCreatePublicAcademyEnrollment();
  const [form, setForm] = useState<CreateAcademyEnrollmentInput>({
    fullName: "",
    phoneNumber: "",
    whatsappNumber: "",
    email: "",
    sourceLabel: "mobile-academy",
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const course = courseQuery.data ?? null;
  const coverUri = resolveMediaUrl(course?.coverImageUrl ?? course?.thumbnailUrl);
  const publishedLabel = course?.publishedAt
    ? formatDate(course.publishedAt, locale)
    : null;
  const startLabel = course?.startsAt
    ? formatDateTime(course.startsAt, locale)
    : null;
  const priceLabel =
    formatCurrency(course?.priceAmount ?? null, course?.currencyCode ?? null, i18n.language) ??
    t("academy.detail.free", "Free");
  const lectures = course?.lectures ?? [];
  const contentBlocks = useMemo(
    () => (course?.fullDescription ? splitCourseContent(course.fullDescription) : []),
    [course?.fullDescription],
  );

  const isNotFound = courseQuery.isSuccess && !course;

  return (
    <DetailPageScaffold
      title={t("academy.detail.title", "Program details")}
      showBack
      onBack={() => router.back()}
      loading={courseQuery.isLoading}
      loadingMessage={t("academy.detail.loading", "Loading program details...")}
      error={courseQuery.isError}
      errorTitle={t("academy.detail.errorTitle", "We could not load the program")}
      errorMessage={t("academy.detail.errorMessage", "Please try again in a moment.")}
      onRetry={() => courseQuery.refetch()}
      retryText={t("academy.detail.retry", "Try again")}
      contentContainerStyle={styles.scaffold}
    >
      {isNotFound ? (
        <EmptyState
          title={t("academy.detail.notFoundTitle", "Program not found")}
          description={t(
            "academy.detail.notFoundDescription",
            "This program is no longer available or the link is invalid.",
          )}
          actionLabel={t("academy.detail.backToAcademy", "Back to academy")}
          onAction={() => router.replace("/(patient)/academy" as never)}
        />
      ) : course ? (
        <View style={styles.stack}>
          <Card variant="elevated" padding="none" style={styles.heroCard}>
            {coverUri ? (
              <Image source={{ uri: coverUri }} style={styles.cover} resizeMode="cover" />
            ) : (
              <View style={[styles.cover, { backgroundColor: theme.colors.primaryLight }]} />
            )}
            <View style={styles.heroBody}>
              <View style={styles.heroTopRow}>
                <StatusChip
                  label={
                    course.publishedAt
                      ? t("academy.detail.published", "Published")
                      : t("academy.detail.draft", "Draft")
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
              {course.shortDescription ? (
                <Text color={theme.colors.textSecondary} style={styles.description}>
                  {course.shortDescription}
                </Text>
              ) : null}
              <View style={styles.metaRow}>
                {publishedLabel ? (
                  <Text color={theme.colors.textMuted} style={styles.metaText}>
                    {publishedLabel}
                  </Text>
                ) : null}
                {startLabel ? (
                  <Text color={theme.colors.textMuted} style={styles.metaText}>
                    {startLabel}
                  </Text>
                ) : null}
                {course.plannedLectureCount ? (
                  <Text color={theme.colors.textMuted} style={styles.metaText}>
                    {t("academy.detail.lectures", {
                      count: course.plannedLectureCount,
                      defaultValue:
                        course.plannedLectureCount === 1
                          ? "1 lesson"
                          : `${course.plannedLectureCount} lessons`,
                    })}
                  </Text>
                ) : null}
                {course.plannedDurationDays ? (
                  <Text color={theme.colors.textMuted} style={styles.metaText}>
                    {t("academy.detail.durationDays", {
                      count: course.plannedDurationDays,
                      defaultValue: `${course.plannedDurationDays} days`,
                    })}
                  </Text>
                ) : null}
              </View>
            </View>
          </Card>

          <Card variant="elevated" padding="lg" style={styles.sectionCard}>
            <SectionHeader
              title={t("academy.detail.overviewTitle", "Overview")}
              subtitle={t(
                "academy.detail.overviewSubtitle",
                "Read the course details comfortably on mobile.",
              )}
            />
            <View style={styles.summaryStack}>
              <SummaryRow
                label={t("academy.detail.status", "Status")}
                value={<StatusChip label={course.status ?? "PUBLISHED"} tone="info" showDot={false} />}
              />
              <SummaryRow
                label={t("academy.detail.visibility", "Visibility")}
                value={course.visibility ?? "PUBLIC"}
              />
              <SummaryRow
                label={t("academy.detail.stats.enrollments", "Enrollments")}
                value={String(course.stats?.totalEnrollments ?? 0)}
              />
              <SummaryRow
                label={t("academy.detail.stats.paid", "Paid enrollments")}
                value={String(course.stats?.paidEnrollments ?? 0)}
              />
            </View>
          </Card>

          {course.fullDescription || contentBlocks.length > 0 ? (
            <Card variant="elevated" padding="lg" style={styles.sectionCard}>
              <SectionHeader
                title={t("academy.detail.descriptionTitle", "Description")}
                subtitle={t("academy.detail.descriptionSubtitle", "A calm, readable overview.")}
              />
              <View style={styles.contentStack}>
                {contentBlocks.length > 0 ? (
                  contentBlocks.map((block, index) => (
                    <Text
                      key={`${index}-${block.slice(0, 24)}`}
                      color={theme.colors.textSecondary}
                      style={styles.paragraph}
                    >
                      {block}
                    </Text>
                  ))
                ) : (
                  <Text color={theme.colors.textSecondary} style={styles.paragraph}>
                    {course.fullDescription}
                  </Text>
                )}
              </View>
            </Card>
          ) : null}

          {lectures.length > 0 ? (
            <Card variant="elevated" padding="lg" style={styles.sectionCard}>
              <SectionHeader
                title={t("academy.detail.scheduleTitle", "Program schedule")}
                subtitle={t(
                  "academy.detail.scheduleSubtitle",
                  "Lessons and modules available in this program.",
                )}
              />
              <View style={styles.lessonList}>
                {lectures.map((lecture) => (
                  <Card key={lecture.id} variant="outlined" padding="md" style={styles.lessonCard}>
                    <Text weight="600" style={styles.lessonTitle}>
                      {lecture.lectureOrder}. {lecture.lectureTitle ?? t("academy.detail.unnamedLesson", "Lesson")}
                    </Text>
                    <Text color={theme.colors.textMuted} style={styles.lessonMeta}>
                      {formatDateTime(lecture.startsAt, locale)}
                    </Text>
                    <Text color={theme.colors.textMuted} style={styles.lessonMeta}>
                      {formatDateTime(lecture.endsAt, locale)}
                    </Text>
                  </Card>
                ))}
              </View>
            </Card>
          ) : null}

          <Card variant="elevated" padding="lg" style={styles.sectionCard}>
          <SectionHeader
            title={t("academy.detail.enrollTitle", "Enroll now")}
            subtitle={t(
              "academy.detail.enrollSubtitle",
              "Share a few details and continue when you are ready.",
            )}
          />
          <View style={styles.formStack}>
            <Input
              label={t("academy.detail.form.fullName", "Full name")}
              value={form.fullName}
              onChangeText={(value) =>
                setForm((current) => ({ ...current, fullName: value }))
              }
              placeholder={t(
                "academy.detail.form.fullNamePlaceholder",
                "Your full name",
              )}
              autoCapitalize="words"
              textContentType="name"
              autoComplete="name"
            />
            <Input
              label={t("academy.detail.form.phone", "Phone number")}
              value={form.phoneNumber}
              onChangeText={(value) =>
                setForm((current) => ({ ...current, phoneNumber: value }))
              }
              placeholder={t(
                "academy.detail.form.phonePlaceholder",
                "05xxxxxxxx",
              )}
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
              autoComplete="tel"
            />
            <Input
              label={t("academy.detail.form.whatsapp", "WhatsApp number")}
              value={form.whatsappNumber ?? ""}
              onChangeText={(value) =>
                setForm((current) => ({ ...current, whatsappNumber: value }))
              }
              placeholder={t(
                "academy.detail.form.whatsappPlaceholder",
                "Optional",
              )}
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
              autoComplete="tel"
              helperText={t(
                "academy.detail.form.whatsappHelp",
                "Optional, but useful for enrollment updates.",
              )}
            />
            <Input
              label={t("academy.detail.form.email", "Email")}
              value={form.email ?? ""}
              onChangeText={(value) =>
                setForm((current) => ({ ...current, email: value }))
              }
              placeholder={t(
                "academy.detail.form.emailPlaceholder",
                "name@example.com",
              )}
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
            />
              {errorMessage ? (
                <Card variant="flat" padding="sm" style={styles.noticeCard}>
                  <Text color="#ba1a1a">{errorMessage}</Text>
                </Card>
              ) : null}
              <Button
                title={enrollMutation.isPending ? t("academy.detail.submitting", "Submitting...") : t("academy.detail.submit", "Continue")}
                disabled={enrollMutation.isPending}
                onPress={async () => {
                  setErrorMessage(null);
                  if (!form.fullName.trim() || !form.phoneNumber.trim()) {
                    setErrorMessage(
                      t(
                        "academy.detail.formValidation",
                        "Please provide your name and phone number.",
                      ),
                    );
                    return;
                  }

                  try {
                    const created = await enrollMutation.mutateAsync({
                      slug,
                      input: {
                        fullName: form.fullName.trim(),
                        phoneNumber: form.phoneNumber.trim(),
                        whatsappNumber: form.whatsappNumber?.trim() || undefined,
                        email: form.email?.trim() || undefined,
                        sourceLabel: form.sourceLabel?.trim() || undefined,
                      },
                    });

                    router.replace({
                      pathname: "/(patient)/academy/enrollments/[id]",
                      params: {
                        id: created.id,
                        token: created.publicAccessToken,
                      },
                    } as never);
                  } catch (error) {
                    setErrorMessage(extractApiErrorMessage(error));
                  }
                }}
              />
            </View>
          </Card>
        </View>
      ) : null}
    </DetailPageScaffold>
  );
}

const styles = StyleSheet.create({
  scaffold: {
    paddingBottom: 32,
  },
  stack: {
    gap: 14,
  },
  heroCard: {
    marginHorizontal: 0,
    overflow: "hidden",
  },
  cover: {
    width: "100%",
    height: 200,
    backgroundColor: "#eef2ff",
  },
  heroBody: {
    padding: 16,
    gap: 10,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  price: {
    fontSize: 13,
  },
  title: {
    fontSize: 24,
    lineHeight: 32,
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
  sectionCard: {
    marginHorizontal: 0,
  },
  summaryStack: {
    gap: 2,
    marginTop: 10,
  },
  contentStack: {
    gap: 10,
    marginTop: 10,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 24,
  },
  lessonList: {
    gap: 10,
    marginTop: 12,
  },
  lessonCard: {
    marginHorizontal: 0,
  },
  lessonTitle: {
    fontSize: 15,
  },
  lessonMeta: {
    fontSize: 12,
    marginTop: 4,
  },
  formStack: {
    gap: 4,
    marginTop: 12,
  },
  noticeCard: {
    marginHorizontal: 0,
  },
});
