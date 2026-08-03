import React from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Card,
  EmptyState,
  ErrorState,
  Header,
  LoadingState,
  Screen,
  StatusChip,
  Text,
  formatDateTime,
} from "../../../../components/ui";
import { useTheme } from "../../../../providers/ThemeProvider";
import {
  usePractitionerCoupon,
  usePractitionerCouponRedemptions,
} from "../hooks";
import {
  formatDateWindow,
  formatPatientLimitLabel,
  formatPercentLabel,
  formatUsageLabel,
  resolveCouponStatusLabel,
  resolveCouponStatusTone,
} from "./PractitionerPromoCodesScreen";

export default function PractitionerPromoCodeDetailsScreen() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const locale = i18n.language || "ar";
  const isRtl = locale.startsWith("ar");
  const rowDirection = isRtl ? "row-reverse" : "row";
  const alignSelfStart = isRtl ? "flex-end" : "flex-start";

  const detailQuery = usePractitionerCoupon(id);
  const redemptionsQuery = usePractitionerCouponRedemptions(id);

  const coupon = detailQuery.data?.item; // Nested under .item
  const redemptions = redemptionsQuery.data?.items ?? [];

  const handleRefresh = () => {
    detailQuery.refetch();
    redemptionsQuery.refetch();
  };

  const displayStatus = coupon ? (coupon.effectiveStatus ?? coupon.status) : null;
  const statusTone = displayStatus ? resolveCouponStatusTone(displayStatus) : "info";

  const usageLabel = coupon ? formatUsageLabel(coupon.currentUsageCount, coupon.usageLimitTotal, t) : "";
  const patientLimitLabel = coupon ? formatPatientLimitLabel(coupon.usageLimitPerPatient, t) : "";

  return (
    <Screen bg="background">
      <Header
        title={t("practitioner.promoCodes.detail.title")}
        showBack
        onBack={() => router.back()}
        rightElement={
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={handleRefresh} style={styles.headerAction} accessibilityRole="button">
              <Ionicons name="refresh-outline" size={22} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={detailQuery.isRefetching || redemptionsQuery.isRefetching}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {detailQuery.isLoading || redemptionsQuery.isLoading ? (
          <LoadingState message={t("practitioner.promoCodes.detail.loading")} />
        ) : detailQuery.isError || redemptionsQuery.isError ? (
          <ErrorState
            title={t("practitioner.promoCodes.detail.errorTitle")}
            message={t("practitioner.promoCodes.detail.errorBody")}
            onRetry={handleRefresh}
          />
        ) : coupon ? (
          <>
            {/* Promo Code Info Card */}
            <Card
              variant="outlined"
              padding="md"
              style={[
                styles.detailHero,
                {
                  borderColor: "#E8DED0",
                  backgroundColor: "#FFFFFF",
                },
              ]}
            >
              <View style={[styles.couponTopRow, { flexDirection: rowDirection }]}>
                <View style={[styles.couponTextWrap, { alignItems: alignSelfStart }]}>
                  <Text weight="700" style={styles.couponCode} color="#24564F" numberOfLines={1}>
                    {coupon.code}
                  </Text>
                  <Text color="#1F332F" weight="600" style={styles.couponSubtitle}>
                    {t("practitioner.promoCodes.list.discount", {
                      value: formatPercentLabel(coupon.discountValue),
                    })}
                  </Text>
                </View>
                <StatusChip
                  label={resolveCouponStatusLabel(displayStatus!, t)}
                  tone={statusTone}
                  showDot={false}
                />
              </View>

              <View style={[styles.couponDetailsBlock, { alignItems: alignSelfStart }]}>
                <View style={[styles.couponDetailRow, { flexDirection: rowDirection }]}>
                  <Ionicons name="pie-chart-outline" size={14} color="#6F7E78" style={isRtl ? { marginLeft: 8 } : { marginRight: 8 }} />
                  <Text color="#6F7E78" style={styles.couponDetailText}>
                    {usageLabel}
                  </Text>
                </View>

                <View style={[styles.couponDetailRow, { flexDirection: rowDirection }]}>
                  <Ionicons name="person-outline" size={14} color="#6F7E78" style={isRtl ? { marginLeft: 8 } : { marginRight: 8 }} />
                  <Text color="#6F7E78" style={styles.couponDetailText}>
                    {t("practitioner.promoCodes.list.perPatient")}: {patientLimitLabel}
                  </Text>
                </View>

                <View style={[styles.couponDetailRow, { flexDirection: rowDirection }]}>
                  <Ionicons name="calendar-outline" size={14} color="#6F7E78" style={isRtl ? { marginLeft: 8 } : { marginRight: 8 }} />
                  <Text color="#6F7E78" style={styles.couponDetailText}>
                    {formatDateWindow(coupon.startsAt, coupon.endsAt, locale, t)}
                  </Text>
                </View>
              </View>
            </Card>

            {/* Redemptions Activity Log */}
            <View style={[styles.redemptionsHeaderRow, { flexDirection: rowDirection }]}>
              <Text weight="700" style={styles.sectionTitle} color="#1F332F">
                {t("practitioner.promoCodes.detail.redemptionsTitle")}
              </Text>
              <Text color="#6F7E78" style={styles.sectionSubtitle}>
                {t("practitioner.promoCodes.list.usage")}: {coupon.currentUsageCount} {coupon.usageLimitTotal ? `/ ${coupon.usageLimitTotal}` : ""}
              </Text>
            </View>

            {redemptions.length ? (
              <View style={styles.redemptionList}>
                {redemptions.map((item) => (
                  <RedemptionCard
                    key={item.id}
                    item={item}
                    locale={locale}
                    theme={theme}
                    t={t}
                    isRtl={isRtl}
                  />
                ))}
              </View>
            ) : (
              <EmptyState
                title={t("practitioner.promoCodes.detail.emptyRedemptionsTitle")}
                description={t("practitioner.promoCodes.detail.emptyRedemptionsBody")}
                icon={
                  <Ionicons
                    name="receipt-outline"
                    size={48}
                    color={theme.colors.textMuted}
                  />
                }
              />
            )}
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function RedemptionCard({
  item,
  locale,
  theme,
  t,
  isRtl,
}: {
  item: any;
  locale: string;
  theme: any;
  t: any;
  isRtl: boolean;
}) {
  const rowDirection = isRtl ? "row-reverse" : "row";
  return (
    <Card
      variant="outlined"
      padding="md"
      style={[
        styles.redemptionCard,
        {
          borderColor: "#E8DED0",
          backgroundColor: "#FFFFFF",
        },
      ]}
    >
      <View style={[styles.redemptionTopRow, { flexDirection: rowDirection }]}>
        <View style={[styles.redemptionText, { alignItems: isRtl ? "flex-end" : "flex-start" }]}>
          <Text weight="700" style={styles.redemptionName} color="#1F332F" numberOfLines={1}>
            {item.patientDisplayName ?? t("practitioner.promoCodes.detail.unknownPatient")}
          </Text>
          <Text color="#6F7E78" style={styles.redemptionMeta}>
            {formatDateTime(item.redeemedAt, locale)}
          </Text>
        </View>
        <Text weight="700" style={styles.redemptionAmount} color="#24564F">
          {formatMoney(
            item.discountAmount,
            item.currencyCode ?? null,
            locale,
            t("practitioner.finance.common.currencyUnavailable"),
          )}
        </Text>
      </View>

      <View style={[styles.redemptionPairs, { flexDirection: rowDirection }]}>
        <MetaPill
          label={t("practitioner.promoCodes.detail.grossAmount")}
          value={formatMoney(
            item.grossAmount,
            item.currencyCode ?? null,
            locale,
            t("practitioner.finance.common.currencyUnavailable"),
          )}
          theme={theme}
        />
        <MetaPill
          label={t("practitioner.promoCodes.detail.platformShare")}
          value={formatMoney(
            item.platformDiscountShare,
            item.currencyCode ?? null,
            locale,
            t("practitioner.finance.common.currencyUnavailable"),
          )}
          theme={theme}
        />
      </View>
    </Card>
  );
}

function MetaPill({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: any;
}) {
  return (
    <View style={[styles.metaPill, { backgroundColor: "#F9FBF9", borderColor: "#EEF4EF" }]}>
      <Text color="#6F7E78" style={styles.metaPillLabel}>
        {label}
      </Text>
      <Text weight="600" style={styles.metaPillValue} color="#1F332F">
        {value}
      </Text>
    </View>
  );
}

function formatMoney(
  value: string | number,
  currencyCode: string | null,
  locale: string,
  fallback: string,
) {
  const numeric = typeof value === "string" ? parseFloat(value) : value;
  if (Number.isNaN(numeric)) {
    return fallback;
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode ?? "SAR",
      currencyDisplay: "symbol",
    }).format(numeric);
  } catch {
    return `${numeric} ${currencyCode ?? ""}`;
  }
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 16,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerAction: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  detailHero: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 16,
    gap: 12,
  },
  couponTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  couponTextWrap: {
    flex: 1,
    gap: 2,
  },
  couponCode: {
    fontSize: 18,
    lineHeight: 24,
  },
  couponSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  couponDetailsBlock: {
    gap: 8,
    marginTop: 4,
  },
  couponDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  couponDetailText: {
    fontSize: 12.5,
    lineHeight: 17,
  },
  redemptionsHeaderRow: {
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 15,
    lineHeight: 20,
  },
  sectionSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  redemptionList: {
    gap: 12,
  },
  redemptionCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    gap: 10,
  },
  redemptionTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  redemptionText: {
    flex: 1,
    gap: 2,
  },
  redemptionName: {
    fontSize: 14,
    lineHeight: 18,
  },
  redemptionMeta: {
    fontSize: 11,
    lineHeight: 15,
  },
  redemptionAmount: {
    fontSize: 14,
    lineHeight: 18,
  },
  redemptionPairs: {
    flexDirection: "row",
    gap: 8,
  },
  metaPill: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },
  metaPillLabel: {
    fontSize: 9,
    lineHeight: 13,
  },
  metaPillValue: {
    fontSize: 11.5,
    lineHeight: 16,
  },
});
