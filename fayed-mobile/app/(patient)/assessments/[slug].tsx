import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import {
  Screen,
  Header,
  Text,
  Button,
  Card,
  LoadingState,
  ErrorState,
} from "../../../src/components/ui";
import { useTheme } from "../../../src/providers/ThemeProvider";
import { useGetAssessmentDefinition } from "../../../src/features/patient/assessments/api";

export default function AssessmentDetailScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const query = useGetAssessmentDefinition(slug ?? null);

  if (query.isLoading) {
    return (
      <LoadingState fullScreen message={t("assessments.detail.loading")} />
    );
  }

  if (query.isError || !query.data?.data.item) {
    return (
      <Screen bg="background">
        <Header showBack onBack={() => router.back()} />
        <ErrorState
          fullScreen
          title={t("assessments.detail.errorTitle")}
          message={t("assessments.detail.errorSubtitle")}
          onRetry={() => query.refetch()}
        />
      </Screen>
    );
  }

  const item = query.data.data.item;

  return (
    <Screen bg="background">
      <Header showBack onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card variant="elevated" style={styles.heroCard} padding="lg">
          <View
            style={[
              styles.accentLine,
              { backgroundColor: theme.colors.primary },
            ]}
          />

          <View style={styles.heroIconWrap}>
            <View
              style={[
                styles.heroIcon,
                { backgroundColor: theme.colors.surfaceSecondary },
              ]}
            >
              <Ionicons
                name="clipboard-outline"
                size={32}
                color={theme.colors.primary}
              />
            </View>
          </View>

          <Text weight="bold" style={styles.heroTitle}>
            {item.title}
          </Text>

          <View style={styles.metaRow}>
            {item.estimatedDurationMinutes != null ? (
              <View
                style={[
                  styles.metaPill,
                  { backgroundColor: theme.colors.surfaceSecondary },
                ]}
              >
                <Ionicons
                  name="time-outline"
                  size={16}
                  color={theme.colors.textSecondary}
                />
                <Text color={theme.colors.textSecondary}>
                  {t("assessments.detail.duration", {
                    value: item.estimatedDurationMinutes,
                  })}
                </Text>
              </View>
            ) : null}

            <View
              style={[
                styles.metaPill,
                { backgroundColor: theme.colors.surfaceSecondary },
              ]}
            >
              <Ionicons
                name="reorder-three-outline"
                size={16}
                color={theme.colors.textSecondary}
              />
              <Text color={theme.colors.textSecondary}>
                {t("assessments.detail.questionCount", {
                  value: item.questions.length,
                })}
              </Text>
            </View>
          </View>

          <Text color={theme.colors.textSecondary} style={styles.bodyText}>
            {item.introText ??
              item.description ??
              t("assessments.detail.fallbackIntro")}
          </Text>
        </Card>

        <Card variant="elevated" style={styles.infoCard} padding="lg">
          <View style={styles.infoHeader}>
            <View
              style={[
                styles.infoIcon,
                { backgroundColor: theme.colors.primaryLight },
              ]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={22}
                color={theme.colors.primary}
              />
            </View>
            <Text weight="bold" style={styles.infoTitle}>
              {t("assessments.detail.privacyTitle")}
            </Text>
          </View>
          <Text color={theme.colors.textSecondary} style={styles.infoBody}>
            {t("assessments.detail.privacyBody")}
          </Text>
        </Card>

        <Card variant="elevated" style={styles.infoCard} padding="lg">
          <View style={styles.infoHeader}>
            <View
              style={[
                styles.infoIcon,
                { backgroundColor: theme.colors.primaryLight },
              ]}
            >
              <Ionicons
                name="help-circle-outline"
                size={22}
                color={theme.colors.primary}
              />
            </View>
            <Text weight="bold" style={styles.infoTitle}>
              {t("assessments.detail.supportTitle")}
            </Text>
          </View>
          <Text color={theme.colors.textSecondary} style={styles.infoBody}>
            {t("assessments.detail.supportBody")}
          </Text>
        </Card>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={t("assessments.detail.start")}
          onPress={() =>
            router.push(`/(patient)/assessments/${item.slug}/questions`)
          }
          style={styles.primaryAction}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 140,
  },
  heroCard: {
    borderRadius: 24,
    paddingTop: 28,
    marginBottom: 24,
  },
  accentLine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  heroIconWrap: {
    alignItems: "flex-end",
    marginBottom: 28,
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    fontSize: 34,
    lineHeight: 46,
    textAlign: "right",
    marginBottom: 22,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginBottom: 28,
  },
  metaPill: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bodyText: {
    fontSize: 18,
    lineHeight: 36,
    textAlign: "right",
  },
  infoCard: {
    borderRadius: 22,
    marginBottom: 20,
  },
  infoHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
  },
  infoIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  infoTitle: {
    fontSize: 28,
    textAlign: "right",
    flex: 1,
  },
  infoBody: {
    fontSize: 18,
    lineHeight: 34,
    textAlign: "right",
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    backgroundColor: "rgba(247,249,254,0.95)",
  },
  primaryAction: {
    borderRadius: 12,
    paddingVertical: 18,
  },
});
