import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  Card,
  ErrorState,
  FilterChip,
  Header,
  LoadingState,
  Screen,
  Text,
} from "../../../src/components/ui";
import { useTheme } from "../../../src/providers/ThemeProvider";
import {
  usePatientWalletEntries,
  usePatientWalletSummary,
} from "../../../src/features/patient/payments/hooks";
import { resolveSupportedCurrencyCode } from "../../../src/lib/currency";
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
// Date grouping helpers
// ---------------------------------------------------------------------------

/**
 * Product-grade money formatter — avoids Intl.NumberFormat currency style
 * which is unreliable in React Native Hermes.
 * Output stays tied to the resolved patient currency from backend metadata.
 */
function formatMoney(amount: string, currencyCode: string): string {
  const num = Number(amount);
  if (!Number.isFinite(num)) return `${amount} ${currencyCode.toUpperCase()}`;
  const rounded = parseFloat(num.toFixed(2));
  const str = rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(2);
  const withCommas = str.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${withCommas} ${currencyCode.toUpperCase()}`;
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
  return d.toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
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

// ---------------------------------------------------------------------------
// Entry row
// ---------------------------------------------------------------------------

function EntryRow({ entry }: { entry: CustomerWalletEntryItem }) {
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US";
  const isCredit = entry.direction === "CREDIT";
  const typeKey =
    `patientPaymentsFlow.transactions.entryTypes.${entry.entryType}` as const;

  // Show "completed" badge for CAPTURE/CREDIT; "pending" for RESERVE
  const isCompleted =
    entry.entryType === "SESSION_PAYMENT_CAPTURE" ||
    entry.entryType === "REFUND_CREDIT" ||
    entry.entryType === "MANUAL_CREDIT";

  return (
    <View style={styles.entryRow}>
      {/* Icon */}
      <View
        style={[
          styles.entryIcon,
          {
            backgroundColor: isCredit
              ? theme.colors.primaryLight
              : theme.colors.surfaceSecondary,
          },
        ]}
      >
        <Ionicons
          name={isCredit ? "arrow-down" : "arrow-up"}
          size={14}
          color={isCredit ? theme.colors.primary : theme.colors.textSecondary}
        />
      </View>

      {/* Text */}
      <View style={styles.entryTextBlock}>
        <Text weight="600" style={styles.entryType}>
          {t(typeKey)}
        </Text>
        {entry.description ? (
          <Text color={theme.colors.textMuted} style={styles.entryDescription}>
            {entry.description}
          </Text>
        ) : null}
        <View
          style={[
            styles.entryBadge,
            {
              backgroundColor: isCompleted
                ? theme.colors.primaryLight
                : theme.colors.surfaceSecondary,
            },
          ]}
        >
          <Text
            color={isCompleted ? theme.colors.primary : theme.colors.textMuted}
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
        color={isCredit ? theme.colors.primary : theme.colors.textPrimary}
        style={styles.entryAmount}
      >
        {isCredit ? "+" : "-"}
        {formatMoney(entry.amount, entry.currencyCode)}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function TransactionHistoryScreen() {
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US";

  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");

  // Load up to 50 entries; the approved design is a flat paginated list
  const entriesQuery = usePatientWalletEntries({ limit: 50 });
  const walletQuery = usePatientWalletSummary();

  const wallet = walletQuery.data?.item ?? null;
  const allEntries = entriesQuery.data?.items ?? [];

  const filteredEntries = useMemo(
    () => allEntries.filter((e) => filterEntry(e, activeFilter)),
    [allEntries, activeFilter],
  );

  const groups = useMemo(() => groupByDay(filteredEntries), [filteredEntries]);
  const todayLabel = t("patientPaymentsFlow.transactions.today");
  const fallbackCurrency = resolveSupportedCurrencyCode({
    currencyCode: wallet?.currencyCode ?? allEntries[0]?.currencyCode ?? null,
  });

  const filters: { key: FilterTab; labelKey: string }[] = [
    { key: "all", labelKey: "patientPaymentsFlow.transactions.filters.all" },
    {
      key: "payments",
      labelKey: "patientPaymentsFlow.transactions.filters.payments",
    },
    {
      key: "credits",
      labelKey: "patientPaymentsFlow.transactions.filters.credits",
    },
    {
      key: "refunds",
      labelKey: "patientPaymentsFlow.transactions.filters.refunds",
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
        {/* ── Balance hero ── */}
        <Card
          variant="elevated"
          padding="lg"
          style={[
            styles.heroCard,
            {
              borderLeftWidth: i18n.language?.startsWith("ar") ? 3 : 0,
              borderLeftColor: theme.colors.primary,
              borderRightWidth: i18n.language?.startsWith("ar") ? 0 : 3,
              borderRightColor: theme.colors.primary,
            },
          ]}
        >
          <Text color={theme.colors.textSecondary} style={styles.heroLabel}>
            {t("patientPaymentsFlow.wallet.balanceLabel")}
          </Text>
          <Text weight="bold" style={styles.heroAmount}>
            {formatMoney(wallet?.availableBalance ?? "0", fallbackCurrency)}
          </Text>
          {/* Clarify scope: wallet entries ≠ all payments */}
          <Text color={theme.colors.textMuted} style={styles.heroScopeNote}>
            {t("patientPaymentsFlow.transactions.walletScopeNote")}
          </Text>
        </Card>

        {/* ── Filter tabs ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterBar}
        >
          {filters.map((f) => (
            <FilterChip
              key={f.key}
              label={t(f.labelKey as Parameters<typeof t>[0])}
              selected={activeFilter === f.key}
              onPress={() => setActiveFilter(f.key)}
            />
          ))}
        </ScrollView>

        {/* ── List ── */}
        {entriesQuery.isLoading ? (
          <LoadingState fullScreen />
        ) : entriesQuery.isError ? (
          <ErrorState onRetry={() => entriesQuery.refetch()} />
        ) : groups.length === 0 ? (
          <View style={styles.emptyWrapper}>
            <Text
              color={theme.colors.textMuted}
              style={styles.emptyTitle}
              weight="600"
            >
              {t("patientPaymentsFlow.transactions.emptyTitle")}
            </Text>
            <Text color={theme.colors.textMuted} style={styles.emptyNote}>
              {t("patientPaymentsFlow.transactions.emptyNote")}
            </Text>
            {/* Data truth note: wallet entries ≠ all payments */}
            <Text
              color={theme.colors.textMuted}
              style={[styles.emptyNote, styles.emptyDataNote]}
            >
              {t("patientPaymentsFlow.transactions.walletOnlyNote")}
            </Text>
          </View>
        ) : (
          <View style={styles.groupList}>
            {groups.map((group) => (
              <View key={group.day}>
                <Text
                  color={theme.colors.textMuted}
                  style={styles.dayLabel}
                  weight="600"
                >
                  {formatDayLabel(group.iso, locale, todayLabel)}
                </Text>
                <Card variant="elevated" padding="md" style={styles.groupCard}>
                  {group.items.map((entry, idx) => (
                    <View key={entry.id}>
                      <EntryRow entry={entry} />
                      {idx < group.items.length - 1 && (
                        <View
                          style={[
                            styles.itemDivider,
                            {
                              backgroundColor: theme.colors.borderLight,
                            },
                          ]}
                        />
                      )}
                    </View>
                  ))}
                </Card>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 16, paddingBottom: 32, gap: 12 },
  heroCard: { marginBottom: 0 },
  heroLabel: { fontSize: 13, marginBottom: 4 },
  heroAmount: { fontSize: 32, letterSpacing: -0.5 },
  heroScopeNote: { fontSize: 12, marginTop: 6 },
  filterBar: { gap: 8, paddingVertical: 4 },
  emptyWrapper: { alignItems: "center", paddingTop: 48, gap: 8 },
  emptyTitle: { fontSize: 16 },
  emptyNote: { fontSize: 13, textAlign: "center", paddingHorizontal: 24 },
  emptyDataNote: { marginTop: 8, lineHeight: 20 },
  groupList: { gap: 12 },
  dayLabel: { fontSize: 13, marginBottom: 8 },
  groupCard: { marginBottom: 0 },
  entryRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 4,
  },
  entryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  entryTextBlock: { flex: 1, gap: 3 },
  entryType: { fontSize: 14 },
  entryDescription: { fontSize: 12 },
  entryBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  entryBadgeText: { fontSize: 11 },
  entryAmount: { fontSize: 15, minWidth: 80, textAlign: "right" },
  itemDivider: { height: 1, marginVertical: 8 },
});

