import React, { useMemo } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import {
  Card,
  ErrorState,
  Header,
  LoadingState,
  Screen,
  Text,
} from "../../src/components/ui";
import { useTheme } from "../../src/providers/ThemeProvider";
import { useAppDirection } from "../../src/i18n/direction";
import { useGetPublicPractitionersInfinite } from "../../src/features/patient/discovery/api";
import { usePublicPractitionerPackagePlans } from "../../src/features/patient/package-plans/hooks";
import { formatMoney as formatCentralMoney, parseMoney } from "../../src/lib/money";
import { getProfessionalTitleLabel } from "../../src/features/practitioner/reference-data";
import type { PublicPractitionerListItem } from "../../src/features/patient/discovery/types";
import { hasPublicPractitionerRating } from "../../src/features/patient/discovery/rating";

const DEFAULT_AVATAR = require("../../assets/user.avif");
const STAR_GOLD = "#EAB308";

function renderStarRating(rating: number) {
  const score = Math.max(0, Math.min(5, rating));
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

const ONLINE_GREEN = "#22C55E";
const OFFLINE_GRAY = "#94A3B8";

function formatPackageMoney(
  amount: number | string | null | undefined,
  currency: string | null | undefined,
  locale: string,
): string {
  if (!amount) return "-";
  const money = parseMoney(String(amount), currency || "EGP");
  return money ? formatCentralMoney(money, locale) : `${amount} ${currency || "EGP"}`;
}

// ---------------------------------------------------------------------------
// Compact Practitioner Package Card Component
// ---------------------------------------------------------------------------

function CompactPractitionerPackageCard({
  practitioner,
}: {
  practitioner: PublicPractitionerListItem;
}) {
  const router = useRouter();
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language?.startsWith("ar") ?? true;
  const locale = i18n.language || "ar";
  const { rowDirection, isRtl, arrowBack } = useAppDirection();

  const [avatarFailed, setAvatarFailed] = React.useState(false);

  // Query practitioner's actual package plans from backend
  const packagePlansQuery = usePublicPractitionerPackagePlans(practitioner.slug);
  const fetchedPlans = packagePlansQuery.data?.items ?? [];

  const rawAvatarUrl = practitioner.avatarUrl;
  const isInvalidOrFakeUrl =
    !rawAvatarUrl ||
    rawAvatarUrl.trim() === "" ||
    rawAvatarUrl.includes("files.local") ||
    rawAvatarUrl.includes("example.com");

  const avatarSource =
    !isInvalidOrFakeUrl && !avatarFailed
      ? { uri: rawAvatarUrl }
      : DEFAULT_AVATAR;

  const isOnline = practitioner.isOnlineNow;
  const primarySpecialty =
    practitioner.specialties.find((s) => s.isPrimary) ??
    practitioner.specialties[0];

  const averageRating = practitioner.ratingSummary.averageRating;
  const totalReviews = practitioner.ratingSummary.totalReviews;
  const hasRating = hasPublicPractitionerRating(averageRating, totalReviews);
  const currency = practitioner.currencyCode || "EGP";

  // Build package pricing list
  const plansToDisplay = useMemo(() => {
    if (fetchedPlans.length > 0) {
      return fetchedPlans.map((plan) => {
        const sessionCount = plan.item.sessionCount || 4;
        const discountPercent = Math.round(Number(plan.item.discountPercent || 15));
        const payableTotal = plan.quote.patientPayableTotal;
        const undiscountedTotal = plan.quote.undiscountedTotal;
        const discountAmount = plan.quote.discountAmount;

        return {
          code: plan.item.code,
          title: isArabic
            ? `باقة ${sessionCount} جلسات`
            : `${sessionCount} Sessions`,
          sessionCount,
          discountPercent,
          payableTotalFormatted: formatPackageMoney(payableTotal, currency, locale),
          undiscountedTotalFormatted: formatPackageMoney(
            undiscountedTotal,
            currency,
            locale,
          ),
          discountAmountFormatted: formatPackageMoney(
            discountAmount,
            currency,
            locale,
          ),
        };
      });
    }

    // Fallback computed packages if backend plan items haven't loaded
    const basePrice =
      practitioner.sessionPrice30 || practitioner.displaySessionPrice30 || 500;

    const base4 = basePrice * 4;
    const payable4 = Math.round(base4 * 0.85);
    const discount4 = Math.round(base4 * 0.15);

    const base8 = basePrice * 8;
    const payable8 = Math.round(base8 * 0.75);
    const discount8 = Math.round(base8 * 0.25);

    return [
      {
        code: "4_SESSIONS",
        title: isArabic ? "باقة ٤ جلسات" : "4 Sessions",
        sessionCount: 4,
        discountPercent: 15,
        payableTotalFormatted: formatPackageMoney(payable4, currency, locale),
        undiscountedTotalFormatted: formatPackageMoney(base4, currency, locale),
        discountAmountFormatted: formatPackageMoney(discount4, currency, locale),
      },
      {
        code: "8_SESSIONS",
        title: isArabic ? "باقة ٨ جلسات" : "8 Sessions",
        sessionCount: 8,
        discountPercent: 25,
        payableTotalFormatted: formatPackageMoney(payable8, currency, locale),
        undiscountedTotalFormatted: formatPackageMoney(base8, currency, locale),
        discountAmountFormatted: formatPackageMoney(discount8, currency, locale),
      },
    ];
  }, [fetchedPlans, practitioner, currency, locale, isArabic]);

  const handlePressCard = () => {
    router.push(`/(public)/discovery/${practitioner.slug}` as any);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={handlePressCard}
      style={[
        styles.cardContainer,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.borderLight,
        },
      ]}
    >
      {/* Top Accent Bar */}
      <View style={[styles.goldBar, { backgroundColor: theme.colors.tertiary }]} />

      <View style={styles.cardPadding}>
        {/* Compact Header: Avatar + Info */}
        <View style={[styles.headerRow, { flexDirection: rowDirection }]}>
          {/* Avatar */}
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
                { backgroundColor: isOnline ? ONLINE_GREEN : OFFLINE_GRAY },
              ]}
            />
          </View>

          {/* Info: Name, Title & Rating Inline */}
          <View style={[styles.mainInfoWrap, { alignItems: isRtl ? "flex-end" : "flex-start" }]}>
            <View style={[styles.nameRowInline, { flexDirection: rowDirection }]}>
              <Text weight="bold" style={styles.displayName} color={theme.colors.textPrimary} numberOfLines={1}>
                {practitioner.displayName || practitioner.slug}
              </Text>
              {practitioner.isVerified ? (
                <Ionicons name="checkmark-circle" size={14} color={theme.colors.primary} />
              ) : null}
            </View>

            <View style={[styles.subMetaRow, { flexDirection: rowDirection }]}>
              <Text color={theme.colors.textSecondary} style={styles.professionalTitle} numberOfLines={1}>
                {getProfessionalTitleLabel(practitioner.professionalTitle, isArabic) ||
                  primarySpecialty?.title ||
                  "أخصائي"}
              </Text>

              {hasRating ? (
                <View style={[styles.ratingInline, { flexDirection: rowDirection }]}>
                  <View style={[styles.starsRow, { flexDirection: rowDirection }]}>
                    {renderStarRating(averageRating!)}
                  </View>
                  <Text weight="bold" style={styles.ratingText} color={theme.colors.textPrimary}>
                    {averageRating!.toFixed(1)}
                  </Text>
                  <Text color={theme.colors.textMuted} style={styles.reviewsCount}>
                    ({totalReviews!})
                  </Text>
                </View>

              ) : (
                <Text color={theme.colors.textMuted} style={styles.reviewsCount}>
                  {t("discovery.list.noRatings")}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Compact Package Pricing Box */}
        <View
          style={[
            styles.packagePricingBox,
            {
              backgroundColor: theme.colors.surfaceSecondary,
              borderColor: theme.colors.borderLight,
            },
          ]}
        >
          {plansToDisplay.map((plan) => (
            <View
              key={plan.code}
              style={[
                styles.planRowCompact,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.borderLight,
                  flexDirection: rowDirection,
                },
              ]}
            >
              {/* Plan Title & Discount Tag */}
              <View style={[styles.planLeftMeta, { flexDirection: rowDirection }]}>
                <Text weight="bold" color={theme.colors.textPrimary} style={styles.planTitleText}>
                  {plan.title}
                </Text>
                <View style={[styles.discountTag, { backgroundColor: theme.colors.primarySoft }]}>
                  <Text weight="bold" color={theme.colors.primary} style={styles.discountTagText}>
                    -{plan.discountPercent}%
                  </Text>
                </View>
              </View>

              {/* Price & Savings */}
              <View style={[styles.planRightPrice, { alignItems: isRtl ? "flex-start" : "flex-end" }]}>
                <Text weight="bold" color={theme.colors.primary} style={styles.packagePayablePrice}>
                  {plan.payableTotalFormatted}
                </Text>
                <Text color={theme.colors.textMuted} style={styles.savingsText}>
                  {isArabic
                    ? `وفر ${plan.discountAmountFormatted}`
                    : `Save ${plan.discountAmountFormatted}`}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Ultra-compact CTA Button */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handlePressCard}
          style={[
            styles.ctaButtonCompact,
            {
              backgroundColor: theme.colors.primary,
              flexDirection: rowDirection,
            },
          ]}
        >
          <Text weight="bold" style={styles.ctaButtonText}>
            {isArabic ? "احجز باقتك الآن" : "Book Package"}
          </Text>
          <Ionicons name={arrowBack} size={13} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Main Public Packages Screen
// ---------------------------------------------------------------------------

export default function PublicPackagesScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const isArabic = i18n.language?.startsWith("ar") ?? true;
  const { textAlign, isRtl, rowDirection } = useAppDirection();

  // Fetch practitioners offering packages
  const practitionersQuery = useGetPublicPractitionersInfinite({
    acceptsPackage: true,
  });

  const practitioners = useMemo<PublicPractitionerListItem[]>(() => {
    if (!practitionersQuery.data?.pages) return [];
    return practitionersQuery.data.pages.flatMap((page) => page.data.items);
  }, [practitionersQuery.data?.pages]);

  const isLoading = practitionersQuery.isLoading;
  const isError = practitionersQuery.isError;

  return (
    <Screen bg="background">
      {/* Header */}
      <Header
        showBack
        title={isArabic ? "باقات الجلسات" : "Session Packages"}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Compact Hero Card */}
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.borderLight,
            },
          ]}
        >
          <View style={[styles.goldBar, { backgroundColor: theme.colors.tertiary }]} />

          <View style={styles.heroPaddingCompact}>
            <View style={[styles.heroHeaderRow, { flexDirection: rowDirection }]}>
              <View style={[styles.heroIconBox, { backgroundColor: theme.colors.primarySoft }]}>
                <Ionicons name="gift" size={18} color={theme.colors.primary} />
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  weight="bold"
                  style={[styles.heroTitleCompact, { textAlign }]}
                  color={theme.colors.textPrimary}
                >
                  {isArabic ? "باقات الجلسات العلاجية" : "Session Packages"}
                </Text>
                <Text color={theme.colors.textSecondary} style={[styles.heroSubtitleCompact, { textAlign }]}>
                  {isArabic
                    ? "وفّر أكثر واصل رحلتك العلاجية مع باقات الجلسات المخفضة لدى أفضل المختصين."
                    : "Save more with discounted session packages from top practitioners."}
                </Text>
              </View>
            </View>

            {/* Benefits Pills */}
            <View style={[styles.benefitsGrid, { flexDirection: rowDirection }]}>
              <View style={[styles.benefitPill, { backgroundColor: theme.colors.surfaceTertiary, borderColor: theme.colors.borderLight }]}>
                <Ionicons name="pricetag" size={12} color={theme.colors.primary} />
                <Text weight="600" style={styles.benefitText} color={theme.colors.textPrimary}>
                  {isArabic ? "خصم لـ 25%" : "Up to 25% OFF"}
                </Text>
              </View>

              <View style={[styles.benefitPill, { backgroundColor: theme.colors.surfaceTertiary, borderColor: theme.colors.borderLight }]}>
                <Ionicons name="calendar" size={12} color={theme.colors.primary} />
                <Text weight="600" style={styles.benefitText} color={theme.colors.textPrimary}>
                  {isArabic ? "مرونة المواعيد" : "Flexible"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Section Heading */}
        <Text
          weight="bold"
          variant="title"
          style={[styles.sectionHeading, { textAlign }]}
          color={theme.colors.textPrimary}
        >
          {isArabic ? "المختصون المتاح لديهم باقات" : "Practitioners Offering Packages"}
        </Text>

        {/* Content States */}
        {isLoading ? (
          <View style={styles.stateWrapper}>
            <LoadingState />
          </View>
        ) : isError ? (
          <View style={styles.stateWrapper}>
            <ErrorState onRetry={() => void practitionersQuery.refetch()} />
          </View>
        ) : practitioners.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderLight }]}>
            <Ionicons name="gift-outline" size={28} color={theme.colors.textMuted} />
            <Text weight="bold" style={styles.emptyTitle} color={theme.colors.textPrimary}>
              {isArabic ? "لا يوجد مختصون متاحون حالياً للباقات" : "No Package Practitioners Available"}
            </Text>
            <Text color={theme.colors.textSecondary} style={styles.emptySubtitle}>
              {isArabic
                ? "يمكنك تصفح باقي المختصين وحجز جلسات فردية مباشرة."
                : "Browse all available practitioners and book individual sessions."}
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/(public)/discovery")}
              style={[styles.browseBtn, { backgroundColor: theme.colors.primary }]}
            >
              <Text weight="bold" color="#FFFFFF" style={styles.browseBtnText}>
                {isArabic ? "تصفح جميع المختصين" : "Browse All Practitioners"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.practitionersListCompact}>
            {practitioners.map((practitioner) => (
              <CompactPractitionerPackageCard
                key={practitioner.id}
                practitioner={practitioner}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 30,
    gap: 10,
  },

  // Hero Section
  heroCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  goldBar: {
    height: 3,
    width: "100%",
  },
  heroPaddingCompact: {
    padding: 12,
    gap: 8,
  },
  heroHeaderRow: {
    alignItems: "center",
    gap: 10,
  },
  heroIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitleCompact: {
    fontSize: 16,
    lineHeight: 21,
  },
  heroSubtitleCompact: {
    fontSize: 12,
    lineHeight: 16,
  },
  benefitsGrid: {
    flexWrap: "wrap",
    gap: 6,
  },
  benefitPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  benefitText: {
    fontSize: 10,
  },

  // Section Heading
  sectionHeading: {
    fontSize: 15,
    lineHeight: 20,
    marginTop: 2,
  },

  // Compact Practitioner Package Card Styles
  cardContainer: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 8,
  },
  cardPadding: {
    padding: 10,
    gap: 8,
  },
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
    gap: 1,
  },
  nameRowInline: {
    alignItems: "center",
    gap: 4,
  },
  displayName: {
    fontSize: 14,
    lineHeight: 18,
  },
  subMetaRow: {
    alignItems: "center",
    gap: 4,
  },
  professionalTitle: {
    fontSize: 11,
    lineHeight: 15,
  },
  dotSeparator: {
    fontSize: 10,
    marginHorizontal: 2,
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
  },

  // Compact Package Pricing Box
  packagePricingBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 6,
    gap: 5,
  },
  planRowCompact: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 5,
    alignItems: "center",
    justifyContent: "space-between",
  },
  planLeftMeta: {
    alignItems: "center",
    gap: 6,
  },
  planTitleText: {
    fontSize: 12,
  },
  discountTag: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  discountTagText: {
    fontSize: 10,
  },
  planRightPrice: {
    gap: 0,
  },
  packagePayablePrice: {
    fontSize: 13,
    lineHeight: 17,
  },
  savingsText: {
    fontSize: 10,
  },

  // Ultra-compact CTA Button
  ctaButtonCompact: {
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    marginTop: 2,
  },
  ctaButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
  },
  reviewsCount: {
    fontSize: 10,
  },

  // States
  stateWrapper: {
    paddingVertical: 20,
  },
  practitionersListCompact: {
    gap: 8,
  },
  emptyBox: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 14,
  },
  emptySubtitle: {
    fontSize: 11,
    textAlign: "center",
  },
  browseBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 4,
  },
  browseBtnText: {
    fontSize: 12,
  },
});
