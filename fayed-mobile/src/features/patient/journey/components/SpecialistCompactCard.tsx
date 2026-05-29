import React, { useEffect, useState } from "react";
import { Dimensions, Image, StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text } from "../../../../components/ui";
import { useTheme } from "../../../../providers/ThemeProvider";
import type { PatientHomePractitionerItemDto } from "../types";

const viewportWidth = Dimensions.get("window").width;
const CARD_WIDTH = Math.max(260, Math.min(316, Math.round(viewportWidth * 0.78)));
const DEFAULT_AVATAR = require("../../../../../assets/user.avif");
const failedAvatarUrls = new Set<string>();

export function SpecialistCompactCard({
  item,
  locale,
  onPress,
  variant = "default",
  rank,
}: {
  item: PatientHomePractitionerItemDto;
  locale: string;
  onPress: () => void;
  variant?: "default" | "topRated" | "recentlyVisited" | "featured";
  rank?: number;
}) {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const isRTL = i18n.language?.startsWith("ar") ?? false;
  const [hasImageError, setHasImageError] = useState(false);
  const [isRemoteLoaded, setIsRemoteLoaded] = useState(false);
  const normalizedAvatarUrl = typeof item.avatarUrl === "string" ? item.avatarUrl.trim() : "";
  const hasRemoteAvatar = normalizedAvatarUrl.length > 0 && !failedAvatarUrls.has(normalizedAvatarUrl);

  useEffect(() => {
    setHasImageError(false);
    setIsRemoteLoaded(false);
  }, [normalizedAvatarUrl]);

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.borderLight,
        },
      ]}
    >
      <View style={[styles.identityRow, isRTL ? styles.rowRtl : null]}>
        <View style={styles.avatarWrap}>
          <Image source={DEFAULT_AVATAR} style={styles.avatar} />
          {hasRemoteAvatar && !hasImageError ? (
            <Image
              source={{ uri: normalizedAvatarUrl }}
              style={[styles.avatar, styles.remoteAvatarOverlay, !isRemoteLoaded ? styles.hiddenAvatar : null]}
              onLoad={() => setIsRemoteLoaded(true)}
              onError={() => {
                failedAvatarUrls.add(normalizedAvatarUrl);
                setHasImageError(true);
                setIsRemoteLoaded(false);
              }}
            />
          ) : null}
        </View>

        <View style={[styles.identityText, isRTL ? styles.alignEnd : null]}>
          {variant === "topRated" ? (
            <View style={[styles.topRatedHeader, isRTL ? styles.rowRtl : null]}>
              {rank ? (
                <View
                  style={[
                    styles.topRankBadge,
                    { backgroundColor: theme.colors.surfaceTertiary, borderColor: theme.colors.borderLight },
                  ]}
                >
                  <Text variant="caption" weight="700" color={theme.colors.textPrimary}>
                    #{rank}
                  </Text>
                </View>
              ) : null}
              {item.averageRating != null ? (
                <View
                  style={[
                    styles.topTrustBadge,
                    { backgroundColor: theme.colors.primaryLight, borderColor: theme.colors.primary },
                  ]}
                >
                  <Ionicons name="star" size={12} color="#EAB308" />
                  <Text variant="caption" weight="700" color={theme.colors.primary}>
                    {t("home.topRated.trustScore", { score: Math.round(Number(item.averageRating) * 20) })}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {variant === "recentlyVisited" ? (
            <View
              style={[
                styles.subtleBadge,
                isRTL ? styles.alignSelfEnd : styles.alignSelfStart,
                { backgroundColor: theme.colors.primaryLight },
              ]}
            >
              <Text variant="caption" weight="600" color={theme.colors.primary}>
                {t("home.recentlyVisited.badge")}
              </Text>
            </View>
          ) : null}
          {variant === "featured" ? (
            <View
              style={[
                styles.subtleBadge,
                isRTL ? styles.alignSelfEnd : styles.alignSelfStart,
                { backgroundColor: theme.colors.primaryLight },
              ]}
            >
              <Text variant="caption" weight="700" color={theme.colors.primary}>
                {item.badgeLabel || t("home.featured.badge")}
              </Text>
            </View>
          ) : null}

          <Text
            variant="body"
            weight="600"
            numberOfLines={1}
            style={isRTL ? styles.textRight : null}
          >
            {item.displayName || item.slug}
          </Text>
          <Text
            variant="caption"
            color={theme.colors.textSecondary}
            numberOfLines={2}
            style={[styles.subtitle, isRTL ? styles.textRight : null]}
          >
            {item.professionalTitle ||
              item.primarySpecialty ||
              t("home.nextSession.defaultSpecialty")}
          </Text>
        </View>
      </View>

      <View style={[styles.metaRow, isRTL ? styles.rowRtl : null]}>
        {item.averageRating != null && variant !== "topRated" ? (
          <View style={[styles.ratingWrap]}>
            <Ionicons name="star" size={12} color="#EAB308" />
            <Text variant="caption" color={theme.colors.textSecondary} weight="500">
              {item.averageRating.toFixed(1)}
            </Text>
          </View>
        ) : (
          <View />
        )}

        {(item.displaySessionPrice30 ?? item.displaySessionPrice60) != null ? (
          <Text variant="caption" weight="600" color={theme.colors.primary} numberOfLines={1}>
            {formatSpecialistPrice(item, locale)}
          </Text>
        ) : (
          <View />
        )}
      </View>
      {variant === "topRated" ? (
        <View style={[styles.reviewMetaRow, isRTL ? styles.rowRtl : null]}>
          <Text variant="caption" color={theme.colors.textSecondary} weight="500">
            {t("home.topRated.reviewsCount", { count: item.totalReviews ?? 0 })}
          </Text>
          <View style={styles.ratingHintRow}>
            <Ionicons name="shield-checkmark-outline" size={12} color={theme.colors.textSecondary} />
            <Text variant="caption" color={theme.colors.textSecondary}>
              {t("home.topRated.title")}
            </Text>
          </View>
        </View>
      ) : null}

      <View style={[styles.profileChip, { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]}>
        <Text variant="caption" weight="600" color="#FFFFFF">
          {t("discovery.list.viewProfile")}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export const SPECIALIST_CARD_WIDTH = CARD_WIDTH;
export const SPECIALIST_CARD_GAP = 12;

function formatSpecialistPrice(
  item: Pick<PatientHomePractitionerItemDto, "displaySessionPrice30" | "displaySessionPrice60">,
  locale: string,
) {
  const value = item.displaySessionPrice30 ?? item.displaySessionPrice60;
  if (value == null) {
    return "";
  }

  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }).format(value);
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    minHeight: 160,
  },
  identityRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  rowRtl: {
    flexDirection: "row-reverse",
  },
  identityText: {
    flex: 1,
  },
  alignEnd: {
    alignItems: "flex-end",
  },
  alignSelfStart: {
    alignSelf: "flex-start",
  },
  alignSelfEnd: {
    alignSelf: "flex-end",
  },
  textRight: {
    textAlign: "right",
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  avatarWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    overflow: "hidden",
  },
  remoteAvatarOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  hiddenAvatar: {
    opacity: 0,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    minHeight: 20,
  },
  ratingWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  trustBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  subtleBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 6,
  },
  rankChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  reviewMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  topRatedHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    width: "100%",
    marginBottom: 6,
  },
  topRankBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  topTrustBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingHintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  subtitle: {
    marginTop: 3,
    minHeight: 32,
  },
  profileChip: {
    marginTop: "auto",
    borderWidth: 1,
    borderRadius: 999,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
});
