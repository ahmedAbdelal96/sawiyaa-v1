import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import {
  ErrorState,
  Header,
  LoadingState,
  Screen,
  Text,
} from "../../../src/components/ui";
import { useTheme } from "../../../src/providers/ThemeProvider";
import { useAppDirection } from "../../../src/i18n/direction";
import {
  usePatientWalletEntries,
  usePatientWalletSummary,
} from "../../../src/features/patient/payments/hooks";
import { formatMoney as formatCentralMoney, parseMoney } from "../../../src/lib/money";
import { formatViewerDate } from "../../../src/lib/time-formatting";
import type {
  CustomerWalletEntryItem,
  CustomerWalletEntryType,
} from "../../../src/features/patient/payments/types";

// ---------------------------------------------------------------------------
// Filter categories — map to backend entryType groups
// ---------------------------------------------------------------------------

type FilterTab = "all" | "payments" | "credits" | "refunds";

const PAYMENT_TYPES = new Set<CustomerWalletEntryType>([
  "SESSION_PAYMENT_RESERVE",
  "SESSION_PAYMENT_CAPTURE",
  "SESSION_PAYMENT_RELEASE",
  "MANUAL_DEBIT",
]);

const CREDIT_TYPES = new Set<CustomerWalletEntryType>([
  "MANUAL_CREDIT",
  "ADJUSTMENT",
]);

const REFUND_TYPES = new Set<CustomerWalletEntryType>([
  "REFUND_CREDIT",
  "REVERSAL",
]);

function filterEntry(entry: CustomerWalletEntryItem, tab: FilterTab): boolean {
  if (tab === "all") return true;
  if (tab === "payments") return PAYMENT_TYPES.has(entry.entryType);
  if (tab === "credits") return CREDIT_TYPES.has(entry.entryType);
  if (tab === "refunds") return REFUND_TYPES.has(entry.entryType);
  return true;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatMoney(amount: string, currencyCode: string | null | undefined, locale: string): string {
  const money = parseMoney(amount, currencyCode);
  return money ? formatCentralMoney(money, locale) : "-";
}

function formatDayLabel(
  isoString: string,
  locale: string,
  todayLabel: string,
): string {
  const d = new Date(isoString);
  const today = new Date();
  if (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  ) {
    return todayLabel;
  }
  return formatViewerDate(d, { locale });
}

function groupByDay(entries: CustomerWalletEntryItem[]): {
  day: string;
  iso: string;
  items: CustomerWalletEntryItem[];
}[] {
  const map = new Map<
    string,
    { iso: string; items: CustomerWalletEntryItem[] }
  >();
  for (const entry of entries) {
    const d = new Date(entry.effectiveAt);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!map.has(key)) {
      map.set(key, { iso: entry.effectiveAt, items: [] });
    }
    map.get(key)!.items.push(entry);
  }
  return Array.from(map.entries()).map(([day, v]) => ({
    day,
    iso: v.iso,
    items: v.items,
  }));
}

function cleanDescription(desc: string | null | undefined, isRtl: boolean): string | null {
  if (!desc) return null;
  // If description is a raw developer/QA note like "QA refund credit for patient wallet", make it user-friendly
  if (desc.includes("QA refund credit")) {
    return isRtl ? "استرداد رصيد إلى المحفظة" : "Refund credit to wallet";
  }
  if (desc.includes("Reserved for a direct session checkout")) {
    return isRtl ? "حجز جلسة مباشرة" : "Reserved for session checkout";
  }
  return desc;
}

// ---------------------------------------------------------------------------
// Custom Filter Chip Component
// ---------------------------------------------------------------------------

function TransactionFilterChip({
  label,
  icon,
  selected,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  selected: boolean;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected
            ? theme.colors.primary
            : theme.colors.surface,
          borderColor: selected
            ? theme.colors.primary
            : theme.colors.borderLight,
        },
      ]}
    >
      <Ionicons
        name={icon}
        size={14}
        color={selected ? "#FFFFFF" : theme.colors.textSecondary}
      />
      <Text
        weight={selected ? "bold" : "600"}
        style={styles.chipText}
        color={selected ? "#FFFFFF" : theme.colors.textSecondary}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Entry Row Component
// ---------------------------------------------------------------------------

function EntryRow({
  entry,
  showDivider,
}: {
  entry: CustomerWalletEntryItem;
  showDivider: boolean;
}) {
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language?.startsWith("ar") ?? false;
  const locale = isRtl ? "ar-SA" : "en-US";
  const { rowDirection, textAlign, oppositeTextAlign } = useAppDirection();
  const isCredit = entry.direction === "CREDIT";
  const typeKey =
    `patientPaymentsFlow.transactions.entryTypes.${entry.entryType}` as const;

  const isCompleted =
    entry.entryType === "SESSION_PAYMENT_CAPTURE" ||
    entry.entryType === "REFUND_CREDIT" ||
    entry.entryType === "MANUAL_CREDIT";

  const description = cleanDescription(entry.description, isRtl);

  return (
    <>
      <View style={[styles.entryRow, { flexDirection: rowDirection }]}>
        {/* Icon */}
        <View
          style={[
            styles.entryIcon,
            {
              backgroundColor: isCredit
                ? theme.colors.primaryLight
                : theme.colors.surfaceTertiary,
            },
          ]}
        >
          <Ionicons
            name={isCredit ? "arrow-down-outline" : "arrow-up-outline"}
            size={16}
            color={isCredit ? theme.colors.primary : theme.colors.textSecondary}
          />
        </View>

        {/* Text block */}
        <View style={[styles.entryTextBlock, { alignItems: isRtl ? "flex-end" : "flex-start" }]}>
          <Text weight="bold" style={[styles.entryType, { textAlign }]}>
            {t(typeKey)}
          </Text>

          {description ? (
            <Text color={theme.colors.textSecondary} style={[styles.entryDescription, { textAlign }]}>
              {description}
            </Text>
          ) : null}

          {/* Status badge */}
          <View
            style={[
              styles.entryBadge,
              {
                backgroundColor: isCompleted
                  ? "#dcfce7"
                  : theme.colors.surfaceTertiary,
                borderColor: isCompleted
                  ? "#bbf7d0"
                  : theme.colors.borderLight,
                alignSelf: isRtl ? "flex-end" : "flex-start",
              },
            ]}
          >
            <Ionicons
              name={isCompleted ? "checkmark-circle" : "time-outline"}
              size={11}
              color={isCompleted ? "#16a34a" : theme.colors.textMuted}
            />
            <Text
              weight="600"
              color={isCompleted ? "#166534" : theme.colors.textMuted}
              style={styles.entryBadgeText}
            >
              {t(
                isCompleted
                  ? "patientPaymentsFlow.transactions.completed"
                  : "patientPaymentsFlow.transactions.pending",
              )}
            </Text>
          </View>
        </View>

        {/* Amount */}
        <Text
          weight="bold"
          style={[
            styles.entryAmount,
            {
              color: isCredit ? "#16a34a" : theme.colors.textPrimary,
              textAlign: oppositeTextAlign,
            },
          ]}
        >
          {isCredit ? "+ " : "- "}
          {formatMoney(entry.amount, entry.currencyCode, locale)}
        </Text>
      </View>

      {showDivider && (
        <View style={[styles.itemDivider, { backgroundColor: theme.colors.borderLight }]} />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export default function TransactionHistoryScreen() {
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const isRtl = i18n.language?.startsWith("ar") ?? false;
  const locale = isRtl ? "ar-SA" : "en-US";
  const { rowDirection, textAlign } = useAppDirection();

  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");

  const entriesQuery = usePatientWalletEntries({ limit: 50 });
  const walletQuery = usePatientWalletSummary();

  const wallet = walletQuery.data?.item ?? null;
  const rawEntries = entriesQuery.data?.items;

  const filteredEntries = useMemo(
    () => (rawEntries ?? []).filter((e) => filterEntry(e, activeFilter)),
    [rawEntries, activeFilter],
  );

  const groups = useMemo(() => groupByDay(filteredEntries), [filteredEntries]);
  const todayLabel = t("patientPaymentsFlow.transactions.today");
  const fallbackCurrency = wallet?.currencyCode ?? rawEntries?.[0]?.currencyCode ?? null;

  const filters: { key: FilterTab; labelKey: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: "all", labelKey: "patientPaymentsFlow.transactions.filters.all", icon: "apps-outline" },
    {
      key: "payments",
      labelKey: "patientPaymentsFlow.transactions.filters.payments",
      icon: "card-outline",
    },
    {
      key: "credits",
      labelKey: "patientPaymentsFlow.transactions.filters.credits",
      icon: "wallet-outline",
    },
    {
      key: "refunds",
      labelKey: "patientPaymentsFlow.transactions.filters.refunds",
      icon: "refresh-outline",
    },
  ];

  return (
    <Screen bg="background">
      <Header
        showBack
        title={t("patientPaymentsFlow.transactions.title")}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Balance Hero Card (visually matching payments.tsx) ── */}
        <View style={[styles.heroCard, { backgroundColor: theme.colors.primary }]}>
          <View style={[styles.heroTopRow, { flexDirection: rowDirection }]}>
            <View style={styles.heroIconWrap}>
              <Ionicons name="wallet-outline" size={14} color="rgba(255,255,255,0.85)" />
            </View>
            <Text style={[styles.heroLabel, { textAlign }]}>
              {t("patientPaymentsFlow.wallet.balanceLabel")}
            </Text>
          </View>

          <Text
            weight="bold"
            numberOfLines={1}
            adjustsFontSizeToFit
            style={[styles.heroAmount, { textAlign }]}
          >
            {formatMoney(wallet?.availableBalance ?? "0", fallbackCurrency, locale)}
          </Text>

          <Text style={[styles.heroScopeNote, { textAlign }]}>
            {t("patientPaymentsFlow.transactions.walletScopeNote")}
          </Text>

          <View
            style={[
              styles.heroAccentLine,
              { alignSelf: isRtl ? "flex-end" : "flex-start" },
            ]}
          />

          <View style={[styles.heroStatsRow, { flexDirection: rowDirection }]}>
            <View style={[styles.heroStat, { alignItems: isRtl ? "flex-end" : "flex-start" }]}>
              <Text style={[styles.heroStatLabel, { textAlign }]}>
                {isRtl ? "المعاملات المعروضة" : "Displayed transactions"}
              </Text>
              <Text weight="bold" style={[styles.heroStatValue, { textAlign }]}>
                {filteredEntries.length}
              </Text>
            </View>
            {wallet?.reservedBalance ? (
              <View style={[styles.heroStat, { alignItems: isRtl ? "flex-end" : "flex-start" }]}>
                <Text style={[styles.heroStatLabel, { textAlign }]}>
                  {t("patientPaymentsFlow.wallet.reservedLabel")}
                </Text>
                <Text weight="bold" style={[styles.heroStatValueGold, { textAlign }]}>
                  {formatMoney(wallet.reservedBalance, fallbackCurrency, locale)}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* ── Filter bar ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.filterBar, { flexDirection: rowDirection }]}
        >
          {filters.map((f) => (
            <TransactionFilterChip
              key={f.key}
              label={t(f.labelKey as Parameters<typeof t>[0])}
              icon={f.icon}
              selected={activeFilter === f.key}
              onPress={() => setActiveFilter(f.key)}
            />
          ))}
        </ScrollView>

        {/* ── Transaction List ── */}
        {entriesQuery.isLoading ? (
          <LoadingState fullScreen />
        ) : entriesQuery.isError ? (
          <ErrorState onRetry={() => entriesQuery.refetch()} />
        ) : groups.length === 0 ? (
          <View style={[styles.emptyWrapper, { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderLight }]}>
            <Ionicons
              name="receipt-outline"
              size={36}
              color={theme.colors.textMuted}
            />
            <Text
              color={theme.colors.textPrimary}
              style={[styles.emptyTitle, { textAlign }]}
              weight="bold"
            >
              {t("patientPaymentsFlow.transactions.emptyTitle")}
            </Text>
            <Text color={theme.colors.textSecondary} style={[styles.emptyNote, { textAlign }]}>
              {t("patientPaymentsFlow.transactions.emptyNote")}
            </Text>
          </View>
        ) : (
          <View style={styles.groupList}>
            {groups.map((group) => (
              <View key={group.day} style={styles.groupBlock}>
                {/* Day label */}
                <View style={styles.dayLabelRow}>
                  <Ionicons name="calendar-outline" size={13} color={theme.colors.textMuted} />
                  <Text
                    color={theme.colors.textMuted}
                    style={[styles.dayLabel, { textAlign }]}
                    weight="bold"
                  >
                    {formatDayLabel(group.iso, locale, todayLabel)}
                  </Text>
                </View>

                {/* Group card */}
                <View
                  style={[
                    styles.groupCard,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.borderLight,
                    },
                  ]}
                >
                  {group.items.map((entry, idx) => (
                    <EntryRow
                      key={entry.id}
                      entry={entry}
                      showDivider={idx < group.items.length - 1}
                    />
                  ))}
                </View>
              </View>
            ))}

            {/* Notice card for gateway payments */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push("/(patient)/payments")}
              style={[
                styles.noticeCard,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderLight },
              ]}
            >
              <Ionicons name="information-circle-outline" size={18} color={theme.colors.primary} />
              <Text
                color={theme.colors.textSecondary}
                style={[styles.noticeText, { textAlign }]}
              >
                {t("patientPaymentsFlow.transactions.walletOnlyNote")}
              </Text>
              <Ionicons name={isRtl ? "chevron-back" : "chevron-forward"} size={16} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

// ---------------------------------------------------------------------------
// Styles — modern design system tokens
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 40,
    gap: 14,
  },

  // Hero Card
  heroCard: {
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 20,
    overflow: "hidden",
  },
  heroTopRow: { alignItems: "center", gap: 8, marginBottom: 10 },
  heroIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroLabel: { fontSize: 13, lineHeight: 18, color: "rgba(255,255,255,0.85)" },
  heroAmount: {
    fontSize: 28,
    lineHeight: 36,
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  heroScopeNote: {
    fontSize: 12,
    lineHeight: 17,
    color: "rgba(255,255,255,0.7)",
    marginTop: 2,
  },
  heroAccentLine: {
    width: 28,
    height: 2,
    borderRadius: 1,
    backgroundColor: "#C8A979",
    marginTop: 14,
    marginBottom: 14,
  },
  heroStatsRow: { gap: 20 },
  heroStat: { gap: 2 },
  heroStatLabel: { fontSize: 11, lineHeight: 16, color: "rgba(255,255,255,0.7)" },
  heroStatValue: { fontSize: 14, lineHeight: 19, color: "#FFFFFF" },
  heroStatValueGold: { fontSize: 14, lineHeight: 19, color: "#C8A979" },

  // Filter Bar & Chips
  filterBar: { gap: 8, paddingVertical: 2 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, lineHeight: 18 },

  // Empty State
  emptyWrapper: {
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    marginTop: 12,
  },
  emptyTitle: { fontSize: 16, lineHeight: 22 },
  emptyNote: { fontSize: 13, lineHeight: 19, textAlign: "center" },

  // Grouped List
  groupList: { gap: 16 },
  groupBlock: { gap: 8 },
  dayLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 4,
  },
  dayLabel: { fontSize: 13, lineHeight: 18 },
  groupCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    paddingHorizontal: 16,
    paddingVertical: 4,
  },

  // Entry Row
  entryRow: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
  },
  entryIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  entryTextBlock: { flex: 1, gap: 3 },
  entryType: { fontSize: 14, lineHeight: 20 },
  entryDescription: { fontSize: 12, lineHeight: 17 },
  entryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 3,
  },
  entryBadgeText: { fontSize: 11, lineHeight: 15 },
  entryAmount: {
    fontSize: 15,
    lineHeight: 21,
    minWidth: 84,
  },
  itemDivider: { height: 1 },

  // Notice card
  noticeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginTop: 4,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
});
