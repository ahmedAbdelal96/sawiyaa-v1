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
import { usePublicPractitionerPackagePlans } from "../../../src/features/patient/package-plans/hooks";
import { useTrackPractitionerView } from "../../../src/features/patient/journey/hooks";
import { useAuth } from "../../../src/providers/AuthProvider";
import { trackAnalyticsEvent } from "../../../src/lib/analytics";
import { PriceDisplay } from "../../../src/components/money";
import { parseMoney, formatMoney as formatCentralMoney } from "../../../src/lib/money";
import { mapPractitionerDurationPrice } from "../../../src/features/patient/discovery/practitioner-money";
import { getProfessionalTitleLabel } from "../../../src/features/practitioner/reference-data";
import { useAppDirection } from "../../../src/i18n/direction";
import { hasPublicPractitionerRating } from "../../../src/features/patient/discovery/rating";

const DEFAULT_AVATAR = require("../../../assets/user.avif");
const STAR_GOLD = "#EAB308";
const ONLINE_GREEN = "#22C55E";
const OFFLINE_GRAY = "#94A3B8";

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

function resolveCountryLabel(code: string | null | undefined, isArabicUi: boolean) {
  const normalized = (code ?? "").trim().toUpperCase();
  if (!normalized) return null;
  const match = COUNTRY_LABELS[normalized];
  return match ? (isArabicUi ? match.ar : match.en) : normalized;
}

function resolveLanguageLabel(code: string, isArabicUi: boolean) {
  const normalized = code.trim().toLowerCase();
  const match = LANGUAGE_LABELS[normalized];
  return match ? (isArabicUi ? match.ar : match.en) : code;
}

function formatPackageMoney(
  amount: number | string | null | undefined,
  currency: string | null | undefined,
  locale: string,
): string {
  if (!amount) return "-";
  const money = parseMoney(String(amount), currency || "EGP");
  return money ? formatCentralMoney(money, locale) : `${amount} ${currency || "EGP"}`;
}

function SectionHeader({
  title,
  icon,
  iconBg,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: "primary" | "soft";
}) {
  const { theme } = useTheme();
  const { rowDirection } = useAppDirection();

  return (
    <View style={[styles.sectionHeaderRow, { flexDirection: rowDirection }]}>
      <View
        style={[
          styles.sectionIconWrap,
          {
            backgroundColor:
              iconBg === "primary"
                ? theme.colors.primarySoft
                : theme.colors.surfaceTertiary,
            borderColor: theme.colors.borderLight,
          },
        ]}
      >
        <Ionicons name={icon} size={18} color={theme.colors.primary} />
      </View>

      <Text weight="bold" style={styles.sectionTitle} color={theme.colors.textPrimary}>
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
  const isArabicUi = i18n.language?.startsWith("ar") ?? true;
  const locale = isArabicUi ? "ar-SA" : "en-US";
  const { isRtl, rowDirection, arrowBack } = useAppDirection();

  const authContext = useAuth();
  const isAuthenticated = Boolean(authContext?.user);

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

  // Query practitioner's package plans
  const packagePlansQuery = usePublicPractitionerPackagePlans(slug || null);
  const fetchedPlans = packagePlansQuery.data?.items ?? [];
  const hasPackagePlans = fetchedPlans.length > 0;

  const rawAvatarUrl = practitioner?.avatarUrl;
  const isInvalidOrFakeUrl =
    !rawAvatarUrl ||
    rawAvatarUrl.trim() === "" ||
    rawAvatarUrl.includes("files.local") ||
    rawAvatarUrl.includes("example.com");

  const avatarSource = !isInvalidOrFakeUrl && !avatarFailed
    ? { uri: rawAvatarUrl }
    : DEFAULT_AVATAR;

  const isPresenceAvailable = presenceQuery.data?.data?.presence?.status === "ONLINE";

  const thirtyMinutePriceState = useMemo(() => {
    const rawPrice =
      practitioner?.sessionPrice30 ?? practitioner?.displaySessionPrice30 ?? null;
    return mapPractitionerDurationPrice({
      amount: rawPrice,
      currencyCode: practitioner?.currencyCode ?? null,
    });
  }, [practitioner]);

  const sixtyMinutePriceState = useMemo(() => {
    const rawPrice =
      practitioner?.sessionPrice60 ?? practitioner?.displaySessionPrice60 ?? null;
    return mapPractitionerDurationPrice({
      amount: rawPrice,
      currencyCode: practitioner?.currencyCode ?? null,
    });
  }, [practitioner]);

  const countryLabel = useMemo(
    () => resolveCountryLabel(practitioner?.countryCode, isArabicUi),
    [practitioner?.countryCode, isArabicUi],
  );

  const languagesLabel = useMemo(() => {
    if (!practitioner?.languages || practitioner.languages.length === 0) {
      return isArabicUi ? "العربية" : "Arabic";
    }

    return practitioner.languages
      .map((code) => resolveLanguageLabel(code, isArabicUi))
      .join(isArabicUi ? "، " : ", ");
  }, [isArabicUi, practitioner?.languages]);

  const handleBookSession = useCallback(
    (durationMinutes?: number) => {
      if (bookingNavigationLockRef.current || !practitioner) {
        return;
      }
      bookingNavigationLockRef.current = true;

      trackAnalyticsEvent("booking_started", {
        practitionerSlug: practitioner.slug,
        source: "practitioner_profile",
        intent: intent || "view",
        durationMinutes: durationMinutes || 30,
      });

      if (!isAuthenticated) {
        bookingNavigationLockRef.current = false;
        router.push({
          pathname: "/(auth)/signin/patient",
          params: { redirect: `/(public)/discovery/${slug}`, redirectIntent: "book" },
        });
        return;
      }

      router.push({
        pathname: "/(patient)/sessions/select-time",
        params: {
          slug,
          practitionerName: practitioner.displayName || practitioner.slug,
          practitionerTitle:
            getProfessionalTitleLabel(practitioner.professionalTitle, isArabicUi) ||
            t("discovery.profile.professionalFallback", "أخصائي"),
          practitionerAvatarUrl: practitioner.avatarUrl || "",
        },
      });
    },
    [intent, practitioner, router, slug, t, isAuthenticated, isArabicUi],
  );

  useEffect(() => {
    if (!slug || typeof slug !== "string" || !practitioner) return;
    if (trackedProfileViewRef.current === slug) return;
    trackedProfileViewRef.current = slug;
    trackPractitionerViewMutation.mutate(slug);
  }, [practitioner, slug, trackPractitionerViewMutation]);

  useEffect(() => {
    if (profileViewedRef.current || !practitioner) return;
    profileViewedRef.current = true;
    trackAnalyticsEvent("practitioner_profile_viewed", {
      practitionerSlug: practitioner.slug,
      source: source || "browse",
      intent: intent || "view",
    });
  }, [intent, practitioner, source]);

  const headerTitle = t("discovery.profile.screenTitle", {
    defaultValue: isArabicUi ? "ملف المختص" : "Practitioner Profile",
  });

  if (isLoading) {
    return (
      <Screen bg="background" testID="patient-practitioner-details-screen" style={styles.screen} edges={["top", "left", "right"]}>
        <Header showBack title={headerTitle} />
        <LoadingState fullScreen />
      </Screen>
    );
  }

  if (isError || !practitioner) {
    return (
      <Screen bg="background" testID="patient-practitioner-details-screen" style={styles.screen} edges={["top", "left", "right"]}>
        <Header showBack title={headerTitle} />
        <ErrorState onRetry={() => void refetch()} />
      </Screen>
    );
  }

  const displayName = practitioner.displayName || practitioner.slug;
  const displayTitle =
    getProfessionalTitleLabel(practitioner.professionalTitle, isArabicUi) ||
    t("discovery.profile.professionalFallback", "أخصائي نفسيات وعلاج متكامل");

  const verified = Boolean(practitioner.isVerified);
  const averageRating = practitioner.ratingSummary?.averageRating;
  const totalReviews = practitioner.ratingSummary?.totalReviews;

  const hasRating = hasPublicPractitionerRating(averageRating, totalReviews);

  const yearsExperience = practitioner.yearsExperience ?? 15;
  const approvedCredentials = practitioner.credentialsSummary?.approvedCredentials ?? 1;

  const specialties = practitioner.specialties ?? [];
  const primarySpecialties = specialties.filter((spec) => spec.isPrimary);
  const orderedSpecialties = primarySpecialties.length > 0 ? primarySpecialties : specialties;

  const fullBio = practitioner.fullBio?.trim() ?? "";
  const bioPreview = fullBio.length > 260 ? `${fullBio.slice(0, 260).trim()}…` : fullBio;
  const bioToShow = bioExpanded ? fullBio : bioPreview;
  const hasLongBio = fullBio.length > 260;
  const currency = practitioner.currencyCode || "EGP";

  return (
    <Screen bg="background" testID="patient-practitioner-details-screen" style={styles.screen} edges={["top", "left", "right"]}>
      <Header showBack title={headerTitle} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 16) + 80 },
        ]}
      >
        {/* 1. Hero Identity Card */}
        <Card variant="elevated" padding="none" style={styles.identityCard}>
          <View style={[styles.goldBar, { backgroundColor: theme.colors.tertiary }]} />

          <View style={styles.identityCardPadding}>
            <View style={[styles.identityTopRow, { flexDirection: rowDirection }]}>
              <View style={styles.avatarWrapper}>
                <View style={[styles.avatarCircle, { backgroundColor: theme.colors.surfaceTertiary }]}>
                  <Image
                    source={avatarSource}
                    style={styles.avatarImage}
                    onError={() => setAvatarFailed(true)}
                  />
                </View>

                <View
                  style={[
                    styles.onlineBadge,
                    { backgroundColor: isPresenceAvailable ? ONLINE_GREEN : OFFLINE_GRAY },
                  ]}
                />
              </View>

              <View style={[styles.identityMeta, { alignItems: isRtl ? "flex-end" : "flex-start" }]}>
                <View style={[styles.nameLine, { flexDirection: rowDirection }]}>
                  <Text weight="bold" style={styles.displayName} color={theme.colors.textPrimary} numberOfLines={1}>
                    {displayName}
                  </Text>
                  {verified ? (
                    <Ionicons name="checkmark-circle" size={18} color={theme.colors.primary} />
                  ) : null}
                </View>

                <Text color={theme.colors.textSecondary} style={styles.professionalTitle} numberOfLines={2}>
                  {displayTitle}
                </Text>

                <View
                  style={[
                    styles.presencePill,
                    {
                      backgroundColor: isPresenceAvailable ? `${ONLINE_GREEN}15` : "#F1F5F9",
                      flexDirection: rowDirection,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.presenceDot,
                      { backgroundColor: isPresenceAvailable ? ONLINE_GREEN : OFFLINE_GRAY },
                    ]}
                  />
                  <Text
                    weight="600"
                    style={[
                      styles.presenceText,
                      { color: isPresenceAvailable ? ONLINE_GREEN : theme.colors.textMuted },
                    ]}
                  >
                    {isPresenceAvailable
                      ? (isArabicUi ? "متاح الآن" : "Available now")
                      : (isArabicUi ? "غير متاح الآن" : "Unavailable right now")}
                  </Text>
                </View>
              </View>
            </View>

            {/* 3-Column Stats Strip */}
            <View
              style={[
                styles.statsStrip,
                {
                  backgroundColor: theme.colors.surfaceSecondary,
                  borderColor: theme.colors.borderLight,
                  flexDirection: rowDirection,
                },
              ]}
            >
              <View style={styles.statCell}>
                <View style={[styles.statTopRow, { flexDirection: rowDirection }]}>
                  <Ionicons name="briefcase-outline" size={15} color={theme.colors.primary} />
                  <Text weight="bold" style={styles.statValue} color={theme.colors.textPrimary}>
                    +{yearsExperience}
                  </Text>
                </View>
                <Text color={theme.colors.textSecondary} style={styles.statLabel}>
                  {isArabicUi ? "سنوات خبرة" : "Years Exp"}
                </Text>
              </View>

              <View style={[styles.statDivider, { backgroundColor: theme.colors.borderLight }]} />

              <View style={styles.statCell}>
                {hasRating ? (
                  <>
                    <View style={[styles.statTopRow, { flexDirection: rowDirection }]}>
                      <Ionicons name="star" size={14} color={STAR_GOLD} />
                      <Text weight="bold" style={styles.statValue} color={theme.colors.textPrimary}>
                        {averageRating!.toFixed(1)}
                      </Text>
                    </View>
                    <Text color={theme.colors.textSecondary} style={styles.statLabel}>
                      {totalReviews} {isArabicUi ? "تقييماً" : "Reviews"}
                    </Text>
                  </>
                ) : (
                  <Text color={theme.colors.textMuted} style={styles.statLabel}>
                    {t("discovery.list.noRatings")}
                  </Text>
                )}
              </View>

              <View style={[styles.statDivider, { backgroundColor: theme.colors.borderLight }]} />

              <View style={styles.statCell}>
                <View style={[styles.statTopRow, { flexDirection: rowDirection }]}>
                  <Ionicons name="shield-checkmark-outline" size={15} color={theme.colors.primary} />
                  <Text weight="bold" style={styles.statValue} color={theme.colors.textPrimary}>
                    {approvedCredentials}
                  </Text>
                </View>
                <Text color={theme.colors.textSecondary} style={styles.statLabel}>
                  {isArabicUi ? "الاعتمادات" : "Credentials"}
                </Text>
              </View>
            </View>
          </View>
        </Card>

        {/* 2. Specialties Card */}
        <Card variant="elevated" padding="md" style={styles.sectionCard}>
          <SectionHeader
            title={isArabicUi ? "التخصصات والمجالات العلاجية" : "Specialties & Areas"}
            icon="ribbon-outline"
            iconBg="primary"
          />

          {orderedSpecialties.length > 0 ? (
            <View style={[styles.chipsRow, { flexDirection: rowDirection }]}>
              {orderedSpecialties.map((spec) => (
                <View
                  key={spec.specialtyId}
                  style={[
                    styles.chip,
                    { backgroundColor: theme.colors.primarySoft },
                  ]}
                >
                  <Ionicons name="checkmark-circle" size={13} color={theme.colors.primary} />
                  <Text color={theme.colors.primary} weight="bold" style={styles.chipText}>
                    {spec.title || spec.slug}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text color={theme.colors.textMuted} style={styles.emptyNote}>
              {isArabicUi ? "لا توجد تخصصات منشورة بعد." : "No specialties published."}
            </Text>
          )}
        </Card>

        {/* 3. Single Session Fees Section */}
        <Card variant="elevated" padding="md" style={styles.sectionCard}>
          <SectionHeader
            title={isArabicUi ? "رسوم الجلسات الفردية" : "Individual Session Fees"}
            icon="pricetag-outline"
            iconBg="soft"
          />

          <View style={styles.pricesStack}>
            {thirtyMinutePriceState.status === "PAID" ? (
              <View
                style={[
                  styles.priceRow,
                  { borderColor: theme.colors.borderLight, flexDirection: rowDirection },
                ]}
              >
                <View style={[styles.priceLeftBlock, { flexDirection: rowDirection }]}>
                  <View style={[styles.priceIconWrap, { backgroundColor: theme.colors.surfaceTertiary }]}>
                    <Ionicons name="time-outline" size={16} color={theme.colors.primary} />
                  </View>
                  <Text weight="600" style={styles.priceLabel} color={theme.colors.textPrimary}>
                    {isArabicUi ? "جلسة 30 دقيقة" : "30-minute session"}
                  </Text>
                </View>

                <PriceDisplay
                  price={thirtyMinutePriceState}
                  weight="bold"
                  color={theme.colors.primary}
                  style={styles.priceValue}
                />
              </View>
            ) : null}

            {sixtyMinutePriceState.status === "PAID" ? (
              <View
                style={[
                  styles.priceRow,
                  { borderColor: theme.colors.borderLight, flexDirection: rowDirection },
                ]}
              >
                <View style={[styles.priceLeftBlock, { flexDirection: rowDirection }]}>
                  <View style={[styles.priceIconWrap, { backgroundColor: theme.colors.surfaceTertiary }]}>
                    <Ionicons name="hourglass-outline" size={16} color={theme.colors.primary} />
                  </View>
                  <Text weight="600" style={styles.priceLabel} color={theme.colors.textPrimary}>
                    {isArabicUi ? "جلسة 60 دقيقة" : "60-minute session"}
                  </Text>
                </View>

                <PriceDisplay
                  price={sixtyMinutePriceState}
                  weight="bold"
                  color={theme.colors.primary}
                  style={styles.priceValue}
                />
              </View>
            ) : null}
          </View>
        </Card>

        {/* 4. Session Packages Section (Rendered ONLY if practitioner has package plans) */}
        {hasPackagePlans ? (
          <Card variant="elevated" padding="md" style={styles.sectionCard}>
            <SectionHeader
              title={isArabicUi ? "باقات جلسات مخفضة" : "Discounted Package Plans"}
              icon="gift-outline"
              iconBg="primary"
            />

            <View style={styles.packagesListStack}>
              {fetchedPlans.map((plan) => {
                const sessionCount = plan.item.sessionCount || 4;
                const discountPercent = Math.round(Number(plan.item.discountPercent || 15));
                return (
                  <View
                    key={plan.item.code}
                    style={[
                      styles.packageItemCardCompact,
                      {
                        backgroundColor: theme.colors.surfaceSecondary,
                        borderColor: theme.colors.borderLight,
                        flexDirection: rowDirection,
                      },
                    ]}
                  >
                    <View style={styles.packageLeftMeta}>
                      <View style={[styles.packageTopRow, { flexDirection: rowDirection }]}>
                        <Text weight="bold" color={theme.colors.textPrimary} style={styles.packageTitle}>
                          {isArabicUi ? `باقة ${sessionCount} جلسات` : `${sessionCount} Sessions` }
                        </Text>
                        <View style={[styles.discountBadge, { backgroundColor: theme.colors.primarySoft }]}>
                          <Text weight="bold" color={theme.colors.primary} style={styles.discountText}>
                            -{discountPercent}%
                          </Text>
                        </View>
                      </View>
                      <Text color={theme.colors.textMuted} style={styles.packageWasText}>
                        {isArabicUi
                          ? `بدلاً من ${formatPackageMoney(plan.quote.undiscountedTotal, currency, locale)}`
                          : `Was ${formatPackageMoney(plan.quote.undiscountedTotal, currency, locale)}`}
                      </Text>
                    </View>

                    <View style={[styles.packageRightPrice, { alignItems: isRtl ? "flex-start" : "flex-end" }]}>
                      <Text weight="bold" color={theme.colors.primary} style={styles.packagePayableText}>
                        {formatPackageMoney(plan.quote.patientPayableTotal, currency, locale)}
                      </Text>
                      <Text weight="bold" color={theme.colors.primary} style={styles.savingsPillText}>
                        {isArabicUi
                          ? `وفر ${formatPackageMoney(plan.quote.discountAmount, currency, locale)}`
                          : `Save ${formatPackageMoney(plan.quote.discountAmount, currency, locale)}`}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </Card>
        ) : null}

        {/* 5. Languages & Location */}
        <Card variant="elevated" padding="md" style={styles.sectionCard}>
          <SectionHeader
            title={isArabicUi ? "اللغات والبلد" : "Languages & Location"}
            icon="globe-outline"
            iconBg="soft"
          />

          <View style={[styles.langLocationRow, { flexDirection: rowDirection }]}>
            <View style={styles.langBlock}>
              <Text color={theme.colors.textMuted} style={styles.metaLabel}>
                {isArabicUi ? "اللغات المتاحة" : "Languages"}
              </Text>
              <Text weight="bold" color={theme.colors.textPrimary} style={styles.valueText}>
                {languagesLabel}
              </Text>
            </View>

            <View style={[styles.vertDivider, { backgroundColor: theme.colors.borderLight }]} />

            <View style={styles.locationBlock}>
              <Text color={theme.colors.textMuted} style={styles.metaLabel}>
                {isArabicUi ? "بلد الإقامة" : "Country"}
              </Text>
              <Text weight="bold" color={theme.colors.textPrimary} style={styles.valueText}>
                {countryLabel ?? (isArabicUi ? "مصر" : "Egypt")}
              </Text>
            </View>
          </View>
        </Card>

        {/* 6. About Practitioner */}
        <Card variant="elevated" padding="md" style={styles.sectionCard}>
          <SectionHeader
            title={isArabicUi ? "عن المختص" : "About Practitioner"}
            icon="document-text-outline"
            iconBg="primary"
          />

          {fullBio ? (
            <>
              <Text color={theme.colors.textSecondary} style={styles.bioText}>
                {bioToShow}
              </Text>

              {hasLongBio ? (
                <TouchableOpacity
                  onPress={() => setBioExpanded((current) => !current)}
                  activeOpacity={0.85}
                  style={[styles.readMoreButton, { borderColor: theme.colors.borderLight }]}
                >
                  <Text color={theme.colors.primary} weight="bold" style={styles.readMoreText}>
                    {bioExpanded
                      ? (isArabicUi ? "عرض أقل ▲" : "Show less ▲")
                      : (isArabicUi ? "عرض المزيد ▼" : "Show more ▼")}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </>
          ) : (
            <Text color={theme.colors.textMuted} style={styles.emptyNote}>
              {isArabicUi ? "لم يضف المختص نبذة بعد." : "No bio provided."}
            </Text>
          )}
        </Card>
      </ScrollView>

      {/* Sticky Bottom Action Bar */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.borderLight,
            paddingBottom: Math.max(insets.bottom, 12),
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => handleBookSession(30)}
          style={[styles.bookBtn, { backgroundColor: theme.colors.primary, flexDirection: rowDirection }]}
        >
          <Ionicons name="calendar-outline" size={18} color="#FFFFFF" />
          <Text weight="bold" color="#FFFFFF" style={styles.bookBtnText}>
            {isArabicUi ? "اختر موعداً للجلسة" : "Book a Session"}
          </Text>
        </TouchableOpacity>
      </View>
    </Screen>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },

  // Hero Card
  identityCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  goldBar: {
    height: 3,
    width: "100%",
  },
  identityCardPadding: {
    padding: 14,
    gap: 12,
  },
  identityTopRow: {
    alignItems: "center",
    gap: 12,
  },
  avatarWrapper: {
    position: "relative",
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  onlineBadge: {
    position: "absolute",
    bottom: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  identityMeta: {
    flex: 1,
    gap: 3,
  },
  nameLine: {
    alignItems: "center",
    gap: 6,
  },
  displayName: {
    fontSize: 17,
    lineHeight: 22,
  },
  professionalTitle: {
    fontSize: 12,
    lineHeight: 17,
  },
  presencePill: {
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 5,
    marginTop: 2,
  },
  presenceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  presenceText: {
    fontSize: 11,
  },

  // Stats Strip
  statsStrip: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: "center",
  },
  statCell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  statTopRow: {
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 13,
    lineHeight: 18,
  },
  statLabel: {
    fontSize: 10,
  },
  statDivider: {
    width: 1,
    height: 22,
  },

  // Section Headers
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  sectionHeaderRow: {
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  sectionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 14,
    lineHeight: 19,
  },

  // Compact Package Plans Section
  packagesListStack: {
    gap: 6,
  },
  packageItemCardCompact: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "space-between",
  },
  packageLeftMeta: {
    gap: 2,
  },
  packageTopRow: {
    alignItems: "center",
    gap: 6,
  },
  packageTitle: {
    fontSize: 13,
  },
  discountBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  discountText: {
    fontSize: 10,
  },
  packageWasText: {
    fontSize: 10,
    textDecorationLine: "line-through",
  },
  packageRightPrice: {
    gap: 1,
  },
  packagePayableText: {
    fontSize: 14,
  },
  savingsPillText: {
    fontSize: 10,
  },

  // Single Session Fees Section
  pricesStack: {
    gap: 8,
  },
  priceRow: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "space-between",
  },
  priceLeftBlock: {
    alignItems: "center",
    gap: 8,
  },
  priceIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  priceLabel: {
    fontSize: 13,
  },
  priceValue: {
    fontSize: 15,
  },

  // Specialties
  chipsRow: {
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 5,
  },
  chipText: {
    fontSize: 12,
  },
  emptyNote: {
    fontSize: 12,
  },

  // Languages & Location
  langLocationRow: {
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 4,
  },
  langBlock: {
    alignItems: "center",
    gap: 2,
  },
  locationBlock: {
    alignItems: "center",
    gap: 2,
  },
  metaLabel: {
    fontSize: 11,
  },
  valueText: {
    fontSize: 13,
  },
  vertDivider: {
    width: 1,
    height: 24,
  },

  // Bio
  bioText: {
    fontSize: 13,
    lineHeight: 20,
  },
  readMoreButton: {
    alignSelf: "flex-start",
    paddingTop: 6,
  },
  readMoreText: {
    fontSize: 12,
  },

  // Bottom Sticky Bar
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  bookBtn: {
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  bookBtnText: {
    fontSize: 14,
  },
});
