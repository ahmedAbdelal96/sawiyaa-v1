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
  const [showMoreDetails, setShowMoreDetails] = useState(false);

  const displayName = useMemo(
    () =>
      profile?.displayName?.trim() ||
      user?.displayName?.trim() ||
      t("practitioner.account.fallbackName"),
    [profile?.displayName, t, user?.displayName],
  );
  const professionalTitle = profile?.professionalTitle?.trim() || t("practitioner.account.fallbackTitle");
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

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card variant="outlined" padding="sm" style={styles.summaryCard}>
          <CompactSectionHeader
            title={t("practitioner.account.sections.overview")}
            subtitle={t("practitioner.account.sections.overviewSubtitle")}
          />

          <View style={styles.summaryTopRow}>
            <View style={styles.avatarWrap}>
              {profile.avatarUrl ? (
                <Image source={{ uri: profile.avatarUrl }} style={styles.avatarImage} />
              ) : (
                <View style={[styles.avatar, { backgroundColor: theme.colors.primaryLight }]}>
                  <Text weight="700" style={[styles.avatarText, { color: theme.colors.primary }]}>
                    {initials}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.summaryCopy}>
              <Text weight="700" style={styles.displayName} color={theme.colors.textPrimary}>
                {displayName}
              </Text>
              <Text color={theme.colors.textSecondary} style={styles.professionalTitle}>
                {professionalTitle}
              </Text>
              <Text color={theme.colors.textMuted} style={styles.specialtyText}>
                {primarySpecialty?.title ?? t("practitioner.account.specialtyFallback")}
              </Text>
            </View>
          </View>

          <View style={styles.badgeRow}>
            <StatusBadge label={profileStatusLabel} status={profileTone(profile.profileStatus)} />
          </View>

          <Text color={theme.colors.textSecondary} style={styles.helperText}>
            {t("practitioner.account.summary.helper")}
          </Text>
        </Card>

        <Card variant="outlined" padding="sm" style={styles.sectionCard}>
          <CompactSectionHeader
            title={t("practitioner.account.statusCard.title")}
            subtitle={t("practitioner.account.statusCard.subtitle")}
          />

          <View style={styles.readOnlyList}>
            <InfoRow label={t("practitioner.account.statusCard.rows.account")} value={accountStatusLabel} />
            <InfoRow
              label={t("practitioner.account.statusCard.rows.approval")}
              value={profileStatusLabel}
            />
            {!isApproved ? (
              <InfoRow
                label={t("practitioner.account.statusCard.rows.applicationStatus")}
                value={applicationStatusLabel}
              />
            ) : null}
            <InfoRow
              label={t("practitioner.account.statusCard.rows.lastUpdated")}
              value={formatDateTime(profile.updatedAt, locale)}
            />
          </View>

          {isApproved ? (
            <View style={styles.approvedNoteBox}>
              <Ionicons name="shield-checkmark-outline" size={18} color={theme.colors.success} />
              <Text color={theme.colors.textPrimary} style={styles.approvedNoteText}>
                {t("practitioner.account.statusCard.approvedNote")}
              </Text>
            </View>
          ) : null}
        </Card>

        <Card variant="outlined" padding="sm" style={styles.sectionCard}>
          <CompactSectionHeader
            title={t("practitioner.account.sections.professional")}
            subtitle={t("practitioner.account.sections.professionalSubtitle")}
          />
          <View style={styles.compactGrid}>
            <CompactField
              label={t("practitioner.account.fields.displayName")}
              value={profile.displayName?.trim() || t("practitioner.account.unknown")}
            />
            <CompactField
              label={t("practitioner.account.fields.professionalTitle")}
              value={profile.professionalTitle?.trim() || t("practitioner.account.unknown")}
            />
            <CompactField
              label={t("practitioner.account.fields.specialty")}
              value={primarySpecialty?.title ?? t("practitioner.account.specialtyFallback")}
            />
            <CompactField
              label={t("practitioner.account.fields.yearsOfExperience")}
              value={
                profile.yearsOfExperience !== null && profile.yearsOfExperience !== undefined
                  ? String(profile.yearsOfExperience)
                  : t("practitioner.account.unknown")
              }
            />
            <CompactField
              label={t("practitioner.account.fields.languages")}
              value={
                profile.languages.length
                  ? profile.languages.map((item) => languageCodeLabel(item, t)).join(", ")
                  : t("practitioner.account.unknown")
              }
            />
            <CompactField
              label={t("practitioner.account.fields.timezone")}
              value={profile.timezone?.trim() || t("practitioner.account.unknown")}
            />
            <CompactField
              label={t("practitioner.account.fields.countryCode")}
              value={profile.countryCode?.trim() || t("practitioner.account.unknown")}
            />
          </View>
        </Card>

        <Card variant="outlined" padding="sm" style={styles.bioCard}>
          <Text weight="600" style={styles.bioTitle} color={theme.colors.textPrimary}>
            {t("practitioner.account.fields.bio")}
          </Text>
          <Text color={theme.colors.textSecondary} style={styles.bioBody} numberOfLines={3}>
            {profile.bio?.trim() || t("practitioner.account.unknown")}
          </Text>
        </Card>

        <Card variant="outlined" padding="sm" style={styles.sectionCard}>
          <CompactSectionHeader
            title={t("practitioner.account.sections.financial")}
            subtitle={t("practitioner.account.sections.financialSubtitle")}
          />
          <View style={styles.readOnlyList}>
            <InfoRow
              label={t("practitioner.account.fields.payoutMethodType")}
              value={payoutMethodLabel(profile.payoutDestination?.methodType, t) ?? t("practitioner.account.unknown")}
            />
            <InfoRow
              label={t("practitioner.account.statusCard.rows.payoutStatus")}
              value={payoutDataStatusLabel}
            />
            <InfoRow label={t("practitioner.account.statusCard.rows.lastUpdated")} value={formatDateTime(profile.updatedAt, locale)} />
          </View>
        </Card>

        <Card variant="outlined" padding="sm" style={styles.sectionCard}>
          <CompactSectionHeader
            title={t("practitioner.account.sections.communication")}
            subtitle={t("practitioner.account.sections.communicationSubtitle")}
          />
          <View style={styles.actionList}>
            <ListRow
              title={t("practitioner.account.actions.messages")}
              subtitle={t("practitioner.account.actions.messagesSubtitle")}
              leftElement={
                <View style={[styles.actionIcon, { backgroundColor: messagesTone.iconBackground }]}>
                  <Ionicons name="chatbubbles-outline" size={18} color={messagesTone.iconColor} />
                </View>
              }
              rightElement={
                unreadMessagesCount > 0 ? (
                  <View style={[styles.inlineBadge, { backgroundColor: messagesTone.iconBackground }]}>
                    <Text color={messagesTone.iconColor} weight="600">
                      {unreadMessagesCount > 99 ? "99+" : String(unreadMessagesCount)}
                    </Text>
                  </View>
                ) : undefined
              }
              onPress={() => router.push("/(practitioner)/messages" as any)}
              showChevron
            />
            <ListRow
              title={t("practitioner.account.actions.support")}
              subtitle={t("practitioner.account.actions.supportSubtitle")}
              leftElement={
                <View style={[styles.actionIcon, { backgroundColor: supportTone.iconBackground }]}>
                  <Ionicons name="headset-outline" size={18} color={supportTone.iconColor} />
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
            <ListRow
              title={t("practitioner.account.actions.logout")}
              subtitle={t("practitioner.account.actions.logoutSubtitle")}
              leftElement={
                <View style={[styles.actionIcon, { backgroundColor: dangerTone.iconBackground }]}>
                  <Ionicons name="log-out-outline" size={18} color={dangerTone.iconColor} />
                </View>
              }
              onPress={() => void signOut()}
              showChevron
            />
          </View>
        </Card>

        <Card variant="outlined" padding="sm" style={styles.sectionCard}>
          <TouchableOpacity
            onPress={() => setShowMoreDetails((current) => !current)}
            activeOpacity={0.85}
            style={styles.moreToggle}
          >
            <View style={styles.moreToggleCopy}>
              <Text weight="600" style={styles.sectionTitle} color={theme.colors.textPrimary}>
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
              <View style={styles.detailGroup}>
                <Text weight="600" style={styles.subsectionTitle} color={theme.colors.textPrimary}>
                  {t("practitioner.account.moreDetails.credentialsTitle")}
                </Text>
                <View style={styles.readOnlyList}>
                  <InfoRow
                    label={t("practitioner.account.fields.credentialSummary")}
                    value={t("practitioner.account.credentialsSummary", {
                      total: profile.credentialSummary.totalCredentials,
                      approved: profile.credentialSummary.approvedCount,
                      pending: profile.credentialSummary.pendingCount,
                    })}
                  />
                  <InfoRow
                    label={t("practitioner.account.fields.createdAt")}
                    value={formatDate(profile.createdAt, locale)}
                  />
                  <InfoRow
                    label={t("practitioner.account.fields.updatedAt")}
                    value={formatDateTime(profile.updatedAt, locale)}
                  />
                </View>
              </View>

              <View style={styles.detailGroup}>
                <Text weight="600" style={styles.subsectionTitle} color={theme.colors.textPrimary}>
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
              </View>

              {hasNotes ? (
                <View style={styles.detailGroup}>
                  <Text weight="600" style={styles.subsectionTitle} color={theme.colors.textPrimary}>
                    {t("practitioner.account.statusCard.missingTitle")}
                  </Text>
                  <View style={styles.chipRow}>
                    {missingRequirementLabels.slice(0, 4).map((item) => (
                      <StatusBadge key={item} label={item} status="default" />
                    ))}
                    {missingRequirementLabels.length > 4 ? (
                      <StatusBadge label={t("practitioner.account.statusCard.moreNotes", { count: missingRequirementLabels.length - 4 })} status="default" />
                    ) : null}
                  </View>
                </View>
              ) : null}

              <View style={styles.detailGroup}>
                <Text weight="600" style={styles.subsectionTitle} color={theme.colors.textPrimary}>
                  {t("practitioner.account.moreDetails.specialtiesTitle")}
                </Text>
                <View style={styles.chipRow}>
                  {profile.specialties.length ? (
                    profile.specialties.map((item) => (
                      <StatusBadge
                        key={item.specialtyId}
                        label={`${item.title ?? t("practitioner.account.specialtyFallback")}${item.isPrimary ? ` · ${t("practitioner.account.primary")}` : ""}`}
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

              <View style={styles.detailGroup}>
                <Text weight="600" style={styles.subsectionTitle} color={theme.colors.textPrimary}>
                  {t("practitioner.account.moreDetails.applicationTitle")}
                </Text>
                <View style={styles.readOnlyList}>
                  <InfoRow
                    label={t("practitioner.account.statusCard.rows.applicationStatus")}
                    value={applicationStatusLabel}
                  />
                  <InfoRow
                    label={t("practitioner.account.fields.applicationSubmittedAt")}
                    value={application?.submittedAt ? formatDateTime(application.submittedAt, locale) : t("practitioner.account.unknown")}
                  />
                  <InfoRow
                    label={t("practitioner.account.fields.applicationReviewedAt")}
                    value={application?.reviewedAt ? formatDateTime(application.reviewedAt, locale) : t("practitioner.account.unknown")}
                  />
                </View>
              </View>

              <View style={styles.detailGroup}>
                <Text weight="600" style={styles.subsectionTitle} color={theme.colors.textPrimary}>
                  {t("practitioner.account.moreDetails.payoutTitle")}
                </Text>
                <View style={styles.readOnlyList}>
                  <InfoRow
                    label={t("practitioner.account.fields.payoutMethodType")}
                    value={payoutMethodLabel(profile.payoutDestination?.methodType, t) ?? t("practitioner.account.unknown")}
                  />
                  <InfoRow
                    label={t("practitioner.account.statusCard.rows.payoutStatus")}
                    value={payoutDataStatusLabel}
                  />
                </View>
                <Text color={theme.colors.textMuted} style={styles.noteText}>
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
  multiline = false,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();

  return (
    <View style={styles.infoRow}>
      <Text color={theme.colors.textMuted} style={styles.infoLabel}>
        {label}
      </Text>
      <Text
        weight="600"
        style={[styles.infoValue, multiline ? styles.infoValueMultiline : null]}
        numberOfLines={multiline ? undefined : 2}
      >
        {value && String(value).trim() ? value : t("practitioner.account.unknown")}
      </Text>
    </View>
  );
}

function CompactField({ label, value }: { label: string; value: string }) {
  const { theme } = useTheme();
  const { t } = useTranslation();

  return (
    <View style={styles.compactField}>
      <Text color={theme.colors.textMuted} style={styles.compactFieldLabel}>
        {label}
      </Text>
      <Text weight="600" color={theme.colors.textPrimary} style={styles.compactFieldValue} numberOfLines={2}>
        {value && String(value).trim() ? value : t("practitioner.account.unknown")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerAction: {
    padding: 6,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 24,
    gap: 12,
  },
  summaryCard: {
    gap: 10,
  },
  summaryTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  avatarWrap: {
    width: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarText: {
    fontSize: 17,
  },
  summaryCopy: {
    flex: 1,
    gap: 2,
  },
  displayName: {
    fontSize: 20,
    lineHeight: 26,
  },
  professionalTitle: {
    fontSize: 13,
    lineHeight: 19,
  },
  specialtyText: {
    fontSize: 12,
    lineHeight: 18,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  helperText: {
    fontSize: 12,
    lineHeight: 18,
  },
  sectionCard: {
    gap: 8,
  },
  compactGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  compactField: {
    width: "48%",
    gap: 3,
    paddingVertical: 2,
  },
  compactFieldLabel: {
    fontSize: 11,
    lineHeight: 16,
  },
  compactFieldValue: {
    fontSize: 13,
    lineHeight: 19,
  },
  readOnlyList: {
    gap: 8,
  },
  infoRow: {
    gap: 3,
    paddingVertical: 1,
  },
  infoLabel: {
    fontSize: 12,
    lineHeight: 17,
  },
  infoValue: {
    fontSize: 14,
    lineHeight: 21,
  },
  infoValueMultiline: {
    lineHeight: 22,
  },
  approvedNoteBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#d1fae5",
    backgroundColor: "#f0fdf4",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  approvedNoteText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  notesBlock: {
    gap: 8,
  },
  subsectionTitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  actionList: {
    gap: 0,
    overflow: "hidden",
  },
  actionIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  moreToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  moreToggleCopy: {
    flex: 1,
    gap: 4,
  },
  sectionTitle: {
    fontSize: 15,
    lineHeight: 21,
  },
  sectionSubtitle: {
    fontSize: 12,
    lineHeight: 18,
  },
  moreDetailsBody: {
    marginTop: 14,
    gap: 12,
  },
  detailGroup: {
    gap: 10,
  },
  noteText: {
    fontSize: 12,
    lineHeight: 18,
  },
  bioCard: {
    gap: 8,
  },
  bioTitle: {
    fontSize: 15,
    lineHeight: 21,
  },
  bioBody: {
    fontSize: 13,
    lineHeight: 20,
  },
  inlineBadge: {
    minWidth: 28,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: "center",
  },
});
