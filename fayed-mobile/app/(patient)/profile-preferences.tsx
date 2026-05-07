import React, { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Header,
  Screen,
  Card,
  Text,
  Input,
  Button,
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
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card
          variant="elevated"
          style={[
            styles.card,
            { borderWidth: 1, borderColor: theme.colors.borderLight },
          ]}
        >
          <Text weight="bold" style={styles.cardTitle}>
            {t("profileScreen.preferences.languageTitle")}
          </Text>
          <Text color={theme.colors.textSecondary} style={styles.bodyText}>
            {t("profileScreen.preferences.languageBody")}
          </Text>
          <View style={styles.choiceWrap}>
            {(["ar", "en"] as const).map((value) => {
              const selected = selectedLanguage === value;
              return (
                <TouchableOpacity
                  key={value}
                  activeOpacity={0.85}
                  style={[
                    styles.choiceButton,
                    {
                      borderColor: selected
                        ? theme.colors.primary
                        : theme.colors.borderLight,
                      backgroundColor: selected
                        ? theme.colors.primaryLight
                        : theme.colors.surface,
                    },
                  ]}
                  onPress={() => setSelectedLanguage(value)}
                >
                  <Text
                    weight={selected ? "600" : "500"}
                    color={
                      selected ? theme.colors.primary : theme.colors.textPrimary
                    }
                  >
                    {t(`profileScreen.language.options.${value}`)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        <Card
          variant="elevated"
          style={[
            styles.card,
            { borderWidth: 1, borderColor: theme.colors.borderLight },
          ]}
        >
          <Text weight="bold" style={styles.cardTitle}>
            {t("profileScreen.preferences.timezoneTitle")}
          </Text>
          <Text color={theme.colors.textSecondary} style={styles.bodyText}>
            {t("profileScreen.preferences.timezoneBody")}
          </Text>
          <View style={styles.formSpacer}>
            <Input
              label={t("profileScreen.details.fields.timezone")}
              value={timezone}
              placeholder={t("profileScreen.preferences.timezonePlaceholder")}
              onChangeText={setTimezone}
            />
          </View>
        </Card>

        <Card
          variant="elevated"
          style={[
            styles.card,
            { borderWidth: 1, borderColor: theme.colors.borderLight },
          ]}
        >
          <Text weight="bold" style={styles.cardTitle}>
            {t("profileScreen.preferences.boundaryTitle")}
          </Text>
          <Text color={theme.colors.textSecondary} style={styles.bodyText}>
            {t("profileScreen.preferences.boundaryBody")}
          </Text>
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
    gap: 10,
  },
  cardTitle: {
    fontSize: 18,
    marginBottom: 4,
  },
  bodyText: {
    fontSize: 13,
    lineHeight: 20,
  },
  choiceWrap: {
    marginTop: 12,
    flexDirection: "row",
    gap: 10,
  },
  choiceButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  formSpacer: {
    marginTop: 12,
  },
});
