import React, { useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Screen,
  Header,
  Text,
  Button,
  LoadingState,
  ErrorState,
} from "../../../src/components/ui";
import { useTheme } from "../../../src/providers/ThemeProvider";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { listSpecialties } from "../../../src/features/specialties/api";
import { extractApiErrorMessage } from "../../../src/lib/api";
import { useCreateMatchingSession } from "../../../src/features/patient/matching/api";
import {
  MatchingUrgencyPreference,
  PractitionerGenderPreference,
  SessionMode,
} from "../../../src/features/patient/matching/types";
import { Ionicons } from "@expo/vector-icons";

type ChoiceItem<T extends string> = {
  id: T;
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
};

export default function MatchingQuestionsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const {
    mutate: createMatchingSession,
    isPending,
    isError,
    error,
  } = useCreateMatchingSession();

  const [selectedGender, setSelectedGender] =
    useState<PractitionerGenderPreference>(PractitionerGenderPreference.ANY);
  const [selectedLanguage, setSelectedLanguage] = useState<"ar" | "en" | "fr">(
    i18n.language.startsWith("ar") ? "ar" : "en",
  );
  const [selectedSpecialtySlug, setSelectedSpecialtySlug] =
    useState<string>("");
  const [selectedMode, setSelectedMode] = useState<SessionMode>("VIDEO");
  const [selectedUrgency, setSelectedUrgency] =
    useState<MatchingUrgencyPreference>(MatchingUrgencyPreference.FLEXIBLE);
  const [primaryConcern, setPrimaryConcern] = useState("");
  const [errorText, setErrorText] = useState<string | null>(null);

  const specialtiesQuery = useQuery({
    queryKey: ["public-specialties", i18n.language],
    queryFn: listSpecialties,
  });

  const specialtyChoices = useMemo(() => {
    return (specialtiesQuery.data?.specialties ?? [])
      .filter((item) => item.isActive)
      .slice(0, 8)
      .map((item) => ({
        id: item.slug,
        title: item.name ?? item.slug,
      }));
  }, [specialtiesQuery.data?.specialties]);

  const genderChoices: ChoiceItem<PractitionerGenderPreference>[] = [
    {
      id: PractitionerGenderPreference.ANY,
      title: t("matching.question.gender.any"),
      subtitle: t("matching.question.gender.anyHint"),
      icon: "remove-circle-outline",
    },
    {
      id: PractitionerGenderPreference.FEMALE,
      title: t("matching.question.gender.female"),
      icon: "female-outline",
    },
    {
      id: PractitionerGenderPreference.MALE,
      title: t("matching.question.gender.male"),
      icon: "male-outline",
    },
  ];

  const languageChoices: ChoiceItem<"ar" | "en" | "fr">[] = [
    {
      id: "ar",
      title: t("matching.question.language.ar"),
      icon: "language-outline",
    },
    {
      id: "en",
      title: t("matching.question.language.en"),
      icon: "language-outline",
    },
    {
      id: "fr",
      title: t("matching.question.language.fr"),
      icon: "language-outline",
    },
  ];

  const modeChoices: ChoiceItem<SessionMode>[] = [
    {
      id: "VIDEO",
      title: t("matching.question.mode.video"),
      icon: "videocam-outline",
    },
    {
      id: "AUDIO",
      title: t("matching.question.mode.audio"),
      icon: "call-outline",
    },
  ];

  const urgencyChoices: ChoiceItem<MatchingUrgencyPreference>[] = [
    {
      id: MatchingUrgencyPreference.FLEXIBLE,
      title: t("matching.question.urgency.flexible"),
      icon: "calendar-outline",
    },
    {
      id: MatchingUrgencyPreference.EARLIEST_AVAILABLE,
      title: t("matching.question.urgency.earliest"),
      icon: "time-outline",
    },
    {
      id: MatchingUrgencyPreference.AVAILABLE_NOW,
      title: t("matching.question.urgency.now"),
      icon: "flash-outline",
    },
  ];

  const handleSubmit = () => {
    setErrorText(null);
    createMatchingSession(
      {
        primaryConcern: primaryConcern.trim() || undefined,
        preferredSpecialtySlug: selectedSpecialtySlug || undefined,
        preferredLanguage: selectedLanguage,
        preferredPractitionerGender: selectedGender,
        sessionMode: selectedMode,
        urgency: selectedUrgency,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      {
        onSuccess: (data) => {
          router.push({
            pathname: "/(patient)/matching/results",
            params: { sessionId: data.data.sessionId },
          });
        },
        onError: (submitError) => {
          setErrorText(extractApiErrorMessage(submitError));
        },
      },
    );
  };

  if (specialtiesQuery.isLoading) {
    return (
      <Screen bg="background">
        <Header showBack  />
        <LoadingState fullScreen message={t("matching.question.loading")} />
      </Screen>
    );
  }

  if (specialtiesQuery.isError) {
    return (
      <Screen bg="background">
        <Header showBack  />
        <ErrorState
          fullScreen
          message={t("matching.question.loadError")}
          onRetry={() => specialtiesQuery.refetch()}
        />
      </Screen>
    );
  }

  if (isError && !errorText) {
    return (
      <Screen bg="background">
        <Header showBack  />
        <ErrorState
          title={t("matching.question.submitErrorTitle")}
          message={extractApiErrorMessage(error)}
          onRetry={handleSubmit}
        />
      </Screen>
    );
  }

  const progress = 60;

  return (
    <Screen bg="background">
      <Header showBack  />

      <View style={styles.progressContainer}>
        <View style={styles.progressMeta}>
          <Text color={theme.colors.textMuted} style={styles.progressText}>
            {t("matching.question.progress")}
          </Text>
          <Text color={theme.colors.textMuted} style={styles.progressText}>
            {progress}%
          </Text>
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
      </View>

      {isPending ? (
        <LoadingState fullScreen message={t("matching.question.submitting")} />
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Text weight="bold" style={styles.questionText}>
              {t("matching.question.title")}
            </Text>
            <Text
              color={theme.colors.textSecondary}
              style={styles.questionSubtext}
            >
              {t("matching.question.subtitle")}
            </Text>

            <View style={styles.sectionSpacing}>
              <Text weight="600" style={styles.sectionTitle}>
                {t("matching.question.gender.title")}
              </Text>
              <View style={styles.choiceGrid}>
                {genderChoices.map((item) => (
                  <ChoiceCard
                    key={item.id}
                    icon={item.icon}
                    title={item.title}
                    subtitle={item.subtitle}
                    selected={selectedGender === item.id}
                    onPress={() => setSelectedGender(item.id)}
                  />
                ))}
              </View>
            </View>

            <View style={styles.sectionSpacing}>
              <Text weight="600" style={styles.sectionTitle}>
                {t("matching.question.language.title")}
              </Text>
              <View style={styles.choiceGrid}>
                {languageChoices.map((item) => (
                  <ChoiceCard
                    key={item.id}
                    icon={item.icon}
                    title={item.title}
                    selected={selectedLanguage === item.id}
                    onPress={() => setSelectedLanguage(item.id)}
                  />
                ))}
              </View>
            </View>

            <View style={styles.sectionSpacing}>
              <Text weight="600" style={styles.sectionTitle}>
                {t("matching.question.specialty.title")}
              </Text>
              <View style={styles.chipsWrap}>
                {specialtyChoices.map((item) => {
                  const selected = selectedSpecialtySlug === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      activeOpacity={0.8}
                      onPress={() =>
                        setSelectedSpecialtySlug((prev) =>
                          prev === item.id ? "" : item.id,
                        )
                      }
                      style={[
                        styles.chip,
                        {
                          borderColor: selected
                            ? theme.colors.primary
                            : theme.colors.borderStrong,
                          backgroundColor: selected
                            ? theme.colors.primary
                            : theme.colors.surface,
                        },
                      ]}
                    >
                      <Text
                        color={
                          selected ? "#ffffff" : theme.colors.textSecondary
                        }
                        weight={selected ? "600" : "normal"}
                        style={styles.chipText}
                      >
                        {item.title}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.sectionSpacing}>
              <Text weight="600" style={styles.sectionTitle}>
                {t("matching.question.mode.title")}
              </Text>
              <View style={styles.choiceGrid}>
                {modeChoices.map((item) => (
                  <ChoiceCard
                    key={item.id}
                    icon={item.icon}
                    title={item.title}
                    selected={selectedMode === item.id}
                    onPress={() => setSelectedMode(item.id)}
                  />
                ))}
              </View>
            </View>

            <View style={styles.sectionSpacing}>
              <Text weight="600" style={styles.sectionTitle}>
                {t("matching.question.urgency.title")}
              </Text>
              <View style={styles.choiceGrid}>
                {urgencyChoices.map((item) => (
                  <ChoiceCard
                    key={item.id}
                    icon={item.icon}
                    title={item.title}
                    selected={selectedUrgency === item.id}
                    onPress={() => setSelectedUrgency(item.id)}
                  />
                ))}
              </View>
            </View>

            <View style={styles.sectionSpacing}>
              <Text weight="600" style={styles.sectionTitle}>
                {t("matching.question.concern.title")}
              </Text>
              <View
                style={[
                  styles.concernInputWrap,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.borderStrong,
                  },
                ]}
              >
                <TextInput
                  value={primaryConcern}
                  onChangeText={setPrimaryConcern}
                  multiline
                  numberOfLines={4}
                  maxLength={200}
                  style={[
                    styles.concernInput,
                    {
                      color: theme.colors.textPrimary,
                    },
                  ]}
                  placeholder={t("matching.question.concern.placeholder")}
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>
            </View>

            {errorText ? (
              <Text color="#dc2626" style={styles.errorText}>
                {errorText}
              </Text>
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            <Button
              title={t("matching.question.next")}
              onPress={handleSubmit}
              style={styles.primaryButton}
            />
          </View>
        </>
      )}
    </Screen>
  );
}

function ChoiceCard({
  icon,
  title,
  subtitle,
  selected,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[
        styles.choiceCard,
        {
          borderColor: selected
            ? theme.colors.primary
            : theme.colors.borderLight,
          backgroundColor: selected
            ? theme.colors.primaryLight
            : theme.colors.surface,
        },
      ]}
    >
      <View style={styles.choiceHeader}>
        <Ionicons name={icon} size={24} color={theme.colors.primary} />
        {selected ? (
          <Ionicons
            name="checkmark-circle"
            size={22}
            color={theme.colors.primary}
          />
        ) : null}
      </View>

      <Text weight="600" style={styles.choiceTitle}>
        {title}
      </Text>
      {subtitle ? (
        <Text color={theme.colors.textSecondary} style={styles.choiceSubtitle}>
          {subtitle}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  progressContainer: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 14,
  },
  progressMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 7,
  },
  progressText: {
    fontSize: 13,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    width: "100%",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 28,
  },
  questionText: {
    fontSize: 36,
    lineHeight: 48,
    marginBottom: 10,
  },
  questionSubtext: {
    fontSize: 18,
    lineHeight: 30,
  },
  sectionSpacing: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 19,
    marginBottom: 12,
  },
  choiceGrid: {
    gap: 12,
  },
  choiceCard: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  choiceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  choiceTitle: {
    fontSize: 22,
    lineHeight: 30,
  },
  choiceSubtitle: {
    marginTop: 4,
    fontSize: 16,
    lineHeight: 25,
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  chipText: {
    fontSize: 15,
  },
  concernInputWrap: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  concernInput: {
    minHeight: 102,
    textAlignVertical: "top",
    fontSize: 16,
    lineHeight: 24,
  },
  errorText: {
    marginTop: 18,
    fontSize: 13,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: "#e3e7ef",
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 22,
    backgroundColor: "#ffffffee",
  },
  primaryButton: {
    borderRadius: 14,
    paddingVertical: 16,
  },
});

