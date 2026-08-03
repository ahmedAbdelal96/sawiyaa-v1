import React, { useMemo, useState } from "react";
import { Image, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  Card,
  ErrorState,
  Header,
  LoadingState,
  ListRow,
  Screen,
  StatusBadge,
  Text,
} from "../../src/components/ui";
import { useAuth } from "../../src/providers/AuthProvider";
import { useTheme } from "../../src/providers/ThemeProvider";
import { CompactSectionHeader, resolvePractitionerTone } from "../../src/features/practitioner/ui/compact";
import {
  usePractitionerApplicationStatus,
  usePractitionerProfile,
  usePractitionerReadiness,
} from "../../src/features/practitioner/profile/hooks";
import {
  formatDate,
  formatDateTime,
  getInitials,
  languageCodeLabel,
  payoutMethodLabel,
  practitionerAccountStatusLabel,
  practitionerApplicationStatusLabel,
  practitionerMissingRequirementLabel,
  profileTone,
} from "../../src/features/practitioner/profile/utils";
import { useGeneralChatUnreadSummary } from "../../src/features/messages/hooks";
import { getProfessionalTitleLabel } from "../../src/features/practitioner/reference-data";

export default function PractitionerAccountScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const { user, signOut } = useAuth();

  const profileQuery = usePractitionerProfile();
  const readinessQuery = usePractitionerReadiness();
  const applicationQuery = usePractitionerApplicationStatus();
  const messagesSummaryQuery = useGeneralChatUnreadSummary("practitioner");

  const profile = profileQuery.data?.profile ?? null;
  const readiness = readinessQuery.data?.readiness ?? null;
  const application = applicationQuery.data?.application ?? null;

  const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US";
  const isArabic = i18n.language?.startsWith("ar") ?? false;
  const [showMoreDetails, setShowMoreDetails] = useState(false);

  const displayName = useMemo(
    () =>
      profile?.displayName?.trim() ||
      user?.displayName?.trim() ||
      t("practitioner.account.fallbackName"),
    [profile?.displayName, t, user?.displayName],
  );
  const professionalTitle = getProfessionalTitleLabel(profile?.professionalTitle, isArabic) || t("practitioner.account.fallbackTitle");
  const initials = getInitials(displayName);
  const primarySpecialty =
    profile?.specialties.find((item) => item.isPrimary) ?? profile?.specialties[0] ?? null;
  const messagesTone = resolvePractitionerTone(theme, "messages");
  const supportTone = resolvePractitionerTone(theme, "support");
  const dangerTone = resolvePractitionerTone(theme, "danger");

  const isBusy = profileQuery.isLoading || readinessQuery.isLoading || applicationQuery.isLoading;

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

  const profileStatusLabel = t(`practitioner.profileStatus.${profile.profileStatus}`);
  const accountStatusLabel = practitionerAccountStatusLabel(user?.status, t);
  const applicationStatusLabel = practitionerApplicationStatusLabel(application?.status ?? null, t);
  const payoutDataStatusLabel = profile.payoutDestination?.methodType
    ? t("practitioner.account.statusCard.payoutReady")
    : t("practitioner.account.statusCard.payoutMissing");
  const unreadMessagesCount = messagesSummaryQuery.data?.item.totalUnreadMessages ?? 0;
  const isApproved = profile.profileStatus === "APPROVED";
  const missingRequirements = readiness?.missingRequirements ?? [];
  const missingRequirementLabels = missingRequirements.map((item) =>
    practitionerMissingRequirementLabel(item, t),
  );
  const hasNotes = missingRequirementLabels.length > 0;
  const rowDirection = isArabic ? "row-reverse" : "row";
  const alignSelfStart = isArabic ? "flex-end" : "flex-start";

  return (
    <Screen bg="background">
      <Header
        title={t("practitioner.account.title")}
        rightElement={
          <TouchableOpacity onPress={signOut} style={styles.headerAction} accessibilityRole="button">
            <Ionicons name="log-out-outline" size={22} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={[styles.newHeroHeader, { backgroundColor: "#FCFAF6", borderColor: "#E8DED0", borderWidth: 1.5 }]}>
          <View style={[styles.newHeroRow, { flexDirection: rowDirection }]}>
            <View style={styles.newAvatarContainer}>
              {profile.avatarUrl ? (
                <Image source={{ uri: profile.avatarUrl }} style={styles.newAvatarImage} />
              ) : (
                <View style={[styles.newAvatarPlaceholder, { backgroundColor: "#EEF4EF" }]}>
                  <Text weight="700" style={[styles.newAvatarText, { color: "#24564F" }]}>
                    {initials}
                  </Text>
                </View>
              )}
            </View>
            <View style={[styles.newHeroCopy, { alignItems: alignSelfStart }]}>
              <Text weight="700" style={styles.newDisplayName} color="#1F332F">
                {displayName}
              </Text>
              <Text color="#6F7E78" style={styles.newProfessionalTitle} weight="600">
                {professionalTitle}
              </Text>
              <Text color="#8F9E98" style={styles.newSpecialtyText}>
                {primarySpecialty?.title ?? t("practitioner.account.specialtyFallback")}
              </Text>
              <View style={[styles.newBadgeRow, { alignSelf: alignSelfStart }]}>
                <StatusBadge label={profileStatusLabel} status={profileTone(profile.profileStatus)} />
              </View>
            </View>
          </View>
        </View>

        {/* Account Status Card */}
        <Card variant="outlined" padding="md" style={styles.newSectionCard}>
          <CompactSectionHeader
            title={t("practitioner.account.statusCard.title")}
            subtitle={t("practitioner.account.statusCard.subtitle")}
          />
          <View style={styles.newReadOnlyList}>
            <InfoRow label={t("practitioner.account.statusCard.rows.account")} value={accountStatusLabel} icon="checkbox-outline" isRtl={isArabic} />
            <View style={styles.newRowDivider} />
            <InfoRow label={t("practitioner.account.statusCard.rows.approval")} value={profileStatusLabel} icon="shield-outline" isRtl={isArabic} />
            <View style={styles.newRowDivider} />
            {!isApproved ? (
              <>
                <InfoRow label={t("practitioner.account.statusCard.rows.applicationStatus")} value={applicationStatusLabel} icon="document-text-outline" isRtl={isArabic} />
                <View style={styles.newRowDivider} />
              </>
            ) : null}
            <InfoRow label={t("practitioner.account.statusCard.rows.lastUpdated")} value={formatDateTime(profile.updatedAt, locale)} icon="time-outline" isRtl={isArabic} />
          </View>
          {isApproved ? (
            <View style={[styles.newApprovedNoteBox, { flexDirection: rowDirection }]}>
              <Ionicons name="shield-checkmark" size={18} color="#24564F" style={isArabic ? { marginLeft: 8 } : { marginRight: 8 }} />
              <Text color="#24564F" style={styles.newApprovedNoteText} weight="600">
                {t("practitioner.account.statusCard.approvedNote")}
              </Text>
            </View>
          ) : null}
        </Card>

        {/* Professional Info Card */}
        <Card variant="outlined" padding="md" style={styles.newSectionCard}>
          <CompactSectionHeader
            title={t("practitioner.account.sections.professional")}
            subtitle={t("practitioner.account.sections.professionalSubtitle")}
          />
          <View style={styles.newCompactGrid}>
            <CompactField label={t("practitioner.account.fields.displayName")} value={profile.displayName?.trim() || t("practitioner.account.unknown")} icon="person-outline" isRtl={isArabic} />
            <CompactField label={t("practitioner.account.fields.professionalTitle")} value={getProfessionalTitleLabel(profile.professionalTitle, isArabic) || t("practitioner.account.unknown")} icon="ribbon-outline" isRtl={isArabic} />
            <CompactField label={t("practitioner.account.fields.specialty")} value={primarySpecialty?.title ?? t("practitioner.account.specialtyFallback")} icon="medical-outline" isRtl={isArabic} />
            <CompactField label={t("practitioner.account.fields.yearsOfExperience")} value={profile.yearsOfExperience !== null && profile.yearsOfExperience !== undefined ? String(profile.yearsOfExperience) : t("practitioner.account.unknown")} icon="calendar-outline" isRtl={isArabic} />
            <CompactField label={t("practitioner.account.fields.languages")} value={profile.languages.length ? profile.languages.map((item) => languageCodeLabel(item, t)).join(", ") : t("practitioner.account.unknown")} icon="language-outline" isRtl={isArabic} />
            <CompactField label={t("practitioner.account.fields.timezone")} value={profile.timezone?.trim() || t("practitioner.account.unknown")} icon="earth-outline" isRtl={isArabic} />
            <CompactField label={t("practitioner.account.fields.countryCode")} value={profile.countryCode?.trim() || t("practitioner.account.unknown")} icon="flag-outline" isRtl={isArabic} />
          </View>
        </Card>

        {/* Biography Card */}
        <Card variant="outlined" padding="md" style={styles.newBioCard}>
          <View style={[styles.newBioHeader, { flexDirection: rowDirection }]}>
            <Ionicons name="document-text-outline" size={18} color="#24564F" style={isArabic ? { marginLeft: 8 } : { marginRight: 8 }} />
            <Text weight="700" style={styles.newBioTitle} color="#1F332F">
              {t("practitioner.account.fields.bio")}
            </Text>
          </View>
          <Text color="#6F7E78" style={[styles.newBioBody, { textAlign: isArabic ? "right" : "left" }]}>
            {profile.bio?.trim() || t("practitioner.account.unknown")}
          </Text>
        </Card>

        {/* Financial Info Card */}
        <Card variant="outlined" padding="md" style={styles.newSectionCard}>
          <CompactSectionHeader
            title={t("practitioner.account.sections.financial")}
            subtitle={t("practitioner.account.sections.financialSubtitle")}
          />
          <View style={styles.newReadOnlyList}>
            <InfoRow label={t("practitioner.account.fields.payoutMethodType")} value={payoutMethodLabel(profile.payoutDestination?.methodType, t) ?? t("practitioner.account.unknown")} icon="cash-outline" isRtl={isArabic} />
            <View style={styles.newRowDivider} />
            <InfoRow label={t("practitioner.account.statusCard.rows.payoutStatus")} value={payoutDataStatusLabel} icon="wallet-outline" isRtl={isArabic} />
            <View style={styles.newRowDivider} />
            <InfoRow label={t("practitioner.account.statusCard.rows.lastUpdated")} value={formatDateTime(profile.updatedAt, locale)} icon="time-outline" isRtl={isArabic} />
          </View>
        </Card>

        {/* Actions & Links Card */}
        <Card variant="outlined" padding="md" style={styles.newSectionCard}>
          <CompactSectionHeader
            title={t("practitioner.account.sections.communication")}
            subtitle={t("practitioner.account.sections.communicationSubtitle")}
          />
          <View style={styles.newActionList}>
            <ListRow
              title={t("practitioner.account.actions.messages")}
              subtitle={t("practitioner.account.actions.messagesSubtitle")}
              leftElement={
                <View style={[styles.newActionIcon, { backgroundColor: "#EEF4EF" }]}>
                  <Ionicons name="chatbubbles-outline" size={18} color="#24564F" />
                </View>
              }
              rightElement={
                unreadMessagesCount > 0 ? (
                  <View style={[styles.newInlineBadge, { backgroundColor: "#DC2626" }]}>
                    <Text color="#FFFFFF" weight="600" style={styles.newBadgeText}>
                      {unreadMessagesCount > 99 ? "99+" : String(unreadMessagesCount)}
                    </Text>
                  </View>
                ) : undefined
              }
              onPress={() => router.push("/(practitioner)/messages" as any)}
              showChevron
            />
            <View style={styles.newRowDivider} />
            <ListRow
              title={t("practitioner.account.actions.support")}
              subtitle={t("practitioner.account.actions.supportSubtitle")}
              leftElement={
                <View style={[styles.newActionIcon, { backgroundColor: "#EEF4EF" }]}>
                  <Ionicons name="headset-outline" size={18} color="#24564F" />
                </View>
              }
              onPress={() =>
                router.push({
                  pathname: "/(practitioner)/messages",
                  params: { tab: "support" },
                } as any)
              }
              showChevron
            />
            <View style={styles.newRowDivider} />
            <ListRow
              title={t("practitioner.account.actions.logout")}
              subtitle={t("practitioner.account.actions.logoutSubtitle")}
              leftElement={
                <View style={[styles.newActionIcon, { backgroundColor: "#FEF3F2" }]}>
                  <Ionicons name="log-out-outline" size={18} color="#DC2626" />
                </View>
              }
              onPress={() => void signOut()}
              showChevron
            />
          </View>
        </Card>

        {/* More Details Card */}
        <Card variant="outlined" padding="md" style={styles.newSectionCard}>
          <TouchableOpacity
            onPress={() => setShowMoreDetails((current) => !current)}
            activeOpacity={0.85}
            style={[styles.newMoreToggle, { flexDirection: rowDirection }]}
          >
            <View style={[styles.newMoreToggleCopy, { alignItems: alignSelfStart }]}>
              <Text weight="700" style={styles.newSectionTitle} color="#1F332F">
                {t("practitioner.account.moreDetails.title")}
              </Text>
              <Text color="#6F7E78" style={styles.newSectionSubtitle}>
                {t("practitioner.account.moreDetails.subtitle")}
              </Text>
            </View>
            <Ionicons
              name={showMoreDetails ? "chevron-up" : "chevron-down"}
              size={20}
              color="#6F7E78"
            />
          </TouchableOpacity>

          {showMoreDetails ? (
            <View style={styles.newMoreDetailsBody}>
              <View style={styles.newDetailGroup}>
                <Text weight="700" style={[styles.newSubsectionTitle, { textAlign: isArabic ? "right" : "left" }]} color="#1F332F">
                  {t("practitioner.account.moreDetails.credentialsTitle")}
                </Text>
                <View style={styles.newReadOnlyList}>
                  <InfoRow
                    label={t("practitioner.account.fields.credentialSummary")}
                    value={t("practitioner.account.credentialsSummary", {
                      total: profile.credentialSummary.totalCredentials,
                      approved: profile.credentialSummary.approvedCount,
                      pending: profile.credentialSummary.pendingCount,
                    })}
                    icon="ribbon-outline"
                    isRtl={isArabic}
                  />
                  <View style={styles.newRowDivider} />
                  <InfoRow
                    label={t("practitioner.account.fields.createdAt")}
                    value={formatDate(profile.createdAt, locale)}
                    icon="calendar-outline"
                    isRtl={isArabic}
                  />
                  <View style={styles.newRowDivider} />
                  <InfoRow
                    label={t("practitioner.account.fields.updatedAt")}
                    value={formatDateTime(profile.updatedAt, locale)}
                    icon="time-outline"
                    isRtl={isArabic}
                  />
                </View>
              </View>

              <View style={styles.newDetailGroup}>
                <Text weight="700" style={[styles.newSubsectionTitle, { textAlign: isArabic ? "right" : "left" }]} color="#1F332F">
                  {t("practitioner.account.moreDetails.verificationTitle")}
                </Text>
                <View style={[styles.newBadgeRow, { justifyContent: isArabic ? "flex-end" : "flex-start" }]}>
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
              </View>

              {hasNotes ? (
                <View style={styles.newDetailGroup}>
                  <Text weight="700" style={[styles.newSubsectionTitle, { textAlign: isArabic ? "right" : "left" }]} color="#1F332F">
                    {t("practitioner.account.statusCard.missingTitle")}
                  </Text>
                  <View style={[styles.newBadgeRow, { justifyContent: isArabic ? "flex-end" : "flex-start" }]}>
                    {missingRequirementLabels.slice(0, 4).map((item) => (
                      <StatusBadge key={item} label={item} status="default" />
                    ))}
                    {missingRequirementLabels.length > 4 ? (
                      <StatusBadge label={t("practitioner.account.statusCard.moreNotes", { count: missingRequirementLabels.length - 4 })} status="default" />
                    ) : null}
                  </View>
                </View>
              ) : null}

              <View style={styles.newDetailGroup}>
                <Text weight="700" style={[styles.newSubsectionTitle, { textAlign: isArabic ? "right" : "left" }]} color="#1F332F">
                  {t("practitioner.account.moreDetails.specialtiesTitle")}
                </Text>
                <View style={[styles.newBadgeRow, { justifyContent: isArabic ? "flex-end" : "flex-start" }]}>
                  {profile.specialties.length ? (
                    profile.specialties.map((item) => (
                      <StatusBadge
                        key={item.specialtyId}
                        label={`${item.title ?? t("practitioner.account.specialtyFallback")}${item.isPrimary ? ` · ${t("practitioner.account.primary")}` : ""}`}
                        status={item.isPrimary ? "success" : "default"}
                      />
                    ))
                  ) : (
                    <Text color="#6F7E78">
                      {t("practitioner.account.specialtiesEmpty")}
                    </Text>
                  )}
                </View>
                <Text color="#8F9E98" style={[styles.newNoteText, { textAlign: isArabic ? "right" : "left" }]}>
                  {t("practitioner.account.specialtiesNote")}
                </Text>
              </View>

              <View style={styles.newDetailGroup}>
                <Text weight="700" style={[styles.newSubsectionTitle, { textAlign: isArabic ? "right" : "left" }]} color="#1F332F">
                  {t("practitioner.account.moreDetails.applicationTitle")}
                </Text>
                <View style={styles.newReadOnlyList}>
                  <InfoRow
                    label={t("practitioner.account.statusCard.rows.applicationStatus")}
                    value={applicationStatusLabel}
                    icon="document-text-outline"
                    isRtl={isArabic}
                  />
                  <View style={styles.newRowDivider} />
                  <InfoRow
                    label={t("practitioner.account.fields.applicationSubmittedAt")}
                    value={application?.submittedAt ? formatDateTime(application.submittedAt, locale) : t("practitioner.account.unknown")}
                    icon="calendar-outline"
                    isRtl={isArabic}
                  />
                  <View style={styles.newRowDivider} />
                  <InfoRow
                    label={t("practitioner.account.fields.applicationReviewedAt")}
                    value={application?.reviewedAt ? formatDateTime(application.reviewedAt, locale) : t("practitioner.account.unknown")}
                    icon="time-outline"
                    isRtl={isArabic}
                  />
                </View>
              </View>

              <View style={styles.newDetailGroup}>
                <Text weight="700" style={[styles.newSubsectionTitle, { textAlign: isArabic ? "right" : "left" }]} color="#1F332F">
                  {t("practitioner.account.moreDetails.payoutTitle")}
                </Text>
                <View style={styles.newReadOnlyList}>
                  <InfoRow
                    label={t("practitioner.account.fields.payoutMethodType")}
                    value={payoutMethodLabel(profile.payoutDestination?.methodType, t) ?? t("practitioner.account.unknown")}
                    icon="cash-outline"
                    isRtl={isArabic}
                  />
                  <View style={styles.newRowDivider} />
                  <InfoRow
                    label={t("practitioner.account.statusCard.rows.payoutStatus")}
                    value={payoutDataStatusLabel}
                    icon="wallet-outline"
                    isRtl={isArabic}
                  />
                </View>
                <Text color="#8F9E98" style={[styles.newNoteText, { textAlign: isArabic ? "right" : "left" }]}>
                  {t("practitioner.account.payoutReadOnlyNote")}
                </Text>
              </View>
            </View>
          ) : null}
        </Card>
      </ScrollView>
    </Screen>
  );
}

function InfoRow({
  label,
  value,
  icon,
  multiline = false,
  isRtl,
}: {
  label: string;
  value: string;
  icon?: keyof typeof Ionicons.glyphMap;
  multiline?: boolean;
  isRtl: boolean;
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const rowDir = isRtl ? "row-reverse" : "row";

  return (
    <View style={[styles.infoRow, { flexDirection: rowDir }]}>
      {icon ? (
        <View style={[styles.rowIconWrap, { backgroundColor: "#EEF4EF" }]}>
          <Ionicons name={icon} size={16} color="#24564F" />
        </View>
      ) : null}
      <View style={[styles.infoRowText, { alignItems: isRtl ? "flex-end" : "flex-start" }]}>
        <Text color={theme.colors.textMuted} style={styles.infoLabel}>
          {label}
        </Text>
        <Text
          weight="600"
          style={[styles.infoValue, { color: "#1F332F" }, multiline ? styles.infoValueMultiline : null]}
          numberOfLines={multiline ? undefined : 2}
        >
          {value && String(value).trim() ? value : t("practitioner.account.unknown")}
        </Text>
      </View>
    </View>
  );
}

function CompactField({
  label,
  value,
  icon,
  isRtl,
}: {
  label: string;
  value: string;
  icon?: keyof typeof Ionicons.glyphMap;
  isRtl: boolean;
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const rowDir = isRtl ? "row-reverse" : "row";

  return (
    <View style={[styles.compactField, { flexDirection: rowDir }]}>
      {icon ? (
        <View style={[styles.rowIconWrap, { backgroundColor: "#EEF4EF" }]}>
          <Ionicons name={icon} size={15} color="#24564F" />
        </View>
      ) : null}
      <View style={[styles.compactFieldText, { alignItems: isRtl ? "flex-end" : "flex-start" }]}>
        <Text color={theme.colors.textMuted} style={styles.compactFieldLabel}>
          {label}
        </Text>
        <Text weight="600" color="#1F332F" style={styles.compactFieldValue} numberOfLines={2}>
          {value && String(value).trim() ? value : t("practitioner.account.unknown")}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerAction: {
    padding: 6,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 16,
  },
  newHeroHeader: {
    borderRadius: 24,
    padding: 20,
    gap: 16,
  },
  newHeroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  newAvatarContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  newAvatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  newAvatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  newAvatarText: {
    fontSize: 24,
  },
  newHeroCopy: {
    flex: 1,
    gap: 3,
  },
  newDisplayName: {
    fontSize: 20,
    lineHeight: 26,
  },
  newProfessionalTitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  newSpecialtyText: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  newBadgeRow: {
    marginTop: 4,
    flexDirection: "row",
  },
  newSectionCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 16,
    gap: 14,
  },
  newReadOnlyList: {
    gap: 12,
  },
  newRowDivider: {
    height: 1.2,
    backgroundColor: "#EEF4EF",
    width: "100%",
  },
  newApprovedNoteBox: {
    borderRadius: 14,
    backgroundColor: "#EEF4EF",
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 8,
    gap: 6,
  },
  newApprovedNoteText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
  },
  newCompactGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  newBioCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 16,
    gap: 10,
  },
  newBioHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  newBioTitle: {
    fontSize: 14.5,
    lineHeight: 20,
  },
  newBioBody: {
    fontSize: 13.5,
    lineHeight: 20,
  },
  newActionList: {
    gap: 0,
  },
  newActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  newInlineBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  newBadgeText: {
    fontSize: 10,
    lineHeight: 14,
  },
  newMoreToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  newMoreToggleCopy: {
    flex: 1,
    gap: 3,
  },
  newSectionTitle: {
    fontSize: 15,
    lineHeight: 20,
  },
  newSectionSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  newMoreDetailsBody: {
    marginTop: 14,
    gap: 16,
  },
  newDetailGroup: {
    gap: 12,
  },
  newSubsectionTitle: {
    fontSize: 14,
    lineHeight: 18,
  },
  newNoteText: {
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 2,
  },
  rowIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  infoRow: {
    gap: 10,
    width: "100%",
  },
  infoRowText: {
    flex: 1,
    gap: 2,
  },
  infoLabel: {
    fontSize: 11.5,
    lineHeight: 16,
  },
  infoValue: {
    fontSize: 13.5,
    lineHeight: 18,
  },
  infoValueMultiline: {
    lineHeight: 20,
  },
  compactField: {
    width: "48%",
    gap: 8,
    paddingVertical: 2,
  },
  compactFieldText: {
    flex: 1,
    gap: 2,
  },
  compactFieldLabel: {
    fontSize: 11,
    lineHeight: 15,
  },
  compactFieldValue: {
    fontSize: 13,
    lineHeight: 17,
  },
});
