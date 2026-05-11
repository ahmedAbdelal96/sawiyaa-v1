import React, { useEffect, useMemo, useRef } from "react";
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
  StatusChip,
} from "../../../src/components/ui";
import { useTheme } from "../../../src/providers/ThemeProvider";
import {
  useGetPublicPractitionerDetails,
  useGetPublicPractitionerPresence,
} from "../../../src/features/patient/discovery/api";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../src/providers/AuthProvider";
import { usePublicAvailabilityWindows } from "../../../src/features/patient/sessions/hooks";
import {
  buildSlotsFromWindows,
  formatLocalizedDateTime,
  getWeekRange,
} from "../../../src/features/patient/sessions/slot-utils";
import { trackAnalyticsEvent } from "../../../src/lib/analytics";
import { usePublicPractitionerPackagePlans } from "../../../src/features/patient/package-plans/hooks";
import { resolveSupportedCurrencyCode } from "../../../src/lib/currency";

function resolvePresenceMeta(status?: string | null) {
  switch (status) {
    case "ONLINE":
      return { icon: "radio-outline" as const, label: "Online now" };
    case "AWAY":
      return { icon: "time-outline" as const, label: "Away right now" };
    case "BUSY":
      return { icon: "pause-circle-outline" as const, label: "Currently busy" };
    case "OFFLINE":
    default:
      return { icon: "moon-outline" as const, label: "Offline right now" };
  }
}

function formatCurrencyAmount(
  amount: number | string | null | undefined,
  currency: string | null | undefined,
  locale: string,
) {
  if (!currency) {
    return null;
  }

  if (typeof amount !== "number") {
    const numeric = Number(amount);
    if (!Number.isFinite(numeric)) {
      return null;
    }
    amount = numeric;
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function TherapistProfileScreen() {
  const router = useRouter();
  const { slug, source, intent, matchScore, matchReason } =
    useLocalSearchParams<{
      slug: string;
      source?: string;
      intent?: string;
      matchScore?: string;
      matchReason?: string;
    }>();
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const { user, role, isLoading: isAuthLoading } = useAuth();
  const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US";
  const bookingNavigationLockRef = useRef(false);
  const profileViewedRef = useRef(false);
  const weekRange = getWeekRange(0);
  const authScopeKey = useMemo(() => {
    if (isAuthLoading) {
      return "bootstrapping";
    }

    if (!user) {
      return "guest";
    }

    return `auth:${user.id}:${role}`;
  }, [isAuthLoading, role, user]);

  const { data, isLoading, isError, refetch } = useGetPublicPractitionerDetails(
    slug || null,
  );
  const presenceQuery = useGetPublicPractitionerPresence(slug || null);
  const availabilityQuery = usePublicAvailabilityWindows(
    slug || null,
    weekRange.fromIso,
    weekRange.toIso,
  );

  const practitioner = data?.data.item ?? null;
  const presence = presenceQuery.data?.data.presence;
  const presenceMeta = resolvePresenceMeta(presence?.status ?? null);
  const futureSlots = buildSlotsFromWindows(
    availabilityQuery.data?.windows ?? [],
  );
  const nextSlot = futureSlots[0] ?? null;
  const weekSlotCount = futureSlots.length;
  const matchingScore = Number(matchScore);
  const isRecommendedFromMatching = source === "matching";
  const displayCurrencyCode = practitioner
    ? resolveSupportedCurrencyCode({
        currencyCode: practitioner.currencyCode,
        regionalPricingMode: practitioner.regionalPricingMode,
        resolvedCountryIsoCode: practitioner.resolvedCountryIsoCode,
        countryCode: practitioner.countryCode,
      })
    : "USD";

  const thirtyMinutePriceLabel =
    practitioner
      ? formatCurrencyAmount(
          practitioner.displaySessionPrice30,
          displayCurrencyCode,
          locale,
        )
      : null;
  const sixtyMinutePriceLabel =
    practitioner
      ? formatCurrencyAmount(
          practitioner.displaySessionPrice60,
          displayCurrencyCode,
          locale,
        )
      : null;

  const packageBrowseDefaults = useMemo(() => {
    if (!practitioner) {
      return {
        durationMinutes: 60 as const,
        sessionMode: "VIDEO" as const,
        currencyCode: "EGP" as const,
      };
    }

    const currencyCode = displayCurrencyCode;
    const hasSixtyMinutePrice = practitioner.displaySessionPrice60 != null;
    const hasThirtyMinutePrice = practitioner.displaySessionPrice30 != null;

    return {
      durationMinutes:
        hasSixtyMinutePrice || !hasThirtyMinutePrice
          ? (60 as const)
          : (30 as const),
      sessionMode: "VIDEO" as const,
      currencyCode,
    };
  }, [displayCurrencyCode, practitioner]);

  const packagePlansQuery = usePublicPractitionerPackagePlans(
    slug || null,
    packageBrowseDefaults,
    {
      cacheScopeKey: authScopeKey,
    },
  );
  const packagePlans = packagePlansQuery.data?.items ?? [];

  useEffect(() => {
    if (profileViewedRef.current || !practitioner) {
      return;
    }

    profileViewedRef.current = true;
    trackAnalyticsEvent("practitioner_profile_viewed", {
      practitionerSlug: practitioner.slug,
      source: source || "browse",
      intent: intent || "view",
      availabilityVisible: weekSlotCount > 0,
      specialtiesCount: practitioner.specialties.length,
    hasPricing: Boolean(thirtyMinutePriceLabel || sixtyMinutePriceLabel),
  });
  }, [
    intent,
    practitioner?.slug,
    practitioner?.specialties.length,
    source,
    sixtyMinutePriceLabel,
    thirtyMinutePriceLabel,
    weekSlotCount,
  ]);

  if (isLoading) {
    return (
      <Screen bg="background">
        <Header showBack />
        <LoadingState fullScreen />
      </Screen>
    );
  }

  if (isError || !practitioner) {
    return (
      <Screen bg="background">
        <Header showBack />
        <ErrorState fullScreen onRetry={refetch} />
      </Screen>
    );
  }

  return (
    <Screen bg="background">
      <Header
        showBack
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

          <View style={styles.trustRow}>
            <View
              style={[
                styles.trustPill,
                { backgroundColor: theme.colors.surfaceSecondary },
              ]}
            >
              <Ionicons
                name={presenceMeta.icon}
                size={14}
                color={theme.colors.primary}
              />
              <Text color={theme.colors.textSecondary} style={styles.trustText}>
                {t(
                  `discovery.profile.presence.${(presence?.status ?? "OFFLINE").toLowerCase()}`,
                  presenceMeta.label,
                )}
              </Text>
            </View>

            <View
              style={[
                styles.trustPill,
                { backgroundColor: theme.colors.surfaceSecondary },
              ]}
            >
              <Ionicons
                name="flash-outline"
                size={14}
                color={theme.colors.primary}
              />
              <Text color={theme.colors.textSecondary} style={styles.trustText}>
                {presence?.isInstantBookingEnabled
                  ? t(
                      "discovery.profile.instantEnabled",
                      "Instant booking is enabled",
                    )
                  : t(
                      "discovery.profile.instantDisabled",
                      "Standard booking applies",
                    )}
              </Text>
            </View>
          </View>

          {isRecommendedFromMatching ? (
            <Card variant="flat" padding="md" style={styles.recommendationCard}>
              <View style={styles.recommendationHeader}>
                <View
                  style={[
                    styles.recommendationIconWrap,
                    { backgroundColor: theme.colors.primaryLight },
                  ]}
                >
                  <Ionicons
                    name="sparkles-outline"
                    size={16}
                    color={theme.colors.primary}
                  />
                </View>
                <View style={styles.recommendationTextWrap}>
                  <Text weight="600" style={styles.recommendationTitle}>
                    {t(
                      "discovery.profile.matchingRecommendationTitle",
                      "Recommended from your matching results",
                    )}
                  </Text>
                  <Text
                    color={theme.colors.textSecondary}
                    style={styles.recommendationBody}
                  >
                    {intent === "book"
                      ? t(
                          "discovery.profile.matchingRecommendationBookBody",
                          "You came here ready to book. Review the profile, confirm a visible time, then check the final payment breakdown before paying.",
                        )
                      : t(
                          "discovery.profile.matchingRecommendationViewBody",
                          "This therapist was suggested from your matching answers. Review the fit signals below before choosing a time.",
                        )}
                  </Text>
                </View>
              </View>

              {Number.isFinite(matchingScore) ? (
                <View style={styles.recommendationScoreRow}>
                  <Text color={theme.colors.textSecondary}>
                    {t("discovery.profile.matchScoreLabel", "Match score")}
                  </Text>
                  <Text weight="600" color={theme.colors.primary}>
                    {t("matching.results.score", { score: matchingScore })}
                  </Text>
                </View>
              ) : null}

              {matchReason ? (
                <Text
                  color={theme.colors.textSecondary}
                  style={styles.recommendationReason}
                >
                  {matchReason}
                </Text>
              ) : null}
            </Card>
          ) : null}
        </Card>

        <Section
          title={t("discovery.profile.bookingConfidence", "Booking confidence")}
        >
          <View style={styles.bookingConfidenceGrid}>
            <Card variant="flat" padding="md" style={styles.confidenceCard}>
              <Text
                color={theme.colors.textMuted}
                style={styles.confidenceLabel}
              >
                {t("discovery.profile.nextAvailable", "Next available")}
              </Text>
              <Text weight="600" style={styles.confidenceValue}>
                {nextSlot
                  ? formatLocalizedDateTime(nextSlot.startsAt, locale)
                  : t(
                      "discovery.profile.noUpcomingSlots",
                      "No open time found this week",
                    )}
              </Text>
            </Card>

            <Card variant="flat" padding="md" style={styles.confidenceCard}>
              <Text
                color={theme.colors.textMuted}
                style={styles.confidenceLabel}
              >
                {t("discovery.profile.thisWeekAvailability", "This week")}
              </Text>
              <Text weight="600" style={styles.confidenceValue}>
                {availabilityQuery.isLoading
                  ? t("patientSessionsFlow.common.loading")
                  : t("discovery.profile.slotsThisWeek", {
                      count: weekSlotCount,
                      defaultValue:
                        weekSlotCount === 1
                          ? "1 visible start time"
                          : `${weekSlotCount} visible start times`,
                    })}
              </Text>
            </Card>
          </View>
        </Section>

        <Section title={t("discovery.profile.pricing", "Session pricing")}>
          <View style={styles.bookingConfidenceGrid}>
            <Card variant="flat" padding="md" style={styles.confidenceCard}>
              <Text
                color={theme.colors.textMuted}
                style={styles.confidenceLabel}
              >
                {t("discovery.profile.duration30", "30 minutes")}
              </Text>
              <Text weight="600" style={styles.confidenceValue}>
                {thirtyMinutePriceLabel ??
                  t(
                    "discovery.profile.pricingUnavailable",
                    "Pricing unavailable",
                  )}
              </Text>
            </Card>
            <Card variant="flat" padding="md" style={styles.confidenceCard}>
              <Text
                color={theme.colors.textMuted}
                style={styles.confidenceLabel}
              >
                {t("discovery.profile.duration60", "60 minutes")}
              </Text>
              <Text weight="600" style={styles.confidenceValue}>
                {sixtyMinutePriceLabel ??
                  t(
                    "discovery.profile.pricingUnavailable",
                    "Pricing unavailable",
                  )}
              </Text>
            </Card>
          </View>
        </Section>

        {packagePlansQuery.isLoading || packagePlansQuery.isError || packagePlans.length > 0 ? (
          <Section title={t("discovery.profile.packagePlans", "Package plans")}>
            <View style={styles.packagePlansStack}>
              {packagePlansQuery.isLoading ? (
                <Card variant="flat" padding="md">
                  <Text color={theme.colors.textSecondary} style={styles.packagePlansNote}>
                    {t(
                      "discovery.profile.packagePlansLoading",
                      "Loading package plans...",
                    )}
                  </Text>
                </Card>
              ) : packagePlansQuery.isError ? (
                <Card variant="flat" padding="md">
                  <Text color={theme.colors.textSecondary} style={styles.packagePlansNote}>
                    {t(
                      "discovery.profile.packagePlansError",
                      "We could not load the package plans right now.",
                    )}
                  </Text>
                  <Button
                    title={t("discovery.profile.packagePlansRetry", "Try again")}
                    onPress={() => packagePlansQuery.refetch()}
                    style={styles.packagePlansButton}
                  />
                </Card>
              ) : (
                packagePlans.map((plan) => {
                  const isActive = Boolean(plan.item.isActive && !plan.item.archivedAt);
                  const quoteCurrency = resolveSupportedCurrencyCode({
                    currencyCode: plan.quote.selectedCurrencyCode,
                    regionalPricingMode: plan.quote.regionalPricingMode,
                    resolvedCountryIsoCode: plan.quote.resolvedCountryIsoCode,
                  });
                  const totalLabel = formatCurrencyAmount(
                    plan.quote.patientPayableTotal,
                    quoteCurrency,
                    locale,
                  );
                  return (
                    <Card key={plan.item.code} variant="elevated" padding="lg" style={styles.packagePlanCard}>
                      <View style={styles.packagePlanTopRow}>
                        <View style={styles.packagePlanTopCopy}>
                          <Text weight="bold" style={styles.packagePlanTitle}>
                            {plan.item.title}
                          </Text>
                          {plan.item.description ? (
                            <Text color={theme.colors.textSecondary} style={styles.packagePlanDescription}>
                              {plan.item.description}
                            </Text>
                          ) : null}
                        </View>
                        <StatusChip
                          label={isActive ? t("discovery.profile.packagePlansActive", "Active") : t("discovery.profile.packagePlansInactive", "Unavailable")}
                          tone={isActive ? "success" : "default"}
                          showDot={false}
                        />
                      </View>

                      <View style={styles.packagePlanMetaRow}>
                        <Text color={theme.colors.textMuted} style={styles.packagePlanMetaText}>
                          {t("discovery.profile.packagePlansSessions", {
                            count: plan.quote.sessionCount,
                            defaultValue:
                              plan.quote.sessionCount === 1
                                ? "1 session"
                                : `${plan.quote.sessionCount} sessions`,
                          })}
                        </Text>
                        <Text color={theme.colors.textMuted} style={styles.packagePlanMetaText}>
                          {t("discovery.profile.packagePlansDiscount", {
                            count: Number(plan.quote.discountPercent),
                            defaultValue: `${plan.quote.discountPercent}% off`,
                          })}
                        </Text>
                      </View>

                      <View style={styles.packagePlanStatsRow}>
                        <Card variant="flat" padding="sm" style={styles.packagePlanStatCard}>
                          <Text color={theme.colors.textMuted} style={styles.packagePlanStatLabel}>
                            {t("discovery.profile.packagePlansTotal", "Total")}
                          </Text>
                          <Text weight="600" style={styles.packagePlanStatValue}>
                            {totalLabel ?? plan.quote.patientPayableTotal}
                          </Text>
                        </Card>
                        <Card variant="flat" padding="sm" style={styles.packagePlanStatCard}>
                          <Text color={theme.colors.textMuted} style={styles.packagePlanStatLabel}>
                            {t("discovery.profile.packagePlansMode", "Mode")}
                          </Text>
                          <Text weight="600" style={styles.packagePlanStatValue}>
                            {plan.quote.sessionMode}
                          </Text>
                        </Card>
                      </View>

                      <Button
                        title={t("discovery.profile.packagePlansPurchase", "Purchase package")}
                        onPress={() =>
                          router.push({
                            pathname: "/(patient)/package-purchases/create",
                            params: {
                              practitionerSlug: practitioner.slug,
                              practitionerName:
                                practitioner.displayName || practitioner.slug,
                              practitionerAvatarUrl: practitioner.avatarUrl || "",
                              packagePlanCode: plan.item.code,
                              durationMinutes: String(plan.quote.durationMinutes),
                              sessionMode: plan.quote.sessionMode,
                              currencyCode: quoteCurrency,
                            },
                          } as any)
                        }
                        style={styles.packagePlansButton}
                      />
                    </Card>
                  );
                })
              )}
            </View>
          </Section>
        ) : null}
        {practitioner.fullBio ? (
          <Section title={t("discovery.profile.about")}>
            <Card variant="flat" padding="md">
              <Text color={theme.colors.textSecondary} style={styles.bioText}>
                {practitioner.fullBio}
              </Text>
            </Card>
          </Section>
        ) : null}

        {practitioner.specialties.length > 0 ? (
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
        ) : null}

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
              <Text
                color={theme.colors.textSecondary}
                style={styles.credentialMeta}
              >
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
                ? practitioner.languages.join(" ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ ")
                : t("discovery.profile.languagesFallback")}
            </Text>
          </Card>
        </Section>

        <Section title={t("discovery.profile.availability")}>
          <Card variant="elevated" padding="lg">
            <Text
              color={theme.colors.textSecondary}
              style={styles.availabilityLead}
            >
              {nextSlot
                ? t(
                    "discovery.profile.availabilityLead",
                    "Choose a visible time first, then review the final payment breakdown before you continue to pay.",
                  )
                : t(
                    "discovery.profile.availabilityEmptyLead",
                    "No concrete booking window is open in the next week yet. You can still review the profile and check again later.",
                  )}
            </Text>

            {nextSlot ? (
              <Card variant="flat" padding="md" style={styles.nextSlotCard}>
                <Text
                  color={theme.colors.textMuted}
                  style={styles.confidenceLabel}
                >
                  {t("discovery.profile.nextVisibleSlot", "Next visible slot")}
                </Text>
                <Text weight="600" style={styles.confidenceValue}>
                  {formatLocalizedDateTime(nextSlot.startsAt, locale)}
                </Text>
              </Card>
            ) : null}

            <Button
              title={
                nextSlot
                  ? t(
                      "discovery.profile.reviewTimes",
                      "Review times and continue",
                    )
                  : t("discovery.profile.bookSession")
              }
              onPress={() => {
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
                    practitionerName:
                      practitioner.displayName || practitioner.slug,
                    practitionerTitle:
                      practitioner.professionalTitle ||
                      t("discovery.profile.professionalFallback"),
                    practitionerAvatarUrl: practitioner.avatarUrl || "",
                  },
                });
              }}
              disabled={!slug}
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
  trustRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },
  trustPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  trustText: {
    fontSize: 12,
  },
  recommendationCard: {
    marginTop: 14,
  },
  recommendationHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  recommendationIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  recommendationTextWrap: {
    flex: 1,
  },
  recommendationTitle: {
    fontSize: 15,
    marginBottom: 4,
  },
  recommendationBody: {
    fontSize: 13,
    lineHeight: 20,
  },
  recommendationScoreRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    gap: 12,
  },
  recommendationReason: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
  },
  packagePlansStack: {
    gap: 12,
  },
  packagePlansNote: {
    fontSize: 13,
    lineHeight: 20,
  },
  packagePlansButton: {
    marginTop: 10,
  },
  packagePlanCard: {
    gap: 10,
  },
  packagePlanTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  packagePlanTopCopy: {
    flex: 1,
  },
  packagePlanTitle: {
    fontSize: 18,
    lineHeight: 24,
  },
  packagePlanDescription: {
    fontSize: 14,
    lineHeight: 22,
    marginTop: 4,
  },
  packagePlanMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  packagePlanMetaText: {
    fontSize: 12,
  },
  packagePlanStatsRow: {
    flexDirection: "row",
    gap: 10,
  },
  packagePlanStatCard: {
    flex: 1,
    marginHorizontal: 0,
  },
  packagePlanStatLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.12,
  },
  packagePlanStatValue: {
    fontSize: 14,
    marginTop: 4,
  },  bookingConfidenceGrid: {
    gap: 10,
  },
  confidenceCard: {
    minHeight: 88,
  },
  confidenceLabel: {
    fontSize: 12,
    marginBottom: 6,
  },
  confidenceValue: {
    fontSize: 15,
    lineHeight: 22,
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
  credentialMeta: {
    fontSize: 14,
  },
  availabilityLead: {
    textAlign: "center",
    marginBottom: 16,
    fontSize: 14,
    lineHeight: 22,
  },
  nextSlotCard: {
    marginBottom: 14,
  },
});





