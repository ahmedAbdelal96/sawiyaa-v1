import React, { useMemo, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  Button,
  Card,
  DetailPageScaffold,
  EmptyState,
  ScreenHeading,
  Text,
} from "../../../../components/ui";
import { useTheme } from "../../../../providers/ThemeProvider";
import { useAppDirection } from "../../../../i18n/direction";
import { getBookingErrorMessage } from "../../../../lib/booking-error-messages";
import { usePublicAvailabilityWindows } from "../../sessions/hooks";
import {
  buildSlotsFromWindows,
  formatLocalizedDateTime,
  getWeekRange,
} from "../../sessions/slot-utils";
import { useBookPackageSession, useMyPackagePurchase } from "../hooks";

export default function PackageSessionBookingScreen({
  purchaseId,
}: {
  purchaseId: string;
}) {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const { textAlign, rowDirection } = useAppDirection();
  const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US";
  const purchaseQuery = useMyPackagePurchase(purchaseId);
  const purchase = purchaseQuery.data?.item ?? null;
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedStart, setSelectedStart] = useState<string | null>(null);
  const booking = useBookPackageSession();
  const week = getWeekRange(weekOffset);
  const availability = usePublicAvailabilityWindows(
    purchase?.practitioner?.publicSlug ?? null,
    week.fromIso,
    week.toIso,
  );
  const slots = useMemo(() => {
    const duration = purchase?.durationMinutes === 30 ? 30 : 60;
    return buildSlotsFromWindows(availability.data?.windows ?? []).filter(
      (slot) =>
        slot.durationMinutes === null || slot.durationMinutes === duration,
    );
  }, [availability.data?.windows, purchase?.durationMinutes]);

  if (purchaseQuery.isLoading) {
    return (
      <DetailPageScaffold title={t("packagePurchases.detail.title")} loading>
        <View />
      </DetailPageScaffold>
    );
  }
  if (!purchase || !purchase.practitioner) {
    return (
      <DetailPageScaffold showBack>
        <EmptyState
          title={t("packagePurchases.detail.notFoundTitle")}
          description={t("packagePurchases.detail.notFoundDescription")}
          actionLabel={t("packagePurchases.detail.back")}
          onAction={() => router.back()}
        />
      </DetailPageScaffold>
    );
  }

  const availableSessions = purchase.progress?.availableSessions ?? 0;
  const submit = async () => {
    if (!selectedStart) return;
    try {
      await booking.mutateAsync({
        purchaseId: purchase.id,
        scheduledStartAt: selectedStart,
      });
      router.back();
    } catch {
      // Refresh the authoritative entitlement projection after a stale-tab
      // conflict so the loser sees the new balance immediately.
      await purchaseQuery.refetch();
    }
  };

  return (
    <DetailPageScaffold showBack contentContainerStyle={styles.scaffold}>
      <View style={styles.stack}>
        <ScreenHeading
          title={t(
            "packagePurchases.detail.bookSessionTitle",
            "Book a package session",
          )}
          subtitle={t(
            "packagePurchases.detail.bookSessionSubtitle",
            "Choose one available appointment from your package.",
          )}
          titleVariant="h2"
        />
        <Card
          variant="flat"
          padding="sm"
          style={[
            styles.coverageNotice,
            {
              backgroundColor: theme.colors.primaryLight,
              borderColor: theme.colors.borderLight,
              flexDirection: rowDirection,
            },
          ]}
        >
          <Text color={theme.colors.primary} style={[styles.coverageNoticeText, { textAlign }]}>
            {t(
              "packagePurchases.detail.packageBookingNotice",
              "This session is covered by your package—no payment is needed.",
            )}
          </Text>
        </Card>
        {availableSessions <= 0 ? (
          <EmptyState
            title={t(
              "packagePurchases.detail.noAvailableSessions",
              "No sessions available",
            )}
            description={t(
              "packagePurchases.detail.noAvailableSessionsHint",
              "Your package has no unreserved sessions right now.",
            )}
            actionLabel={t("packagePurchases.detail.back")}
            onAction={() => router.back()}
          />
        ) : (
          <Card variant="outlined" padding="sm" style={styles.card}>
            <View style={[styles.weekRow, { flexDirection: rowDirection }]}>
              <Button
                title={t("packagePurchases.detail.previousWeek", "Previous")}
                variant="secondary"
                onPress={() => setWeekOffset((value) => Math.max(0, value - 1))}
              />
              <Button
                title={t("packagePurchases.detail.nextWeek", "Next")}
                variant="secondary"
                onPress={() => setWeekOffset((value) => value + 1)}
              />
            </View>
            <Text
              color={theme.colors.textSecondary}
              style={[styles.range, { textAlign }]}
            >
              {formatLocalizedDateTime(week.fromIso, locale)}
            </Text>
            {availability.isLoading ? (
              <Text style={{ textAlign }}>
                {t(
                  "packagePurchases.detail.loadingSlots",
                  "Loading availability...",
                )}
              </Text>
            ) : slots.length === 0 ? (
              <Text
                color={theme.colors.textSecondary}
                style={[styles.empty, { textAlign }]}
              >
                {t(
                  "packagePurchases.detail.noSlots",
                  "No available times in this week.",
                )}
              </Text>
            ) : (
              <View style={styles.slotGrid}>
                {slots.map((slot) => {
                  const selected = selectedStart === slot.startsAt;
                  return (
                    <TouchableOpacity
                      key={slot.startsAt}
                      onPress={() => setSelectedStart(slot.startsAt)}
                      style={[
                        styles.slot,
                        {
                          borderColor: selected
                            ? theme.colors.primary
                            : theme.colors.border,
                          backgroundColor: selected
                            ? theme.colors.primaryLight
                            : theme.colors.surface,
                        },
                      ]}
                    >
                      <Text weight="600" style={{ textAlign }}>
                        {formatLocalizedDateTime(slot.startsAt, locale)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
            {booking.error ? (
              <Text
                color={theme.colors.error}
                style={[styles.error, { textAlign }]}
              >
                {getBookingErrorMessage(booking.error, t, "package")}
              </Text>
            ) : null}
            <Button
              title={
                booking.isPending
                  ? t("packagePurchases.detail.booking", "Booking...")
                  : t("packagePurchases.list.bookSession", "Book session")
              }
              onPress={() => void submit()}
              disabled={!selectedStart || booking.isPending}
            />
          </Card>
        )}
      </View>
    </DetailPageScaffold>
  );
}

const styles = StyleSheet.create({
  scaffold: { paddingBottom: 28 },
  stack: { gap: 12 },
  card: { gap: 14, borderRadius: 20 },
  coverageNotice: { borderWidth: 1, borderRadius: 14 },
  coverageNoticeText: { flex: 1, fontSize: 12.5, lineHeight: 18 },
  weekRow: { justifyContent: "space-between", gap: 8 },
  range: { fontSize: 12 },
  slotGrid: { gap: 8 },
  slot: { borderWidth: 1, borderRadius: 12, padding: 12 },
  empty: { paddingVertical: 16 },
  error: { fontSize: 12 },
});
