import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  Button,
  Card,
  DetailPageScaffold,
  ErrorState,
  Input,
  LoadingState,
  StatusChip,
  SummaryRow,
  SectionHeader,
  Text,
} from "../../src/components/ui";
import { useTheme } from "../../src/providers/ThemeProvider";
import {
  usePractitionerApplicationStatus,
  usePractitionerProfile,
  usePractitionerReadiness,
  useUpdatePractitionerProfile,
} from "../../src/features/practitioner/profile/hooks";
import {
  usePractitionerOnboardingCredentials,
  usePractitionerOnboardingSpecialties,
  usePractitionerSpecialtyCatalog,
  useSubmitPractitionerApplication,
  useUpdatePractitionerSpecialties,
  useUploadPractitionerCredential,
} from "../../src/features/practitioner/onboarding";
import type {
  PractitionerCredential,
  PractitionerCredentialType,
  SubmitPractitionerApplicationRequest,
  UploadPractitionerCredentialRequest,
} from "../../src/features/practitioner/onboarding";
import {
  getLocalizedSpecialtyCategoryName,
  getLocalizedSpecialtyName,
} from "../../src/features/specialties/localized";
import {
  applicationTone,
  formatDate,
  formatDateTime,
  profileTone,
  readinessTone,
} from "../../src/features/practitioner/profile/utils";

type PricingForm = {
  sessionPrice30Egp: string;
  sessionPrice30Usd: string;
  sessionPrice60Egp: string;
  sessionPrice60Usd: string;
  acceptsPackage: boolean;
};

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function parseCurrencyInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const normalized = Number(trimmed.replace(/,/g, ""));
  return Number.isFinite(normalized) ? normalized : undefined;
}

function normalizeIsoDateInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function formatCredentialTypeLabel(value: PractitionerCredentialType, t: any) {
  return t(`practitioner.onboarding.credentialTypes.${value}`, value);
}

function credentialTone(status: PractitionerCredential["reviewStatus"]) {
  switch (status) {
    case "APPROVED":
      return "success" as const;
    case "PENDING":
      return "warning" as const;
    case "REJECTED":
    case "EXPIRED":
      return "error" as const;
    default:
      return "default" as const;
  }
}

function formatRequirementLabel(value: string) {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function specialtyLabel(specialty: {
  name?: string | null;
  nameAr?: string | null;
  nameEn?: string | null;
  title?: string | null;
  slug: string;
}, locale: string) {
  return specialty.title
    ?? getLocalizedSpecialtyName(
      {
        name: specialty.name ?? null,
        nameAr: specialty.nameAr ?? null,
        nameEn: specialty.nameEn ?? null,
        slug: specialty.slug,
      },
      locale,
    );
}

export default function PractitionerOnboardingWorkspaceScreen() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();

  const profileQuery = usePractitionerProfile();
  const readinessQuery = usePractitionerReadiness();
  const applicationQuery = usePractitionerApplicationStatus();
  const profileUpdate = useUpdatePractitionerProfile();
  const specialtiesQuery = usePractitionerOnboardingSpecialties();
  const credentialsQuery = usePractitionerOnboardingCredentials();
  const catalogQuery = usePractitionerSpecialtyCatalog();
  const updateSpecialties = useUpdatePractitionerSpecialties();
  const uploadCredential = useUploadPractitionerCredential();
  const submitApplication = useSubmitPractitionerApplication();

  const profile = profileQuery.data?.profile ?? null;
  const readiness = readinessQuery.data?.readiness ?? null;
  const application = applicationQuery.data?.application ?? null;
  const specialtyItems =
    specialtiesQuery.data?.specialties ?? profile?.specialties ?? [];
  const credentials = credentialsQuery.data?.credentials ?? [];
  const catalogCategories = catalogQuery.data?.categories ?? [];
  const catalogSpecialties = catalogQuery.data?.specialties ?? [];
  const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US";
  const pricing = profile?.pricing ?? {
    session30: { egp: null, usd: null },
    session60: { egp: null, usd: null },
  };

  const [pricingForm, setPricingForm] = useState<PricingForm>({
    sessionPrice30Egp: "",
    sessionPrice30Usd: "",
    sessionPrice60Egp: "",
    sessionPrice60Usd: "",
    acceptsPackage: false,
  });
  const [
    selectedPrimarySpecialtyCategoryId,
    setSelectedPrimarySpecialtyCategoryId,
  ] = useState("");
  const [selectedSpecialtyIds, setSelectedSpecialtyIds] = useState<string[]>(
    [],
  );
  const [credentialType, setCredentialType] =
    useState<PractitionerCredentialType>("LICENSE");
  const [credentialFileUrl, setCredentialFileUrl] = useState("");
  const [credentialExpiresAt, setCredentialExpiresAt] = useState("");

  const pricingInitialized = useRef(false);
  const specialtiesInitialized = useRef(false);

  useEffect(() => {
    if (!profile || pricingInitialized.current) {
      return;
    }

    pricingInitialized.current = true;
    setPricingForm({
      sessionPrice30Egp:
        pricing.session30.egp !== null && pricing.session30.egp !== undefined
          ? String(pricing.session30.egp)
          : "",
      sessionPrice30Usd:
        pricing.session30.usd !== null && pricing.session30.usd !== undefined
          ? String(pricing.session30.usd)
          : "",
      sessionPrice60Egp:
        pricing.session60.egp !== null && pricing.session60.egp !== undefined
          ? String(pricing.session60.egp)
          : "",
      sessionPrice60Usd:
        pricing.session60.usd !== null && pricing.session60.usd !== undefined
          ? String(pricing.session60.usd)
          : "",
      acceptsPackage: Boolean(profile.acceptsPackage),
    });
  }, [profile]);

  useEffect(() => {
    if (!profile || !catalogQuery.data || specialtiesInitialized.current) {
      return;
    }

    const currentSpecialtyIds = specialtyItems.map((item) => item.specialtyId);
    const currentCategoryId =
      profile.primarySpecialtyCategoryId ??
      catalogSpecialties.find((item) => currentSpecialtyIds.includes(item.id))
        ?.category?.id ??
      catalogCategories[0]?.id ??
      "";

    specialtiesInitialized.current = true;
    setSelectedPrimarySpecialtyCategoryId(currentCategoryId);
    setSelectedSpecialtyIds(currentSpecialtyIds);
  }, [
    catalogCategories,
    catalogQuery.data,
    catalogSpecialties,
    profile,
    specialtyItems,
  ]);

  const selectedCategory = catalogCategories.find(
    (item) => item.id === selectedPrimarySpecialtyCategoryId,
  );
  const visibleSpecialties = useMemo(
    () =>
      catalogSpecialties.filter(
        (item) => item.category?.id === selectedPrimarySpecialtyCategoryId,
      ),
    [catalogSpecialties, selectedPrimarySpecialtyCategoryId],
  );

  const selectedSpecialties = useMemo(
    () =>
      catalogSpecialties.filter((item) =>
        selectedSpecialtyIds.includes(item.id),
      ),
    [catalogSpecialties, selectedSpecialtyIds],
  );

  const currentProfileStatus = profile
    ? t(`practitioner.profileStatus.${profile.profileStatus}`)
    : null;
  const readinessLabel = readiness?.canSubmitApplication
    ? t("practitioner.account.readiness.ready")
    : t("practitioner.account.readiness.notReady");
  const applicationStatus =
    application?.status ?? profile?.applicationStatusSummary.status ?? null;
  const applicationLabel = applicationStatus
    ? t(
        `practitioner.account.applicationStatuses.${applicationStatus}`,
        applicationStatus,
      )
    : t("practitioner.account.applicationStatuses.NONE");
  const missingRequirements = readiness?.missingRequirements ?? [];
  const canSubmitApplication = Boolean(
    readiness?.canSubmitApplication &&
    profile &&
    selectedPrimarySpecialtyCategoryId &&
    selectedSpecialtyIds.length > 0,
  );
  const submitButtonLabel =
    applicationStatus === "SUBMITTED" ||
    applicationStatus === "UNDER_REVIEW" ||
    applicationStatus === "APPROVED"
      ? t("practitioner.onboarding.application.viewStatus")
      : t("practitioner.onboarding.application.submit");

  if (profileQuery.isLoading) {
    return (
      <DetailPageScaffold title={t("practitioner.onboarding.title")} showBack>
        <LoadingState
          fullScreen
          message={t("practitioner.onboarding.loading")}
        />
      </DetailPageScaffold>
    );
  }

  if (profileQuery.isError || !profile) {
    return (
      <DetailPageScaffold title={t("practitioner.onboarding.title")} showBack>
        <ErrorState
          fullScreen
          title={t("practitioner.onboarding.errorTitle")}
          message={t("practitioner.onboarding.errorBody")}
          retryText={t("practitioner.onboarding.retry")}
          onRetry={profileQuery.refetch}
        />
      </DetailPageScaffold>
    );
  }

  async function savePricing() {
    try {
      await profileUpdate.mutateAsync({
        sessionPrice30Egp: parseCurrencyInput(pricingForm.sessionPrice30Egp),
        sessionPrice30Usd: parseCurrencyInput(pricingForm.sessionPrice30Usd),
        sessionPrice60Egp: parseCurrencyInput(pricingForm.sessionPrice60Egp),
        sessionPrice60Usd: parseCurrencyInput(pricingForm.sessionPrice60Usd),
        acceptsPackage: pricingForm.acceptsPackage,
      });

      Alert.alert(
        t("practitioner.onboarding.pricing.savedTitle"),
        t("practitioner.onboarding.pricing.savedBody"),
      );
    } catch {
      Alert.alert(
        t("practitioner.onboarding.pricing.saveFailedTitle"),
        t("practitioner.onboarding.pricing.saveFailedBody"),
      );
    }
  }

  async function saveSpecialties() {
    if (
      !selectedPrimarySpecialtyCategoryId ||
      selectedSpecialtyIds.length === 0
    ) {
      Alert.alert(
        t("practitioner.onboarding.specialties.invalidTitle"),
        t("practitioner.onboarding.specialties.invalidBody"),
      );
      return;
    }

    try {
      await updateSpecialties.mutateAsync({
        primarySpecialtyCategoryId: selectedPrimarySpecialtyCategoryId,
        specialtyIds: selectedSpecialtyIds,
      });

      Alert.alert(
        t("practitioner.onboarding.specialties.savedTitle"),
        t("practitioner.onboarding.specialties.savedBody"),
      );
    } catch {
      Alert.alert(
        t("practitioner.onboarding.specialties.saveFailedTitle"),
        t("practitioner.onboarding.specialties.saveFailedBody"),
      );
    }
  }

  async function saveCredential() {
    const fileUrl = credentialFileUrl.trim();
    const expiresAt = normalizeIsoDateInput(credentialExpiresAt);

    if (!isValidHttpUrl(fileUrl)) {
      Alert.alert(
        t("practitioner.onboarding.credentials.invalidUrlTitle"),
        t("practitioner.onboarding.credentials.invalidUrlBody"),
      );
      return;
    }

    try {
      await uploadCredential.mutateAsync({
        credentialType,
        fileUrl,
        expiresAt,
      });

      setCredentialFileUrl("");
      setCredentialExpiresAt("");
      setCredentialType("LICENSE");
      Alert.alert(
        t("practitioner.onboarding.credentials.savedTitle"),
        t("practitioner.onboarding.credentials.savedBody"),
      );
    } catch {
      Alert.alert(
        t("practitioner.onboarding.credentials.saveFailedTitle"),
        t("practitioner.onboarding.credentials.saveFailedBody"),
      );
    }
  }

  async function submitWorkspaceApplication() {
    if (!profile) {
      return;
    }

    if (!canSubmitApplication) {
      Alert.alert(
        t("practitioner.onboarding.application.notReadyTitle"),
        t("practitioner.onboarding.application.notReadyBody"),
      );
      return;
    }

    const payload: SubmitPractitionerApplicationRequest = {
      displayName: profile.displayName ?? undefined,
      professionalTitle: profile.professionalTitle ?? undefined,
      bio: profile.bio ?? undefined,
      countryCode: profile.countryCode ?? undefined,
      yearsOfExperience: profile.yearsOfExperience ?? undefined,
      practitionerType:
        profile.practitionerType as SubmitPractitionerApplicationRequest["practitionerType"],
      practitionerGender:
        profile.practitionerGender as SubmitPractitionerApplicationRequest["practitionerGender"],
      sessionPrice30Egp: parseCurrencyInput(pricingForm.sessionPrice30Egp),
      sessionPrice30Usd: parseCurrencyInput(pricingForm.sessionPrice30Usd),
      sessionPrice60Egp: parseCurrencyInput(pricingForm.sessionPrice60Egp),
      sessionPrice60Usd: parseCurrencyInput(pricingForm.sessionPrice60Usd),
      locale: (profile.locale?.startsWith("ar") ? "ar" : "en") as "ar" | "en",
      timezone: profile.timezone ?? undefined,
      languageCodes: profile.languages,
      specialtySelection: {
        primarySpecialtyCategoryId: selectedPrimarySpecialtyCategoryId,
        specialtyIds: selectedSpecialtyIds,
      },
    };

    try {
      const result = await submitApplication.mutateAsync(payload);
      Alert.alert(
        t("practitioner.onboarding.application.submittedTitle"),
        result.message ||
          t("practitioner.onboarding.application.submittedBody"),
      );
    } catch {
      Alert.alert(
        t("practitioner.onboarding.application.submitFailedTitle"),
        t("practitioner.onboarding.application.submitFailedBody"),
      );
    }
  }

  return (
    <DetailPageScaffold
      title={t("practitioner.onboarding.title")}
      showBack
      loading={false}
      contentContainerStyle={styles.content}
    >
      <Card variant="elevated" padding="lg" style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <View style={styles.heroCopy}>
            <Text weight="bold" style={styles.heroTitle}>
              {t("practitioner.onboarding.heroTitle")}
            </Text>
            <Text
              color={theme.colors.textSecondary}
              style={styles.heroSubtitle}
            >
              {t("practitioner.onboarding.heroBody")}
            </Text>
          </View>
          <StatusChip
            label={
              currentProfileStatus ??
              t("practitioner.account.applicationStatuses.NONE")
            }
            tone={profileTone(profile.profileStatus)}
            showDot={false}
          />
        </View>

        <View style={styles.heroBadges}>
          <StatusChip
            label={readinessLabel}
            tone={readinessTone(readiness)}
            showDot={false}
          />
          <StatusChip
            label={applicationLabel}
            tone={applicationTone(application)}
            showDot={false}
          />
          <StatusChip
            label={
              profile.isProfileCompleted
                ? t("practitioner.account.readiness.complete")
                : t("practitioner.account.readiness.incomplete")
            }
            tone={profile.isProfileCompleted ? "success" : "warning"}
            showDot={false}
          />
        </View>

        <View style={styles.summaryGrid}>
          <SummaryRow
            label={t("practitioner.onboarding.summary.missingRequirements")}
            value={
              missingRequirements.length
                ? t("practitioner.onboarding.summary.missingCount", {
                    count: missingRequirements.length,
                  })
                : t("practitioner.onboarding.summary.noMissingRequirements")
            }
          />
          <SummaryRow
            label={t("practitioner.onboarding.summary.credentials")}
            value={t("practitioner.account.credentialsSummary", {
              total: profile.credentialSummary.totalCredentials,
              approved: profile.credentialSummary.approvedCount,
              pending: profile.credentialSummary.pendingCount,
            })}
          />
          <SummaryRow
            label={t("practitioner.onboarding.summary.specialties")}
            value={String(
              selectedSpecialties.length || profile.specialties.length,
            )}
          />
        </View>

        {missingRequirements.length ? (
          <View style={styles.missingWrap}>
            <Text
              weight="600"
              style={styles.sectionEyebrow}
              color={theme.colors.textSecondary}
            >
              {t("practitioner.onboarding.summary.missingTitle")}
            </Text>
            <View style={styles.chipWrap}>
              {missingRequirements.slice(0, 6).map((item) => (
                <StatusChip
                  key={item}
                  label={formatRequirementLabel(item)}
                  tone="warning"
                  showDot={false}
                />
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.heroActions}>
          <Button
            title={t("practitioner.onboarding.actions.submit")}
            onPress={() => void submitWorkspaceApplication()}
            disabled={
              submitApplication.isPending ||
              !canSubmitApplication ||
              profileQuery.isLoading ||
              profileUpdate.isPending ||
              updateSpecialties.isPending ||
              uploadCredential.isPending
            }
          />
          <Button
            variant="secondary"
            title={t("practitioner.onboarding.actions.openAccount")}
            onPress={() => router.push("/(practitioner)/account")}
          />
        </View>
      </Card>

      <Card variant="outlined" padding="lg">
        <SectionHeader
          title={t("practitioner.onboarding.pricing.title")}
          subtitle={t("practitioner.onboarding.pricing.subtitle")}
        />
        <Input
          label={t("practitioner.onboarding.pricing.fields.sessionPrice30Egp")}
          keyboardType="decimal-pad"
          value={pricingForm.sessionPrice30Egp}
          onChangeText={(value) =>
            setPricingForm((current) => ({
              ...current,
              sessionPrice30Egp: value,
            }))
          }
          placeholder="250"
        />
        <Input
          label={t("practitioner.onboarding.pricing.fields.sessionPrice30Usd")}
          keyboardType="decimal-pad"
          value={pricingForm.sessionPrice30Usd}
          onChangeText={(value) =>
            setPricingForm((current) => ({
              ...current,
              sessionPrice30Usd: value,
            }))
          }
          placeholder="8"
        />
        <Input
          label={t("practitioner.onboarding.pricing.fields.sessionPrice60Egp")}
          keyboardType="decimal-pad"
          value={pricingForm.sessionPrice60Egp}
          onChangeText={(value) =>
            setPricingForm((current) => ({
              ...current,
              sessionPrice60Egp: value,
            }))
          }
          placeholder="450"
        />
        <Input
          label={t("practitioner.onboarding.pricing.fields.sessionPrice60Usd")}
          keyboardType="decimal-pad"
          value={pricingForm.sessionPrice60Usd}
          onChangeText={(value) =>
            setPricingForm((current) => ({
              ...current,
              sessionPrice60Usd: value,
            }))
          }
          placeholder="15"
        />

        <View style={styles.switchRow}>
          <View style={styles.switchCopy}>
            <Text weight="600" style={styles.switchTitle}>
              {t("practitioner.onboarding.pricing.fields.acceptsPackage")}
            </Text>
            <Text
              color={theme.colors.textSecondary}
              style={styles.switchSubtitle}
            >
              {t("practitioner.onboarding.pricing.acceptsPackageHint")}
            </Text>
          </View>
          <Switch
            value={pricingForm.acceptsPackage}
            onValueChange={(value) =>
              setPricingForm((current) => ({
                ...current,
                acceptsPackage: value,
              }))
            }
          />
        </View>

        <Text color={theme.colors.textMuted} style={styles.noteText}>
          {t("practitioner.onboarding.pricing.note")}
        </Text>

        <Button
          title={
            profileUpdate.isPending
              ? t("practitioner.onboarding.actions.saving")
              : t("practitioner.onboarding.pricing.save")
          }
          onPress={() => void savePricing()}
          disabled={profileUpdate.isPending}
        />
      </Card>

      <Card variant="outlined" padding="lg">
        <SectionHeader
          title={t("practitioner.onboarding.specialties.title")}
          subtitle={t("practitioner.onboarding.specialties.subtitle")}
        />

        {catalogQuery.isLoading ? (
          <LoadingState message={t("practitioner.onboarding.catalogLoading")} />
        ) : catalogCategories.length === 0 ? (
          <Text color={theme.colors.textSecondary}>
            {t("practitioner.onboarding.specialties.catalogEmpty")}
          </Text>
        ) : (
          <>
            <Text
              weight="600"
              style={styles.sectionEyebrow}
              color={theme.colors.textSecondary}
            >
              {t("practitioner.onboarding.specialties.category")}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hScroll}
            >
              {catalogCategories.map((category) => {
                const selected =
                  selectedPrimarySpecialtyCategoryId === category.id;
                return (
                  <TouchableOpacity
                    key={category.id}
                    activeOpacity={0.85}
                    onPress={() => {
                      setSelectedPrimarySpecialtyCategoryId(category.id);
                      setSelectedSpecialtyIds((current) =>
                        current.filter((itemId) =>
                          catalogSpecialties.some(
                            (item) =>
                              item.id === itemId &&
                              item.category?.id === category.id,
                          ),
                        ),
                      );
                    }}
                    style={[
                      styles.choicePill,
                      {
                        backgroundColor: selected
                          ? theme.colors.primaryLight
                          : theme.colors.surfaceSecondary,
                        borderColor: selected
                          ? theme.colors.primary
                          : theme.colors.borderLight,
                      },
                    ]}
                  >
                    <Text
                      weight="600"
                      color={
                        selected
                          ? theme.colors.textBrand
                          : theme.colors.textPrimary
                      }
                    >
                      {getLocalizedSpecialtyCategoryName(category, i18n.language || "en")}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text
              weight="600"
              style={styles.sectionEyebrow}
              color={theme.colors.textSecondary}
            >
              {selectedCategory
                ? t("practitioner.onboarding.specialties.specialtiesIn", {
                    category: getLocalizedSpecialtyCategoryName(selectedCategory, i18n.language || "en"),
                  })
                : t("practitioner.onboarding.specialties.specialties")}
            </Text>
            <View style={styles.wrapList}>
              {visibleSpecialties.length ? (
                visibleSpecialties.map((specialty) => {
                  const selected = selectedSpecialtyIds.includes(specialty.id);
                  return (
                    <TouchableOpacity
                      key={specialty.id}
                      activeOpacity={0.85}
                      onPress={() =>
                        setSelectedSpecialtyIds((current) =>
                          current.includes(specialty.id)
                            ? current.filter((item) => item !== specialty.id)
                            : [...current, specialty.id],
                        )
                      }
                      style={[
                        styles.wrapChip,
                        {
                          backgroundColor: selected
                            ? theme.colors.primaryLight
                            : theme.colors.surfaceSecondary,
                          borderColor: selected
                            ? theme.colors.primary
                            : theme.colors.borderLight,
                        },
                      ]}
                    >
                      <Text
                        weight="600"
                        color={
                          selected
                            ? theme.colors.textBrand
                            : theme.colors.textPrimary
                        }
                      >
                        {specialtyLabel(specialty, i18n.language || "en")}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <Text color={theme.colors.textSecondary}>
                  {t("practitioner.onboarding.specialties.selectCategoryFirst")}
                </Text>
              )}
            </View>

            <View style={styles.selectedSummary}>
              <SummaryRow
                label={t(
                  "practitioner.onboarding.specialties.currentSelection",
                )}
                value={
                  selectedSpecialties.length
                    ? selectedSpecialties
                        .map((specialty) => specialtyLabel(specialty, i18n.language || "en"))
                        .join(", ")
                    : t("practitioner.onboarding.specialties.none")
                }
              />
            </View>

            <Text color={theme.colors.textMuted} style={styles.noteText}>
              {t("practitioner.onboarding.specialties.note")}
            </Text>
            <Button
              title={
                updateSpecialties.isPending
                  ? t("practitioner.onboarding.actions.saving")
                  : t("practitioner.onboarding.specialties.save")
              }
              onPress={() => void saveSpecialties()}
              disabled={
                updateSpecialties.isPending ||
                !selectedPrimarySpecialtyCategoryId ||
                selectedSpecialtyIds.length === 0
              }
            />
          </>
        )}
      </Card>

      {/* Required Documents Checklist */}
      <Card variant="outlined" padding="lg">
        <SectionHeader
          title={t("practitioner.onboarding.requiredDocuments.title")}
          subtitle={t("practitioner.onboarding.requiredDocuments.subtitle")}
        />

        <View style={styles.checklistContainer}>
          {/* National ID or Passport */}
          <View style={styles.checklistItem}>
            <Ionicons
              name={
                credentials.some(
                  (c) =>
                    (c.credentialType === "NATIONAL_ID" ||
                      c.credentialType === "PASSPORT") &&
                    c.reviewStatus === "APPROVED",
                )
                  ? "checkmark-circle"
                  : "ellipse-outline"
              }
              size={24}
              color={
                credentials.some(
                  (c) =>
                    (c.credentialType === "NATIONAL_ID" ||
                      c.credentialType === "PASSPORT") &&
                    c.reviewStatus === "APPROVED",
                )
                  ? theme.colors.primary
                  : theme.colors.textMuted
              }
            />
            <View style={styles.checklistItemContent}>
              <Text
                weight="500"
                color={theme.colors.textPrimary}
                style={styles.checklistItemLabel}
              >
                {t("practitioner.onboarding.requiredDocuments.idOrPassport")}
              </Text>
              <Text
                color={theme.colors.textMuted}
                style={styles.checklistItemHint}
              >
                {t(
                  "practitioner.onboarding.requiredDocuments.idOrPassportHint",
                )}
              </Text>
              {credentials.find(
                (c) =>
                  (c.credentialType === "NATIONAL_ID" ||
                    c.credentialType === "PASSPORT") &&
                  c.reviewStatus === "PENDING",
              ) && (
                <Text
                  color={theme.colors.textMuted}
                  style={styles.checklistItemStatus}
                >
                  ⏳{" "}
                  {t("practitioner.onboarding.requiredDocuments.pendingReview")}
                </Text>
              )}
            </View>
          </View>

          {/* Degree Certificate */}
          <View style={styles.checklistItem}>
            <Ionicons
              name={
                credentials.some(
                  (c) =>
                    c.credentialType === "DEGREE" &&
                    c.reviewStatus === "APPROVED",
                )
                  ? "checkmark-circle"
                  : "ellipse-outline"
              }
              size={24}
              color={
                credentials.some(
                  (c) =>
                    c.credentialType === "DEGREE" &&
                    c.reviewStatus === "APPROVED",
                )
                  ? theme.colors.primary
                  : theme.colors.textMuted
              }
            />
            <View style={styles.checklistItemContent}>
              <Text
                weight="500"
                color={theme.colors.textPrimary}
                style={styles.checklistItemLabel}
              >
                {t("practitioner.onboarding.requiredDocuments.degree")}
              </Text>
              <Text
                color={theme.colors.textMuted}
                style={styles.checklistItemHint}
              >
                {t("practitioner.onboarding.requiredDocuments.degreeHint")}
              </Text>
              {credentials.find(
                (c) =>
                  c.credentialType === "DEGREE" && c.reviewStatus === "PENDING",
              ) && (
                <Text
                  color={theme.colors.textMuted}
                  style={styles.checklistItemStatus}
                >
                  ⏳{" "}
                  {t("practitioner.onboarding.requiredDocuments.pendingReview")}
                </Text>
              )}
            </View>
          </View>
        </View>

        {!readiness?.isProfileCompleted && (
          <View
            style={[
              styles.warningBanner,
              { backgroundColor: theme.colors.warning + "15" },
            ]}
          >
            <Ionicons
              name="alert-circle"
              size={20}
              color={theme.colors.warning}
            />
            <Text color={theme.colors.warning} style={styles.warningBannerText}>
              {t("practitioner.onboarding.requiredDocuments.pendingWarning")}
            </Text>
          </View>
        )}
      </Card>

      <Card variant="outlined" padding="lg">
        <SectionHeader
          title={t("practitioner.onboarding.credentials.title")}
          subtitle={t("practitioner.onboarding.credentials.subtitle")}
        />

        <View style={styles.summaryGrid}>
          <SummaryRow
            label={t("practitioner.onboarding.credentials.total")}
            value={String(profile.credentialSummary.totalCredentials)}
          />
          <SummaryRow
            label={t("practitioner.onboarding.credentials.approved")}
            value={String(profile.credentialSummary.approvedCount)}
          />
          <SummaryRow
            label={t("practitioner.onboarding.credentials.pending")}
            value={String(profile.credentialSummary.pendingCount)}
          />
          <SummaryRow
            label={t("practitioner.onboarding.credentials.rejected")}
            value={String(profile.credentialSummary.rejectedCount)}
          />
        </View>

        {credentials.length ? (
          <View style={styles.credentialsList}>
            {credentials.map((item) => (
              <Card
                key={item.credentialId}
                variant="flat"
                padding="md"
                style={styles.credentialCard}
              >
                <View style={styles.credentialHeader}>
                  <View style={styles.credentialCopy}>
                    <Text weight="600" style={styles.credentialTitle}>
                      {formatCredentialTypeLabel(item.credentialType, t)}
                    </Text>
                    <Text
                      color={theme.colors.textSecondary}
                      style={styles.credentialMeta}
                    >
                      {item.fileUrl}
                    </Text>
                  </View>
                  <StatusChip
                    label={t(
                      `practitioner.onboarding.credentials.status.${item.reviewStatus}`,
                      item.reviewStatus,
                    )}
                    tone={credentialTone(item.reviewStatus)}
                    showDot={false}
                  />
                </View>
                <View style={styles.credentialFooter}>
                  <Text
                    color={theme.colors.textMuted}
                    style={styles.credentialMeta}
                  >
                    {t("practitioner.onboarding.credentials.uploadedAt", {
                      date: formatDateTime(item.uploadedAt, locale),
                    })}
                  </Text>
                  <Text
                    color={theme.colors.textMuted}
                    style={styles.credentialMeta}
                  >
                    {item.expiresAt
                      ? t("practitioner.onboarding.credentials.expiresAt", {
                          date: formatDate(item.expiresAt, locale),
                        })
                      : t("practitioner.onboarding.credentials.noExpiry")}
                  </Text>
                </View>
              </Card>
            ))}
          </View>
        ) : (
          <Text color={theme.colors.textSecondary}>
            {t("practitioner.onboarding.credentials.empty")}
          </Text>
        )}

        <View style={styles.credentialForm}>
          <SectionHeader
            title={t("practitioner.onboarding.credentials.addTitle")}
            subtitle={t("practitioner.onboarding.credentials.addSubtitle")}
          />
          <Text
            weight="600"
            style={styles.sectionEyebrow}
            color={theme.colors.textSecondary}
          >
            {t("practitioner.onboarding.credentials.type")}
          </Text>
          <View style={styles.wrapList}>
            {(
              [
                "LICENSE",
                "DEGREE",
                "CERTIFICATION",
                "NATIONAL_ID",
                "PASSPORT",
                "MEMBERSHIP",
                "OTHER",
              ] as PractitionerCredentialType[]
            ).map((item) => {
              const selected = credentialType === item;
              return (
                <TouchableOpacity
                  key={item}
                  activeOpacity={0.85}
                  onPress={() => setCredentialType(item)}
                  style={[
                    styles.wrapChip,
                    {
                      backgroundColor: selected
                        ? theme.colors.primaryLight
                        : theme.colors.surfaceSecondary,
                      borderColor: selected
                        ? theme.colors.primary
                        : theme.colors.borderLight,
                    },
                  ]}
                >
                  <Text
                    weight="600"
                    color={
                      selected
                        ? theme.colors.textBrand
                        : theme.colors.textPrimary
                    }
                  >
                    {formatCredentialTypeLabel(item, t)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Input
            label={t("practitioner.onboarding.credentials.fileUrl")}
            value={credentialFileUrl}
            onChangeText={setCredentialFileUrl}
            placeholder="https://..."
            helperText={t("practitioner.onboarding.credentials.fileUrlHint")}
            autoCapitalize="none"
          />
          <Input
            label={t("practitioner.onboarding.credentials.expiresAt")}
            value={credentialExpiresAt}
            onChangeText={setCredentialExpiresAt}
            placeholder="2026-04-25"
            helperText={t("practitioner.onboarding.credentials.expiresAtHint")}
            autoCapitalize="none"
          />
          <Button
            title={
              uploadCredential.isPending
                ? t("practitioner.onboarding.actions.saving")
                : t("practitioner.onboarding.credentials.save")
            }
            onPress={() => void saveCredential()}
            disabled={uploadCredential.isPending}
          />
        </View>
      </Card>

      <Card variant="outlined" padding="lg">
        <SectionHeader
          title={t("practitioner.onboarding.application.title")}
          subtitle={t("practitioner.onboarding.application.subtitle")}
        />

        <SummaryRow
          label={t("practitioner.onboarding.application.status")}
          value={
            <StatusChip
              label={applicationLabel}
              tone={applicationTone(application)}
              showDot={false}
            />
          }
        />
        <SummaryRow
          label={t("practitioner.onboarding.application.readiness")}
          value={
            <StatusChip
              label={readinessLabel}
              tone={readinessTone(readiness)}
              showDot={false}
            />
          }
        />
        <SummaryRow
          label={t("practitioner.onboarding.application.profileComplete")}
          value={
            <StatusChip
              label={
                profile.isProfileCompleted
                  ? t("practitioner.account.readiness.complete")
                  : t("practitioner.account.readiness.incomplete")
              }
              tone={profile.isProfileCompleted ? "success" : "warning"}
              showDot={false}
            />
          }
        />
        <SummaryRow
          label={t("practitioner.onboarding.application.specialties")}
          value={
            selectedSpecialties.length
              ? selectedSpecialties
                  .map((specialty) => specialtyLabel(specialty, i18n.language || "en"))
                  .join(", ")
              : "-"
          }
        />

        {application?.submittedAt ? (
          <SummaryRow
            label={t("practitioner.onboarding.application.submittedAt")}
            value={formatDateTime(application.submittedAt, locale)}
          />
        ) : null}
        {application?.reviewedAt ? (
          <SummaryRow
            label={t("practitioner.onboarding.application.reviewedAt")}
            value={formatDateTime(application.reviewedAt, locale)}
          />
        ) : null}

        {application?.reviewNotes ? (
          <View style={styles.reviewNotes}>
            <Text
              weight="600"
              style={styles.sectionEyebrow}
              color={theme.colors.textSecondary}
            >
              {t("practitioner.onboarding.application.reviewNotes")}
            </Text>
            <Text
              color={theme.colors.textSecondary}
              style={styles.reviewNotesBody}
            >
              {application.reviewNotes}
            </Text>
          </View>
        ) : null}

        <Text color={theme.colors.textMuted} style={styles.noteText}>
          {t("practitioner.onboarding.application.note")}
        </Text>

        <Button
          title={
            submitApplication.isPending
              ? t("practitioner.onboarding.actions.submitting")
              : submitButtonLabel
          }
          onPress={() => void submitWorkspaceApplication()}
          disabled={!canSubmitApplication || submitApplication.isPending}
        />
      </Card>
    </DetailPageScaffold>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    gap: 14,
  },
  heroCard: {
    gap: 16,
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  heroCopy: {
    flex: 1,
    gap: 4,
  },
  heroTitle: {
    fontSize: 22,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 22,
  },
  heroBadges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  summaryGrid: {
    gap: 6,
  },
  missingWrap: {
    gap: 10,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  heroActions: {
    gap: 10,
    marginTop: 2,
  },
  sectionEyebrow: {
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  noteText: {
    fontSize: 12,
    lineHeight: 18,
  },
  pricingNote: {
    fontSize: 12,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 16,
  },
  switchCopy: {
    flex: 1,
    gap: 4,
  },
  switchTitle: {
    fontSize: 15,
  },
  switchSubtitle: {
    fontSize: 12,
    lineHeight: 18,
  },
  hScroll: {
    gap: 8,
    paddingBottom: 4,
  },
  choicePill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  wrapList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  wrapChip: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  selectedSummary: {
    marginTop: 12,
  },
  credentialsList: {
    gap: 10,
    marginBottom: 12,
  },
  credentialCard: {
    gap: 10,
  },
  credentialHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  credentialCopy: {
    flex: 1,
    gap: 4,
  },
  credentialTitle: {
    fontSize: 15,
  },
  credentialMeta: {
    fontSize: 12,
    lineHeight: 18,
  },
  credentialFooter: {
    gap: 4,
  },
  credentialForm: {
    gap: 12,
    marginTop: 8,
  },
  reviewNotes: {
    gap: 6,
    marginTop: 10,
  },
  reviewNotesBody: {
    fontSize: 13,
    lineHeight: 20,
  },
  checklistContainer: {
    gap: 12,
    marginBottom: 12,
  },
  checklistItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  checklistItemContent: {
    flex: 1,
    gap: 4,
  },
  checklistItemLabel: {
    fontSize: 15,
    lineHeight: 20,
  },
  checklistItemHint: {
    fontSize: 12,
    lineHeight: 18,
  },
  checklistItemStatus: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  warningBannerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});
