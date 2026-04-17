import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Image, Pressable, View } from "react-native";

import { authSessionService } from "@/auth/application/auth-session.service";
import { useAuthSession } from "@/auth/hooks/use-auth-session";
import { routes } from "@/core/constants/routes";
import { stitchAssets } from "@/core/constants/stitch-assets";
import { useAppTheme } from "@/core/theme/theme-provider";
import { useJourneySummary } from "@/modules/journey/hooks/use-journey-summary";
import { useMySessions } from "@/modules/sessions/hooks/use-sessions";
import { AppButton, AppCard, AppErrorState, AppLoader, AppScreen, AppText } from "@/shared/ui";

const QUICK_ACTIONS = [
  {
    title: "exploreSpecialists",
    hint: "تصفح قائمة المختصين",
    href: routes.app.practitioners,
    icon: "👥",
    tone: "rgba(213,227,255,0.58)",
  },
  {
    title: "openMatching",
    hint: "ابدأ التقييم الأولي",
    href: routes.app.matching,
    icon: "🧭",
    tone: "rgba(197,236,204,0.62)",
  },
  {
    title: "openSessions",
    hint: "إدارة المواعيد",
    href: routes.app.sessions,
    icon: "🗓️",
    tone: "rgba(214,227,255,0.7)",
  },
  {
    title: "openSupport",
    hint: "طلب مساعدة",
    href: routes.app.supportTickets,
    icon: "💬",
    tone: "rgba(255,218,214,0.58)",
  },
] as const;

function mapActionToRoute(action: string): Href {
  switch (action) {
    case "COMPLETE_PAYMENT":
      return routes.app.payments;
    case "JOIN_UPCOMING_SESSION":
      return routes.app.sessions;
    case "VIEW_SUPPORT_TICKET":
      return routes.app.supportTickets;
    case "START_GUIDED_MATCHING":
      return routes.app.matching;
    case "BOOK_NEXT_SESSION":
      return routes.app.practitioners;
    case "TAKE_ASSESSMENT":
      return routes.app.matching;
    default:
      return routes.app.home;
  }
}

function mapActionLabel(action: string, t: (key: string) => string) {
  switch (action) {
    case "COMPLETE_PAYMENT":
      return t("openPayments");
    case "JOIN_UPCOMING_SESSION":
      return t("sessionJoinNow");
    case "VIEW_SUPPORT_TICKET":
      return t("openSupport");
    case "START_GUIDED_MATCHING":
    case "TAKE_ASSESSMENT":
      return t("openMatching");
    case "BOOK_NEXT_SESSION":
      return t("exploreSpecialists");
    default:
      return t("openProfile");
  }
}

export function HomeScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { profile } = useAuthSession();
  const { spacing, colors } = useAppTheme();
  const sessionsQuery = useMySessions("SCHEDULED");
  const journeyQuery = useJourneySummary();

  if (journeyQuery.isLoading || sessionsQuery.isLoading) {
    return (
      <AppScreen>
        <AppLoader label={t("loading")} />
      </AppScreen>
    );
  }

  if (journeyQuery.isError || sessionsQuery.isError) {
    return (
      <AppScreen>
        <AppErrorState
          onRetry={() => {
            void journeyQuery.refetch();
            void sessionsQuery.refetch();
          }}
        />
      </AppScreen>
    );
  }

  const nextSession = sessionsQuery.data?.items?.[0];
  const nextSessionTime = nextSession?.scheduledStartAt
    ? new Intl.DateTimeFormat(i18n.language, {
        weekday: "long",
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(nextSession.scheduledStartAt))
    : "";

  const action = journeyQuery.data?.suggestedNextAction || "BOOK_NEXT_SESSION";

  return (
    <AppScreen scroll contentStyle={{ paddingBottom: 160 }}>
      <View style={{ gap: spacing.lg }}>
        <View
          style={{
            alignItems: "center",
            backgroundColor: "rgba(248,249,251,0.82)",
            borderRadius: 999,
            flexDirection: "row",
            justifyContent: "space-between",
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.sm,
          }}
        >
          <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm }}>
            <Image source={{ uri: stitchAssets.journeyAvatar }} style={{ borderRadius: 20, height: 40, width: 40 }} />
            <View>
              <AppText variant="caption" color={colors.textMuted}>
                أهلًا بك،
              </AppText>
              <AppText color={colors.primary} style={{ fontWeight: "800" }}>
                {profile?.displayName || "ضيف فايِد"}
              </AppText>
            </View>
          </View>

          <AppText variant="title" color={colors.primary} style={{ fontWeight: "900" }}>
            Fayed
          </AppText>

          <Pressable onPress={() => authSessionService.logout().then(() => router.replace(routes.public.welcome))}>
            <AppText variant="caption" color={colors.textSecondary}>
              خروج
            </AppText>
          </Pressable>
        </View>

        <AppCard style={{ backgroundColor: colors.primaryContainer, borderRadius: 42, padding: spacing.lg }}>
          <View style={{ gap: spacing.sm }}>
            <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between" }}>
              <View>
                <AppText variant="heading" color="#FFFFFF" style={{ fontSize: 36, fontWeight: "900" }}>
                  رحلتي
                </AppText>
                <AppText color="#EAF2FF">خطواتك القادمة نحو الاستقرار</AppText>
              </View>
              <View style={{ backgroundColor: "rgba(255,255,255,0.24)", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 }}>
                <AppText variant="caption" color="#FFFFFF" style={{ fontWeight: "700" }}>
                  المستوى 2
                </AppText>
              </View>
            </View>

            <View style={{ gap: spacing.xs, marginTop: spacing.xs }}>
              <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between" }}>
                <AppText variant="caption" color="#EAF2FF">
                  التقدم الحالي
                </AppText>
                <AppText variant="caption" color="#FFFFFF" style={{ fontWeight: "700" }}>
                  ٦٥٪
                </AppText>
              </View>
              <View style={{ backgroundColor: "rgba(255,255,255,0.26)", borderRadius: 999, height: 12, overflow: "hidden" }}>
                <View style={{ backgroundColor: "#FFFFFF", borderRadius: 999, height: "100%", width: "65%" }} />
              </View>
            </View>

            <AppText color="#F4F8FF" style={{ lineHeight: 24 }}>
              لقد أنجزت 3 جلسات هذا الشهر. استمر في التقدم.
            </AppText>
          </View>
        </AppCard>

        <View style={{ gap: spacing.sm }}>
          <AppText variant="title" style={{ fontWeight: "800" }}>
            جلستك القادمة
          </AppText>
          <AppCard style={{ backgroundColor: colors.surfaceLowest, borderRadius: 34, padding: spacing.lg }}>
            <View style={{ gap: spacing.md }}>
              <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.md }}>
                <Image source={{ uri: stitchAssets.practitionerFallback }} style={{ borderRadius: 16, height: 68, width: 68 }} />
                <View style={{ flex: 1, gap: spacing.xs }}>
                  <AppText style={{ fontWeight: "800" }}>
                    {nextSession?.practitioner.displayName || "لا توجد جلسة قادمة"}
                  </AppText>
                  <AppText color={colors.textSecondary}>
                    {nextSession ? nextSessionTime : "ابدأ بحجز جلسة جديدة"}
                  </AppText>
                </View>
                {nextSession ? (
                  <View style={{ backgroundColor: "rgba(197,236,204,0.9)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 }}>
                    <AppText variant="caption" style={{ fontWeight: "700" }}>
                      قريبًا
                    </AppText>
                  </View>
                ) : null}
              </View>

              <AppButton
                label={nextSession ? t("sessionJoinNow") : t("exploreSpecialists")}
                onPress={() =>
                  router.push(nextSession ? routes.app.sessionDetails(nextSession.id) : routes.app.practitioners)
                }
              />
            </View>
          </AppCard>
        </View>

        <View style={{ gap: spacing.sm }}>
          <AppText variant="title" style={{ fontWeight: "800" }}>
            الوصول السريع
          </AppText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            {QUICK_ACTIONS.map((item) => (
              <Pressable
                key={item.title}
                onPress={() => router.push(item.href)}
                style={{
                  backgroundColor: item.tone,
                  borderRadius: 28,
                  gap: spacing.xs,
                  minHeight: 128,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.md,
                  width: "48%",
                }}
              >
                <AppText style={{ fontSize: 20 }}>{item.icon}</AppText>
                <AppText style={{ fontWeight: "800" }}>{t(item.title)}</AppText>
                <AppText variant="caption" color={colors.textSecondary}>
                  {item.hint}
                </AppText>
              </Pressable>
            ))}
          </View>
        </View>

        <AppCard style={{ backgroundColor: "rgba(242,244,246,0.92)", borderRadius: 30, padding: spacing.lg }}>
          <View style={{ gap: spacing.sm }}>
            <AppText variant="title" style={{ fontWeight: "800" }}>
              الخطوة الأهم الآن
            </AppText>
            <AppText color={colors.textSecondary}>اخترنا لك الإجراء التالي بناءً على وضع رحلتك الحالية.</AppText>
            <AppButton label={mapActionLabel(action, t)} onPress={() => router.push(mapActionToRoute(action))} />
          </View>
        </AppCard>
      </View>
    </AppScreen>
  );
}
