import React from "react";
import { View, StyleSheet, Image, TouchableOpacity } from "react-native";
import { Text } from "../../../../components/ui";
import { PublicPractitionerListItem } from "../types";
import { useTheme } from "../../../../providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { getPatientPreferredCurrency } from "../../../../lib/currency";
import { usePatientProfile } from "../../profile/hooks";

const STAR_COLOR = "#eab308";
const ONLINE_GREEN = "#22c55e";
const FAIDED_BRAND = "#357f74";
const TAG_GRAY = "#56656b";

export interface PractitionerCompactCardProps {
  practitioner: PublicPractitionerListItem;
  onPress?: () => void;
}

export const PractitionerCompactCard = ({
  practitioner,
  onPress,
}: PractitionerCompactCardProps) => {
  const { theme } = useTheme();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const profileQuery = usePatientProfile();

  const primarySpecialty =
    practitioner.specialties.find((s) => s.isPrimary) ??
    practitioner.specialties[0];

  // Egyptian patients always see EGP; non-Egyptian see practitioner's USD setting
  const patientCountryCode = profileQuery.data?.profile.countryCode ?? null;
  const currencyCode = getPatientPreferredCurrency(patientCountryCode, practitioner);

  // Select the correct price for the patient's currency
  const price =
    currencyCode === "EGP"
      ? (practitioner.sessionPrice30Egp ?? practitioner.sessionPrice60Egp ?? null)
      : (practitioner.sessionPrice30Usd ?? practitioner.sessionPrice60Usd ?? null);
  const averageRating = practitioner.ratingSummary.averageRating;

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push(`/(patient)/discovery/${practitioner.slug}`);
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={handlePress}
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.borderLight,
        },
      ]}
    >
      <View
        style={[
          styles.pulseBar,
          { backgroundColor: theme.colors.primary },
        ]}
      />

      <View style={styles.cardContent}>
        <View style={styles.avatarSection}>
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
                size={22}
                color={theme.colors.textMuted}
              />
            )}
            {practitioner.isOnlineNow && (
              <View style={styles.onlineIndicator} />
            )}
          </View>
        </View>

        <View style={styles.infoSection}>
          <View style={styles.nameRow}>
            <Text weight="bold" style={styles.name} numberOfLines={1}>
              {practitioner.displayName || practitioner.slug}
            </Text>
            <View
              style={[
                styles.onlineChip,
                {
                  backgroundColor: practitioner.isOnlineNow
                    ? `${theme.colors.success}20`
                    : `${theme.colors.textMuted}20`,
                },
              ]}
            >
              <View
                style={[
                  styles.onlineDot,
                  {
                    backgroundColor: practitioner.isOnlineNow
                      ? theme.colors.success
                      : theme.colors.textMuted,
                  },
                ]}
              />
              <Text
                style={[
                  styles.onlineChipText,
                  {
                    color: practitioner.isOnlineNow
                      ? theme.colors.success
                      : theme.colors.textMuted,
                  },
                ]}
              >
                {practitioner.isOnlineNow
                  ? t("discovery.profile.presence.online", "Online")
                  : t("discovery.profile.presence.offline", "Offline")}
              </Text>
            </View>
          </View>

          <Text
            color={theme.colors.textSecondary}
            style={styles.title}
            numberOfLines={1}
          >
            {practitioner.professionalTitle ||
              primarySpecialty?.title ||
              t("discovery.list.professionalFallback")}
          </Text>

          <View style={styles.statsRow}>
            {averageRating ? (
              <View style={styles.statItem}>
                <Ionicons name="star" size={12} color={STAR_COLOR} />
                <Text weight="600" style={styles.statText}>
                  {averageRating.toFixed(1)}
                </Text>
                <Text color={theme.colors.textMuted} style={styles.statMuted}>
                  ({practitioner.ratingSummary.totalReviews})
                </Text>
              </View>
            ) : null}

            {practitioner.yearsExperience ? (
              <View style={styles.statItem}>
                <Ionicons
                  name="briefcase-outline"
                  size={12}
                  color={theme.colors.textSecondary}
                />
                <Text color={theme.colors.textSecondary} style={styles.statText}>
                  {i18n.language?.startsWith("ar")
                    ? `${practitioner.yearsExperience} سنة`
                    : `${practitioner.yearsExperience}y`}
                </Text>
              </View>
            ) : null}

            {price != null && price !== undefined ? (
              <View style={styles.priceTag}>
                <Text weight="600" style={styles.priceText}>
                  {new Intl.NumberFormat(
                    i18n.language?.startsWith("ar") ? "ar-SA" : "en-US",
                    {
                      style: "currency",
                      currency: currencyCode,
                      maximumFractionDigits: 0,
                    },
                  ).format(price)}
                </Text>
              </View>
            ) : null}
          </View>

          {practitioner.specialties.length > 0 && (
            <View style={styles.specialtyRow}>
              {practitioner.specialties.slice(0, 2).map((spec) => (
                <View
                  key={spec.specialtyId}
                  style={[
                    styles.specialtyTag,
                    { backgroundColor: theme.colors.surfaceSecondary },
                  ]}
                >
                  <Text style={styles.specialtyTagText} numberOfLines={1}>
                    {spec.title}
                  </Text>
                </View>
              ))}
              {practitioner.specialties.length > 2 && (
                <View
                  style={[
                    styles.specialtyTag,
                    { backgroundColor: theme.colors.surfaceSecondary },
                  ]}
                >
                  <Text style={styles.specialtyTagText}>
                    +{practitioner.specialties.length - 2}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        <View style={styles.arrowSection}>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={theme.colors.textMuted}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    flexDirection: "row",
    marginBottom: 10,
  },
  pulseBar: {
    width: 4,
  },
  cardContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  avatarSection: {
    marginRight: 10,
  },
  avatarContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 1,
    right: 1,
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: ONLINE_GREEN,
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  infoSection: {
    flex: 1,
    justifyContent: "center",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  name: {
    fontSize: 15,
    flex: 1,
    marginRight: 8,
  },
  onlineChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    gap: 4,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  onlineChipText: {
    fontSize: 11,
    fontWeight: "600",
  },
  title: {
    fontSize: 12,
    marginBottom: 5,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 5,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  statText: {
    fontSize: 12,
  },
  statMuted: {
    fontSize: 11,
  },
  priceTag: {
    marginLeft: "auto",
  },
  priceText: {
    fontSize: 13,
    color: FAIDED_BRAND,
  },
  specialtyRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
  },
  specialtyTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  specialtyTagText: {
    fontSize: 11,
    color: TAG_GRAY,
  },
  arrowSection: {
    paddingLeft: 6,
    alignSelf: "center",
  },
});