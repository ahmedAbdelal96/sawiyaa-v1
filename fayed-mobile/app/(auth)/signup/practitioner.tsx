import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { AuthScaffold } from "../../../src/components/auth/AuthScaffold";
import { Button, Input, Text } from "../../../src/components/ui";
import { useAuth } from "../../../src/providers/AuthProvider";
import { useTheme } from "../../../src/providers/ThemeProvider";
import { useTranslation } from "react-i18next";
import { extractApiErrorMessage } from "../../../src/lib/api";
import {
  listSpecialties,
  listSpecialtyCategories,
} from "../../../src/features/specialties/api";
import type {
  Specialty,
  SpecialtyCategory,
} from "../../../src/features/specialties/contracts";
import type { PractitionerRegisterRequest } from "../../../src/features/auth/contracts";

const PRACTITIONER_TYPES: Array<
  NonNullable<PractitionerRegisterRequest["practitionerType"]>
> = [
  "PSYCHOLOGIST",
  "PSYCHIATRIST",
  "NUTRITIONIST",
  "WEIGHT_LOSS_SPECIALIST",
  "COUNSELOR",
  "OTHER",
];

function validateEmail(email: string) {
  return /\S+@\S+\.\S+/.test(email.trim());
}

export default function PractitionerSignUpScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { signUpPractitioner } = useAuth();

  const [categories, setCategories] = useState<SpecialtyCategory[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [isCatalogLoading, setIsCatalogLoading] = useState(true);

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [otpEmail, setOtpEmail] = useState("");
  const [password, setPassword] = useState("");
  const [professionalTitle, setProfessionalTitle] = useState("");
  const [bio, setBio] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [yearsOfExperience, setYearsOfExperience] = useState("");
  const [practitionerType, setPractitionerType] =
    useState<PractitionerRegisterRequest["practitionerType"]>();
  const [primarySpecialtyCategoryId, setPrimarySpecialtyCategoryId] =
    useState("");
  const [selectedSpecialtyIds, setSelectedSpecialtyIds] = useState<string[]>(
    [],
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [successText, setSuccessText] = useState<string | null>(null);

  useEffect(() => {
    async function loadCatalog() {
      setIsCatalogLoading(true);
      try {
        const [categoryResponse, specialtyResponse] = await Promise.all([
          listSpecialtyCategories(),
          listSpecialties(),
        ]);
        setCategories(categoryResponse.categories);
        setSpecialties(specialtyResponse.specialties);
      } catch (error) {
        setErrorText(extractApiErrorMessage(error));
      } finally {
        setIsCatalogLoading(false);
      }
    }

    void loadCatalog();
  }, []);

  const emailError = useMemo(() => {
    if (!email) {
      return null;
    }
    return validateEmail(email) ? null : t("auth.validation.email");
  }, [email, t]);

  const otpEmailError = useMemo(() => {
    if (!otpEmail) {
      return null;
    }
    return validateEmail(otpEmail) ? null : t("auth.validation.email");
  }, [otpEmail, t]);

  const visibleSpecialties = useMemo(
    () =>
      specialties.filter(
        (specialty) => specialty.category?.id === primarySpecialtyCategoryId,
      ),
    [primarySpecialtyCategoryId, specialties],
  );

  async function handleSubmit() {
    setIsSubmitting(true);
    setErrorText(null);
    setSuccessText(null);

    try {
      const response = await signUpPractitioner({
        displayName: displayName.trim() || undefined,
        email: email.trim(),
        otpEmail: otpEmail.trim() || undefined,
        password,
        professionalTitle: professionalTitle.trim() || undefined,
        bio: bio.trim() || undefined,
        countryCode: countryCode.trim().toUpperCase() || undefined,
        yearsOfExperience: yearsOfExperience
          ? Number(yearsOfExperience)
          : undefined,
        practitionerType,
        primarySpecialtyCategoryId,
        specialtyIds: selectedSpecialtyIds,
      });

      setSuccessText(response.message);
      router.replace("/(auth)/signin/practitioner");
    } catch (error) {
      setErrorText(extractApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  function toggleSpecialty(specialtyId: string) {
    setSelectedSpecialtyIds((current) =>
      current.includes(specialtyId)
        ? current.filter((item) => item !== specialtyId)
        : [...current, specialtyId],
    );
  }

  return (
    <AuthScaffold
      eyebrow={t("auth.practitionerSignUp.eyebrow")}
      title={t("auth.practitionerSignUp.title")}
      subtitle={t("auth.practitionerSignUp.subtitle")}
      footer={
        <TouchableOpacity
          onPress={() => router.replace("/(auth)/signin/practitioner")}
        >
          <Text color={theme.colors.textMuted} style={styles.backText}>
            {t("auth.common.backToPractitionerSignIn")}
          </Text>
        </TouchableOpacity>
      }
    >
      <Input
        autoCapitalize="words"
        label={t("auth.fields.displayName")}
        onChangeText={setDisplayName}
        placeholder={t("auth.placeholders.displayName")}
        value={displayName}
      />
      <Input
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        label={t("auth.fields.email")}
        onChangeText={setEmail}
        placeholder={t("auth.placeholders.email")}
        value={email}
        error={emailError ?? undefined}
      />
      <Input
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        label={t("auth.fields.otpEmail")}
        onChangeText={setOtpEmail}
        placeholder={t("auth.placeholders.otpEmail")}
        value={otpEmail}
        helperText={t("auth.practitionerSignUp.otpEmailHelper")}
        error={otpEmailError ?? undefined}
      />
      <Input
        autoCapitalize="none"
        autoComplete="password"
        label={t("auth.fields.password")}
        onChangeText={setPassword}
        placeholder={t("auth.placeholders.password")}
        secureTextEntry
        value={password}
      />
      <Input
        label={t("auth.fields.professionalTitle")}
        onChangeText={setProfessionalTitle}
        placeholder={t("auth.placeholders.professionalTitle")}
        value={professionalTitle}
      />
      <Input
        label={t("auth.fields.countryCode")}
        onChangeText={setCountryCode}
        placeholder={t("auth.placeholders.countryCode")}
        value={countryCode}
        autoCapitalize="characters"
      />
      <Input
        keyboardType="number-pad"
        label={t("auth.fields.yearsOfExperience")}
        onChangeText={setYearsOfExperience}
        placeholder={t("auth.placeholders.yearsOfExperience")}
        value={yearsOfExperience}
      />
      <Input
        label={t("auth.fields.bio")}
        multiline
        onChangeText={setBio}
        placeholder={t("auth.placeholders.bio")}
        value={bio}
        style={styles.multilineInput}
      />

      <Text
        weight="600"
        style={styles.sectionTitle}
        color={theme.colors.textPrimary}
      >
        {t("auth.practitionerSignUp.practitionerTypeTitle")}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {PRACTITIONER_TYPES.map((item) => {
          const selected = practitionerType === item;
          return (
            <TouchableOpacity
              key={item}
              onPress={() => setPractitionerType(item)}
              style={[
                styles.chip,
                {
                  backgroundColor: selected
                    ? theme.colors.primaryLight
                    : theme.colors.surfaceSecondary,
                  borderColor: selected
                    ? theme.colors.primary
                    : theme.colors.borderStrong,
                },
              ]}
            >
              <Text
                color={
                  selected ? theme.colors.textBrand : theme.colors.textPrimary
                }
                weight="600"
              >
                {t(`auth.practitionerTypes.${item}`)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Text
        weight="600"
        style={styles.sectionTitle}
        color={theme.colors.textPrimary}
      >
        {t("auth.practitionerSignUp.categoryTitle")}
      </Text>
      {isCatalogLoading ? (
        <ActivityIndicator
          color={theme.colors.primary}
          style={styles.catalogLoader}
        />
      ) : (
        <View style={styles.wrapList}>
          {categories.map((category) => {
            const selected = primarySpecialtyCategoryId === category.id;
            return (
              <TouchableOpacity
                key={category.id}
                onPress={() => {
                  setPrimarySpecialtyCategoryId(category.id);
                  setSelectedSpecialtyIds([]);
                }}
                style={[
                  styles.wrapChip,
                  {
                    backgroundColor: selected
                      ? theme.colors.primaryLight
                      : theme.colors.surfaceSecondary,
                    borderColor: selected
                      ? theme.colors.primary
                      : theme.colors.borderStrong,
                  },
                ]}
              >
                <Text
                  color={
                    selected ? theme.colors.textBrand : theme.colors.textPrimary
                  }
                  weight="600"
                >
                  {category.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <Text
        weight="600"
        style={styles.sectionTitle}
        color={theme.colors.textPrimary}
      >
        {t("auth.practitionerSignUp.specialtiesTitle")}
      </Text>
      <View style={styles.wrapList}>
        {visibleSpecialties.length === 0 ? (
          <Text color={theme.colors.textMuted}>
            {t("auth.practitionerSignUp.selectCategoryFirst")}
          </Text>
        ) : (
          visibleSpecialties.map((specialty) => {
            const selected = selectedSpecialtyIds.includes(specialty.id);
            return (
              <TouchableOpacity
                key={specialty.id}
                onPress={() => toggleSpecialty(specialty.id)}
                style={[
                  styles.wrapChip,
                  {
                    backgroundColor: selected
                      ? theme.colors.primaryLight
                      : theme.colors.surfaceSecondary,
                    borderColor: selected
                      ? theme.colors.primary
                      : theme.colors.borderStrong,
                  },
                ]}
              >
                <Text
                  color={
                    selected ? theme.colors.textBrand : theme.colors.textPrimary
                  }
                  weight="600"
                >
                  {specialty.name ?? specialty.slug}
                </Text>
              </TouchableOpacity>
            );
          })
        )}
      </View>

      {successText ? (
        <Text style={styles.successText} color="#15803d">
          {successText}
        </Text>
      ) : null}
      {errorText ? (
        <Text style={styles.errorText} color="#dc2626">
          {errorText}
        </Text>
      ) : null}

      <Button
        title={
          isSubmitting
            ? t("auth.common.pleaseWait")
            : t("auth.practitionerSignUp.submit")
        }
        onPress={() => void handleSubmit()}
        disabled={
          isSubmitting ||
          !email ||
          !password ||
          !primarySpecialtyCategoryId ||
          selectedSpecialtyIds.length === 0 ||
          Boolean(emailError) ||
          Boolean(otpEmailError)
        }
      />

      <View style={styles.rowWrap}>
        <Text color={theme.colors.textSecondary}>
          {t("auth.practitionerSignUp.haveAccount")}
        </Text>
        <TouchableOpacity
          onPress={() => router.replace("/(auth)/signin/practitioner")}
        >
          <Text color={theme.colors.textBrand} weight="600">
            {t("auth.practitionerSignUp.goToSignIn")}
          </Text>
        </TouchableOpacity>
      </View>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  multilineInput: {
    minHeight: 92,
    paddingTop: 14,
    textAlignVertical: "top",
  },
  sectionTitle: {
    fontSize: 15,
    marginTop: 8,
    marginBottom: 10,
  },
  chipRow: {
    gap: 10,
    paddingBottom: 6,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  wrapList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14,
  },
  wrapChip: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  catalogLoader: {
    marginBottom: 14,
  },
  errorText: {
    fontSize: 13,
    marginBottom: 12,
  },
  successText: {
    fontSize: 13,
    marginBottom: 12,
  },
  rowWrap: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 16,
  },
  backText: {
    fontSize: 13,
    textAlign: "center",
  },
});
