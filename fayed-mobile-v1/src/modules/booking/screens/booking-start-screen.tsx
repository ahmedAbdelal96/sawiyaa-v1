import { useRouter, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Image, View } from "react-native";

import { routes } from "@/core/constants/routes";
import { stitchAssets } from "@/core/constants/stitch-assets";
import { useAppTheme } from "@/core/theme/theme-provider";
import { SlotPicker } from "@/modules/booking/components/slot-picker";
import type { BookingDuration } from "@/modules/booking/domain/booking.types";
import { usePractitionerAvailability, usePractitionerProfile } from "@/modules/practitioners/hooks/use-practitioner-profile";
import { AppButton, AppCard, AppChip, AppEmptyState, AppErrorState, AppHeader, AppLoader, AppScreen, AppText } from "@/shared/ui";

export function BookingStartScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { spacing, colors } = useAppTheme();
  const params = useLocalSearchParams<{ slug?: string }>();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug || "";
  const [durationMinutes, setDurationMinutes] = useState<BookingDuration>(60);
  const [selectedSlot, setSelectedSlot] = useState<string | undefined>();

  const profileQuery = usePractitionerProfile(slug);
  const availabilityQuery = usePractitionerAvailability(slug);

  if (!slug) {
    return (
      <AppScreen>
        <AppEmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
      </AppScreen>
    );
  }

  if (profileQuery.isLoading || availabilityQuery.isLoading) {
    return (
      <AppScreen>
        <AppLoader label={t("loading")} />
      </AppScreen>
    );
  }

  if (profileQuery.isError || availabilityQuery.isError) {
    return (
      <AppScreen>
        <AppErrorState
          onRetry={() => {
            void profileQuery.refetch();
            void availabilityQuery.refetch();
          }}
        />
      </AppScreen>
    );
  }

  if (!profileQuery.data || !availabilityQuery.data) {
    return (
      <AppScreen>
        <AppEmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
      </AppScreen>
    );
  }

  return (
    <AppScreen scroll>
      <View style={{ gap: spacing.lg }}>
        <AppHeader title={t("bookingTitle")} subtitle={profileQuery.data.displayName || t("bookingSubtitle")} />

        <Image
          source={{ uri: profileQuery.data.avatarUrl || stitchAssets.practitionerFallback }}
          style={{ borderRadius: 32, height: 190, width: "100%" }}
        />

        <AppCard style={{ backgroundColor: colors.surfaceLow }}>
          <View style={{ gap: spacing.md }}>
            <AppText variant="title" style={{ fontWeight: "800" }}>
              {t("bookingDurationTitle")}
            </AppText>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              <AppChip label={`30 ${t("minutesLabel")}`} selected={durationMinutes === 30} onPress={() => setDurationMinutes(30)} />
              <AppChip label={`60 ${t("minutesLabel")}`} selected={durationMinutes === 60} onPress={() => setDurationMinutes(60)} />
            </View>
          </View>
        </AppCard>

        <AppCard style={{ backgroundColor: colors.surfaceLowest }}>
          <View style={{ gap: spacing.md }}>
            <AppText variant="title" style={{ fontWeight: "800" }}>
              {t("bookingSlotTitle")}
            </AppText>
            <AppText color={colors.textSecondary}>{t("bookingSlotDescription")}</AppText>
            <SlotPicker
              slots={availabilityQuery.data.windows}
              selectedSlot={selectedSlot}
              onSelect={setSelectedSlot}
              locale={i18n.language}
            />
          </View>
        </AppCard>

        <AppButton
          label={t("bookingContinue")}
          disabled={!selectedSlot}
          onPress={() => {
            if (!selectedSlot) return;
            router.push(routes.app.bookingConfirm(slug, selectedSlot, durationMinutes));
          }}
        />
      </View>
    </AppScreen>
  );
}
