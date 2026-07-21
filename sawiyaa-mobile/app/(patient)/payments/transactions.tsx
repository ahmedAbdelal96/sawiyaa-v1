import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import {
  ErrorState,
  FilterChip,
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
// Date grouping helpers
// ---------------------------------------------------------------------------

/**
 * Money formatter — avoids Intl.NumberFormat currency style which is
 * unreliable in React Native Hermes.
 *
 * NOTE: currencyCode always comes from backend data. Never hardcode currency
 * symbols or codes in screen components.
 */
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

// ---------------------------------------------------------------------------
// Entry row
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
  const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US";
  const { isRtl, rowDirection, textAlign, oppositeTextAlign } = useAppDirection();
  const isCredit = entry.direction === "CREDIT";
  const typeKey =
    `patientPaymentsFlow.transactions.entryTypes.${entry.entryType}` as const;

  // Badge: completed for CAPTURE/CREDIT/REFUND; pending for RESERVE
  const isCompleted =
    entry.entryType === "SESSION_PAYMENT_CAPTURE" ||
    entry.entryType === "REFUND_CREDIT" ||
    entry.entryType === "MANUAL_CREDIT";

  return (
    <>
      <View style={[styles.entryRow, { flexDirection: rowDirection }]}>
        {/* Icon */}
        <View
          style={[
            styles.entryIcon,
            {
              backgroundColor: isCredit
                ? theme.colors.statusSuccessBg
                : theme.colors.surfaceMuted,
            },
          ]}
        >
          <Ionicons
            name={isCredit ? "arrow-down" : "arrow-up"}
            size={13}
            color={isCredit ? theme.colors.success : theme.colors.textSecondary}
          />
        </View>

        {/* Text block */}
        <View style={[styles.entryTextBlock, { alignItems: isRtl ? "flex-end" : "flex-start" }]}>
          <Text weight="600" style={[styles.entryType, { textAlign }]}>
            {t(typeKey)}
          </Text>
          {entry.description ? (
            <Text color={theme.colors.textMuted} style={[styles.entryDescription, { textAlign }]}>
              {entry.description}
            </Text>
          ) : null}
          {/* Completed / Pending badge */}
          <View
            style={[
              styles.entryBadge,
              {
                backgroundColor: isCompleted
                  ? theme.colors.statusSuccessBg
                  : theme.colors.surfaceContainer,
                alignSelf: isRtl ? "flex-end" : "flex-start",
              },
            ]}
          >
            <Text
              color={isCompleted ? theme.colors.success : theme.colors.textMuted}
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
          color={isCredit ? theme.colors.success : theme.colors.textPrimary}
          style={[styles.entryAmount, { textAlign: oppositeTextAlign }]}
        >
          {isCredit ? "+" : "−"}
          {formatMoney(entry.amount, entry.currencyCode, locale)}
        </Text>
      </View>

      {showDivider && (
        <View style={[styles.itemDivider, { backgroundColor: theme.colors.divider }]} />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function TransactionHistoryScreen() {
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US";
  const { rowDirection, textAlign } = useAppDirection();

  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");

  // Load up to 20 entries; the approved design is a flat paginated list
  const entriesQuery = usePatientWalletEntries({ limit: 20 });
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
        {/* ── Balance hero — matches teal wallet card ── */}
        <View style={[styles.heroCard, { backgroundColor: theme.colors.primary }]}>
          <Text style={[styles.heroLabel, { textAlign }]}>
            {t("patientPaymentsFlow.wallet.balanceLabel")}
          </Text>
          <Text weight="bold" style={[styles.heroAmount, { textAlign }]}>
            {formatMoney(wallet?.availableBalance ?? "0", fallbackCurrency, locale)}
          </Text>
          <Text style={[styles.heroScopeNote, { textAlign }]}>
            {t("patientPaymentsFlow.transactions.walletScopeNote")}
          </Text>
        </View>

        {/* ── Filter tabs ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.filterBar, { flexDirection: rowDirection }]}
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
            <Ionicons
              name="receipt-outline"
              size={32}
              color={theme.colors.textMuted}
            />
            <Text
              color={theme.colors.textMuted}
              style={[styles.emptyTitle, { textAlign }]}
              weight="600"
            >
              {t("patientPaymentsFlow.transactions.emptyTitle")}
            </Text>
            <Text color={theme.colors.textMuted} style={[styles.emptyNote, { textAlign }]}>
              {t("patientPaymentsFlow.transactions.emptyNote")}
            </Text>
            <Text
              color={theme.colors.textMuted}
              style={[styles.emptyNote, styles.emptyDataNote, { textAlign }]}
            >
              {t("patientPaymentsFlow.transactions.walletOnlyNote")}
            </Text>
          </View>
        ) : (
          <View style={styles.groupList}>
            {groups.map((group) => (
              <View key={group.day}>
                {/* Day label */}
                <Text
                  color={theme.colors.textMuted}
                  style={[styles.dayLabel, { textAlign }]}
                  weight="600"
                >
                  {formatDayLabel(group.iso, locale, todayLabel)}
                </Text>

                {/* Group card */}
                <View
                  style={[
                    styles.groupCard,
                    {
                      backgroundColor: theme.colors.surfaceRaised,
                      borderColor: theme.colors.border,
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

            {/* Data scope note */}
            <TouchableOpacity disabled>
              <Text
                color={theme.colors.textMuted}
                style={[styles.scopeNote, { textAlign }]}
              >
                {t("patientPaymentsFlow.transactions.walletOnlyNote")}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  scrollContent: { padding: 16, paddingBottom: 40, gap: 12 },

  // ── Hero card (teal background — matches payments.tsx wallet card) ──
  heroCard: {
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 4,
  },
  heroLabel: {
    fontSize: 12,
    lineHeight: 17,
    color: "rgba(255,255,255,0.75)",
  },
  heroAmount: {
    fontSize: 30,
    lineHeight: 38,
    letterSpacing: -0.5,
    color: "#FFFFFF",
  },
  heroScopeNote: {
    fontSize: 12,
    lineHeight: 17,
    color: "rgba(255,255,255,0.55)",
    marginTop: 4,
  },

  // ── Filter bar ──
  filterBar: { gap: 8, paddingVertical: 2 },

  // ── Empty state ──
  emptyWrapper: { alignItems: "center", paddingTop: 48, gap: 10 },
  emptyTitle: { fontSize: 16, lineHeight: 22 },
  emptyNote: { fontSize: 13, lineHeight: 19, paddingHorizontal: 24 },
  emptyDataNote: { marginTop: 6, opacity: 0.8 },

  // ── Group list ──
  groupList: { gap: 16 },
  dayLabel: { fontSize: 12, lineHeight: 17, marginBottom: 6, paddingHorizontal: 2 },

  // ── Group card ──
  groupCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    paddingHorizontal: 14,
    paddingVertical: 4,
  },

  // ── Entry row ──
  entryRow: {
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 12,
  },
  entryIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    flexShrink: 0,
  },
  entryTextBlock: { flex: 1, gap: 3 },
  entryType: { fontSize: 13, lineHeight: 18 },
  entryDescription: { fontSize: 12, lineHeight: 17 },
  entryBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 3,
  },
  entryBadgeText: { fontSize: 11, lineHeight: 16 },
  entryAmount: {
    fontSize: 14,
    lineHeight: 20,
    minWidth: 80,
  },
  itemDivider: { height: 1, opacity: 0.5 },

  // ── Scope note ──
  scopeNote: { fontSize: 12, lineHeight: 17, paddingHorizontal: 4 },
});
