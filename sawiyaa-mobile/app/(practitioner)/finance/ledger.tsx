import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import {
  Button,
  ErrorState,
  FilterChip,
  Header,
  LoadingState,
  Screen,
  Text,
} from "../../../src/components/ui";
import { usePractitionerLedgerEntries } from "../../../src/features/practitioner/finance/hooks";
import {
  formatDateShort,
  formatSignedMoney,
  ledgerBucketLabel,
  ledgerEntryTypeLabel,
  monthYearLabel,
  safeFinanceText,
} from "../../../src/features/practitioner/finance/utils";
import type { PractitionerLedgerEntry } from "../../../src/features/practitioner/finance/types";
import { useTheme } from "../../../src/providers/ThemeProvider";

const PAGE_SIZE = 20;
type TransactionFilter = "ALL" | "EARNINGS" | "TRANSFERS";
type TranslateFn = ReturnType<typeof useTranslation>["t"];

export default function PractitionerTransactionsScreen() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US";
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<TransactionFilter>("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [items, setItems] = useState<PractitionerLedgerEntry[]>([]);
  const query = usePractitionerLedgerEntries({ page, limit: PAGE_SIZE });

  useEffect(() => {
    if (!query.data) return;
    setItems((current) => {
      if (page === 1) return query.data.items;
      const seen = new Set(current.map((item) => item.id));
      return [...current, ...query.data.items.filter((item) => !seen.has(item.id))];
    });
  }, [page, query.data]);

  useEffect(() => {
    setExpandedId(null);
  }, [filter]);

  const filteredItems = useMemo(() => {
    return [...items]
      .sort(
        (a, b) =>
          new Date(b.effectiveAt ?? b.createdAt).getTime() -
          new Date(a.effectiveAt ?? a.createdAt).getTime(),
      )
      .filter((item) => {
        if (filter === "ALL") return true;
        if (filter === "TRANSFERS") return item.entryType.includes("SETTLEMENT");
        return item.entryType.includes("EARNING") || item.entryType === "SESSION_GROSS";
      });
  }, [filter, items]);

  const groupedItems = useMemo(() => {
    const groups = new Map<string, PractitionerLedgerEntry[]>();
    for (const item of filteredItems) {
      const date = new Date(item.effectiveAt ?? item.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      groups.set(key, [...(groups.get(key) ?? []), item]);
    }
    return Array.from(groups.entries()).map(([key, groupItems]) => {
      const [year, month] = key.split("-").map(Number);
      return { key, label: monthYearLabel(year, month, locale), items: groupItems };
    });
  }, [filteredItems, locale]);

  const refresh = () => {
    setPage(1);
    setItems([]);
    setExpandedId(null);
    void query.refetch();
  };

  if (query.isLoading && page === 1) {
    return (
      <Screen bg="background">
        <Header title={t("practitioner.finance.product.transactions")} showBack />
        <LoadingState fullScreen message={t("practitioner.finance.common.loading")} />
      </Screen>
    );
  }

  if (query.isError && page === 1) {
    return (
      <Screen bg="background">
        <Header title={t("practitioner.finance.product.transactions")} showBack />
        <ErrorState
          fullScreen
          title={t("practitioner.finance.ledger.errorTitle")}
          message={t("practitioner.finance.ledger.errorBody")}
          onRetry={refresh}
        />
      </Screen>
    );
  }

  return (
    <Screen bg="background">
      <Header
        title={t("practitioner.finance.product.transactions")}
        showBack
        rightElement={
          <TouchableOpacity
            accessibilityLabel={t("practitioner.finance.common.refresh")}
            onPress={refresh}
            style={styles.headerAction}
          >
            <Ionicons name="refresh-outline" size={22} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.filterRow}>
          <FilterChip
            label={t("practitioner.finance.filters.all")}
            selected={filter === "ALL"}
            onPress={() => setFilter("ALL")}
          />
          <FilterChip
            label={t("practitioner.finance.product.earnings")}
            selected={filter === "EARNINGS"}
            onPress={() => setFilter("EARNINGS")}
          />
          <FilterChip
            label={t("practitioner.finance.product.transfers")}
            selected={filter === "TRANSFERS"}
            onPress={() => setFilter("TRANSFERS")}
          />
        </View>

        {groupedItems.length ? (
          groupedItems.map((group) => (
            <View key={group.key} style={styles.group}>
              <Text color={theme.colors.textMuted} style={styles.groupTitle}>
                {group.label}
              </Text>
              <View style={[styles.list, { borderTopColor: theme.colors.borderLight }]}>
                {group.items.map((item) => (
                  <TransactionRow
                    key={item.id}
                    item={item}
                    locale={locale}
                    t={t}
                    expanded={expandedId === item.id}
                    onToggle={() =>
                      setExpandedId((current) => (current === item.id ? null : item.id))
                    }
                  />
                ))}
              </View>
            </View>
          ))
        ) : (
          <Text color={theme.colors.textSecondary} style={styles.emptyText}>
            {t("practitioner.finance.product.noTransactions")}
          </Text>
        )}

        {query.data && page < query.data.pagination.totalPages ? (
          <Button
            title={query.isFetching ? t("practitioner.finance.common.loadingMore") : t("practitioner.finance.common.loadMore")}
            onPress={() => setPage((current) => current + 1)}
            variant="secondary"
            disabled={query.isFetching}
          />
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function TransactionRow({
  item,
  locale,
  t,
  expanded,
  onToggle,
}: {
  item: PractitionerLedgerEntry;
  locale: string;
  t: TranslateFn;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { theme } = useTheme();
  const title = safeFinanceText(item.description, ledgerEntryTypeLabel(item.entryType, t));
  const amount = formatSignedMoney(
    item.amount,
    item.currency,
    locale,
    t("practitioner.finance.common.currencyUnavailable"),
  );
  const status = ledgerBucketLabel(item.balanceBucket, t);

  return (
    <View style={[styles.row, { borderBottomColor: theme.colors.borderLight }]}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${amount}. ${formatDateShort(item.effectiveAt, locale)}. ${status}`}
        onPress={onToggle}
        style={styles.rowTop}
      >
        <View style={styles.rowCopy}>
          <Text weight="600" style={styles.rowTitle} numberOfLines={1}>
            {title}
          </Text>
          <Text color={theme.colors.textMuted} style={styles.rowMeta} numberOfLines={1}>
            {formatDateShort(item.effectiveAt, locale)} · {status}
          </Text>
        </View>
        <View style={styles.rowAmountWrap}>
          <Text weight="600" style={styles.rowAmount} numberOfLines={1}>
            {amount}
          </Text>
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={16}
            color={theme.colors.textMuted}
          />
        </View>
      </TouchableOpacity>

      {expanded ? (
        <View style={styles.details}>
          <DetailRow label={t("practitioner.finance.ledger.details.type")} value={title} />
          <DetailRow label={t("practitioner.finance.ledger.details.bucket")} value={status} />
          <DetailRow
            label={t("practitioner.finance.ledger.details.effectiveAt")}
            value={formatDateShort(item.effectiveAt, locale)}
          />
          <DetailRow
            label={t("practitioner.finance.ledger.details.source")}
            value={referenceLabel(item.referenceType, t)}
          />
        </View>
      ) : null}
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.detailRow, { borderTopColor: theme.colors.borderLight }]}>
      <Text color={theme.colors.textMuted} style={styles.detailLabel}>
        {label}
      </Text>
      <Text weight="600" style={styles.detailValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function referenceLabel(value: string | null, t: TranslateFn) {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return t("practitioner.finance.ledger.details.none");
  const known = ["session", "payment", "settlement", "coupon", "manual"] as const;
  return known.includes(normalized as (typeof known)[number])
    ? t(`practitioner.finance.ledger.referenceTypes.${normalized}`)
    : t("practitioner.finance.ledger.referenceTypes.unknown");
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
    gap: 16,
  },
  headerAction: {
    padding: 8,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  group: {
    gap: 5,
  },
  groupTitle: {
    fontSize: 11,
  },
  list: {
    borderTopWidth: 1,
  },
  row: {
    borderBottomWidth: 1,
    paddingVertical: 5,
  },
  rowTop: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  rowCopy: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 11,
  },
  rowMeta: {
    fontSize: 9,
    lineHeight: 13,
  },
  rowAmountWrap: {
    alignItems: "flex-end",
    gap: 3,
    maxWidth: "46%",
  },
  rowAmount: {
    fontSize: 11,
  },
  details: {
    paddingBottom: 4,
    gap: 4,
  },
  detailRow: {
    minHeight: 25,
    borderTopWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  detailLabel: {
    fontSize: 9,
    flex: 1,
  },
  detailValue: {
    fontSize: 9,
    maxWidth: "60%",
    textAlign: "left",
  },
  emptyText: {
    fontSize: 12,
    paddingVertical: 14,
  },
});
