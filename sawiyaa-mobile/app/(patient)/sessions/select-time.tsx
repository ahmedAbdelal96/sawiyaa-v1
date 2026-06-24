import React, { useEffect, useMemo, useRef, useState } from "react";
import { I18nManager, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Button, Card, Header, Screen, ScreenHeading, Text } from "../../../src/components/ui";
import { useTheme } from "../../../src/providers/ThemeProvider";
import { useGetPublicPractitionerDetails } from "../../../src/features/patient/discovery/api";
import { getPatientPreferredCurrency } from "../../../src/lib/currency";
import { usePatientProfile } from "../../../src/features/patient/profile/hooks";
import { trackAnalyticsEvent } from "../../../src/lib/analytics";
import { usePublicPractitionerPackagePlans, usePackagePlanQuote } from "../../../src/features/patient/package-plans/hooks";
import { usePublicAvailabilityWindows } from "../../../src/features/patient/sessions/hooks";
import type {
  AvailabilityWindow,
  BookedAvailabilitySlot,
} from "../../../src/features/patient/sessions/types";
import type { PackagePlanQuotedItem } from "../../../src/features/patient/package-plans/types";
import {
  BookingTypeTabs,
  DurationSegment,
  type BookingTypeValue,
  type DurationValue,
  PackagePlanSelector,
  PractitionerSummaryCard,
  RollingDateScheduleTable,
  type SelectTimeDateColumn,
} from "../../../src/features/patient/sessions/components/SelectTimePanels";
import { formatViewerDateTime } from "../../../src/lib/time-formatting";

const VISIBLE_DATE_COLUMNS = 5;
type ScheduleSlot = {
  startsAt: string;
  kind: "AVAILABLE" | "BOOKED" | "RESERVED";
};

function toDayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function buildSlotsFromDurationWindows(
  windows: AvailabilityWindow[],
  bookedSlots: BookedAvailabilitySlot[],
  durationMinutes: DurationValue,
): ScheduleSlot[] {
  const earliestAllowedStart = Date.now() + 60 * 1000;
  const slots: ScheduleSlot[] = [];

  for (const window of windows) {
    if (window.durationMinutes !== null && window.durationMinutes !== durationMinutes) {
      continue;
    }

    const startMs = new Date(window.startsAt).getTime();
    if (startMs <= earliestAllowedStart) continue;

    slots.push({
      startsAt: new Date(startMs).toISOString(),
      kind: "AVAILABLE",
    });
  }

  for (const booked of bookedSlots) {
    if (
      booked.durationMinutes !== null &&
      booked.durationMinutes !== durationMinutes
    ) {
      continue;
    }
    if (new Date(booked.startsAt).getTime() <= earliestAllowedStart) continue;
    slots.push({
      startsAt: booked.startsAt,
      kind: booked.statusType,
    });
  }

  const deduped = new Map<string, ScheduleSlot>();
  for (const slot of slots) {
    const existing = deduped.get(slot.startsAt);
    if (!existing) {
      deduped.set(slot.startsAt, slot);
      continue;
    }

    if (existing.kind === "AVAILABLE" && slot.kind !== "AVAILABLE") {
      deduped.set(slot.startsAt, slot);
    }
  }

  const merged = Array.from(deduped.values());
  merged.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  return merged;
}

function toDateColumns(
  from: Date,
  locale: string,
  slots: ScheduleSlot[],
): SelectTimeDateColumn[] {
  const map = new Map<string, ScheduleSlot[]>();
  for (const slot of slots) {
    const date = new Date(slot.startsAt);
    const dayKey = toDayKey(date);
    const list = map.get(dayKey);
    if (list) list.push(slot);
    else map.set(dayKey, [slot]);
  }

  const dayNameFormatter = new Intl.DateTimeFormat(locale, { weekday: "short" });
  const dayNumberFormatter = new Intl.DateTimeFormat(locale, { day: "numeric" });
  const columns: SelectTimeDateColumn[] = [];
  for (let idx = 0; idx < VISIBLE_DATE_COLUMNS; idx += 1) {
    const date = new Date(from);
    date.setDate(from.getDate() + idx);
    const dayKey = toDayKey(date);
    columns.push({
      dayKey,
      dayLabelShort: dayNameFormatter.format(date),
      dayNumber: dayNumberFormatter.format(date),
      slots: map.get(dayKey) ?? [],
    });
  }
  return columns;
}

function formatMoney(amount: string | null | undefined, currency: string, locale: string) {
  if (!amount) return null;
  const num = Number(amount);
  if (!Number.isFinite(num)) return null;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(num);
}

export default function SelectSessionTimeScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const isArabicUi = i18n.language?.startsWith("ar") ?? false;
  const isRtl = isArabicUi || I18nManager.isRTL;
  const locale = isArabicUi ? "ar-SA" : "en-US";
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const params = useLocalSearchParams<{
    slug: string;
    practitionerName?: string;
    practitionerTitle?: string;
    practitionerAvatarUrl?: string;
  }>();

  const [bookingType, setBookingType] = useState<BookingTypeValue>("appointment");
  const [appointmentDuration, setAppointmentDuration] = useState<DurationValue>(30);
  const [packageDuration, setPackageDuration] = useState<DurationValue>(30);
  const [dateWindowOffsetDays, setDateWindowOffsetDays] = useState(0);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [showBooked, setShowBooked] = useState(false);
  const [footerHeight, setFooterHeight] = useState(96);

  const [selectedAppointmentSlot, setSelectedAppointmentSlot] = useState<string | null>(null);
  const [selectedPackagePlanCode, setSelectedPackagePlanCode] = useState<string | null>(null);
  const [selectedPackageSlots, setSelectedPackageSlots] = useState<string[]>([]);

  const continueLockRef = useRef(false);
  const canShowBookedSlots = true;

  const practitionerQuery = useGetPublicPractitionerDetails(params.slug ?? null);
  const profileQuery = usePatientProfile();
  const practitioner = practitionerQuery.data?.data.item ?? null;

  // Egyptian patients always see EGP; non-Egyptian see practitioner's USD setting
  const patientCountryCode = profileQuery.data?.profile.countryCode ?? null;
  const packageCurrency = practitioner
    ? getPatientPreferredCurrency(patientCountryCode, practitioner)
    : "USD";
  const packageSupport30Query = usePublicPractitionerPackagePlans(
    params.slug ?? null,
    {
      durationMinutes: 30,
      sessionMode: "VIDEO",
      currencyCode: packageCurrency,
    },
    { enabled: Boolean(params.slug) },
  );
  const packageSupport60Query = usePublicPractitionerPackagePlans(
    params.slug ?? null,
    {
      durationMinutes: 60,
      sessionMode: "VIDEO",
      currencyCode: packageCurrency,
    },
    { enabled: Boolean(params.slug) },
  );
  const supportsPackages30 = (packageSupport30Query.data?.items?.length ?? 0) > 0;
  const supportsPackages60 = (packageSupport60Query.data?.items?.length ?? 0) > 0;
  const supportsPackagesByPlans = supportsPackages30 || supportsPackages60;
  const isPackageSupportChecking =
    Boolean(params.slug) &&
    !supportsPackagesByPlans &&
    (packageSupport30Query.isLoading || packageSupport60Query.isLoading);
  const practitionerAcceptsPackages =
    (practitioner as { acceptsPackage?: boolean; acceptsPackages?: boolean } | null)
      ?.acceptsPackage ??
    (practitioner as { acceptsPackage?: boolean; acceptsPackages?: boolean } | null)
      ?.acceptsPackages ??
    null;
  const supportsPackages =
    practitionerAcceptsPackages === false ? false : supportsPackagesByPlans;

  useEffect(() => {
    if (!supportsPackages && bookingType === "package") {
      setBookingType("appointment");
    }
  }, [supportsPackages, bookingType]);

  const dateWindow = useMemo(() => {
    const today = new Date();
    const from = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + dateWindowOffsetDays,
      0,
      0,
      0,
      0,
    );
    const to = new Date(from);
    to.setDate(to.getDate() + VISIBLE_DATE_COLUMNS);
    return { from, to, fromIso: from.toISOString(), toIso: to.toISOString() };
  }, [dateWindowOffsetDays]);

  const effectiveDuration = bookingType === "appointment" ? appointmentDuration : packageDuration;
  const windowsQuery = usePublicAvailabilityWindows(
    params.slug ?? null,
    dateWindow.fromIso,
    dateWindow.toIso,
    showBooked,
  );
  const windows = windowsQuery.data?.windows ?? [];
  const bookedSlots = showBooked ? windowsQuery.data?.bookedSlots ?? [] : [];
  const durationSlots = useMemo(
    () =>
      buildSlotsFromDurationWindows(windows, bookedSlots, effectiveDuration),
    [bookedSlots, effectiveDuration, windows],
  );
  const dateColumns = useMemo(
    () => toDateColumns(dateWindow.from, locale, durationSlots),
    [dateWindow.from, durationSlots, locale],
  );

  const packagePlansQuery = usePublicPractitionerPackagePlans(
    params.slug ?? null,
    {
      durationMinutes: packageDuration,
      sessionMode: "VIDEO",
      currencyCode: packageCurrency,
    },
    { enabled: bookingType === "package" && supportsPackages },
  );
  const packagePlans = packagePlansQuery.data?.items ?? [];

  useEffect(() => {
    if (!packagePlans.length) {
      setSelectedPackagePlanCode(null);
      return;
    }
    const exists = selectedPackagePlanCode
      ? packagePlans.some((plan) => plan.item.code === selectedPackagePlanCode)
      : false;
    if (!exists) {
      setSelectedPackagePlanCode(packagePlans[0]?.item.code ?? null);
    }
  }, [packagePlans, selectedPackagePlanCode]);

  const selectedPackagePlan = useMemo<PackagePlanQuotedItem | null>(() => {
    if (!selectedPackagePlanCode) return null;
    return packagePlans.find((plan) => plan.item.code === selectedPackagePlanCode) ?? null;
  }, [packagePlans, selectedPackagePlanCode]);

  const packageQuoteQuery = usePackagePlanQuote(
    bookingType === "package" && selectedPackagePlanCode && params.slug
      ? {
          packagePlanCode: selectedPackagePlanCode,
          practitionerSlug: params.slug,
          durationMinutes: packageDuration,
          sessionMode: "VIDEO",
          currencyCode: packageCurrency,
        }
      : null,
  );
  const packageQuote = packageQuoteQuery.data?.item?.quote ?? selectedPackagePlan?.quote ?? null;
  const requiredPackageSlots = packageQuote?.sessionCount ?? selectedPackagePlan?.item.sessionCount ?? 0;

  useEffect(() => {
    setSelectedAppointmentSlot(null);
    setSelectedPackageSlots([]);
  }, [bookingType]);

  useEffect(() => {
    setSelectedAppointmentSlot(null);
  }, [appointmentDuration]);

  useEffect(() => {
    setSelectedPackageSlots([]);
  }, [packageDuration, selectedPackagePlanCode, dateWindowOffsetDays]);

  useEffect(() => {
    if (selectedAppointmentSlot) {
      const stillExists = dateColumns.some((day) =>
        day.slots.some((slot) => slot.startsAt === selectedAppointmentSlot),
      );
      if (!stillExists) setSelectedAppointmentSlot(null);
    }
  }, [dateColumns, selectedAppointmentSlot]);

  const practitionerName =
    params.practitionerName ??
    practitioner?.displayName ??
    t("patientSessionsFlow.common.practitionerFallback");
  const practitionerTitle =
    params.practitionerTitle ??
    practitioner?.professionalTitle ??
    t("patientSessionsFlow.common.professionalFallback");
  const practitionerAvatarUrl = params.practitionerAvatarUrl ?? practitioner?.avatarUrl ?? "";

  const selectedAppointmentLabel = selectedAppointmentSlot
    ? formatViewerDateTime(selectedAppointmentSlot, {
        locale,
        fallbackText: t("patientSessionsFlow.selectTime.noSelectedSlot"),
      })
    : t("patientSessionsFlow.selectTime.noSelectedSlot");

  const packageSelectedSummary =
    selectedPackageSlots.length === 0
      ? t("patientSessionsFlow.selectTime.packageProgress", {
          selected: 0,
          total: requiredPackageSlots || 0,
        })
      : t("patientSessionsFlow.selectTime.packageProgress", {
          selected: selectedPackageSlots.length,
          total: requiredPackageSlots || 0,
        });

  const canContinueAppointment = Boolean(selectedAppointmentSlot && params.slug);
  const canContinuePackage =
    Boolean(params.slug) &&
    Boolean(selectedPackagePlanCode) &&
    Boolean(packageQuote) &&
    requiredPackageSlots > 0 &&
    selectedPackageSlots.length === requiredPackageSlots &&
    !packageQuoteQuery.isLoading &&
    !packageQuoteQuery.isError;

  const packageCtaEnabled = canContinuePackage;

  const onToggleAppointmentSlot = (slot: string) => {
    setSelectedAppointmentSlot(slot);
    trackAnalyticsEvent("slot_selected", {
      practitionerSlug: params.slug || undefined,
      selectedStartAt: slot,
      durationMinutes: appointmentDuration,
      bookingType: "appointment",
    });
  };

  const onTogglePackageSlot = (slot: string) => {
    setSelectedPackageSlots((current) => {
      if (current.includes(slot)) return current.filter((value) => value !== slot);
      if (current.length >= requiredPackageSlots) return current;
      return [...current, slot].sort();
    });
    trackAnalyticsEvent("slot_selected", {
      practitionerSlug: params.slug || undefined,
      selectedStartAt: slot,
      durationMinutes: packageDuration,
      bookingType: "package",
    });
  };

  const onContinueAppointment = () => {
    if (continueLockRef.current || !selectedAppointmentSlot) return;
    continueLockRef.current = true;
    router.push({
      pathname: "/(patient)/sessions/confirm",
      params: {
        slug: params.slug,
        practitionerName: practitionerName,
        practitionerTitle: practitionerTitle,
        practitionerAvatarUrl: practitionerAvatarUrl,
        selectedStartAt: selectedAppointmentSlot,
        maxDuration: String(appointmentDuration),
      },
    });
  };

  const onContinuePackage = () => {
    if (!canContinuePackage || !selectedPackagePlanCode) return;
    const preselectedSlots = JSON.stringify(
      selectedPackageSlots.map((scheduledStartAt) => ({ scheduledStartAt })),
    );
    router.push({
      pathname: "/(patient)/package-purchases/create",
      params: {
        practitionerSlug: params.slug,
        practitionerName,
        practitionerTitle,
        practitionerAvatarUrl,
        packagePlanCode: selectedPackagePlanCode,
        durationMinutes: String(packageDuration),
        sessionMode: "VIDEO",
        currencyCode: packageQuote?.selectedCurrencyCode ?? packageCurrency,
        preselectedSlots,
      },
    });
  };

  return (
    <Screen bg="background" style={styles.screen} edges={["top", "left", "right"]}>
      <Header showBack />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: footerHeight + Math.max(insets.bottom, 12) + 16 },
        ]}
      >
        <ScreenHeading
          title={t("patientSessionsFlow.selectTime.title")}
          subtitle={t("patientSessionsFlow.selectTime.headingSubtitle")}
          titleVariant="h2"
        />

        <PractitionerSummaryCard
          theme={theme}
          isRtl={isRtl}
          practitionerName={practitionerName}
          practitionerTitle={practitionerTitle}
          practitionerAvatarUrl={practitionerAvatarUrl}
          avatarFailed={avatarFailed}
          setAvatarFailed={setAvatarFailed}
        />

        <BookingTypeTabs
          theme={theme}
          isRtl={isRtl}
          value={bookingType}
          onChange={setBookingType}
          showPackageTab={supportsPackages}
          isPackageSupportChecking={isPackageSupportChecking}
        />

        {bookingType === "appointment" ? (
          <>
            <Card variant="elevated" padding="sm" style={styles.compactCard}>
              <DurationSegment
                theme={theme}
                isRtl={isRtl}
                title={t("patientSessionsFlow.selectTime.durationTitle")}
                value={appointmentDuration}
                onChange={setAppointmentDuration}
              />
            </Card>

            <RollingDateScheduleTable
              theme={theme}
              locale={locale}
              isRtl={isRtl}
              fromIso={dateWindow.fromIso}
              toIso={dateWindow.toIso}
              dateColumns={dateColumns}
              onPrevWindow={() => setDateWindowOffsetDays((prev) => prev - VISIBLE_DATE_COLUMNS)}
              onNextWindow={() => setDateWindowOffsetDays((prev) => prev + VISIBLE_DATE_COLUMNS)}
              selectedSlots={selectedAppointmentSlot ? [selectedAppointmentSlot] : []}
              onToggleSlot={onToggleAppointmentSlot}
              maxSelectedCount={1}
              isLoading={windowsQuery.isLoading}
              isError={windowsQuery.isError}
              onRetry={() => windowsQuery.refetch()}
              showBooked={showBooked}
              onToggleShowBooked={setShowBooked}
              canShowBookedSlots={canShowBookedSlots}
              timezone={timezone}
            />
          </>
        ) : (
          <>
            <Card variant="elevated" padding="sm" style={styles.compactCard}>
              <Text color={theme.colors.textSecondary} style={styles.packageIntro}>
                {t("patientSessionsFlow.selectTime.packageIntro")}
              </Text>

              <DurationSegment
                theme={theme}
                isRtl={isRtl}
                title={t("patientSessionsFlow.selectTime.durationTitle")}
                value={packageDuration}
                onChange={setPackageDuration}
              />

              <Text weight="600" style={[styles.blockTitle, styles.blockTitleSpaced]}>
                {t("patientSessionsFlow.selectTime.packagePlansTitle")}
              </Text>
              <PackagePlanSelector
                theme={theme}
                isRtl={isRtl}
                plans={packagePlans}
                selectedPlanCode={selectedPackagePlanCode}
                onSelectPlan={setSelectedPackagePlanCode}
                isLoading={packagePlansQuery.isLoading}
                isError={packagePlansQuery.isError}
                onRetry={() => packagePlansQuery.refetch()}
              />
              {!packagePlansQuery.isLoading &&
              !packagePlansQuery.isError &&
              packagePlans.length === 0 ? (
                <Text color={theme.colors.textMuted} style={styles.noPlansText}>
                  {t("patientSessionsFlow.selectTime.packageDurationUnavailable")}
                </Text>
              ) : null}
            </Card>

            <Card variant="elevated" padding="sm" style={styles.compactCard}>
              <Text weight="600" style={styles.blockTitle}>
                {t("patientSessionsFlow.selectTime.quoteTitle")}
              </Text>
              {packageQuoteQuery.isLoading ? (
                <Text color={theme.colors.textSecondary} style={styles.quoteText}>
                  {t("patientSessionsFlow.common.loading")}
                </Text>
              ) : packageQuoteQuery.isError || !packageQuote ? (
                <View style={styles.inlineState}>
                  <Text color={theme.colors.textSecondary}>{t("patientSessionsFlow.selectTime.packageQuoteError")}</Text>
                  <Button title={t("patientSessionsFlow.common.retry")} onPress={() => packageQuoteQuery.refetch()} style={styles.retryButton} />
                </View>
              ) : (
                <View style={styles.quoteStack}>
                  <Text style={styles.quoteText}>
                    {t("patientSessionsFlow.selectTime.quoteRegularTotal")}:{" "}
                    {formatMoney(packageQuote.undiscountedTotal, packageQuote.selectedCurrencyCode, locale) ?? "-"}
                  </Text>
                  <Text style={styles.quoteText}>
                    {t("patientSessionsFlow.selectTime.quoteDiscount")}:{" "}
                    {formatMoney(packageQuote.discountAmount, packageQuote.selectedCurrencyCode, locale) ?? "-"} ({Number(packageQuote.discountPercent)}%)
                  </Text>
                  <Text weight="600" style={styles.quoteText}>
                    {t("patientSessionsFlow.selectTime.quotePayable")}:{" "}
                    {formatMoney(packageQuote.patientPayableTotal, packageQuote.selectedCurrencyCode, locale) ?? "-"}
                  </Text>
                </View>
              )}
            </Card>

            <Card variant="elevated" padding="sm" style={styles.compactCard}>
              <Text weight="600" style={styles.blockTitle}>
                {t("patientSessionsFlow.selectTime.packageProgressTitle")}
              </Text>
              <Text style={styles.quoteText} color={theme.colors.textSecondary}>
                {packageSelectedSummary}
              </Text>
            </Card>

            <RollingDateScheduleTable
              theme={theme}
              locale={locale}
              isRtl={isRtl}
              fromIso={dateWindow.fromIso}
              toIso={dateWindow.toIso}
              dateColumns={dateColumns}
              onPrevWindow={() => setDateWindowOffsetDays((prev) => prev - VISIBLE_DATE_COLUMNS)}
              onNextWindow={() => setDateWindowOffsetDays((prev) => prev + VISIBLE_DATE_COLUMNS)}
              selectedSlots={selectedPackageSlots}
              onToggleSlot={onTogglePackageSlot}
              maxSelectedCount={requiredPackageSlots || 0}
              isLoading={windowsQuery.isLoading}
              isError={windowsQuery.isError}
              onRetry={() => windowsQuery.refetch()}
              showBooked={showBooked}
              onToggleShowBooked={setShowBooked}
              canShowBookedSlots={canShowBookedSlots}
              timezone={timezone}
            />
          </>
        )}
      </ScrollView>

      <View
        onLayout={(event) => {
          const height = Math.ceil(event.nativeEvent.layout.height);
          if (height > 0 && height !== footerHeight) {
            setFooterHeight(height);
          }
        }}
        style={[
          styles.footer,
          {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.borderLight,
            paddingBottom: Math.max(10, insets.bottom + 4),
          },
        ]}
      >
        {bookingType === "appointment" ? (
          <Text style={styles.footerTopText} color={theme.colors.textSecondary}>
            {selectedAppointmentLabel}
          </Text>
        ) : (
          <Text style={styles.footerTopText} color={theme.colors.textSecondary}>
            {packageSelectedSummary}
          </Text>
        )}
        {bookingType === "appointment" ? (
          <Button
            title={t("patientSessionsFlow.selectTime.continue")}
            onPress={onContinueAppointment}
            disabled={!canContinueAppointment}
            style={styles.footerButton}
          />
        ) : (
          <TouchableOpacity
            activeOpacity={packageCtaEnabled ? 0.85 : 1}
            onPress={onContinuePackage}
            disabled={!packageCtaEnabled}
            style={[
              styles.packageFooterButton,
              {
                backgroundColor: packageCtaEnabled ? theme.colors.primary : theme.colors.borderStrong,
              },
            ]}
          >
            <Text
              weight="600"
              color={theme.colors.surface}
              style={styles.packageFooterButtonText}
            >
              {t("patientSessionsFlow.selectTime.continueToPackagePayment")}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 0 },
  scrollContent: { paddingHorizontal: 10, paddingTop: 8, paddingBottom: 170, gap: 8 },
  compactCard: { borderRadius: 12 },
  packageIntro: { fontSize: 12, lineHeight: 18 },
  blockTitle: { fontSize: 15, lineHeight: 21 },
  blockTitleSpaced: { marginTop: 8 },
  quoteStack: { gap: 6, marginTop: 8 },
  quoteText: { fontSize: 12 },
  noPlansText: { marginTop: 8, fontSize: 12 },
  inlineState: { paddingVertical: 10 },
  retryButton: { marginTop: 6, borderRadius: 10 },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    paddingHorizontal: 10,
    paddingTop: 8,
  },
  footerTopText: { fontSize: 12, marginBottom: 6 },
  footerButton: { borderRadius: 12, minHeight: 44 },
  packageFooterButton: {
    width: "100%",
    minHeight: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  packageFooterButtonText: { fontSize: 15, lineHeight: 20, textAlign: "center" },
});
