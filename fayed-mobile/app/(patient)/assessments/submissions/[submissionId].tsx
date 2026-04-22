import React from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import {
  Screen,
  Text,
  Card,
  Button,
  LoadingState,
  ErrorState,
} from "../../../../src/components/ui";
import { useTheme } from "../../../../src/providers/ThemeProvider";
import { useAuth } from "../../../../src/providers/AuthProvider";
import { useGetMyAssessmentSubmission } from "../../../../src/features/patient/assessments/api";
import { AssessmentScoreRing } from "../../../../src/features/patient/assessments/components/AssessmentScoreRing";

function bandColor(band: string, primary: string) {
  if (band === "HIGH" || band === "MODERATE") {
    return "#a86500";
  }
  if (band === "MILD") {
    return primary;
  }
  return primary;
}

export default function AssessmentSubmissionResultScreen() {
  const router = useRouter();
  const { submissionId } = useLocalSearchParams<{ submissionId: string }>();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { user } = useAuth();

  const query = useGetMyAssessmentSubmission(submissionId ?? null);

  if (query.isLoading) {
    return (
      <LoadingState fullScreen message={t("assessments.result.loading")} />
    );
  }

  if (query.isError || !query.data?.data) {
    return (
      <Screen bg="background">
        <ErrorState
          fullScreen
          title={t("assessments.result.errorTitle")}
          message={t("assessments.result.errorSubtitle")}
          onRetry={() => query.refetch()}
        />
      </Screen>
    );
  }

  const submission = query.data.data;
  const result = submission.result;
  const userInitial =
    (user?.displayName ?? user?.primaryEmail ?? "U")
      .trim()
      .charAt(0)
      .toUpperCase() || "U";

  if (!result) {
    return (
      <Screen bg="background">
        <ErrorState
          fullScreen
          title={t("assessments.result.unavailableTitle")}
          message={t("assessments.result.unavailableSubtitle")}
          onRetry={() => router.replace("/(patient)/assessments")}
        />
      </Screen>
    );
  }

  return (
    <Screen bg="background">
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.topBar}>
          <View style={styles.brandWrap}>
            <Text weight="bold" style={styles.brandName}>
              Sanctuary
            </Text>
            <View
              style={[
                styles.avatar,
                { backgroundColor: theme.colors.surfaceSecondary },
              ]}
            >
              <Text weight="bold">{userInitial}</Text>
            </View>
          </View>

          <Ionicons
            name="notifications-outline"
            size={24}
            color={theme.colors.primary}
          />
        </View>

        <View style={styles.headerSection}>
          <Text weight="bold" style={styles.headerTitle}>
            {t("assessments.result.title")}
          </Text>
          <Text
            color={theme.colors.textSecondary}
            style={styles.headerSubtitle}
          >
            {t("assessments.result.subtitle")}
          </Text>
        </View>

        <Card variant="elevated" style={styles.resultCard} padding="lg">
          <View
            style={[
              styles.resultAccent,
              { backgroundColor: theme.colors.primary },
            ]}
          />
          <View style={styles.scoreWrap}>
            <AssessmentScoreRing
              score={result.score}
              label={t(`assessments.result.bands.${result.band}` as never)}
              overlineLabel={t('assessments.result.levelLabel')}
            />
          </View>

          <Text weight="bold" style={styles.sectionTitle}>
            {t("assessments.result.meaningTitle")}
          </Text>
          <Text color={theme.colors.textSecondary} style={styles.summaryText}>
            {result.summary}
          </Text>

          <Card variant="flat" style={styles.noticeCard} padding="md">
            <View style={styles.noticeRow}>
              <Ionicons
                name="information-circle-outline"
                size={20}
                color={theme.colors.primary}
              />
              <Text
                color={theme.colors.textSecondary}
                style={styles.noticeText}
              >
                {t("assessments.result.notice")}
              </Text>
            </View>
          </Card>
        </Card>

        <View style={styles.nextSection}>
          <Text weight="bold" style={styles.sectionTitle}>
            {t("assessments.result.nextStepsTitle")}
          </Text>

          <Card variant="elevated" style={styles.actionCard} padding="lg">
            <View
              style={[
                styles.actionIcon,
                { backgroundColor: theme.colors.primaryLight },
              ]}
            >
              <Ionicons
                name="medkit-outline"
                size={22}
                color={theme.colors.primary}
              />
            </View>
            <Text weight="bold" style={styles.actionTitle}>
              {t("assessments.result.actionTherapistTitle")}
            </Text>
            <Text color={theme.colors.textSecondary} style={styles.actionBody}>
              {result.nextSteps[0] ??
                t("assessments.result.actionTherapistBody")}
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/(patient)/discovery")}
            >
              <Text
                color={theme.colors.primary}
                weight="600"
                style={styles.inlineLink}
              >
                {t("assessments.result.actionTherapistCta")}
              </Text>
            </TouchableOpacity>
          </Card>

          <Card variant="elevated" style={styles.actionCard} padding="lg">
            <View
              style={[
                styles.actionIcon,
                { backgroundColor: theme.colors.primaryLight },
              ]}
            >
              <Ionicons
                name="leaf-outline"
                size={22}
                color={theme.colors.primary}
              />
            </View>
            <Text weight="bold" style={styles.actionTitle}>
              {t("assessments.result.actionExerciseTitle")}
            </Text>
            <Text color={theme.colors.textSecondary} style={styles.actionBody}>
              {result.nextSteps[1] ??
                t("assessments.result.actionExerciseBody")}
            </Text>
            <Text
              color={theme.colors.primary}
              weight="600"
              style={styles.inlineLink}
            >
              {t("assessments.result.actionExerciseCta")}
            </Text>
          </Card>

          <Card variant="elevated" style={styles.actionCard} padding="lg">
            <View style={[styles.actionIcon, { backgroundColor: "#f6e3c7" }]}>
              <Ionicons name="book-outline" size={22} color="#a86500" />
            </View>
            <Text weight="bold" style={styles.actionTitle}>
              {t("assessments.result.actionLibraryTitle")}
            </Text>
            <Text color={theme.colors.textSecondary} style={styles.actionBody}>
              {result.nextSteps[2] ?? t("assessments.result.actionLibraryBody")}
            </Text>
            <Text
              color={theme.colors.primary}
              weight="600"
              style={styles.inlineLink}
            >
              {t("assessments.result.actionLibraryCta")}
            </Text>
          </Card>
        </View>

        <Card variant="flat" style={styles.footerCard} padding="lg">
          <Text weight="bold" style={styles.footerTitle}>
            {t("assessments.result.saveTitle")}
          </Text>
          <Text color={theme.colors.textSecondary} style={styles.footerBody}>
            {t("assessments.result.saveBody")}
          </Text>
          <Button
            title={t("assessments.result.saveProfile")}
            onPress={() => router.replace("/(patient)/assessments")}
            style={styles.footerButton}
          />
          <TouchableOpacity
            disabled
            style={styles.pdfLink}
          >
            <Text
              color={theme.colors.primary}
              weight="600"
              style={styles.pdfLinkText}
            >
              {t("assessments.result.downloadPdf")}
            </Text>
          </TouchableOpacity>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 26,
  },
  brandWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  brandName: {
    fontSize: 18,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  headerSection: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 30,
    textAlign: "right",
    marginBottom: 10,
  },
  headerSubtitle: {
    fontSize: 16,
    lineHeight: 28,
    textAlign: "right",
  },
  resultCard: {
    borderRadius: 22,
    marginBottom: 26,
    paddingTop: 24,
  },
  resultAccent: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: 5,
  },
  scoreWrap: {
    alignItems: "center",
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 24,
    textAlign: "right",
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 16,
    lineHeight: 30,
    textAlign: "right",
  },
  noticeCard: {
    marginTop: 20,
    borderRadius: 14,
  },
  noticeRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
  },
  noticeText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 24,
    textAlign: "right",
  },
  nextSection: {
    gap: 18,
    marginBottom: 24,
  },
  actionCard: {
    borderRadius: 22,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-end",
    marginBottom: 18,
  },
  actionTitle: {
    fontSize: 24,
    textAlign: "right",
    marginBottom: 10,
  },
  actionBody: {
    fontSize: 15,
    lineHeight: 28,
    textAlign: "right",
    marginBottom: 18,
  },
  inlineLink: {
    fontSize: 15,
    textAlign: "right",
  },
  footerCard: {
    borderRadius: 22,
  },
  footerTitle: {
    fontSize: 22,
    textAlign: "right",
    marginBottom: 10,
  },
  footerBody: {
    fontSize: 15,
    lineHeight: 28,
    textAlign: "right",
    marginBottom: 18,
  },
  footerButton: {
    marginTop: 12,
    borderRadius: 12,
  },
  pdfLink: {
    marginTop: 16,
    alignItems: "center",
    opacity: 0.5,
  },
  pdfLinkText: {
    fontSize: 15,
    textAlign: "center",
  },
});
