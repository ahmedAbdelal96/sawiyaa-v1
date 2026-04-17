import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { View } from "react-native";

import { routes } from "@/core/constants/routes";
import { useAppTheme } from "@/core/theme/theme-provider";
import { SessionSummaryCard } from "@/modules/booking/components/session-summary-card";
import type { BookingDuration } from "@/modules/booking/domain/booking.types";
import { useCreateSession } from "@/modules/booking/hooks/use-booking";
import { usePractitionerProfile } from "@/modules/practitioners/hooks/use-practitioner-profile";
import { AppButton, AppEmptyState, AppErrorState, AppHeader, AppLoader, AppScreen, AppText } from "@/shared/ui";

function parseDuration(value: string | undefined): BookingDuration | null {
  if (value === "30") return 30;
  if (value === "60") return 60;
  return null;
}

export function BookingConfirmScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { spacing, colors } = useAppTheme();
  const params = useLocalSearchParams<{
    slug?: string;
    startsAt?: string;
    durationMinutes?: string;
  }>();

  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug || "";
  const startsAt = Array.isArray(params.startsAt) ? params.startsAt[0] : params.startsAt || "";
  const durationMinutesRaw = Array.isArray(params.durationMinutes)
    ? params.durationMinutes[0]
    : params.durationMinutes;
  const durationMinutes = parseDuration(durationMinutesRaw);

  const profileQuery = usePractitionerProfile(slug);
  const createSessionMutation = useCreateSession();

  if (!slug || !startsAt || !durationMinutes) {
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

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <AppScreen>
        <AppErrorState onRetry={() => profileQuery.refetch()} />
      </AppScreen>
    );
  }

  return (
    <AppScreen scroll>
      <View style={{ gap: spacing.lg }}>
        <AppHeader title={t("bookingConfirmTitle")} subtitle={t("bookingConfirmSubtitle")} />

        <SessionSummaryCard
          practitionerName={profileQuery.data.displayName || "-"}
          startsAt={startsAt}
          durationMinutes={durationMinutes}
        />
        <AppText color={colors.primary} style={{ fontWeight: "800" }}>
          {t("bookingCreateSession")}
        </AppText>

        <AppButton
          label={t("bookingCreateSession")}
          loading={createSessionMutation.isPending}
          onPress={() =>
            createSessionMutation.mutate(
              {
                practitionerSlug: slug,
                scheduledStartAt: startsAt,
                durationMinutes,
                sessionMode: "VIDEO",
              },
              {
                onSuccess: (session) => {
                  router.replace(routes.app.paymentCheckout(session.id));
                },
              },
            )
          }
        />

        {createSessionMutation.isError ? <AppErrorState onRetry={() => createSessionMutation.reset()} /> : null}
      </View>
    </AppScreen>
  );
}
