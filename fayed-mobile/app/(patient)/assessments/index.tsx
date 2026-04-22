import React, { useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  I18nManager,
} from "react-native";
import { useQueries } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import {
  Screen,
  Text,
  Card,
  LoadingState,
  ErrorState,
  EmptyState,
} from "../../../src/components/ui";
import { useTheme } from "../../../src/providers/ThemeProvider";
import { useAuth } from "../../../src/providers/AuthProvider";
import {
  fetchAssessmentDefinition,
  useGetMyAssessmentsHistory,
  useGetPublicAssessments,
} from "../../../src/features/patient/assessments/api";
import {
  AssessmentSubmissionStatus,
  PatientAssessmentHistoryItem,
} from "../../../src/features/patient/assessments/types";
import { AssessmentStatusCard } from "../../../src/features/patient/assessments/components/AssessmentStatusCard";

type ListFilter = "all" | "current" | "history";

function getLatestHistoryBySlug(items: PatientAssessmentHistoryItem[]) {
  const map = new Map<string, PatientAssessmentHistoryItem>();

  items.forEach((item) => {
    const existing = map.get(item.assessmentSlug);
    const currentTime = new Date(item.completedAt ?? item.createdAt).getTime();
    const existingTime = existing
      ? new Date(existing.completedAt ?? existing.createdAt).getTime()
      : -Infinity;

    if (!existing || currentTime > existingTime) {
      map.set(item.assessmentSlug, item);
    }
  });

  return map;
}

function mapStatus(status?: AssessmentSubmissionStatus) {
  if (status === "COMPLETED") {
    return "COMPLETED" as const;
  }
  if (status === "IN_PROGRESS") {
    return "IN_PROGRESS" as const;
  }
  return "NOT_STARTED" as const;
}

export default function PatientAssessmentsListScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const { user } = useAuth();
  const [selectedFilter, setSelectedFilter] = useState<ListFilter>("current");
  const isRTL = I18nManager.isRTL;

  const assessmentsQuery = useGetPublicAssessments();
  const historyQuery = useGetMyAssessmentsHistory({ page: 1, limit: 50 });

  const assessmentItems = assessmentsQuery.data?.data.items ?? [];
  const historyItems = historyQuery.data?.data.items ?? [];
  const latestHistoryBySlug = useMemo(
    () => getLatestHistoryBySlug(historyItems),
    [historyItems],
  );

  const detailQueries = useQueries({
    queries: assessmentItems.map((item) => ({
      queryKey: ["patient-assessments", "count", item.slug],
      queryFn: async () => {
        const result = await fetchAssessmentDefinition(item.slug);
        return result.data.item.questions.length;
      },
      staleTime: 60_000,
    })),
  });

  const questionCountMap = useMemo(() => {
    const map = new Map<string, number | null>();
    assessmentItems.forEach((item, index) => {
      const cached = detailQueries[index]?.data;
      map.set(item.slug, typeof cached === "number" ? cached : null);
    });
    return map;
  }, [assessmentItems, detailQueries]);

  const enrichedCards = useMemo(() => {
    return assessmentItems.map((item) => {
      const latest = latestHistoryBySlug.get(item.slug);
      return {
        definition: item,
        latest,
        status: mapStatus(latest?.status),
        questionCount: questionCountMap.get(item.slug) ?? null,
      };
    });
  }, [assessmentItems, latestHistoryBySlug, questionCountMap]);

  const activeCards = useMemo(
    () => enrichedCards.filter((item) => item.status !== "COMPLETED"),
    [enrichedCards],
  );
  const completedCards = useMemo(
    () => enrichedCards.filter((item) => item.status === "COMPLETED"),
    [enrichedCards],
  );

  const visibleCards = useMemo(() => {
    if (selectedFilter === "history") {
      return completedCards;
    }
    if (selectedFilter === "current") {
      return activeCards;
    }
    return enrichedCards;
  }, [activeCards, completedCards, enrichedCards, selectedFilter]);

  const actionableCount = activeCards.filter(
    (item) => item.status !== "IN_PROGRESS",
  ).length;
  const inProgressCount = activeCards.filter(
    (item) => item.status === "IN_PROGRESS",
  ).length;

  if (assessmentsQuery.isLoading || historyQuery.isLoading) {
    return <LoadingState fullScreen message={t("assessments.list.loading")} />;
  }

  if (assessmentsQuery.isError || historyQuery.isError) {
    return (
      <Screen bg="background">
        <ErrorState
          fullScreen
          title={t("assessments.list.errorTitle")}
          message={t("assessments.list.errorSubtitle")}
          onRetry={() => {
            assessmentsQuery.refetch();
            historyQuery.refetch();
          }}
        />
      </Screen>
    );
  }

  const userInitial =
    (user?.displayName ?? user?.primaryEmail ?? "U")
      .trim()
      .charAt(0)
      .toUpperCase() || "U";

  return (
    <Screen bg="background">
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <View
              style={[
                styles.avatar,
                { backgroundColor: theme.colors.surfaceSecondary },
              ]}
            >
              <Text weight="bold">{userInitial}</Text>
            </View>
            <Text weight="bold" style={styles.brandText}>
              Clinical Sanctuary
            </Text>
          </View>

          <Ionicons
            name="notifications-outline"
            size={24}
            color={theme.colors.primary}
          />
        </View>

        <Card
          variant="elevated"
          style={[
            styles.heroCard,
            { borderWidth: 1, borderColor: theme.colors.borderLight },
          ]}
          padding="lg"
        >
          <View style={styles.heroContent}>
            <View style={styles.heroTextBlock}>
              <Text
                weight="bold"
                style={[
                  styles.heroTitle,
                  { textAlign: isRTL ? "right" : "left" },
                ]}
              >
                {t("assessments.list.heroTitle")}
              </Text>
              <Text
                color={theme.colors.textSecondary}
                style={[
                  styles.heroSubtitle,
                  { textAlign: isRTL ? "right" : "left" },
                ]}
              >
                {t("assessments.list.heroSubtitle")}
              </Text>
            </View>

            <View style={styles.heroStats}>
              <View
                style={[
                  styles.statCard,
                  { backgroundColor: theme.colors.surfaceSecondary },
                ]}
              >
                <Text
                  weight="bold"
                  style={[styles.statValue, { color: "#a86500" }]}
                >
                  {i18n.language.startsWith("ar")
                    ? actionableCount.toLocaleString("ar-SA")
                    : actionableCount}
                </Text>
                <Text
                  color={theme.colors.textSecondary}
                  style={styles.statLabel}
                >
                  {t("assessments.list.remainingCount")}
                </Text>
              </View>
              <View
                style={[
                  styles.statCard,
                  { backgroundColor: theme.colors.surfaceSecondary },
                ]}
              >
                <Text
                  weight="bold"
                  style={[styles.statValue, { color: theme.colors.primary }]}
                >
                  {i18n.language.startsWith("ar")
                    ? inProgressCount.toLocaleString("ar-SA")
                    : inProgressCount}
                </Text>
                <Text
                  color={theme.colors.textSecondary}
                  style={styles.statLabel}
                >
                  {t("assessments.list.inProgressCount")}
                </Text>
              </View>
            </View>
          </View>
        </Card>

        <View style={styles.filterRow}>
          {(
            [
              ["all", t("assessments.list.filters.all")],
              ["current", t("assessments.list.filters.current")],
              ["history", t("assessments.list.filters.history")],
            ] as const
          ).map(([key, label]) => {
            const active = selectedFilter === key;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => setSelectedFilter(key)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active
                      ? theme.colors.primaryLight
                      : theme.colors.surface,
                    borderColor: active
                      ? theme.colors.primary
                      : theme.colors.borderLight,
                  },
                ]}
              >
                <Text
                  color={
                    active ? theme.colors.primary : theme.colors.textSecondary
                  }
                  weight={active ? "600" : "normal"}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {visibleCards.length === 0 ? (
          <EmptyState
            title={t("assessments.list.emptyTitle")}
            description={t("assessments.list.emptySubtitle")}
            icon={
              <Ionicons
                name="clipboard-outline"
                size={48}
                color={theme.colors.textMuted}
              />
            }
          />
        ) : (
          <View style={styles.cardsColumn}>
            {visibleCards.map(
              ({ definition, latest, status, questionCount }) => {
                const isCompleted = status === "COMPLETED";
                const isInProgress = status === "IN_PROGRESS";

                return (
                  <AssessmentStatusCard
                    key={definition.slug}
                    title={definition.title}
                    description={
                      definition.description ??
                      t("assessments.list.descriptionFallback")
                    }
                    durationMinutes={definition.estimatedDurationMinutes}
                    questionCount={questionCount}
                    status={status}
                    statusLabel={
                      isCompleted
                        ? t("assessments.list.status.completed")
                        : isInProgress
                          ? t("assessments.list.status.inProgress")
                          : t("assessments.list.status.notStarted")
                    }
                    actionLabel={
                      isCompleted
                        ? t("assessments.list.actions.viewResult")
                        : isInProgress
                          ? t("assessments.list.actions.continue")
                          : t("assessments.list.actions.start")
                    }
                    footerNote={
                      isCompleted && latest?.completedAt
                        ? t("assessments.list.completedAt", {
                            date: new Date(
                              latest.completedAt,
                            ).toLocaleDateString(
                              i18n.language.startsWith("ar")
                                ? "ar-SA"
                                : "en-US",
                              {
                                day: "numeric",
                                month: "long",
                              },
                            ),
                          })
                        : null
                    }
                    onPress={() => {
                      if (isCompleted && latest) {
                        router.push(
                          `/(patient)/assessments/submissions/${latest.submissionId}`,
                        );
                        return;
                      }

                      router.push(`/(patient)/assessments/${definition.slug}`);
                    }}
                  />
                );
              },
            )}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 128,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 22,
  },
  topBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  brandText: {
    fontSize: 18,
  },
  heroCard: {
    borderRadius: 28,
    marginBottom: 20,
  },
  heroContent: {
    gap: 18,
  },
  heroTextBlock: {
    gap: 12,
  },
  heroTitle: {
    fontSize: 30,
    lineHeight: 38,
  },
  heroSubtitle: {
    fontSize: 15,
    lineHeight: 23,
  },
  heroStats: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  statCard: {
    width: 86,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e1e8f5",
  },
  statValue: {
    fontSize: 24,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: "center",
  },
  filterRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginBottom: 18,
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 15,
    paddingVertical: 9,
  },
  cardsColumn: {
    gap: 16,
  },
});
