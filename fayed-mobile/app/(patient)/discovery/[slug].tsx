import React from "react";
import { View, StyleSheet, ScrollView, Image } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  Screen,
  Header,
  Text,
  Button,
  Card,
  LoadingState,
  ErrorState,
  Section,
} from "../../../src/components/ui";
import { useTheme } from "../../../src/providers/ThemeProvider";
import { useGetPublicPractitionerDetails } from "../../../src/features/patient/discovery/api";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

export default function TherapistProfileScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { theme } = useTheme();
  const { t } = useTranslation();

  const { data, isLoading, isError, refetch } = useGetPublicPractitionerDetails(
    slug || null,
  );

  if (isLoading) {
    return (
      <Screen bg="background">
        <Header showBack onBack={() => router.back()} />
        <LoadingState fullScreen />
      </Screen>
    );
  }

  if (isError || !data?.data.item) {
    return (
      <Screen bg="background">
        <Header showBack onBack={() => router.back()} />
        <ErrorState fullScreen onRetry={refetch} />
      </Screen>
    );
  }

  const practitioner = data.data.item;

  return (
    <Screen bg="background">
      <Header
        showBack
        onBack={() => router.back()}
        rightElement={
          <Ionicons
            name="share-outline"
            size={24}
            color={theme.colors.textPrimary}
          />
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card
          variant="elevated"
          padding="lg"
          style={[
            styles.headerCard,
            { borderRightColor: theme.colors.primary },
          ]}
        >
          <View style={styles.headerBlock}>
            <View
              style={[
                styles.avatarContainer,
                { backgroundColor: theme.colors.surfaceTertiary },
              ]}
            >
              {practitioner.avatarUrl ? (
                <Image
                  source={{ uri: practitioner.avatarUrl }}
                  style={styles.avatar}
                />
              ) : (
                <Ionicons
                  name="person"
                  size={44}
                  color={theme.colors.textMuted}
                />
              )}
            </View>

            <View style={styles.headerTextCol}>
              <Text weight="bold" style={styles.name}>
                {practitioner.displayName || practitioner.slug}
              </Text>
              <Text color={theme.colors.textSecondary} style={styles.title}>
                {practitioner.professionalTitle ||
                  t("discovery.profile.professionalFallback")}
              </Text>

              <View style={styles.metaInlineRow}>
                {practitioner.isVerified ? (
                  <View
                    style={[
                      styles.verifiedPill,
                      { backgroundColor: theme.colors.primaryLight },
                    ]}
                  >
                    <Ionicons
                      name="checkmark-circle"
                      size={14}
                      color={theme.colors.primary}
                    />
                    <Text
                      color={theme.colors.primary}
                      weight="600"
                      style={styles.verifiedText}
                    >
                      {t(
                        "discovery.profile.verifiedProfessional",
                        "Verified professional",
                      )}
                    </Text>
                  </View>
                ) : null}
                <Text
                  color={theme.colors.textSecondary}
                  style={styles.locationText}
                >
                  {practitioner.countryCode ||
                    t("discovery.profile.countryFallback")}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View
              style={[
                styles.statTile,
                {
                  backgroundColor: theme.colors.surfaceSecondary,
                  borderColor: theme.colors.borderLight,
                },
              ]}
            >
              <Text weight="bold" style={styles.statTileValue}>
                {practitioner.yearsExperience
                  ? `${practitioner.yearsExperience}+`
                  : "--"}
              </Text>
              <Text
                color={theme.colors.textSecondary}
                style={styles.statTileLabel}
              >
                {t("discovery.profile.yearsExp")}
              </Text>
            </View>

            <View
              style={[
                styles.statTile,
                {
                  backgroundColor: theme.colors.surfaceSecondary,
                  borderColor: theme.colors.borderLight,
                },
              ]}
            >
              <Text weight="bold" style={styles.statTileValue}>
                {practitioner.ratingSummary.averageRating
                  ? practitioner.ratingSummary.averageRating.toFixed(1)
                  : "--"}
              </Text>
              <Text
                color={theme.colors.textSecondary}
                style={styles.statTileLabel}
              >
                {t("discovery.profile.reviews", {
                  count: practitioner.ratingSummary.totalReviews,
                })}
              </Text>
            </View>

            <View
              style={[
                styles.statTile,
                {
                  backgroundColor: theme.colors.surfaceSecondary,
                  borderColor: theme.colors.borderLight,
                },
              ]}
            >
              <Text weight="bold" style={styles.statTileValue}>
                {practitioner.credentialsSummary.approvedCredentials}
              </Text>
              <Text
                color={theme.colors.textSecondary}
                style={styles.statTileLabel}
              >
                {t("discovery.profile.credentials", "Credentials")}
              </Text>
            </View>
          </View>
        </Card>

        {practitioner.fullBio && (
          <Section title={t("discovery.profile.about")}>
            <Card variant="flat" padding="md">
              <Text color={theme.colors.textSecondary} style={styles.bioText}>
                {practitioner.fullBio}
              </Text>
            </Card>
          </Section>
        )}

        {practitioner.specialties.length > 0 && (
          <Section title={t("discovery.profile.specialties")}>
            <View style={styles.tagsContainer}>
              {practitioner.specialties.map((spec) => (
                <View
                  key={spec.specialtyId}
                  style={[
                    styles.tag,
                    { backgroundColor: theme.colors.primaryLight },
                  ]}
                >
                  <Text color={theme.colors.primary} style={styles.tagText}>
                    {spec.title || spec.slug}
                  </Text>
                </View>
              ))}
            </View>
          </Section>
        )}

        <Section title={t("discovery.profile.credentials")}>
          <Card variant="elevated" padding="md" style={styles.credentialsCard}>
            <Ionicons
              name="shield-checkmark-outline"
              size={24}
              color="#22c55e"
              style={styles.credentialIcon}
            />
            <View style={styles.credentialText}>
              <Text weight="600">
                {t("discovery.profile.verifiedProfessional")}
              </Text>
              <Text color={theme.colors.textSecondary} style={{ fontSize: 14 }}>
                {t("discovery.profile.credentialCount", {
                  count: practitioner.credentialsSummary.approvedCredentials,
                })}
              </Text>
            </View>
          </Card>
        </Section>

        <Section title={t("discovery.profile.languages")}>
          <Card variant="flat" padding="md">
            <Text color={theme.colors.textSecondary} style={styles.bioText}>
              {practitioner.languages.length > 0
                ? practitioner.languages.join(" • ")
                : t("discovery.profile.languagesFallback")}
            </Text>
          </Card>
        </Section>

        <Section title={t("discovery.profile.availability")}>
          <Card variant="elevated" padding="lg">
            <Text
              style={{ textAlign: "center", marginBottom: 16 }}
              color={theme.colors.textMuted}
            >
              {t("discovery.profile.availabilityNotice")}
            </Text>
            <Button
              title={t("discovery.profile.bookSession")}
              onPress={() =>
                router.push({
                  pathname: "/sessions/select-time",
                  params: {
                    slug,
                    practitionerName:
                      practitioner.displayName || practitioner.slug,
                    practitionerTitle:
                      practitioner.professionalTitle ||
                      t("discovery.profile.professionalFallback"),
                    practitionerAvatarUrl: practitioner.avatarUrl || "",
                  },
                })
              }
            />
          </Card>
        </Section>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 130,
  },
  headerCard: {
    marginBottom: 14,
    borderRightWidth: 4,
  },
  headerBlock: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  avatarContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#ffffff",
    marginRight: 14,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  headerTextCol: {
    flex: 1,
  },
  name: {
    fontSize: 34,
    lineHeight: 38,
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    marginBottom: 4,
    textAlign: "center",
  },
  locationText: {
    fontSize: 13,
    textTransform: "uppercase",
  },
  metaInlineRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
  },
  verifiedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  verifiedText: {
    fontSize: 12,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
  },
  statTile: {
    flex: 1,
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  statTileValue: {
    fontSize: 20,
    marginBottom: 3,
  },
  statTileLabel: {
    fontSize: 12,
    textAlign: "center",
  },
  bioText: {
    fontSize: 15,
    lineHeight: 24,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 14,
    fontWeight: "500",
  },
  credentialsCard: {
    flexDirection: "row",
    alignItems: "center",
  },
  credentialIcon: {
    marginRight: 16,
  },
  credentialText: {
    flex: 1,
  },
});
