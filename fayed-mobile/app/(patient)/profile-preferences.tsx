import React, { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  Header,
  Screen,
  Card,
  Text,
  Input,
  Button,
  SegmentedControl,
} from "../../src/components/ui";
import { useTheme } from "../../src/providers/ThemeProvider";
import { useTranslation } from "react-i18next";
import { usePatientProfile } from "../../src/features/patient/profile/hooks";
import {
  useMySettings,
  usePatchMySettingsPreferences,
} from "../../src/features/settings/hooks";
import type { SettingsLocale } from "../../src/features/settings/types";
import { setAppLanguage } from "../../src/i18n";
import { useAppDirection } from "../../src/i18n/direction";
import { extractApiErrorMessage } from "../../src/lib/api";

export default function PatientProfilePreferencesScreen() {
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const profileQuery = usePatientProfile();
  const settingsQuery = useMySettings();
  const patchSettingsPreferences = usePatchMySettingsPreferences();

  const profile = profileQuery.data?.profile;
  const settings = settingsQuery.data?.item;
  const [selectedLanguage, setSelectedLanguage] = useState<SettingsLocale>(
    i18n.language.startsWith("ar") ? "ar" : "en",
  );
  const [timezone, setTimezone] = useState("");

  const { rowDirection } = useAppDirection();

  useEffect(() => {
    const nextLanguage = (settings?.preferences.locale ??
      profile?.locale ??
      (i18n.language.startsWith("ar") ? "ar" : "en")) as SettingsLocale;
    setSelectedLanguage(nextLanguage);
    setTimezone(
      settings?.preferences.timezone ??
        profile?.timezone ??
        Intl.DateTimeFormat().resolvedOptions().timeZone ??
        "",
    );
  }, [
    i18n.language,
    profile?.locale,
    profile?.timezone,
    settings?.preferences.locale,
    settings?.preferences.timezone,
  ]);

  const save = async () => {
    try {
      await patchSettingsPreferences.mutateAsync({
        locale: selectedLanguage,
        timezone: timezone.trim() || undefined,
      });

      const result = await setAppLanguage(selectedLanguage);

      if (result.requiresRestart) {
        Alert.alert(
          t("profileScreen.language.restartTitle"),
          t("profileScreen.language.restartBody"),
        );
      } else {
        Alert.alert(
          t("profileScreen.preferences.savedTitle"),
          t("profileScreen.preferences.savedBody"),
        );
      }
    } catch (error) {
      Alert.alert(
        t("profileScreen.common.saveFailedTitle"),
        extractApiErrorMessage(error) ||
          t("profileScreen.language.saveFailedBody"),
      );
    }
  };

  return (
    <Screen bg="background">
      <Header title={t("profileScreen.preferences.screenTitle")} showBack />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Language Selection Card */}
        <Card
          variant="elevated"
          style={styles.card}
          padding="none"
        >
          {/* Subtle gold accent indicator line at the top */}
          <View style={[styles.goldAccentLine, { backgroundColor: theme.colors.tertiary }]} />

          <View style={styles.cardInnerPadding}>
            <View style={[styles.cardHeaderRow, { flexDirection: rowDirection }]}>
              <Ionicons name="language-outline" size={20} color={theme.colors.primary} style={{ marginEnd: 8 }} />
              <Text weight="bold" style={styles.cardTitle} color={theme.colors.textPrimary}>
                {t("profileScreen.preferences.languageTitle")}
              </Text>
            </View>
            <Text color={theme.colors.textSecondary} style={styles.bodyText}>
              {t("profileScreen.preferences.languageBody")}
            </Text>
            <View style={styles.choiceWrap}>
              <SegmentedControl
                options={[
                  { key: "ar", label: t("profileScreen.language.options.ar") },
                  { key: "en", label: t("profileScreen.language.options.en") },
                ]}
                value={selectedLanguage}
                onChange={(val) => setSelectedLanguage(val as SettingsLocale)}
              />
            </View>
          </View>
        </Card>

        {/* Timezone Selection Card */}
        <Card
          variant="elevated"
          style={styles.card}
          padding="none"
        >
          {/* Subtle gold accent indicator line at the top */}
          <View style={[styles.goldAccentLine, { backgroundColor: theme.colors.tertiary }]} />

          <View style={styles.cardInnerPadding}>
            <View style={[styles.cardHeaderRow, { flexDirection: rowDirection }]}>
              <Ionicons name="time-outline" size={20} color={theme.colors.primary} style={{ marginEnd: 8 }} />
              <Text weight="bold" style={styles.cardTitle} color={theme.colors.textPrimary}>
                {t("profileScreen.preferences.timezoneTitle")}
              </Text>
            </View>
            
            {/* Informative calm green care tip, no harsh warnings */}
            <View
              style={[
                styles.infoNoteCard,
                {
                  backgroundColor: theme.colors.mintAccent,
                },
              ]}
            >
              <View style={[styles.infoNoteRow, { flexDirection: rowDirection }]}>
                <Ionicons name="sparkles-outline" size={16} color={theme.colors.primary} style={{ marginEnd: 8, marginTop: 2 }} />
                <Text color={theme.colors.textPrimary} style={styles.infoNoteText}>
                  {t("profileScreen.preferences.timezoneBody")}
                </Text>
              </View>
            </View>

            <View style={styles.formSpacer}>
              <Input
                label={t("profileScreen.details.fields.timezone")}
                value={timezone}
                placeholder={t("profileScreen.preferences.timezonePlaceholder")}
                onChangeText={setTimezone}
              />
            </View>
          </View>
        </Card>

        {/* Boundary Info Card - Warm Card layout */}
        <Card
          variant="elevated"
          style={[styles.warmCard, { backgroundColor: theme.colors.surface }]}
          padding="none"
        >
          {/* Subtle gold accent indicator line at the top */}
          <View style={[styles.goldAccentLine, { backgroundColor: theme.colors.tertiary }]} />

          <View style={styles.cardInnerPadding}>
            <View style={[styles.cardHeaderRow, { flexDirection: rowDirection }]}>
              <Ionicons name="shield-checkmark-outline" size={20} color={theme.colors.textSecondary} style={{ marginEnd: 8 }} />
              <Text weight="bold" style={styles.cardTitle} color={theme.colors.textPrimary}>
                {t("profileScreen.preferences.boundaryTitle")}
              </Text>
            </View>
            <Text color={theme.colors.textSecondary} style={styles.bodyText}>
              {t("profileScreen.preferences.boundaryBody")}
            </Text>
          </View>
        </Card>

        <Button
          title={
            patchSettingsPreferences.isPending
              ? t("profileScreen.common.saving")
              : t("profileScreen.common.save")
          }
          onPress={save}
          disabled={
            patchSettingsPreferences.isPending || settingsQuery.isLoading
          }
          style={styles.saveButton}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 120,
    gap: 14,
  },
  card: {
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8DED0",
    overflow: "hidden",
  },
  warmCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E8DED0",
    overflow: "hidden",
  },
  goldAccentLine: {
    height: 3,
    width: "100%",
  },
  cardInnerPadding: {
    padding: 16,
    gap: 12,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 16,
  },
  bodyText: {
    fontSize: 13,
    lineHeight: 20,
  },
  choiceWrap: {
    marginTop: 4,
    width: "100%",
  },
  formSpacer: {
    marginTop: 4,
  },
  infoNoteCard: {
    borderRadius: 12,
    padding: 12,
  },
  infoNoteRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  infoNoteText: {
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
  saveButton: {
    height: 52,
    borderRadius: 14,
    marginTop: 6,
  },
  rowRtl: {
    flexDirection: "row-reverse",
  },
  rowLtr: {
    flexDirection: "row",
  },
});
