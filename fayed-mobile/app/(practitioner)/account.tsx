import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import {
  Button,
  Card,
  ErrorState,
  Header,
  Input,
  LoadingState,
  Screen,
  StatusBadge,
  Text,
} from "../../src/components/ui";
import { useAuth } from "../../src/providers/AuthProvider";
import { useTheme } from "../../src/providers/ThemeProvider";
import {
  usePractitionerApplicationStatus,
  usePractitionerProfile,
  usePractitionerReadiness,
  useUpdatePractitionerProfile,
} from "../../src/features/practitioner/profile/hooks";
import type { PractitionerProfile, UpdatePractitionerProfileRequest } from "../../src/features/practitioner/profile/types";
import {
  applicationTone,
  formatDate,
  formatDateTime,
  getInitials,
  payoutSummary,
  profileTone,
  readinessTone,
} from "../../src/features/practitioner/profile/utils";

type FormState = {
  displayName: string;
  professionalTitle: string;
  bio: string;
  countryCode: string;
  yearsOfExperience: string;
  practitionerType: string;
  practitionerGender: string;
  locale: string;
  timezone: string;
  languageCodes: string;
};

const PRACTITIONER_TYPES = [
  "PSYCHOLOGIST",
  "PSYCHIATRIST",
  "NUTRITIONIST",
  "WEIGHT_LOSS_SPECIALIST",
  "COUNSELOR",
  "OTHER",
] as const;

const GENDERS = ["MALE", "FEMALE"] as const;
const LANGUAGES = ["ar", "en"] as const;

function formatStatusLabel(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part[0] + part.slice(1).toLowerCase())
    .join(" ");
}

export default function PractitionerAccountScreen() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const { user, signOut } = useAuth();

  const profileQuery = usePractitionerProfile();
  const readinessQuery = usePractitionerReadiness();
  const applicationQuery = usePractitionerApplicationStatus();
  const updateProfile = useUpdatePractitionerProfile();

  const profile = profileQuery.data?.profile ?? null;
  const readiness = readinessQuery.data?.readiness ?? null;
  const application = applicationQuery.data?.application ?? null;

  const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US";

  const [form, setForm] = useState<FormState>({
    displayName: "",
    professionalTitle: "",
    bio: "",
    countryCode: "",
    yearsOfExperience: "",
    practitionerType: "",
    practitionerGender: "",
    locale: "",
    timezone: "",
    languageCodes: "",
  });
  const [showAdvancedFields, setShowAdvancedFields] = useState(false);
  const [showMoreDetails, setShowMoreDetails] = useState(false);

  useEffect(() => {
    if (!profile) {
      return;
    }

    setForm({
      displayName: profile.displayName ?? "",
      professionalTitle: profile.professionalTitle ?? "",
      bio: profile.bio ?? "",
      countryCode: profile.countryCode ?? "",
      yearsOfExperience:
        profile.yearsOfExperience !== null && profile.yearsOfExperience !== undefined
          ? String(profile.yearsOfExperience)
          : "",
      practitionerType: profile.practitionerType ?? "",
      practitionerGender: profile.practitionerGender ?? "",
      locale: profile.locale ?? "",
      timezone: profile.timezone ?? "",
      languageCodes: profile.languages.join(", "),
    });
    setShowAdvancedFields(false);
    setShowMoreDetails(false);
  }, [profile]);

  const displayName =
    profile?.displayName?.trim() || user?.displayName?.trim() || t("practitioner.account.fallbackName");
  const title = profile?.professionalTitle?.trim() || t("practitioner.account.fallbackTitle");
  const initials = getInitials(displayName);
  const isBusy =
    profileQuery.isLoading || readinessQuery.isLoading || applicationQuery.isLoading;

  if (isBusy) {
    return (
      <Screen bg="background">
        <Header
          title={t("practitioner.account.title")}
          rightElement={
            <TouchableOpacity onPress={signOut} style={styles.headerAction}>
              <Ionicons name="log-out-outline" size={22} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          }
        />
        <LoadingState fullScreen message={t("practitioner.account.common.loading")} />
      </Screen>
    );
  }

  if (profileQuery.isError || !profile) {
    return (
      <Screen bg="background">
        <Header
          title={t("practitioner.account.title")}
          rightElement={
            <TouchableOpacity onPress={signOut} style={styles.headerAction}>
              <Ionicons name="log-out-outline" size={22} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          }
        />
        <ErrorState
          fullScreen
          title={t("practitioner.account.errorTitle")}
          message={t("practitioner.account.errorBody")}
          onRetry={profileQuery.refetch}
        />
      </Screen>
    );
  }

  const saveProfile = async () => {
    const payload = buildPayload(form, profile);

    if (!payload.displayName?.trim()) {
      Alert.alert(
        t("practitioner.account.validation.titleRequired"),
        t("practitioner.account.validation.titleRequiredBody"),
      );
      return;
    }

    if (payload.yearsOfExperience !== undefined && payload.yearsOfExperience !== null) {
      if (payload.yearsOfExperience < 0 || payload.yearsOfExperience > 80) {
        Alert.alert(
          t("practitioner.account.validation.yearsTitle"),
          t("practitioner.account.validation.yearsBody"),
        );
        return;
      }
    }

    try {
      await updateProfile.mutateAsync(payload);
      Alert.alert(
        t("practitioner.account.common.savedTitle"),
        t("practitioner.account.common.savedBody"),
      );
    } catch {
      Alert.alert(
        t("practitioner.account.common.saveFailedTitle"),
        t("practitioner.account.common.saveFailedBody"),
      );
    }
  };

  const currentPayout = payoutSummary(profile.payoutDestination);
  const currentStatusLabel = t(`practitioner.profileStatus.${profile.profileStatus}`);
  const applicationStatusLabel = application?.status
    ? t(`practitioner.account.applicationStatuses.${application.status}`, application.status)
    : t("practitioner.account.applicationStatuses.NONE");
  const readinessLabel = readiness?.canSubmitApplication
    ? t("practitioner.account.readiness.ready")
    : t("practitioner.account.readiness.notReady");
  const missingRequirementsCount = readiness?.missingRequirements.length ?? 0;
  const nextStepLabel = readiness?.canSubmitApplication
    ? t("practitioner.account.nextStepReady")
    : missingRequirementsCount > 0
      ? t("practitioner.account.nextStepMissing", { count: missingRequirementsCount })
      : t("practitioner.account.nextStepNotReady");
  const primarySpecialty =
    profile.specialties.find((item) => item.isPrimary) ?? profile.specialties[0] ?? null;
  const accountStatusLabel = formatStatusLabel(user?.status);

  return (
    <Screen bg="background">
      <Header
        title={t("practitioner.account.title")}
        rightElement={
          <TouchableOpacity onPress={signOut} style={styles.headerAction}>
            <Ionicons name="log-out-outline" size={22} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.content}>
        <Card variant="elevated" padding="lg" style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.avatarWrap}>
              {profile.avatarUrl ? (
                <Image source={{ uri: profile.avatarUrl }} style={styles.avatarImage} />
              ) : (
                <View style={[styles.avatar, { backgroundColor: theme.colors.primaryLight }]}>
                  <Text weight="bold" style={[styles.avatarText, { color: theme.colors.primary }]}>
                    {initials}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.heroTextWrap}>
              <Text weight="bold" style={styles.heroTitle}>
                {displayName}
              </Text>
              <Text color={theme.colors.textSecondary} style={styles.heroSubtitle}>
                {title}
              </Text>
              <Text color={theme.colors.textMuted} style={styles.heroMeta}>
                {primarySpecialty?.title ?? primarySpecialty?.slug ?? t("practitioner.account.specialtyFallback")}
              </Text>
            </View>
          </View>

          <View style={styles.badgeRow}>
            <StatusBadge label={currentStatusLabel} status={profileTone(profile.profileStatus)} />
            <StatusBadge label={readinessLabel} status={readinessTone(readiness)} />
            <StatusBadge label={applicationStatusLabel} status={applicationTone(application)} />
          </View>

          <View style={styles.heroSummary}>
            <SummaryRow label={t("practitioner.account.summary.nextStep")} value={nextStepLabel} />
            <SummaryRow label={t("practitioner.account.summary.payout")} value={currentPayout} />
            <SummaryRow label={t("practitioner.account.summary.account")} value={accountStatusLabel} />
          </View>
        </Card>

        <Card variant="outlined" padding="lg">
          <View style={styles.sectionHeaderBlock}>
            <Text weight="600" style={styles.sectionTitle}>
              {t("practitioner.account.editTitle")}
            </Text>
            <Text color={theme.colors.textSecondary} style={styles.sectionSubtitle}>
              {t("practitioner.account.editSubtitle")}
            </Text>
          </View>

          <Input
            label={t("practitioner.account.fields.displayName")}
            value={form.displayName}
            onChangeText={(value) => setForm((current) => ({ ...current, displayName: value }))}
            placeholder={t("practitioner.account.placeholders.displayName")}
          />
          <Input
            label={t("practitioner.account.fields.professionalTitle")}
            value={form.professionalTitle}
            onChangeText={(value) => setForm((current) => ({ ...current, professionalTitle: value }))}
            placeholder={t("practitioner.account.placeholders.professionalTitle")}
          />
          <Input
            label={t("practitioner.account.fields.bio")}
            value={form.bio}
            onChangeText={(value) => setForm((current) => ({ ...current, bio: value }))}
            placeholder={t("practitioner.account.placeholders.bio")}
            multiline
            numberOfLines={4}
            style={styles.bioInput}
          />
          <Input
            label={t("practitioner.account.fields.timezone")}
            value={form.timezone}
            onChangeText={(value) => setForm((current) => ({ ...current, timezone: value }))}
            placeholder="Africa/Cairo"
          />
          <Input
            label={t("practitioner.account.fields.countryCode")}
            value={form.countryCode}
            onChangeText={(value) =>
              setForm((current) => ({ ...current, countryCode: value.toUpperCase() }))
            }
            placeholder="EG"
            autoCapitalize="characters"
            maxLength={3}
          />
          <Input
            label={t("practitioner.account.fields.yearsOfExperience")}
            value={form.yearsOfExperience}
            onChangeText={(value) =>
              setForm((current) => ({ ...current, yearsOfExperience: value.replace(/[^0-9]/g, "") }))
            }
            placeholder="10"
            keyboardType="number-pad"
          />

          <TouchableOpacity
            style={styles.secondaryToggle}
            activeOpacity={0.85}
            onPress={() => setShowAdvancedFields((current) => !current)}
          >
            <View style={styles.secondaryToggleCopy}>
              <Text weight="600" style={styles.secondaryToggleTitle}>
                {showAdvancedFields
                  ? t("practitioner.account.moreFields.hide")
                  : t("practitioner.account.moreFields.show")}
              </Text>
              <Text color={theme.colors.textSecondary} style={styles.secondaryToggleSubtitle}>
                {t("practitioner.account.moreFields.subtitle")}
              </Text>
            </View>
            <Ionicons
              name={showAdvancedFields ? "chevron-up" : "chevron-down"}
              size={20}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>

          {showAdvancedFields ? (
            <View style={styles.advancedFields}>
              <ChoiceGroup
                label={t("practitioner.account.fields.locale")}
                value={form.locale}
                options={LANGUAGES.map((item) => ({
                  value: item,
                  label: t(`practitioner.account.language.${item}`),
                }))}
                onChange={(value) => setForm((current) => ({ ...current, locale: value }))}
              />

              <ChoiceGroup
                label={t("practitioner.account.fields.practitionerType")}
                value={form.practitionerType}
                options={PRACTITIONER_TYPES.map((item) => ({
                  value: item,
                  label: t(`practitioner.account.types.${item}`),
                }))}
                onChange={(value) => setForm((current) => ({ ...current, practitionerType: value }))}
              />

              <ChoiceGroup
                label={t("practitioner.account.fields.practitionerGender")}
                value={form.practitionerGender}
                options={GENDERS.map((item) => ({
                  value: item,
                  label: t(`practitioner.account.genders.${item}`),
                }))}
                onChange={(value) => setForm((current) => ({ ...current, practitionerGender: value }))}
              />

              <Input
                label={t("practitioner.account.fields.languageCodes")}
                value={form.languageCodes}
                onChangeText={(value) => setForm((current) => ({ ...current, languageCodes: value }))}
                placeholder={t("practitioner.account.placeholders.languageCodes")}
                helperText={t("practitioner.account.languageCodesHint")}
              />
            </View>
          ) : null}

          <View style={styles.payoutActions}>
            <Button
              title={t("practitioner.account.actions.save")}
              onPress={saveProfile}
              disabled={updateProfile.isPending}
            />
          </View>
        </Card>

        <Card variant="outlined" padding="lg">
          <TouchableOpacity
            onPress={() => setShowMoreDetails((current) => !current)}
            activeOpacity={0.85}
            style={styles.moreDetailsToggle}
          >
            <View style={styles.sectionHeaderTextBlock}>
              <Text weight="600" style={styles.sectionTitle}>
                {t("practitioner.account.moreDetails.title")}
              </Text>
              <Text color={theme.colors.textSecondary} style={styles.sectionSubtitle}>
                {t("practitioner.account.moreDetails.subtitle")}
              </Text>
            </View>
            <Ionicons
              name={showMoreDetails ? "chevron-up" : "chevron-down"}
              size={20}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>

          {showMoreDetails ? (
            <View style={styles.moreDetailsBody}>
              <View style={styles.detailBlock}>
                <Text weight="600" style={styles.subsectionTitle}>
                  {t("practitioner.account.moreDetails.profileTitle")}
                </Text>
                <View style={styles.detailList}>
                  <ListItem label={t("practitioner.account.fields.locale")} value={profile.locale} />
                  <ListItem
                    label={t("practitioner.account.fields.practitionerType")}
                    value={profile.practitionerType}
                  />
                  <ListItem
                    label={t("practitioner.account.fields.practitionerGender")}
                    value={profile.practitionerGender}
                  />
                  <ListItem
                    label={t("practitioner.account.fields.languages")}
                    value={profile.languages.length ? profile.languages.join(", ") : null}
                  />
                </View>
              </View>

              <View style={styles.detailBlock}>
                <Text weight="600" style={styles.subsectionTitle}>
                  {t("practitioner.account.moreDetails.payoutTitle")}
                </Text>
                <View style={styles.detailList}>
                  <ListItem
                    label={t("practitioner.account.fields.payoutMethodType")}
                    value={profile.payoutDestination?.methodType ?? null}
                  />
                  <ListItem
                    label={t("practitioner.account.fields.payoutDestination")}
                    value={currentPayout}
                  />
                </View>
                <Text color={theme.colors.textMuted} style={styles.noteText}>
                  {t("practitioner.account.payoutReadOnlyNote")}
                </Text>
              </View>

              <View style={styles.detailBlock}>
                <Text weight="600" style={styles.subsectionTitle}>
                  {t("practitioner.account.moreDetails.verificationTitle")}
                </Text>
                <View style={styles.badgeRow}>
                  <StatusBadge
                    label={
                      user?.isEmailVerified
                        ? t("practitioner.account.verifiedEmail")
                        : t("practitioner.account.unverifiedEmail")
                    }
                    status={user?.isEmailVerified ? "success" : "warning"}
                  />
                  <StatusBadge
                    label={
                      user?.isPhoneVerified
                        ? t("practitioner.account.verifiedPhone")
                        : t("practitioner.account.unverifiedPhone")
                    }
                    status={user?.isPhoneVerified ? "success" : "warning"}
                  />
                  <StatusBadge
                    label={
                      readiness?.checks?.isPractitionerOtpVerified
                        ? t("practitioner.account.otpVerified")
                        : t("practitioner.account.otpNotVerified")
                    }
                    status={readiness?.checks?.isPractitionerOtpVerified ? "success" : "warning"}
                  />
                  <StatusBadge
                    label={
                      readiness?.checks?.isAccountActive
                        ? t("practitioner.account.accountActive")
                        : t("practitioner.account.accountInactive")
                    }
                    status={readiness?.checks?.isAccountActive ? "success" : "warning"}
                  />
                </View>
                <View style={[styles.detailList, styles.detailListTopGap]}>
                  <ListItem
                    label={t("practitioner.account.fields.credentialSummary")}
                    value={t("practitioner.account.credentialsSummary", {
                      total: profile.credentialSummary.totalCredentials,
                      approved: profile.credentialSummary.approvedCount,
                      pending: profile.credentialSummary.pendingCount,
                    })}
                  />
                  <ListItem
                    label={t("practitioner.account.fields.createdAt")}
                    value={formatDate(profile.createdAt, locale)}
                  />
                  <ListItem
                    label={t("practitioner.account.fields.updatedAt")}
                    value={formatDateTime(profile.updatedAt, locale)}
                  />
                </View>
              </View>

              <View style={styles.detailBlock}>
                <Text weight="600" style={styles.subsectionTitle}>
                  {t("practitioner.account.specialtiesTitle")}
                </Text>
                <View style={styles.chipRow}>
                  {profile.specialties.length ? (
                    profile.specialties.map((item) => (
                      <StatusBadge
                        key={item.specialtyId}
                        label={`${item.title ?? item.slug}${item.isPrimary ? ` · ${t("practitioner.account.primary")}` : ""}`}
                        status={item.isPrimary ? "success" : "default"}
                      />
                    ))
                  ) : (
                    <Text color={theme.colors.textSecondary}>
                      {t("practitioner.account.specialtiesEmpty")}
                    </Text>
                  )}
                </View>
                <Text color={theme.colors.textMuted} style={styles.noteText}>
                  {t("practitioner.account.specialtiesNote")}
                </Text>
              </View>
            </View>
          ) : null}
        </Card>
      </ScrollView>
    </Screen>
  );
}

function buildPayload(form: FormState, profile: PractitionerProfile): UpdatePractitionerProfileRequest {
  const languages = form.languageCodes
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  const years = form.yearsOfExperience.trim();

  return {
    displayName: form.displayName.trim() || profile.displayName || undefined,
    professionalTitle: form.professionalTitle.trim() || undefined,
    bio: form.bio.trim() || undefined,
    countryCode: form.countryCode.trim().toUpperCase() || undefined,
    yearsOfExperience: years ? Number(years) : undefined,
    practitionerType: (form.practitionerType || undefined) as UpdatePractitionerProfileRequest["practitionerType"],
    practitionerGender: (form.practitionerGender || undefined) as UpdatePractitionerProfileRequest["practitionerGender"],
    locale: (form.locale || undefined) as "ar" | "en" | undefined,
    timezone: form.timezone.trim() || undefined,
    languageCodes: languages.length ? languages : undefined,
  };
}

function ListItem({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  const { theme } = useTheme();

  return (
    <View style={styles.listItem}>
      <Text color={theme.colors.textMuted} style={styles.listLabel}>
        {label}
      </Text>
      <Text weight="600" style={styles.listValue}>
        {value && String(value).trim() ? String(value) : "-"}
      </Text>
    </View>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const { theme } = useTheme();

  return (
    <View style={styles.summaryRow}>
      <Text color={theme.colors.textMuted} style={styles.summaryLabel}>
        {label}
      </Text>
      <Text weight="600" style={styles.summaryValue}>
        {value}
      </Text>
    </View>
  );
}

function ChoiceGroup({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  const { theme } = useTheme();

  return (
    <View style={styles.choiceSection}>
      <Text color={theme.colors.textSecondary} style={styles.choiceLabel}>
        {label}
      </Text>
      <View style={styles.choiceRow}>
        {options.map((option) => {
          const selected = value === option.value;

          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.choicePill,
                {
                  backgroundColor: selected ? theme.colors.primaryLight : theme.colors.surfaceSecondary,
                  borderColor: selected ? theme.colors.primary : theme.colors.borderLight,
                },
              ]}
              onPress={() => onChange(option.value)}
              activeOpacity={0.85}
            >
              <Text
                weight="600"
                style={styles.choiceText}
                color={selected ? theme.colors.primary : theme.colors.textPrimary}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerAction: {
    padding: 6,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 28,
    gap: 14,
  },
  heroCard: {
    gap: 14,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  avatarWrap: {
    width: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarText: {
    fontSize: 18,
  },
  heroTextWrap: {
    flex: 1,
    gap: 3,
  },
  heroTitle: {
    fontSize: 22,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  heroMeta: {
    fontSize: 12,
    lineHeight: 18,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  heroSummary: {
    gap: 10,
    marginTop: 2,
  },
  summaryRow: {
    gap: 4,
  },
  summaryLabel: {
    fontSize: 12,
  },
  summaryValue: {
    fontSize: 15,
    lineHeight: 22,
  },
  sectionHeaderBlock: {
    gap: 4,
    marginBottom: 12,
  },
  sectionHeaderTextBlock: {
    gap: 4,
  },
  sectionTitle: {
    fontSize: 18,
  },
  sectionSubtitle: {
    fontSize: 13,
    lineHeight: 20,
  },
  bioInput: {
    minHeight: 100,
    textAlignVertical: "top",
    paddingTop: 14,
  },
  secondaryToggle: {
    marginTop: 8,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  secondaryToggleCopy: {
    flex: 1,
    gap: 4,
  },
  secondaryToggleTitle: {
    fontSize: 14,
  },
  secondaryToggleSubtitle: {
    fontSize: 12,
    lineHeight: 18,
  },
  advancedFields: {
    gap: 4,
    marginTop: 4,
  },
  payoutActions: {
    gap: 10,
    marginTop: 10,
  },
  moreDetailsToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  moreDetailsBody: {
    marginTop: 16,
    gap: 18,
  },
  detailBlock: {
    gap: 12,
  },
  subsectionTitle: {
    fontSize: 15,
  },
  detailList: {
    gap: 12,
  },
  detailListTopGap: {
    marginTop: 10,
  },
  listItem: {
    gap: 4,
    paddingVertical: 2,
  },
  listLabel: {
    fontSize: 12,
  },
  listValue: {
    fontSize: 15,
    lineHeight: 21,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  noteText: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 18,
  },
  choiceSection: {
    marginBottom: 16,
    gap: 12,
  },
  choiceLabel: {
    fontSize: 13,
  },
  choiceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  choicePill: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  choiceText: {
    fontSize: 13,
  },
});
