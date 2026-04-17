import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Image, Pressable, ScrollView, View } from "react-native";

import { routes } from "@/core/constants/routes";
import { stitchAssets } from "@/core/constants/stitch-assets";
import { useAppTheme } from "@/core/theme/theme-provider";
import { AvailabilityWindowList } from "@/modules/practitioners/components/availability-window-list";
import {
  usePractitionerAvailability,
  usePractitionerProfile,
} from "@/modules/practitioners/hooks/use-practitioner-profile";
import { AppButton, AppEmptyState, AppErrorState, AppLoader, AppScreen, AppText } from "@/shared/ui";

export function PractitionerDetailsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { spacing, colors, shadows } = useAppTheme();
  const params = useLocalSearchParams<{ slug?: string }>();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug || "";
  const profileQuery = usePractitionerProfile(slug);
  const availabilityQuery = usePractitionerAvailability(slug);

  if (!slug) {
    return (
      <AppScreen>
        <AppEmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
      </AppScreen>
    );
  }

  if (profileQuery.isLoading) {
    return (
      <AppScreen>
        <AppLoader label={t("loading")} />
      </AppScreen>
    );
  }

  if (profileQuery.isError) {
    return (
      <AppScreen>
        <AppErrorState onRetry={() => profileQuery.refetch()} />
      </AppScreen>
    );
  }

  if (!profileQuery.data) {
    return (
      <AppScreen>
        <AppEmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
      </AppScreen>
    );
  }

  const practitioner = profileQuery.data;

  return (
    <AppScreen scroll={false} contentStyle={{ paddingHorizontal: 0, paddingTop: 0 }}>
      <View style={{ flex: 1 }}>
        <View style={{ height: 360, position: "relative" }}>
          <Image
            source={{ uri: practitioner.avatarUrl || stitchAssets.practitionerFallback }}
            style={{ height: "100%", width: "100%" }}
          />
          <View
            style={{
              backgroundColor: "rgba(0,0,0,0.22)",
              bottom: 0,
              left: 0,
              position: "absolute",
              right: 0,
              top: 0,
            }}
          />

          <View
            style={{
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "space-between",
              left: spacing.lg,
              position: "absolute",
              right: spacing.lg,
              top: spacing.xxxl,
            }}
          >
            <Pressable
              onPress={() => router.back()}
              style={{
                alignItems: "center",
                backgroundColor: "rgba(255,255,255,0.25)",
                borderRadius: 999,
                height: 48,
                justifyContent: "center",
                width: 48,
              }}
            >
              <AppText color="#FFFFFF">←</AppText>
            </Pressable>
            <Pressable
              style={{
                alignItems: "center",
                backgroundColor: "rgba(255,255,255,0.25)",
                borderRadius: 999,
                height: 48,
                justifyContent: "center",
                width: 48,
              }}
            >
              <AppText color="#FFFFFF">⤴</AppText>
            </Pressable>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{
            gap: spacing.lg,
            marginTop: -84,
            paddingBottom: 180,
            paddingHorizontal: spacing.xl,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{
              ...shadows.card,
              backgroundColor: colors.surfaceLowest,
              borderRadius: 42,
              gap: spacing.md,
              padding: spacing.lg,
            }}
          >
            <View style={{ alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between" }}>
              <View style={{ flex: 1, gap: spacing.xs }}>
                <View style={{ alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                  <AppText variant="heading" style={{ fontSize: 36, fontWeight: "900" }}>
                    {practitioner.displayName || t("profileDetailsTitle")}
                  </AppText>
                  {practitioner.isVerified ? (
                    <View
                      style={{
                        alignSelf: "flex-start",
                        backgroundColor: "rgba(197,236,204,0.9)",
                        borderRadius: 999,
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                      }}
                    >
                      <AppText variant="caption" style={{ fontWeight: "700" }}>
                        موثق
                      </AppText>
                    </View>
                  ) : null}
                </View>
                <AppText color={colors.primary} style={{ fontWeight: "800" }}>
                  {practitioner.professionalTitle || t("profileAvailabilityHint")}
                </AppText>
              </View>

              <View
                style={{
                  alignItems: "center",
                  backgroundColor: "rgba(242,244,246,0.95)",
                  borderRadius: 18,
                  gap: 2,
                  minWidth: 76,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: spacing.sm,
                }}
              >
                <AppText color={colors.primary} style={{ fontWeight: "800" }}>
                  ★ {practitioner.ratingSummary.averageRating ?? 0}
                </AppText>
                <AppText variant="caption" color={colors.textMuted}>
                  {practitioner.ratingSummary.totalReviews} تقييم
                </AppText>
              </View>
            </View>

            <View style={{ backgroundColor: "rgba(194,198,211,0.25)", height: 1 }} />

            <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm }}>
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="caption" color={colors.textMuted}>
                  الخبرة
                </AppText>
                <AppText style={{ fontWeight: "800" }}>{practitioner.yearsExperience ? `+${practitioner.yearsExperience} سنة` : "-"}</AppText>
              </View>
              <View style={{ backgroundColor: "rgba(194,198,211,0.25)", height: 40, width: 1 }} />
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="caption" color={colors.textMuted}>
                  التخصصات
                </AppText>
                <AppText style={{ fontWeight: "800" }}>
                  {practitioner.specialties.length > 0 ? practitioner.specialties.length : "-"}
                </AppText>
              </View>
              <View style={{ backgroundColor: "rgba(194,198,211,0.25)", height: 40, width: 1 }} />
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="caption" color={colors.textMuted}>
                  التوثيقات
                </AppText>
                <AppText style={{ fontWeight: "800" }}>
                  {practitioner.credentialsSummary.approvedCredentials}/{practitioner.credentialsSummary.totalCredentials}
                </AppText>
              </View>
            </View>

            <View style={{ gap: spacing.xs }}>
              <AppText variant="title" style={{ fontWeight: "800" }}>
                عن المختص
              </AppText>
              <AppText color={colors.textSecondary} style={{ lineHeight: 25 }}>
                {practitioner.fullBio || t("profileAvailabilityHint")}
              </AppText>
            </View>

            {practitioner.specialties.length > 0 ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
                {practitioner.specialties.map((item) => (
                  <View
                    key={item.specialtyId}
                    style={{
                      backgroundColor: "rgba(214,227,255,0.85)",
                      borderRadius: 999,
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                    }}
                  >
                    <AppText variant="caption" style={{ color: "#0A1C34", fontWeight: "700" }}>
                      {item.title || item.slug}
                    </AppText>
                  </View>
                ))}
              </View>
            ) : null}
          </View>

          {availabilityQuery.isLoading ? <AppLoader label={t("loading")} /> : null}
          {availabilityQuery.isError ? <AppErrorState onRetry={() => availabilityQuery.refetch()} /> : null}

          {availabilityQuery.data ? (
            <View
              style={{
                ...shadows.card,
                backgroundColor: "rgba(242,244,246,0.92)",
                borderRadius: 36,
                gap: spacing.sm,
                padding: spacing.lg,
              }}
            >
              <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between" }}>
                <AppText variant="title" style={{ fontWeight: "800" }}>
                  المواعيد المتاحة
                </AppText>
                <AppText variant="caption" color={colors.textMuted}>
                  {"—"}
                </AppText>
              </View>
              <AvailabilityWindowList windows={availabilityQuery.data.windows} locale={i18n.language} />
            </View>
          ) : null}
        </ScrollView>

        <View
          style={{
            backgroundColor: "rgba(255,255,255,0.9)",
            borderTopColor: "rgba(194,198,211,0.3)",
            borderTopWidth: 1,
            bottom: 0,
            left: 0,
            paddingBottom: spacing.lg,
            paddingHorizontal: spacing.xl,
            paddingTop: spacing.md,
            position: "absolute",
            right: 0,
          }}
        >
          <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.sm }}>
            <View>
              <AppText variant="caption" color={colors.textMuted}>
                يبدأ من
              </AppText>
              <AppText style={{ fontSize: 28, fontWeight: "900" }}>{"—"}</AppText>
            </View>
            <View style={{ width: "65%" }}>
              <AppButton label={t("bookingCta")} onPress={() => router.push(routes.app.bookingStart(slug))} />
            </View>
          </View>

          <AppButton
            label={t("careChatCreateRequest")}
            onPress={() => router.push(routes.app.careChatNewRequestFor(slug))}
            variant="secondary"
          />
        </View>
      </View>
    </AppScreen>
  );
}


