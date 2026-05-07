import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
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
import { useAuth } from "../../src/providers/AuthProvider";
import { useTheme } from "../../src/providers/ThemeProvider";
import { useTranslation } from "react-i18next";
import {
  usePatchPatientProfile,
  usePatientProfile,
} from "../../src/features/patient/profile/hooks";
import {
  formatProfileDate,
  getInitials,
  isValidCountryCode,
  isValidDateOfBirth,
  normalizeCountryCode,
  normalizeDateOfBirth,
} from "../../src/features/patient/profile/account-utils";
import { extractApiErrorMessage } from "../../src/lib/api";

type GenderValue = "male" | "female" | "";

export default function PatientProfileDetailsScreen() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const profileQuery = usePatientProfile();
  const patchProfile = usePatchPatientProfile();
  const profile = profileQuery.data?.profile;

  const [form, setForm] = useState({
    displayName: "",
    dateOfBirth: "",
    gender: "" as GenderValue,
    countryCode: "",
  });

  useEffect(() => {
    if (!profile) {
      return;
    }

    setForm({
      displayName: profile.displayName ?? user?.displayName ?? "",
      dateOfBirth: profile.dateOfBirth ? profile.dateOfBirth.slice(0, 10) : "",
      gender: (profile.gender as GenderValue | null) ?? "",
      countryCode: profile.countryCode ?? "",
    });
  }, [profile, user?.displayName]);

  const avatarUri = profile?.avatarDataUrl ?? profile?.avatarUrl ?? null;
  const displayName =
    form.displayName.trim() ||
    user?.displayName ||
    t("profileScreen.fallbackName");
  const initials = useMemo(() => getInitials(displayName), [displayName]);

  const save = async () => {
    const normalizedCountryCode = normalizeCountryCode(form.countryCode);
    const normalizedDateOfBirth = normalizeDateOfBirth(form.dateOfBirth);

    if (!isValidCountryCode(normalizedCountryCode)) {
      Alert.alert(
        t("profileScreen.details.invalidCountryTitle"),
        t("profileScreen.details.invalidCountryBody"),
      );
      return;
    }

    if (!isValidDateOfBirth(normalizedDateOfBirth)) {
      Alert.alert(
        t("profileScreen.details.invalidBirthDateTitle"),
        t("profileScreen.details.invalidBirthDateBody"),
      );
      return;
    }

    try {
      const allCoreFieldsFilled = Boolean(
        form.displayName.trim() && normalizedDateOfBirth && form.gender,
      );

      await patchProfile.mutateAsync({
        displayName: form.displayName.trim() || undefined,
        dateOfBirth: normalizedDateOfBirth,
        gender: form.gender || null,
        countryCode: normalizedCountryCode,
        ...(allCoreFieldsFilled && !profile?.isOnboardingCompleted
          ? { completeOnboarding: true }
          : {}),
      });

      Alert.alert(
        t("profileScreen.details.savedTitle"),
        t("profileScreen.details.savedBody"),
      );
    } catch (error) {
      Alert.alert(
        t("profileScreen.common.saveFailedTitle"),
        extractApiErrorMessage(error) ||
          t("profileScreen.details.saveFailedBody"),
      );
    }
  };

  return (
    <Screen bg="background">
      <Header title={t("profileScreen.details.screenTitle")} showBack />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card
          variant="elevated"
          style={[
            styles.card,
            { borderWidth: 1, borderColor: theme.colors.borderLight },
          ]}
        >
          <View style={styles.heroRow}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <View
                style={[
                  styles.avatarFallback,
                  { backgroundColor: theme.colors.primaryLight },
                ]}
              >
                <Text
                  weight="bold"
                  style={[styles.avatarText, { color: theme.colors.primary }]}
                >
                  {initials}
                </Text>
              </View>
            )}
            <View style={styles.heroTextWrap}>
              <Text weight="bold" style={styles.cardTitle}>
                {t("profileScreen.details.avatar.title")}
              </Text>
              <Text color={theme.colors.textSecondary} style={styles.bodyText}>
                {t("profileScreen.details.avatar.body")}
              </Text>
              <Text color={theme.colors.textSecondary} style={styles.metaText}>
                {formatProfileDate(profile?.updatedAt, i18n.language)
                  ? t("profileScreen.details.avatar.updatedAt", {
                      date: formatProfileDate(
                        profile?.updatedAt,
                        i18n.language,
                      ),
                    })
                  : t("profileScreen.none")}
              </Text>
            </View>
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
            {t("profileScreen.details.formTitle")}
          </Text>
          <Text color={theme.colors.textSecondary} style={styles.bodyText}>
            {t("profileScreen.details.formBody")}
          </Text>
          <View style={styles.formSpacer}>
            <Input
              label={t("profileScreen.details.fields.displayName")}
              value={form.displayName}
              onChangeText={(displayName) =>
                setForm((current) => ({ ...current, displayName }))
              }
            />
            <Input
              label={t("profileScreen.details.fields.dateOfBirth")}
              value={form.dateOfBirth}
              placeholder={t(
                "profileScreen.details.fields.dateOfBirthPlaceholder",
              )}
              onChangeText={(dateOfBirth) =>
                setForm((current) => ({ ...current, dateOfBirth }))
              }
            />
            <Text
              weight="500"
              color={theme.colors.textSecondary}
              style={styles.fieldLabel}
            >
              {t("profileScreen.details.fields.gender")}
            </Text>
            <View style={styles.choiceWrap}>
              {(["male", "female", ""] as const).map((value) => {
                const selected = form.gender === value;
                const label =
                  value === "male"
                    ? t("profileScreen.details.genderOptions.male")
                    : value === "female"
                      ? t("profileScreen.details.genderOptions.female")
                      : t("profileScreen.details.genderOptions.unspecified");

                return (
                  <TouchableOpacity
                    key={value || "unspecified"}
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
                    onPress={() =>
                      setForm((current) => ({ ...current, gender: value }))
                    }
                  >
                    <Text
                      weight={selected ? "600" : "500"}
                      color={
                        selected
                          ? theme.colors.primary
                          : theme.colors.textPrimary
                      }
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Input
              label={t("profileScreen.details.fields.countryCode")}
              value={form.countryCode}
              placeholder={t(
                "profileScreen.details.fields.countryCodePlaceholder",
              )}
              autoCapitalize="characters"
              maxLength={3}
              onChangeText={(countryCode) =>
                setForm((current) => ({ ...current, countryCode }))
              }
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
            {t("profileScreen.details.accountTitle")}
          </Text>
          <Text color={theme.colors.textSecondary} style={styles.bodyText}>
            {t("profileScreen.details.accountBody")}
          </Text>
          <View style={styles.accountRow}>
            <View style={styles.accountItem}>
              <Text
                color={theme.colors.textSecondary}
                style={styles.accountLabel}
              >
                {t("profileScreen.details.readOnly.email")}
              </Text>
              <Text weight="600">
                {user?.primaryEmail || t("profileScreen.fallbackEmail")}
              </Text>
            </View>
            <View style={styles.accountItem}>
              <Text
                color={theme.colors.textSecondary}
                style={styles.accountLabel}
              >
                {t("profileScreen.details.readOnly.phone")}
              </Text>
              <Text weight="600">
                {user?.primaryPhone || t("profileScreen.none")}
              </Text>
            </View>
          </View>
          <Text color={theme.colors.textSecondary} style={styles.metaText}>
            {t("profileScreen.details.readOnly.note")}
          </Text>
        </Card>

        <Button
          title={
            patchProfile.isPending
              ? t("profileScreen.common.saving")
              : t("profileScreen.common.save")
          }
          onPress={save}
          disabled={patchProfile.isPending || profileQuery.isLoading}
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
  heroRow: {
    flexDirection: "row",
    gap: 14,
  },
  heroTextWrap: {
    flex: 1,
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  avatarFallback: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 24,
  },
  cardTitle: {
    fontSize: 18,
    marginBottom: 4,
  },
  bodyText: {
    fontSize: 13,
    lineHeight: 20,
  },
  metaText: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 18,
  },
  formSpacer: {
    marginTop: 12,
    gap: 16,
  },
  fieldLabel: {
    marginBottom: 8,
    fontSize: 14,
  },
  choiceWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  choiceButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  accountRow: {
    gap: 12,
    marginTop: 10,
  },
  accountItem: {
    gap: 4,
  },
  accountLabel: {
    fontSize: 12,
  },
});
