import React from "react";
import { View, StyleSheet, Image } from "react-native";
import { Card, Text, Button, StatusChip } from "../../../../components/ui";
import { PublicPractitionerListItem } from "../types";
import { useTheme } from "../../../../providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { resolveSupportedCurrencyCode } from "../../../../lib/currency";

export interface TherapistCardProps {
  practitioner: PublicPractitionerListItem;
}

export const TherapistCard = ({ practitioner }: TherapistCardProps) => {
  const { theme } = useTheme();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US";

  const primarySpecialty =
    practitioner.specialties.find((s) => s.isPrimary) ||
    practitioner.specialties[0];
  const currencyCode = resolveSupportedCurrencyCode({
    currencyCode: practitioner.currencyCode,
    regionalPricingMode: practitioner.regionalPricingMode,
    resolvedCountryIsoCode: practitioner.resolvedCountryIsoCode,
    countryCode: practitioner.countryCode,
  });
  const price =
    practitioner.displaySessionPrice30 ??
    practitioner.displaySessionPrice60;
  const averageRating = practitioner.ratingSummary.averageRating;
  const visibleLanguages = practitioner.languages
    .slice(0, 3)
    .map(
      (code) =>
        ({
          ar: t("matching.question.language.ar"),
          en: t("matching.question.language.en"),
          fr: t("matching.question.language.fr"),
        })[code] ?? code,
    );

  return (
    <Card
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.borderLight,
        },
      ]}
      padding="lg"
      variant="elevated"
    >
      <View
        style={[styles.pulseBar, { backgroundColor: theme.colors.primary }]}
      />

      <View style={styles.header}>
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
            <Ionicons name="person" size={32} color={theme.colors.textMuted} />
          )}
          {practitioner.isOnlineNow && <View style={styles.onlineIndicator} />}
        </View>

        <View style={styles.headerInfo}>
          <Text weight="bold" style={styles.name} numberOfLines={1}>
            {practitioner.displayName || practitioner.slug}
          </Text>
          <Text
            color={theme.colors.textSecondary}
            style={styles.title}
            numberOfLines={1}
          >
            {practitioner.professionalTitle ||
              primarySpecialty?.title ||
              t("discovery.list.professionalFallback")}
          </Text>

          <View style={styles.metaPillsRow}>
            <StatusChip
              label={
                practitioner.isOnlineNow
                  ? t("discovery.profile.presence.online", "Online now")
                  : t("discovery.profile.presence.offline", "Offline right now")
              }
              tone={practitioner.isOnlineNow ? "success" : "default"}
            />
            {visibleLanguages.length > 0 ? (
              <Text color={theme.colors.textSecondary} style={styles.languages}>
                {visibleLanguages.join(" • ")}
              </Text>
            ) : null}
          </View>

          <View style={styles.statsRow}>
            {averageRating ? (
              <View style={styles.statItem}>
                <Ionicons name="star" size={14} color="#eab308" />
                <Text weight="600" style={styles.statText}>
                  {averageRating.toFixed(1)}
                  <Text color={theme.colors.textMuted} weight="normal">
                    {" "}
                    ({practitioner.ratingSummary.totalReviews})
                  </Text>
                </Text>
              </View>
            ) : (
              <View style={styles.statItem}>
                <Ionicons
                  name="star-outline"
                  size={14}
                  color={theme.colors.textMuted}
                />
                <Text color={theme.colors.textMuted} style={styles.statText}>
                  {t("discovery.list.newBadge")}
                </Text>
              </View>
            )}

            {practitioner.yearsExperience ? (
              <View style={[styles.statItem, styles.statDivider]}>
                <Ionicons
                  name="briefcase-outline"
                  size={14}
                  color={theme.colors.textSecondary}
                />
                <Text
                  color={theme.colors.textSecondary}
                  style={styles.statText}
                >
                  {t("discovery.list.experience", {
                    years: practitioner.yearsExperience,
                  })}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      {practitioner.bioSnippet ? (
        <Text
          color={theme.colors.textSecondary}
          style={styles.bio}
          numberOfLines={2}
        >
          {practitioner.bioSnippet}
        </Text>
      ) : null}

      <View style={styles.tagsContainer}>
        {practitioner.specialties.slice(0, 2).map((spec) => (
          <View
            key={spec.specialtyId}
            style={[
              styles.tag,
              { backgroundColor: theme.colors.surfaceSecondary },
            ]}
          >
            <Text style={styles.tagText} color={theme.colors.textSecondary}>
              {spec.title}
            </Text>
          </View>
        ))}
        {practitioner.specialties.length > 2 && (
          <View
            style={[
              styles.tag,
              { backgroundColor: theme.colors.surfaceSecondary },
            ]}
          >
            <Text style={styles.tagText} color={theme.colors.textSecondary}>
              +{practitioner.specialties.length - 2}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <View style={styles.priceContainer}>
          <Text color={theme.colors.textMuted} style={styles.priceLabel}>
            {t("discovery.list.priceLabel")}
          </Text>
          <Text
            weight="bold"
            color={theme.colors.textBrand}
            style={styles.priceValue}
          >
            {price !== null && price !== undefined
              ? t("discovery.list.priceValue", {
                  value: new Intl.NumberFormat(locale, {
                    style: "currency",
                    currency: currencyCode,
                    maximumFractionDigits: 0,
                  }).format(price),
                })
              : t("discovery.list.priceUnavailable")}
          </Text>
        </View>
        <Button
          title={t("discovery.list.viewProfile")}
          onPress={() =>
            router.push(`/(patient)/discovery/${practitioner.slug}`)
          }
          style={styles.actionButton}
        />
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    overflow: "hidden",
    position: "relative",
  },
  pulseBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  header: {
    flexDirection: "row",
    marginBottom: 12,
  },
  avatarContainer: {
    width: 74,
    height: 74,
    borderRadius: 37,
    marginRight: 16,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  avatar: {
    width: 74,
    height: 74,
    borderRadius: 37,
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#22c55e",
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  headerInfo: {
    flex: 1,
    justifyContent: "center",
  },
  metaPillsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 10,
  },
  languages: {
    fontSize: 13,
  },
  name: {
    fontSize: 24,
    marginBottom: 3,
  },
  title: {
    fontSize: 15,
    marginBottom: 10,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  statText: {
    fontSize: 13,
    marginLeft: 4,
  },
  statDivider: {
    marginLeft: 12,
    paddingLeft: 12,
    borderLeftWidth: 1,
    borderLeftColor: "#e2e8f0",
  },
  bio: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 14,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 14,
    gap: 8,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  tagText: {
    fontSize: 12,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#e7edf8",
    paddingTop: 16,
  },
  priceContainer: {},
  priceLabel: {
    fontSize: 12,
  },
  priceValue: {
    fontSize: 16,
  },
  actionButton: {
    width: 142,
    paddingVertical: 11,
  },
});

