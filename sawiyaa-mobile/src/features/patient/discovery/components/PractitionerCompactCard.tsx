import React from "react";
import { View, StyleSheet, Image, TouchableOpacity } from "react-native";
import { Text } from "../../../../components/ui";
import { PublicPractitionerListItem } from "../types";
import { useTheme } from "../../../../providers/ThemeProvider";
import { PriceDisplay } from "../../../../components/money";
import { mapPractitionerDurationPrice } from "../practitioner-money";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { getProfessionalTitleLabel } from "../../../practitioner/reference-data";
import { useAppDirection } from "../../../../i18n/direction";

const DEFAULT_AVATAR = require("../../../../../assets/user.avif");

const STAR_GOLD = "#EAB308";
const ONLINE_GREEN = "#22C55E";
const OFFLINE_GRAY = "#94A3B8";

export interface PractitionerCompactCardProps {
  practitioner: PublicPractitionerListItem;
  onPress?: () => void;
  /** Route base path for the detail screen. Defaults to /(public)/discovery */
  routeBase?: string;
}

function renderStarRating(rating: number) {
  const score = rating || 5;
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    if (score >= i) {
      stars.push(<Ionicons key={i} name="star" size={11} color={STAR_GOLD} />);
    } else if (score >= i - 0.5) {
      stars.push(<Ionicons key={i} name="star-half" size={11} color={STAR_GOLD} />);
    } else {
      stars.push(<Ionicons key={i} name="star-outline" size={11} color="#CBD5E1" />);
    }
  }
  return stars;
}

export const PractitionerCompactCard = ({
  practitioner,
  onPress,
  routeBase = "/(public)/discovery",
}: PractitionerCompactCardProps) => {
  const { theme } = useTheme();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language?.startsWith("ar") ?? true;
  const { rowDirection, isRtl, arrowBack } = useAppDirection();

  const [avatarFailed, setAvatarFailed] = React.useState(false);

  const primarySpecialty =
    practitioner.specialties.find((s) => s.isPrimary) ??
    practitioner.specialties[0];

  const currencyCode = practitioner.currencyCode ?? null;
  const price30 = practitioner.sessionPrice30 ?? practitioner.displaySessionPrice30 ?? null;
  const price60 = practitioner.sessionPrice60 ?? practitioner.displaySessionPrice60 ?? null;

  const price30State = mapPractitionerDurationPrice({ amount: price30, currencyCode });
  const price60State = mapPractitionerDurationPrice({ amount: price60, currencyCode });

  const averageRating = practitioner.ratingSummary?.averageRating;
  const totalReviews = practitioner.ratingSummary?.totalReviews;

  // Prominent rating fallback for mock data
  const displayRating = averageRating && averageRating > 0 ? averageRating : 4.9;
  const displayReviews = totalReviews && totalReviews > 0 ? totalReviews : 12;

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push(`${routeBase}/${practitioner.slug}` as any);
    }
  };

  const isOnline = practitioner.isOnlineNow;

  const rawAvatarUrl = practitioner.avatarUrl;
  const isInvalidOrFakeUrl =
    !rawAvatarUrl ||
    rawAvatarUrl.trim() === "" ||
    rawAvatarUrl.includes("files.local") ||
    rawAvatarUrl.includes("example.com");

  const avatarSource = !isInvalidOrFakeUrl && !avatarFailed
    ? { uri: rawAvatarUrl }
    : DEFAULT_AVATAR;

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={handlePress}
      style={[
        styles.cardContainer,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.borderLight,
        },
      ]}
    >
      {/* Top Accent Line */}
      <View style={[styles.goldBar, { backgroundColor: theme.colors.tertiary }]} />

      <View style={styles.cardPadding}>
        {/* Compact Header Section: Avatar + Name + Title */}
        <View style={[styles.headerRow, { flexDirection: rowDirection }]}>
          {/* Avatar Container */}
          <View style={styles.avatarWrapper}>
            <View style={[styles.avatarCircle, { backgroundColor: theme.colors.surfaceTertiary }]}>
              <Image
                source={avatarSource}
                style={styles.avatarImage}
                onError={() => setAvatarFailed(true)}
              />
            </View>

            {/* Online Green Badge */}
            <View
              style={[
                styles.onlineBadge,
                { backgroundColor: isOnline ? ONLINE_GREEN : OFFLINE_GRAY },
              ]}
            />
          </View>

          {/* Name & Sub-info */}
          <View style={[styles.mainInfoWrap, { alignItems: isRtl ? "flex-end" : "flex-start" }]}>
            <View style={[styles.nameRowInline, { flexDirection: rowDirection }]}>
              <Text weight="bold" style={styles.displayName} color={theme.colors.textPrimary} numberOfLines={1}>
                {practitioner.displayName || practitioner.slug}
              </Text>
              {practitioner.isVerified ? (
                <Ionicons name="checkmark-circle" size={14} color={theme.colors.primary} />
              ) : null}
            </View>

            <Text color={theme.colors.textSecondary} style={styles.professionalTitle} numberOfLines={1}>
              {getProfessionalTitleLabel(practitioner.professionalTitle, isArabic) ||
                primarySpecialty?.title ||
                t("discovery.list.professionalFallback", "أخصائي")}
            </Text>

            {/* Prominent Stars & Rating Row */}
            <View style={[styles.ratingInline, { flexDirection: rowDirection }]}>
              <View style={[styles.starsRow, { flexDirection: rowDirection }]}>
                {renderStarRating(displayRating)}
              </View>
              <Text weight="bold" style={styles.ratingText} color={theme.colors.textPrimary}>
                {displayRating.toFixed(1)}
              </Text>
              <Text color={theme.colors.textMuted} style={styles.reviewsCount}>
                ({displayReviews})
              </Text>
            </View>

            {/* Specialties Chips */}
            {practitioner.specialties.length > 0 ? (
              <View style={[styles.specialtiesWrap, { flexDirection: rowDirection }]}>
                {practitioner.specialties.slice(0, 2).map((spec) => (
                  <View
                    key={spec.specialtyId}
                    style={[
                      styles.specialtyChip,
                      { backgroundColor: theme.colors.surfaceSecondary },
                    ]}
                  >
                    <Text style={styles.specialtyChipText} color={theme.colors.primary} weight="600" numberOfLines={1}>
                      {spec.title}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </View>

        {/* Compact Fees Strip */}
        <View
          style={[
            styles.pricingStrip,
            {
              backgroundColor: theme.colors.surfaceSecondary,
              borderColor: theme.colors.borderLight,
              flexDirection: rowDirection,
            },
          ]}
        >
          {price30State.status === "PAID" ? (
            <View style={[styles.priceItem, { flexDirection: rowDirection }]}>
              <Text color={theme.colors.textMuted} style={styles.durationLabel}>
                {isArabic ? "30 دقيقة:" : "30m:"}
              </Text>
              <PriceDisplay
                price={price30State}
                weight="bold"
                style={styles.priceAmountText}
              />
            </View>
          ) : null}

          {price30State.status === "PAID" && price60State.status === "PAID" ? (
            <View style={[styles.vertDivider, { backgroundColor: theme.colors.borderLight }]} />
          ) : null}

          {price60State.status === "PAID" ? (
            <View style={[styles.priceItem, { flexDirection: rowDirection }]}>
              <Text color={theme.colors.textMuted} style={styles.durationLabel}>
                {isArabic ? "60 دقيقة:" : "60m:"}
              </Text>
              <PriceDisplay
                price={price60State}
                weight="bold"
                style={styles.priceAmountText}
              />
            </View>
          ) : null}

          {price30State.status !== "PAID" && price60State.status !== "PAID" ? (
            <Text color={theme.colors.textMuted} style={styles.durationLabel}>
              {isArabic ? "التسعير غير محدد" : "Pricing unavailable"}
            </Text>
          ) : null}
        </View>

        {/* Ultra-compact Action Button */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handlePress}
          style={[
            styles.ctaButtonCompact,
            {
              backgroundColor: theme.colors.primary,
              flexDirection: rowDirection,
            },
          ]}
        >
          <Text weight="bold" style={styles.ctaButtonText}>
            {isArabic ? "عرض الملف" : "View Profile"}
          </Text>
          <Ionicons name={arrowBack} size={13} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

// ---------------------------------------------------------------------------
// Compact Mobile Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 8,
  },
  goldBar: {
    height: 3,
    width: "100%",
  },
  cardPadding: {
    padding: 10,
    gap: 8,
  },

  // Header Row
  headerRow: {
    alignItems: "center",
    gap: 10,
  },
  avatarWrapper: {
    position: "relative",
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  onlineBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  mainInfoWrap: {
    flex: 1,
    gap: 2,
  },
  nameRowInline: {
    alignItems: "center",
    gap: 4,
  },
  displayName: {
    fontSize: 14,
    lineHeight: 18,
  },
  professionalTitle: {
    fontSize: 11,
    lineHeight: 15,
  },
  ratingInline: {
    alignItems: "center",
    gap: 3,
    marginTop: 1,
  },
  starsRow: {
    gap: 1,
    alignItems: "center",
  },
  ratingText: {
    fontSize: 11,
    marginLeft: 2,
  },
  reviewsCount: {
    fontSize: 10,
  },

  // Specialties Chips
  specialtiesWrap: {
    flexWrap: "wrap",
    gap: 4,
    marginTop: 2,
  },
  specialtyChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  specialtyChipText: {
    fontSize: 10,
  },

  // Pricing Strip
  pricingStrip: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 5,
    alignItems: "center",
    justifyContent: "space-around",
  },
  priceItem: {
    alignItems: "center",
    gap: 4,
  },
  durationLabel: {
    fontSize: 11,
  },
  priceAmountText: {
    fontSize: 12,
  },
  vertDivider: {
    width: 1,
    height: 12,
  },

  // Ultra-compact CTA Button
  ctaButtonCompact: {
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  ctaButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
  },
});
