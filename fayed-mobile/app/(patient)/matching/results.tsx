import React from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  Screen,
  Header,
  Text,
  Button,
  LoadingState,
  ErrorState,
  EmptyState,
} from "../../../src/components/ui";
import { useTheme } from "../../../src/providers/ThemeProvider";
import { useGetMatchingSession } from "../../../src/features/patient/matching/api";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

export default function MatchingResultsScreen() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const { theme } = useTheme();
  const { t } = useTranslation();

  const {
    data: sessionData,
    isLoading,
    isError,
    refetch,
  } = useGetMatchingSession(sessionId || null);

  const handleBackToHome = () => router.replace("/(patient)/matching/intro");

  const openPractitionerProfile = (
    slug: string,
    score: number,
    rationaleNote?: string,
    intent: "view" | "book" = "view",
  ) => {
    router.push({
      pathname: "/(patient)/discovery/[slug]",
      params: {
        slug,
        source: "matching",
        intent,
        matchScore: String(score),
        matchReason: rationaleNote ?? "",
      },
    });
  };

  if (isLoading) {
    return (
      <Screen bg="background">
        <Header
          title={t("matching.results.header")}
          showBack
          onBack={handleBackToHome}
        />
        <LoadingState fullScreen message={t("matching.results.loading")} />
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen bg="background">
        <Header
          title={t("matching.results.header")}
          showBack
          onBack={handleBackToHome}
        />
        <ErrorState fullScreen onRetry={refetch} />
      </Screen>
    );
  }

  const recommendations = sessionData?.data?.items ?? [];

  return (
    <Screen bg="background">
      <Header
        title={t("matching.results.header")}
        showBack
        onBack={handleBackToHome}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerBlock}>
          <View
            style={[
              styles.successIcon,
              { backgroundColor: theme.colors.primaryLight },
            ]}
          >
            <Ionicons
              name="checkmark-circle"
              size={30}
              color={theme.colors.primary}
            />
          </View>
          <Text weight="bold" style={styles.title}>
            {t("matching.results.title")}
          </Text>
          <Text color={theme.colors.textSecondary} style={styles.subtitle}>
            {t("matching.results.subtitle")}
          </Text>
        </View>

        {recommendations.length === 0 ? (
          <EmptyState
            title={t("matching.results.emptyTitle")}
            description={t("matching.results.emptySubtitle")}
          />
        ) : (
          <View style={styles.listWrap}>
            {recommendations.map((item) => (
              <View
                key={item.practitioner.id}
                style={[
                  styles.matchCard,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.borderLight,
                  },
                ]}
              >
                <View
                  style={[
                    styles.leftPulse,
                    { backgroundColor: theme.colors.primary },
                  ]}
                />

                <View style={styles.cardBody}>
                  <View style={styles.scoreBadgeWrap}>
                    <View
                      style={[
                        styles.scoreBadge,
                        { backgroundColor: theme.colors.primary },
                      ]}
                    >
                      <Text
                        color="#ffffff"
                        weight="600"
                        style={styles.scoreText}
                      >
                        {t("matching.results.score", { score: item.score })}
                      </Text>
                    </View>
                  </View>

                  <Text weight="bold" style={styles.therapistName}>
                    {item.practitioner.displayName || item.practitioner.slug}
                  </Text>
                  <Text
                    color={theme.colors.textSecondary}
                    style={styles.therapistSpec}
                  >
                    {item.practitioner.professionalTitle ||
                      t("matching.results.professionalFallback")}
                  </Text>

                  {item.rationale.notes.length > 0 ? (
                    <View
                      style={[
                        styles.reasonBox,
                        { backgroundColor: theme.colors.surfaceSecondary },
                      ]}
                    >
                      <Text
                        color={theme.colors.textSecondary}
                        style={styles.reasonText}
                      >
                        {item.rationale.notes[0]}
                      </Text>
                    </View>
                  ) : null}

                  <View style={styles.actionsRow}>
                    <Button
                      title={t("matching.results.viewProfile")}
                      variant="secondary"
                      style={styles.secondaryBtn}
                      onPress={() =>
                        openPractitionerProfile(
                          item.practitioner.slug,
                          item.score,
                          item.rationale.notes[0],
                          "view",
                        )
                      }
                    />
                    <Button
                      title={t("matching.results.bookNow")}
                      style={styles.primaryBtn}
                      onPress={() =>
                        openPractitionerProfile(
                          item.practitioner.slug,
                          item.score,
                          item.rationale.notes[0],
                          "book",
                        )
                      }
                    />
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push("/(patient)/discovery")}
          style={styles.viewAllWrap}
        >
          <Text
            color={theme.colors.textBrand}
            weight="600"
            style={styles.viewAllText}
          >
            {t("matching.results.viewAllTherapists")}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 34,
  },
  headerBlock: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 20,
  },
  successIcon: {
    width: 70,
    height: 70,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: 40,
    lineHeight: 50,
    textAlign: "center",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 19,
    lineHeight: 30,
    textAlign: "center",
  },
  listWrap: {
    paddingHorizontal: 16,
    gap: 14,
  },
  matchCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    flexDirection: "row",
  },
  leftPulse: {
    width: 4,
  },
  cardBody: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  scoreBadgeWrap: {
    alignItems: "flex-end",
    marginBottom: 6,
  },
  scoreBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  scoreText: {
    fontSize: 12,
  },
  therapistName: {
    fontSize: 30,
    lineHeight: 38,
    marginBottom: 4,
  },
  therapistSpec: {
    fontSize: 20,
    lineHeight: 28,
    marginBottom: 10,
  },
  reasonBox: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  reasonText: {
    fontSize: 16,
    lineHeight: 24,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  secondaryBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 11,
  },
  primaryBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 11,
  },
  viewAllWrap: {
    marginTop: 26,
    alignItems: "center",
  },
  viewAllText: {
    fontSize: 17,
  },
});
