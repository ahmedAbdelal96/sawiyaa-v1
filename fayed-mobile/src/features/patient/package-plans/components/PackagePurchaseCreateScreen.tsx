import React, { useEffect, useMemo, useRef, useState } from "react";
import { Image, StyleSheet, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import {
  Button,
  Card,
  DetailPageScaffold,
  EmptyState,
  ScreenHeading,
  SectionHeader,
  StatusChip,
  SummaryRow,
  Text,
} from "../../../../components/ui";
import { useTheme } from "../../../../providers/ThemeProvider";
import { useAuth } from "../../../../providers/AuthProvider";
import { resolveMediaUrl } from "../../../../lib/resolve-media-url";
import { extractApiErrorMessage } from "../../../../lib/api";
import { useCreatePackagePurchase, usePublicPractitionerPackagePlans } from "../hooks";
import { usePublicAvailabilityWindows } from "../../sessions/hooks";
import { getPatientPreferredCurrency } from "../../../../lib/currency";
import { usePatientProfile } from "../../profile/hooks";
import { useGetPublicPractitionerDetails } from "../../discovery/api";
import { getPackagePurchasePlanTranslationKey } from "../lib";
import {
  buildSlotsFromWindows,
  formatLocalizedDateRange,
  formatLocalizedDateTime,
  formatLocalizedTime,
  getWeekRange,
  groupSlotsByDay,
  splitDaySlotsByPart,
} from "../../sessions/slot-utils";
import type { PackagePlanQuotedItem } from "../types";

function formatMoney(amount: string | null | undefined, currencyCode: string | null | undefined, locale: string) {
  if (!amount || !currencyCode) {
    return "-";
  }

  const num = Number(amount);
  if (!Number.isFinite(num)) {
    return `${amount} ${currencyCode.toUpperCase()}`;
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(num);
}

function resolveQuoteLabel(
  quotedItem: PackagePlanQuotedItem | undefined,
  locale: string,
  currencyCode?: string | null,
  planLabel?: string | null,
) {
  if (!quotedItem) {
    return null;
  }

  const resolvedPlanLabel = planLabel ?? quotedItem.item.title;
  return `${resolvedPlanLabel} | ${formatMoney(
    quotedItem.quote.patientPayableTotal,
    currencyCode ?? quotedItem.quote.selectedCurrencyCode,
    locale,
  )}`;
}

export default function PackagePurchaseCreateScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const { user, role, isLoading: isAuthLoading } = useAuth();
  const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US";
  const params = useLocalSearchParams<{
    practitionerSlug: string;
    practitionerName?: string;
    practitionerTitle?: string;
    practitionerAvatarUrl?: string;
    packagePlanCode: string;
    durationMinutes?: string;
    sessionMode?: string;
    currencyCode?: string;
    preselectedSlots?: string;
  }>();

  const durationMinutes = Number(params.durationMinutes) >= 60 ? 60 : 30;
  const sessionMode = (params.sessionMode === "AUDIO" ? "AUDIO" : "VIDEO") as "VIDEO" | "AUDIO";
  const authScopeKey = useMemo(() => {
    if (isAuthLoading) {
      return "bootstrapping";
    }

    if (!user) {
      return "guest";
    }

    return `auth:${user.id}:${role}`;
  }, [isAuthLoading, role, user]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedStartsAt, setSelectedStartsAt] = useState<string[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [prefillNotice, setPrefillNotice] = useState<string | null>(null);
  const hasProcessedPrefillRef = useRef(false);
  const createMutation = useCreatePackagePurchase();

  const profileQuery = usePatientProfile();
  const practitionerSlug = params.practitionerSlug ?? null;
  const practitionerQuery = useGetPublicPractitionerDetails(practitionerSlug);
  const practitioner = practitionerQuery.data?.data.item ?? null;
  const patientCountryCode = profileQuery.data?.profile.countryCode ?? null;

  const packagePlansQuery = usePublicPractitionerPackagePlans(
    practitionerSlug,
    {
      durationMinutes,
      sessionMode,
      currencyCode: getPatientPreferredCurrency(patientCountryCode, practitioner ?? {}),
    },
    {
      cacheScopeKey: authScopeKey,
    },
  );
  const plan = packagePlansQuery.data?.items.find(
    (item) => item.item.code === params.packagePlanCode,
  );
  const quoteCurrency = getPatientPreferredCurrency(patientCountryCode, {
    currencyCode: plan?.quote.selectedCurrencyCode ?? null,
    regionalPricingMode: plan?.quote.regionalPricingMode ?? null,
    resolvedCountryIsoCode: plan?.quote.resolvedCountryIsoCode ?? null,
  });
  const sessionCount = plan?.quote.sessionCount ?? plan?.item.sessionCount ?? 0;
  const localizedPlanLabel = plan
    ? t(getPackagePurchasePlanTranslationKey(plan.item.code), {
        count: plan.item.sessionCount,
        defaultValue: plan.item.title,
      })
    : null;
  const selectedQuoteLabel = resolveQuoteLabel(plan, locale, quoteCurrency, localizedPlanLabel);
  const currentWeek = getWeekRange(weekOffset);
  const availabilityQuery = usePublicAvailabilityWindows(
    params.practitionerSlug ?? null,
    currentWeek.fromIso,
    currentWeek.toIso,
  );
  const availableSlots = useMemo(() => {
    const slots = buildSlotsFromWindows(availabilityQuery.data?.windows ?? []);
    return slots.filter((slot) => slot.maxDuration >= durationMinutes);
  }, [availabilityQuery.data?.windows, durationMinutes]);
  const groupedSlots = useMemo(
    () => groupSlotsByDay(availableSlots, locale),
    [availableSlots, locale],
  );
  const selectedSlots = useMemo(
    () =>
      selectedStartsAt
        .map((startsAt) => availableSlots.find((slot) => slot.startsAt === startsAt))
        .filter((slot): slot is NonNullable<typeof slot> => Boolean(slot)),
    [availableSlots, selectedStartsAt],
  );

  const preselectedSlotsFromParams = useMemo(() => {
    const raw = params.preselectedSlots;
    if (!raw || typeof raw !== "string") {
      return [] as string[];
    }

    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [] as string[];
      }
      return parsed
        .map((item) =>
          typeof item?.scheduledStartAt === "string" ? item.scheduledStartAt : null,
        )
        .filter((value): value is string => Boolean(value));
    } catch {
      return [] as string[];
    }
  }, [params.preselectedSlots]);

  useEffect(() => {
    if (hasProcessedPrefillRef.current) {
      return;
    }

    if (preselectedSlotsFromParams.length === 0) {
      hasProcessedPrefillRef.current = true;
      return;
    }

    if (availabilityQuery.isLoading) {
      return;
    }

    const validStarts = preselectedSlotsFromParams
      .filter((startsAt) =>
        availableSlots.some((slot) => slot.startsAt === startsAt),
      )
      .slice(0, sessionCount);

    setSelectedStartsAt([...validStarts].sort());

    if (validStarts.length !== preselectedSlotsFromParams.length) {
      setPrefillNotice(
        t(
          "packagePurchases.create.prefillAdjusted",
          "تم تحديث المواعيد المحددة تلقائيًا لأن بعض الاختيارات لم تعد متاحة.",
        ),
      );
    }

    hasProcessedPrefillRef.current = true;
  }, [
    availabilityQuery.isLoading,
    availableSlots,
    preselectedSlotsFromParams,
    sessionCount,
    t,
  ]);

  const toggleSlot = (startsAt: string) => {
    setSubmitError(null);

    setSelectedStartsAt((current) => {
      if (current.includes(startsAt)) {
        return current.filter((value) => value !== startsAt);
      }

      if (current.length >= sessionCount) {
        return current;
      }

      return [...current, startsAt].sort();
    });
  };

  const canContinue = selectedStartsAt.length === sessionCount && sessionCount > 0;

  if (!params.practitionerSlug || !params.packagePlanCode) {
    return (
      <DetailPageScaffold
        showBack
      >
        <EmptyState
          title={t("packagePurchases.create.notFoundTitle", "Package not available")}
          description={t(
            "packagePurchases.create.notFoundDescription",
            "The package link is missing important details.",
          )}
          actionLabel={t("packagePurchases.create.back", "Back")}
          onAction={() => router.back()}
        />
      </DetailPageScaffold>
    );
  }

  if (packagePlansQuery.isError || !plan) {
    return (
      <DetailPageScaffold
        showBack
        error={packagePlansQuery.isError}
        errorTitle={t("packagePurchases.create.errorTitle", "We could not load the package")}
        errorMessage={t(
          "packagePurchases.create.errorMessage",
          "Please try again in a moment.",
        )}
        onRetry={() => packagePlansQuery.refetch()}
        retryText={t("packagePurchases.create.retry", "Try again")}
      >
        <View />
      </DetailPageScaffold>
    );
  }

  const coverUri = resolveMediaUrl(params.practitionerAvatarUrl);

  return (
    <DetailPageScaffold
      showBack
      contentContainerStyle={styles.scaffold}
    >
      <View style={styles.stack}>
        <ScreenHeading
          title={t("packagePurchases.create.headingTitle")}
          subtitle={t("packagePurchases.create.headingSubtitle")}
          titleVariant="h2"
        />
        <Card variant="elevated" padding="none" style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heroCopy}>
              <StatusChip
                label={t("packagePurchases.create.badge", "Package purchase")}
                tone="info"
                showDot={false}
              />
              <Text weight="bold" style={styles.title}>
                {t(getPackagePurchasePlanTranslationKey(plan.item.code), {
                  count: plan.item.sessionCount,
                  defaultValue: plan.item.title,
                })}
              </Text>
              <Text color={theme.colors.textSecondary} style={styles.subtitle}>
                {params.practitionerName || params.practitionerSlug}
              </Text>
              <View style={styles.heroMeta}>
                <SummaryRow
                  label={t("packagePurchases.create.sessions", "Sessions")}
                  value={String(plan.quote.sessionCount)}
                />
                <SummaryRow
                  label={t("packagePurchases.create.discount", "Discount")}
                  value={`${plan.quote.discountPercent}%`}
                />
                <SummaryRow
                  label={t("packagePurchases.create.total", "Total")}
                  value={formatMoney(plan.quote.patientPayableTotal, quoteCurrency, locale)}
                />
              </View>
            </View>
            {coverUri ? (
              <Image source={{ uri: coverUri }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: theme.colors.primaryLight }]} />
            )}
          </View>
        </Card>

        <Card variant="elevated" padding="lg" style={styles.sectionCard}>
          <SectionHeader
            title={t("packagePurchases.create.selectionTitle", "Choose session times")}
            subtitle={t(
              "packagePurchases.create.selectionSubtitle",
              "Pick one visible time for each package session.",
            )}
          />
          <View style={styles.selectionNote}>
            <Text color={theme.colors.textSecondary} style={styles.noteText}>
              {t("packagePurchases.create.weekNote", {
                defaultValue: `Use the next weeks to select all ${sessionCount || 0} sessions.`,
              })}
            </Text>
          </View>

          <View style={styles.weekRow}>
            <Text weight="600" style={styles.weekLabel}>
              {formatLocalizedDateRange(currentWeek.fromIso, currentWeek.toIso, locale)}
            </Text>
            <View style={styles.weekButtons}>
              <TouchableOpacity
                disabled={weekOffset === 0}
                onPress={() => setWeekOffset((value) => Math.max(0, value - 1))}
                style={[styles.weekButton, { opacity: weekOffset === 0 ? 0.35 : 1 }]}
              >
                <Ionicons name="chevron-back" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setWeekOffset((value) => value + 1)}
                style={styles.weekButton}
              >
                <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {availabilityQuery.isLoading ? (
            <Text color={theme.colors.textSecondary} style={styles.helperText}>
              {t("packagePurchases.create.loadingSlots", "Loading availability...")}
            </Text>
          ) : availabilityQuery.isError ? (
            <Card variant="flat" padding="md" style={styles.noticeCard}>
              <Text color="#ba1a1a">
                {t("packagePurchases.create.loadError", "We could not load availability right now.")}
              </Text>
              <Button
                title={t("packagePurchases.create.retry", "Try again")}
                variant="secondary"
                onPress={() => availabilityQuery.refetch()}
                style={styles.retryButton}
              />
            </Card>
          ) : groupedSlots.length === 0 ? (
            <Card variant="flat" padding="md" style={styles.noticeCard}>
              <Text color={theme.colors.textSecondary}>
                {t("packagePurchases.create.noSlots", "No open time found in this week.")}
              </Text>
            </Card>
          ) : (
            <View style={styles.slotGroups}>
              {groupedSlots.map((group) => {
                const parts = splitDaySlotsByPart(group.slots);
                const selectedCountForDay = group.slots.filter((slot) =>
                  selectedStartsAt.includes(slot.startsAt),
                ).length;
                return (
                  <Card key={group.dayKey} variant="outlined" padding="md" style={styles.dayCard}>
                    <View style={styles.dayHeader}>
                      <Text weight="600" style={styles.dayLabel}>
                        {group.dayLabel}
                      </Text>
                      <StatusChip
                        label={t("packagePurchases.create.daySelected", {
                          count: selectedCountForDay,
                          defaultValue: `${selectedCountForDay} selected`,
                        })}
                        tone={selectedCountForDay > 0 ? "success" : "default"}
                        showDot={false}
                      />
                    </View>

                    {([["morning", parts.morning], ["afternoon", parts.afternoon], ["evening", parts.evening]] as const).map(
                      ([label, slots]) => {
                        if (slots.length === 0) return null;

                        return (
                          <View key={label} style={styles.partBlock}>
                            <Text color={theme.colors.textMuted} style={styles.partLabel}>
                              {t(`packagePurchases.create.parts.${label}`, label)}
                            </Text>
                            <View style={styles.slotGrid}>
                              {slots.map((slot) => {
                                const selected = selectedStartsAt.includes(slot.startsAt);
                                const disabled = !selected && selectedStartsAt.length >= sessionCount;
                                return (
                                  <TouchableOpacity
                                    key={slot.startsAt}
                                    onPress={() => toggleSlot(slot.startsAt)}
                                    disabled={disabled}
                                    style={[
                                      styles.slotButton,
                                      {
                                        backgroundColor: selected
                                          ? theme.colors.primaryLight
                                          : theme.colors.surface,
                                        borderColor: selected
                                          ? theme.colors.primary
                                          : theme.colors.borderLight,
                                        opacity: disabled ? 0.45 : 1,
                                      },
                                    ]}
                                  >
                                    <Text
                                      weight={selected ? "600" : "normal"}
                                      color={
                                        selected ? theme.colors.primary : theme.colors.textPrimary
                                      }
                                      style={styles.slotText}
                                    >
                                      {formatLocalizedTime(slot.startsAt, locale)}
                                    </Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          </View>
                        );
                      },
                    )}
                  </Card>
                );
              })}
            </View>
          )}
        </Card>

        <Card variant="elevated" padding="lg" style={styles.sectionCard}>
          <SectionHeader
            title={t("packagePurchases.create.reviewTitle", "Review")}
            subtitle={t(
              "packagePurchases.create.reviewSubtitle",
              "Confirm the selected sessions before creating the purchase.",
            )}
          />
          <View style={styles.reviewStack}>
            <SummaryRow
              label={t("packagePurchases.create.selectedCount", "Selected")}
              value={`${selectedStartsAt.length}/${sessionCount}`}
            />
            <SummaryRow
              label={t("packagePurchases.create.package", "Package")}
              value={
                selectedQuoteLabel ||
                t(getPackagePurchasePlanTranslationKey(plan.item.code), {
                  count: plan.item.sessionCount,
                  defaultValue: plan.item.title,
                })
              }
            />
            <SummaryRow
              label={t("packagePurchases.create.duration", "Session duration")}
              value={t("packagePurchases.create.minutes", {
                count: durationMinutes,
                defaultValue: `${durationMinutes} minutes`,
              })}
            />
          </View>

          {selectedSlots.length > 0 ? (
            <Card variant="flat" padding="md" style={styles.selectedCard}>
              <Text weight="600" style={styles.selectedTitle}>
                {t("packagePurchases.create.selectedTimes", "Selected times")}
              </Text>
              <View style={styles.selectedList}>
                {selectedSlots.map((slot) => (
                  <View key={slot!.startsAt} style={styles.selectedItem}>
                    <Ionicons name="time-outline" size={14} color={theme.colors.primary} />
                    <Text color={theme.colors.textSecondary} style={styles.selectedText}>
                      {formatLocalizedDateTime(slot!.startsAt, locale)}
                    </Text>
                  </View>
                ))}
              </View>
            </Card>
          ) : null}

          {submitError ? (
            <Card variant="flat" padding="sm" style={styles.noticeCard}>
              <Text color="#ba1a1a">{submitError}</Text>
            </Card>
          ) : null}
          {prefillNotice ? (
            <Card variant="flat" padding="sm" style={styles.noticeCard}>
              <Text color={theme.colors.textSecondary}>{prefillNotice}</Text>
            </Card>
          ) : null}

          <Button
            title={createMutation.isPending ? t("packagePurchases.create.creating", "Creating...") : t("packagePurchases.create.continue", "Continue to payment")}
            onPress={async () => {
              setSubmitError(null);
              if (!canContinue) {
                setSubmitError(
                  t(
                    "packagePurchases.create.validation",
                    "Please select all required session times first.",
                  ),
                );
                return;
              }

              try {
                const created = await createMutation.mutateAsync({
                  packagePlanCode: params.packagePlanCode,
                  practitionerSlug: params.practitionerSlug,
                  durationMinutes,
                  sessionMode,
                  selectedCurrencyCode: quoteCurrency,
                  selectedSessionSlots: selectedStartsAt.map((startsAt) => ({ scheduledStartAt: startsAt })),
                });

                router.push({
                  pathname: "/(patient)/package-purchases/[id]/pay",
                  params: { id: created.item.id },
                } as never);
              } catch (error) {
                setSubmitError(extractApiErrorMessage(error));
              }
            }}
            disabled={
              createMutation.isPending ||
              selectedStartsAt.length !== sessionCount ||
              sessionCount === 0
            }
          />
        </Card>
      </View>
    </DetailPageScaffold>
  );
}

const styles = StyleSheet.create({
  scaffold: {
    paddingBottom: 36,
  },
  stack: {
    gap: 14,
  },
  heroCard: {
    marginHorizontal: 0,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  heroCopy: {
    flex: 1,
    gap: 8,
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 22,
  },
  heroMeta: {
    marginTop: 4,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 18,
    overflow: "hidden",
  },
  sectionCard: {
    marginHorizontal: 0,
  },
  selectionNote: {
    marginTop: 10,
    marginBottom: 8,
  },
  noteText: {
    fontSize: 13,
    lineHeight: 20,
  },
  weekRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  },
  weekLabel: {
    flex: 1,
    fontSize: 15,
  },
  weekButtons: {
    flexDirection: "row",
    gap: 8,
  },
  weekButton: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  helperText: {
    fontSize: 13,
    lineHeight: 20,
  },
  noticeCard: {
    marginHorizontal: 0,
  },
  retryButton: {
    marginTop: 8,
  },
  slotGroups: {
    gap: 12,
    marginTop: 4,
  },
  dayCard: {
    marginHorizontal: 0,
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  dayLabel: {
    fontSize: 16,
    flex: 1,
  },
  partBlock: {
    marginTop: 10,
    gap: 8,
  },
  partLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.14,
  },
  slotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  slotButton: {
    minWidth: 96,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  slotText: {
    fontSize: 14,
  },
  reviewStack: {
    gap: 2,
    marginTop: 10,
  },
  selectedCard: {
    marginHorizontal: 0,
    marginTop: 10,
  },
  selectedTitle: {
    fontSize: 14,
    marginBottom: 10,
  },
  selectedList: {
    gap: 8,
  },
  selectedItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  selectedText: {
    fontSize: 12,
  },
});
