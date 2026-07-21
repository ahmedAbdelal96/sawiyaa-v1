import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  I18nManager,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import {
  Card,
  ErrorState,
  Header,
  LoadingState,
  Screen,
  Text,
} from "../../../src/components/ui";
import { useTheme } from "../../../src/providers/ThemeProvider";
import {
  useGetPublicPractitionerDetails,
  useGetPublicPractitionerPresence,
} from "../../../src/features/patient/discovery/api";
import { useTrackPractitionerView } from "../../../src/features/patient/journey/hooks";
import { trackAnalyticsEvent } from "../../../src/lib/analytics";
import { PriceDisplay } from "../../../src/components/money";
import { parsePrice } from "../../../src/lib/money";

const FALLBACK_AVATAR = require("../../../assets/user.avif");

type CountryLabel = { ar: string; en: string };

const COUNTRY_LABELS: Record<string, CountryLabel> = {
  EG: { ar: "مصر", en: "Egypt" },
  SA: { ar: "المملكة العربية السعودية", en: "Saudi Arabia" },
  AE: { ar: "الإمارات العربية المتحدة", en: "United Arab Emirates" },
  KW: { ar: "الكويت", en: "Kuwait" },
  JO: { ar: "الأردن", en: "Jordan" },
};

const LANGUAGE_LABELS: Record<string, { ar: string; en: string }> = {
  ar: { ar: "العربية", en: "Arabic" },
  en: { ar: "الإنجليزية", en: "English" },
  fr: { ar: "الفرنسية", en: "French" },
};

function resolveCountryLabel(
  code: string | null | undefined,
  isArabicUi: boolean,
) {
  const normalized = (code ?? "").trim().toUpperCase();
  if (!normalized) {
    return null;
  }

  const match = COUNTRY_LABELS[normalized];
  if (match) {
    return isArabicUi ? match.ar : match.en;
  }

  return normalized;
}

function resolveLanguageLabel(code: string, isArabicUi: boolean) {
  const normalized = code.trim().toLowerCase();
  const match = LANGUAGE_LABELS[normalized];
  if (match) {
    return isArabicUi ? match.ar : match.en;
  }

  return code;
}

function SectionHeader({
  title,
  icon,
  iconBg,
  isRtl,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: "primary" | "soft";
  isRtl: boolean;
}) {
  const { theme } = useTheme();

  return (
    <View style={styles.sectionHeaderRow}>
      {/* Icon container — always on the leading side */}
      <View
        style={[
          styles.sectionIconWrap,
          {
            backgroundColor:
              iconBg === "primary"
                ? theme.colors.primaryLight
                : theme.colors.surfaceTertiary,
            borderColor: theme.colors.borderLight,
          },
        ]}
      >
        <Ionicons name={icon} size={18} color={theme.colors.primary} />
      </View>

      {/* Title — aligned opposite side, text direction-aware */}
      <Text
        weight="600"
        style={[
          styles.sectionTitle,
          isRtl ? { textAlign: "right", marginStart: 0, marginEnd: "auto" } : { textAlign: "left", marginStart: "auto", marginEnd: 0 },
        ]}
      >
        {title}
      </Text>
    </View>
  );
}

export default function TherapistProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const isArabicUi = i18n.language?.startsWith("ar") ?? false;
  const locale = isArabicUi ? "ar-SA" : "en-US";
  const isRtl = I18nManager.isRTL;

  const { slug, source, intent } = useLocalSearchParams<{
    slug: string;
    source?: string;
    intent?: string;
  }>();

  const bookingNavigationLockRef = useRef(false);
  const profileViewedRef = useRef(false);
  const trackedProfileViewRef = useRef<string | null>(null);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const trackPractitionerViewMutation = useTrackPractitionerView();

  const { data, isLoading, isError, refetch } = useGetPublicPractitionerDetails(
    slug || null,
  );
  const presenceQuery = useGetPublicPractitionerPresence(slug || null);

  const practitioner = data?.data.item ?? null;
  const presence = presenceQuery.data?.data.presence ?? null;
  const isPresenceAvailable = presence?.status === "ONLINE";

  const displayCurrencyCode = practitioner?.currencyCode ?? null;
  const thirtyMinutePrice = practitioner?.sessionPrice30 ?? null;
  const sixtyMinutePrice = practitioner?.sessionPrice60 ?? null;

  const thirtyMinutePriceState = parsePrice({
    priceStatus: "PAID",
    priceAmount: thirtyMinutePrice == null ? null : String(thirtyMinutePrice),
    currencyCode: displayCurrencyCode,
  });
  const sixtyMinutePriceState = parsePrice({
    priceStatus: "PAID",
    priceAmount: sixtyMinutePrice == null ? null : String(sixtyMinutePrice),
    currencyCode: displayCurrencyCode,
  });

  const countryLabel = resolveCountryLabel(
    practitioner?.countryCode ?? null,
    isArabicUi,
  );

  const languagesLabel = useMemo(() => {
    const languages = practitioner?.languages ?? [];
    const resolved = languages
      .map((code) => resolveLanguageLabel(code, isArabicUi))
      .filter((value) => value && value.trim().length > 0);

    if (resolved.length === 0) {
      return null;
    }

    return resolved.join(isArabicUi ? "، " : ", ");
  }, [isArabicUi, practitioner?.languages]);

  const handleChooseTime = useCallback(() => {
    if (!slug || !practitioner) {
      return;
    }

    if (bookingNavigationLockRef.current) {
      return;
    }

    bookingNavigationLockRef.current = true;
    trackAnalyticsEvent("booking_started", {
      practitionerSlug: practitioner.slug,
      source: "practitioner_profile",
      intent: intent || "view",
    });

    router.push({
      pathname: "/(patient)/sessions/select-time",
      params: {
        slug,
        practitionerName: practitioner.displayName || practitioner.slug,
        practitionerTitle:
          practitioner.professionalTitle ||
          t("discovery.profile.professionalFallback"),
        practitionerAvatarUrl: practitioner.avatarUrl || "",
      },
    });
  }, [intent, practitioner, router, slug, t]);

  useEffect(() => {
    if (!slug || typeof slug !== "string") {
      return;
    }

    if (!practitioner || trackedProfileViewRef.current === slug) {
      return;
    }

    trackedProfileViewRef.current = slug;
    trackPractitionerViewMutation.mutate(slug, {
      onError: (error) => {
        if (__DEV__) {
          // Silent in production by product requirement.
          console.warn("Failed to track practitioner view", error);
        }
      },
    });
  }, [practitioner, slug, trackPractitionerViewMutation]);

  useEffect(() => {
    if (profileViewedRef.current || !practitioner) {
      return;
    }

    profileViewedRef.current = true;
    trackAnalyticsEvent("practitioner_profile_viewed", {
      practitionerSlug: practitioner.slug,
      source: source || "browse",
      intent: intent || "view",
      specialtiesCount: practitioner.specialties.length,
      hasPricing: thirtyMinutePriceState.status === "PAID" || sixtyMinutePriceState.status === "PAID",
    });
  }, [intent, practitioner, source, sixtyMinutePriceState.status, thirtyMinutePriceState.status]);

  const headerTitle = t("discovery.profile.screenTitle", {
    defaultValue: isArabicUi ? "ملف المختص" : "Practitioner Profile",
  });

  if (isLoading) {
    return (
      <Screen bg="background" style={styles.screen} edges={["top", "left", "right"]}>
        <Header showBack title={headerTitle} />
        <LoadingState fullScreen />
      </Screen>
    );
  }

  if (isError || !practitioner) {
    return (
      <Screen bg="background" style={styles.screen} edges={["top", "left", "right"]}>
        <Header showBack title={headerTitle} />
        <ErrorState fullScreen onRetry={refetch} />
      </Screen>
    );
  }

  const displayName = practitioner.displayName || practitioner.slug;
  const displayTitle =
    practitioner.professionalTitle || t("discovery.profile.professionalFallback");

  const verified = Boolean(practitioner.isVerified);

  const averageRating = practitioner.ratingSummary?.averageRating ?? null;
  const totalReviews = practitioner.ratingSummary?.totalReviews ?? null;
  const yearsExperience = practitioner.yearsExperience ?? null;
  const approvedCredentials = practitioner.credentialsSummary?.approvedCredentials ?? null;

  const specialties = practitioner.specialties ?? [];
  const primarySpecialties = specialties.filter((spec) => spec.isPrimary);
  const orderedSpecialties = primarySpecialties.length > 0 ? primarySpecialties : specialties;
  const visibleSpecialties = orderedSpecialties.slice(0, 4);
  const remainingSpecialtiesCount = Math.max(orderedSpecialties.length - visibleSpecialties.length, 0);

  const fullBio = practitioner.fullBio?.trim() ?? "";
  const bioPreview = fullBio.length > 260 ? `${fullBio.slice(0, 260).trim()}…` : fullBio;
  const bioToShow = bioExpanded ? fullBio : bioPreview;
  const hasLongBio = fullBio.length > 260;

  return (
    <Screen bg="background" style={styles.screen} edges={["top", "left", "right"]}>
      <Header showBack title={headerTitle} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 16) + 118 },
        ]}
      >
        <Card variant="elevated" padding="md" style={styles.identityCard}>
          <View
            pointerEvents="none"
            style={[
              styles.avatarHalo,
              { backgroundColor: theme.colors.surfaceTertiary },
              isRtl ? { left: 18 } : { right: 18 },
            ]}
          />
          <View style={[styles.identityTopRow, isRtl ? styles.identityTopRowRtl : null]}>
            <View style={styles.presenceRow}>
              <View
                style={[
                  styles.presencePill,
                  {
                    backgroundColor: isPresenceAvailable
                      ? theme.colors.successLight
                      : theme.colors.surface,
                    borderColor: isPresenceAvailable
                      ? theme.colors.success
                      : theme.colors.borderLight,
                  },
                ]}
              >
                <View
                  style={[
                    styles.presenceDot,
                    {
                      backgroundColor: isPresenceAvailable
                        ? theme.colors.success
                        : theme.colors.textMuted,
                    },
                  ]}
                />
                <Text
                  weight="600"
                  color={isPresenceAvailable ? theme.colors.success : theme.colors.textSecondary}
                  style={styles.presenceText}
                >
                  {isPresenceAvailable
                    ? t("discovery.profile.statusAvailable", {
                        defaultValue: isArabicUi ? "متاح الآن" : "Available now",
                      })
                    : t("discovery.profile.statusUnavailable", {
                        defaultValue: isArabicUi ? "غير متاح الآن" : "Unavailable right now",
                      })}
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.avatarWrap,
                {
                  backgroundColor: theme.colors.surfaceTertiary,
                  borderColor: theme.colors.surface,
                },
              ]}
            >
              {practitioner.avatarUrl && practitioner.avatarUrl.trim() && !avatarFailed ? (
                <Image
                  source={{ uri: practitioner.avatarUrl }}
                  style={styles.avatar}
                  onError={() => setAvatarFailed(true)}
                />
              ) : (
                <Image source={FALLBACK_AVATAR} style={styles.avatar} />
              )}
            </View>
          </View>

          <View style={styles.identityNameRow}>
            <View style={[styles.nameLine, isRtl ? styles.nameLineRtl : null]}>
              <Text weight="bold" style={styles.displayName} numberOfLines={1}>
                {displayName}
              </Text>
              {verified ? (
                <View
                  style={[
                    styles.verifiedBadge,
                    { backgroundColor: theme.colors.primaryLight },
                  ]}
                >
                  <Ionicons
                    name="checkmark"
                    size={14}
                    color={theme.colors.primary}
                  />
                </View>
              ) : null}
            </View>
            <Text
              color={theme.colors.textSecondary}
              style={styles.professionalTitle}
              numberOfLines={2}
            >
              {displayTitle}
            </Text>
          </View>

          <View
            style={[
              styles.statsStrip,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.borderLight,
                flexDirection: isRtl ? "row-reverse" : "row",
              },
            ]}
          >
            <View style={styles.statCell}>
              <View style={styles.statTopRow}>
                <Ionicons
                  name="briefcase-outline"
                  size={16}
                  color={theme.colors.textMuted}
                />
                <Text weight="bold" style={styles.statValue}>
                  {yearsExperience ? `+${yearsExperience}` : "--"}
                </Text>
              </View>
              <Text color={theme.colors.textSecondary} style={styles.statLabel}>
                {t("discovery.profile.yearsExp")}
              </Text>
            </View>

            <View
              style={[
                styles.statDivider,
                { backgroundColor: theme.colors.borderLight },
              ]}
            />

            <View style={styles.statCell}>
              <View style={styles.statTopRow}>
                <Ionicons
                  name="star"
                  size={16}
                  color={theme.colors.secondary}
                />
                <Text weight="bold" style={styles.statValue}>
                  {averageRating != null ? averageRating.toFixed(1) : "--"}
                </Text>
              </View>
              <Text color={theme.colors.textSecondary} style={styles.statLabel}>
                {totalReviews != null
                  ? t("discovery.profile.reviews", { count: totalReviews })
                  : t("discovery.profile.reviews", { count: 0 })}
              </Text>
            </View>

            <View
              style={[
                styles.statDivider,
                { backgroundColor: theme.colors.borderLight },
              ]}
            />

            <View style={styles.statCell}>
              <View style={styles.statTopRow}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={16}
                  color={theme.colors.textMuted}
                />
                <Text weight="bold" style={styles.statValue}>
                  {typeof approvedCredentials === "number"
                    ? approvedCredentials.toString()
                    : "--"}
                </Text>
              </View>
              <Text color={theme.colors.textSecondary} style={styles.statLabel}>
                {t("discovery.profile.credentials")}
              </Text>
            </View>
          </View>
        </Card>

        <Card variant="elevated" padding="md" style={styles.sectionCard}>
          <SectionHeader
            title={t("discovery.profile.specialties", {
              defaultValue: isArabicUi ? "التخصصات" : "Specialties",
            })}
            icon="ribbon-outline"
            iconBg="primary"
            isRtl={isRtl}
          />

          {visibleSpecialties.length > 0 ? (
            <View style={[styles.chipsRow, isRtl ? styles.chipsRowRtl : null]}>
              {visibleSpecialties.map((spec) => (
                <View
                  key={spec.specialtyId}
                  style={[
                    styles.chip,
                    { backgroundColor: theme.colors.primaryLight },
                  ]}
                >
                  <Text
                    color={theme.colors.textBrand}
                    weight="600"
                    style={styles.chipText}
                    numberOfLines={1}
                  >
                    {spec.title || spec.slug}
                  </Text>
                </View>
              ))}
              {remainingSpecialtiesCount > 0 ? (
                <View
                  style={[
                    styles.chip,
                    { backgroundColor: theme.colors.surfaceTertiary },
                  ]}
                >
                  <Text
                    color={theme.colors.textSecondary}
                    weight="600"
                    style={styles.chipText}
                  >
                    +{remainingSpecialtiesCount}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : (
            <Text color={theme.colors.textMuted} style={styles.emptyNote}>
              {t("discovery.profile.specialtiesEmpty", {
                defaultValue: isArabicUi
                  ? "لا توجد تخصصات منشورة بعد."
                  : "No specialties have been published yet.",
              })}
            </Text>
          )}
        </Card>

        <Card variant="elevated" padding="md" style={styles.sectionCard}>
          <SectionHeader
            title={t("discovery.profile.languages", {
              defaultValue: isArabicUi ? "اللغات" : "Languages",
            })}
            icon="globe-outline"
            iconBg="soft"
            isRtl={isRtl}
          />

          <Text style={[styles.valueText, isRtl ? styles.valueTextRtl : null]}>
            {languagesLabel ?? t("discovery.profile.languagesFallback")}
          </Text>

          <View
            style={[
              styles.metaRow,
              isRtl ? styles.metaRowRtl : null,
              { borderTopColor: theme.colors.borderLight },
            ]}
          >
            <View style={styles.metaTextColumn}>
              <Text color={theme.colors.textMuted} style={styles.metaLabel}>
                {t("discovery.profile.countryLabel", {
                  defaultValue: isArabicUi ? "البلد" : "Country",
                })}
              </Text>
              <Text style={[styles.valueText, isRtl ? styles.valueTextRtl : null]}>
                {countryLabel ?? t("discovery.profile.countryFallback")}
              </Text>
            </View>
            <View
              style={[
                styles.metaIconWrap,
                {
                  backgroundColor: theme.colors.surfaceTertiary,
                  borderColor: theme.colors.borderLight,
                },
              ]}
            >
              <Ionicons
                name="location-outline"
                size={18}
                color={theme.colors.primary}
              />
            </View>
          </View>
        </Card>

        <Card variant="elevated" padding="md" style={styles.sectionCard}>
          <SectionHeader
            title={t("discovery.profile.aboutPractitioner", {
              defaultValue: isArabicUi ? "عن المختص" : "About",
            })}
            icon="document-text-outline"
            iconBg="primary"
            isRtl={isRtl}
          />

          {fullBio ? (
            <>
              <Text
                color={theme.colors.textSecondary}
                style={[styles.bioText, isRtl ? styles.bioTextRtl : null]}
              >
                {bioToShow}
              </Text>

              {hasLongBio ? (
                <TouchableOpacity
                  onPress={() => setBioExpanded((current) => !current)}
                  activeOpacity={0.85}
                  style={[
                    styles.readMoreButton,
                    { borderColor: theme.colors.borderLight },
                  ]}
                >
                  <Text
                    color={theme.colors.textBrand}
                    weight="600"
                    style={styles.readMoreText}
                  >
                    {bioExpanded
                      ? t("discovery.profile.showLess", {
                          defaultValue: isArabicUi ? "عرض أقل" : "Show less",
                        })
                      : t("discovery.profile.showMore", {
                          defaultValue: isArabicUi ? "عرض المزيد" : "Show more",
                        })}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </>
          ) : (
            <Text color={theme.colors.textMuted} style={styles.emptyNote}>
              {t("discovery.profile.aboutEmpty", {
                defaultValue: isArabicUi
                  ? "لم يضف المختص نبذة بعد."
                  : "This practitioner has not added a bio yet.",
              })}
            </Text>
          )}
        </Card>

        <Card variant="elevated" padding="md" style={styles.sectionCard}>
          <SectionHeader
            title={t("discovery.profile.pricing", {
              defaultValue: isArabicUi ? "أسعار الجلسات" : "Session prices",
            })}
            icon="pricetag-outline"
            iconBg="soft"
            isRtl={isRtl}
          />

          <View style={styles.pricesStack}>
            <View
              style={[
                styles.priceRow,
                isRtl ? styles.priceRowRtl : null,
                { borderColor: theme.colors.borderLight },
              ]}
            >
              <View style={styles.priceRightBlock}>
                <View
                  style={[
                    styles.priceIconWrap,
                    {
                      backgroundColor: theme.colors.surfaceTertiary,
                      borderColor: theme.colors.borderLight,
                    },
                  ]}
                >
                  <Ionicons
                    name="time-outline"
                    size={18}
                    color={theme.colors.primary}
                  />
                </View>
                <Text weight="600" style={styles.priceLabel}>
                  {t("discovery.profile.duration30", {
                    defaultValue: isArabicUi ? "جلسة 30 دقيقة" : "30-minute session",
                  })}
                </Text>
              </View>

              <PriceDisplay
                price={thirtyMinutePriceState}
                weight="bold"
                color={theme.colors.textBrand}
                style={styles.priceValue}
                numberOfLines={1}
              />
            </View>

            <View
              style={[
                styles.priceRow,
                isRtl ? styles.priceRowRtl : null,
                { borderColor: theme.colors.borderLight },
              ]}
            >
              <View style={styles.priceRightBlock}>
                <View
                  style={[
                    styles.priceIconWrap,
                    {
                      backgroundColor: theme.colors.surfaceTertiary,
                      borderColor: theme.colors.borderLight,
                    },
                  ]}
                >
                  <Ionicons
                    name="hourglass-outline"
                    size={18}
                    color={theme.colors.primary}
                  />
                </View>
                <Text weight="600" style={styles.priceLabel}>
                  {t("discovery.profile.duration60", {
                    defaultValue: isArabicUi ? "جلسة 60 دقيقة" : "60-minute session",
                  })}
                </Text>
              </View>

              <PriceDisplay
                price={sixtyMinutePriceState}
                weight="bold"
                color={theme.colors.textBrand}
                style={styles.priceValue}
                numberOfLines={1}
              />
            </View>
          </View>
        </Card>
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          {
            paddingBottom: Math.max(insets.bottom, 12),
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={handleChooseTime}
          disabled={!slug}
          style={[
            styles.bottomCta,
            {
              backgroundColor: theme.colors.primary,
              opacity: slug ? 1 : 0.6,
              flexDirection: isRtl ? "row-reverse" : "row",
            },
          ]}
        >
          <Ionicons
            name="calendar-outline"
            size={20}
            color={theme.colors.surface}
          />
          <Text
            color={theme.colors.surface}
            weight="600"
            style={styles.bottomCtaText}
          >
            {t("discovery.profile.chooseTimeCta", {
              defaultValue: isArabicUi ? "اختر موعدًا" : "Choose a time",
            })}
          </Text>
          <Ionicons
            name={isRtl ? "arrow-back" : "arrow-forward"}
            size={18}
            color={theme.colors.surface}
          />
        </TouchableOpacity>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 0,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 12,
    gap: 10,
  },
  identityCard: {
    borderRadius: 20,
  },
  avatarHalo: {
    position: "absolute",
    top: 12,
    width: 80,
    height: 80,
    borderRadius: 999,
    opacity: 0.45,
  },
  identityTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  presenceRow: {
    flex: 1,
  },
  presencePill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  presenceDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
  },
  presenceText: {
    fontSize: 11,
  },
  avatarWrap: {
    width: 66,
    height: 66,
    borderRadius: 999,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0,
  },
  avatar: {
    width: 66,
    height: 66,
    borderRadius: 999,
  },
  identityNameRow: {
    marginBottom: 0,
  },
  nameLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  displayName: {
    fontSize: 22,
    lineHeight: 28,
    flex: 1,
  },
  verifiedBadge: {
    width: 22,
    height: 22,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  professionalTitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
  },
  statsStrip: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 10,
  },
  statCell: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  statTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  statValue: {
    fontSize: 15,
    lineHeight: 20,
  },
  statLabel: {
    fontSize: 11,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    alignSelf: "stretch",
  },
  sectionCard: {
    borderRadius: 18,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    lineHeight: 20,
  },
  sectionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    maxWidth: "100%",
  },
  chipText: {
    fontSize: 12,
  },
  valueText: {
    fontSize: 14,
    lineHeight: 20,
  },
  emptyNote: {
    fontSize: 13,
    lineHeight: 20,
  },
  metaRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  metaTextColumn: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 11,
    marginBottom: 3,
  },
  metaIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  bioText: {
    fontSize: 13,
    lineHeight: 21,
  },
  readMoreButton: {
    marginTop: 10,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  readMoreText: {
    fontSize: 12,
  },
  pricesStack: {
    gap: 8,
  },
  priceRow: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  priceRightBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  priceIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  priceLabel: {
    fontSize: 13,
    lineHeight: 18,
  },
  priceValue: {
    fontSize: 17,
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  bottomCta: {
    borderRadius: 20,
    minHeight: 52,
    paddingHorizontal: 16,
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 8,
  },
  bottomCtaText: {
    fontSize: 15,
    flex: 1,
    textAlign: "center",
  },
  // ── RTL variants ──────────────────────────────────────────────────
  sectionHeaderRowRtl: {
    flexDirection: "row-reverse",
  },
  sectionTitleRtl: {
    textAlign: "right",
  },
  identityTopRowRtl: {
    flexDirection: "row-reverse",
  },
  chipsRowRtl: {
    flexDirection: "row-reverse",
  },
  metaRowRtl: {
    flexDirection: "row-reverse",
  },
  priceRowRtl: {
    flexDirection: "row-reverse",
  },
  bioTextRtl: {
    textAlign: "right",
  },
  valueTextRtl: {
    textAlign: "right",
  },
  nameLineRtl: {
    flexDirection: "row-reverse",
  },
});
