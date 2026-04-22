import React, { useMemo, useState } from "react";
import {
  I18nManager,
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import {
  Screen,
  Text,
  Button,
  LoadingState,
  ErrorState,
} from "../../../../src/components/ui";
import { useTheme } from "../../../../src/providers/ThemeProvider";
import {
  useGetAssessmentDefinition,
  useSubmitAssessment,
} from "../../../../src/features/patient/assessments/api";
import { extractApiErrorMessage } from "../../../../src/lib/api";

export default function AssessmentQuestionsScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { t } = useTranslation();
  const { theme } = useTheme();

  const definitionQuery = useGetAssessmentDefinition(slug ?? null);
  const submitMutation = useSubmitAssessment(slug ?? "");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [errorText, setErrorText] = useState<string | null>(null);

  const definition = definitionQuery.data?.data.item;
  const questions = definition?.questions ?? [];
  const question = questions[currentIndex];
  const isRTL = I18nManager.isRTL;
  const progress = questions.length
    ? Math.round(((currentIndex + 1) / questions.length) * 100)
    : 0;

  const hasUnsupportedQuestions = useMemo(() => {
    return questions.some((item) => item.inputType !== "SINGLE_CHOICE");
  }, [questions]);

  const handleSelect = (questionKey: string, optionKey: string) => {
    setAnswers((current) => ({
      ...current,
      [questionKey]: optionKey,
    }));
    setErrorText(null);
  };

  const handleNext = async () => {
    if (!question) {
      return;
    }

    if (question.isRequired && !answers[question.key]) {
      setErrorText(t("assessments.question.requiredError"));
      return;
    }

    if (currentIndex < questions.length - 1) {
      setCurrentIndex((value) => value + 1);
      setErrorText(null);
      return;
    }

    try {
      const response = await submitMutation.mutateAsync({
        answers: questions
          .filter((item) => answers[item.key])
          .map((item) => ({
            questionKey: item.key,
            selectedOptionKey: answers[item.key],
          })),
      });

      router.replace(
        `/(patient)/assessments/submissions/${response.data.submissionId}`,
      );
    } catch (error) {
      setErrorText(extractApiErrorMessage(error));
    }
  };

  const handlePrevious = () => {
    if (currentIndex === 0) {
      router.back();
      return;
    }

    setCurrentIndex((value) => value - 1);
    setErrorText(null);
  };

  if (definitionQuery.isLoading) {
    return (
      <LoadingState fullScreen message={t("assessments.question.loading")} />
    );
  }

  if (definitionQuery.isError || !definition) {
    return (
      <Screen bg="background">
        <ErrorState
          fullScreen
          title={t("assessments.question.errorTitle")}
          message={t("assessments.question.errorSubtitle")}
          onRetry={() => definitionQuery.refetch()}
        />
      </Screen>
    );
  }

  if (hasUnsupportedQuestions) {
    return (
      <Screen bg="background">
        <ErrorState
          fullScreen
          title={t("assessments.question.unsupportedTitle")}
          message={t("assessments.question.unsupportedSubtitle")}
          onRetry={() => router.replace("/(patient)/assessments")}
        />
      </Screen>
    );
  }

  return (
    <Screen bg="background">
      <View style={styles.topMeta}>
        <Text style={styles.stepText}>
          {t("assessments.question.stepText", {
            current: currentIndex + 1,
            total: questions.length,
          })}
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.closeButton}
        >
          <Ionicons name="close" size={28} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <View
        style={[
          styles.progressBar,
          { backgroundColor: theme.colors.borderLight },
        ]}
      >
        <View
          style={[
            styles.progressFill,
            { backgroundColor: theme.colors.primary, width: `${progress}%` },
          ]}
        />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text weight="bold" style={styles.questionTitle}>
          {question?.prompt}
        </Text>
        <Text
          color={theme.colors.textSecondary}
          style={styles.questionSubtitle}
        >
          {question?.description ?? t("assessments.question.subtitleFallback")}
        </Text>

        <View style={styles.optionsColumn}>
          {question?.options.map((option, index) => {
            const selected = answers[question.key] === option.key;
            const iconName =
              index === 0
                ? "happy-outline"
                : index === 1
                  ? "remove-circle-outline"
                  : index === 2
                    ? "sad-outline"
                    : "alert-circle-outline";

            return (
              <TouchableOpacity
                key={option.key}
                activeOpacity={0.9}
                onPress={() => handleSelect(question.key, option.key)}
                style={[
                  styles.optionCard,
                  {
                    backgroundColor: selected
                      ? theme.colors.surface
                      : theme.colors.surfaceSecondary,
                    borderColor: selected
                      ? theme.colors.primary
                      : theme.colors.borderLight,
                    borderBottomWidth: selected ? 3 : 1,
                  },
                ]}
              >
                <View style={styles.optionTopRow}>
                  <View style={styles.optionLeadingText}>
                    <Text
                      weight={selected ? "bold" : "600"}
                      style={styles.optionTitle}
                    >
                      {option.label}
                    </Text>
                  </View>
                  <View style={styles.optionIcons}>
                    <View
                      style={[
                        styles.emotionBadge,
                        { backgroundColor: theme.colors.primaryLight },
                      ]}
                    >
                      <Ionicons
                        name={iconName}
                        size={22}
                        color={theme.colors.primary}
                      />
                    </View>
                    <Ionicons
                      name={selected ? "radio-button-on" : "radio-button-off"}
                      size={28}
                      color={
                        selected ? theme.colors.primary : theme.colors.textMuted
                      }
                    />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {errorText ? (
          <Text color="#ba1a1a" style={styles.errorText}>
            {errorText}
          </Text>
        ) : null}
      </ScrollView>

      <View
        style={[
          styles.footerBar,
          {
            borderTopColor: theme.colors.borderLight,
            backgroundColor: theme.colors.surface,
          },
        ]}
      >
        {/* Previous: text link, appears on the reading-start side */}
        <TouchableOpacity
          onPress={handlePrevious}
          style={styles.prevLink}
          disabled={submitMutation.isPending}
        >
          <Ionicons
            name={isRTL ? "arrow-forward" : "arrow-back"}
            size={18}
            color={theme.colors.primary}
          />
          <Text color={theme.colors.primary} weight="600" style={styles.prevText}>
            {t("assessments.question.previous")}
          </Text>
        </TouchableOpacity>

        {/* Next/Submit: primary button */}
        <Button
          title={
            currentIndex === questions.length - 1
              ? t("assessments.question.submit")
              : t("assessments.question.next")
          }
          onPress={handleNext}
          disabled={submitMutation.isPending}
          style={styles.nextButton}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: 18,
  },
  closeButton: {
    position: "absolute",
    right: 20,
    padding: 4,
  },
  stepText: {
    fontSize: 18,
  },
  progressBar: {
    height: 4,
    width: "100%",
  },
  progressFill: {
    height: "100%",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 44,
    paddingBottom: 150,
  },
  questionTitle: {
    fontSize: 36,
    lineHeight: 54,
    textAlign: "right",
    marginBottom: 18,
  },
  questionSubtitle: {
    fontSize: 19,
    lineHeight: 34,
    textAlign: "right",
    marginBottom: 34,
  },
  optionsColumn: {
    gap: 16,
  },
  optionCard: {
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 22,
  },
  optionTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  optionLeadingText: {
    flex: 1,
    alignItems: "flex-end",
  },
  optionIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  emotionBadge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  optionTitle: {
    fontSize: 30,
    textAlign: "right",
  },
  errorText: {
    fontSize: 15,
    marginTop: 18,
    textAlign: "right",
  },
  footerBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },
  prevLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  prevText: {
    fontSize: 16,
  },
  nextButton: {
    flex: 1,
    maxWidth: '56%',
    borderRadius: 14,
  },
});
