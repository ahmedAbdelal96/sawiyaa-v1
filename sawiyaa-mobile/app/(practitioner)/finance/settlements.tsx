import React, { useEffect, useState } from "react";
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
  StatusBadge,
  Text,
} from "../../../src/components/ui";
import { usePractitionerSettlementItems } from "../../../src/features/practitioner/finance/hooks";
import {
  formatDateShort,
  formatMoney,
  settlementStatusLabel,
  settlementStatusTone,
} from "../../../src/features/practitioner/finance/utils";
import type {
  PractitionerSettlementItem,
  PractitionerSettlementStatus,
} from "../../../src/features/practitioner/finance/types";
import { useTheme } from "../../../src/providers/ThemeProvider";

const PAGE_SIZE = 20;
type TransferFilter = "ALL" | PractitionerSettlementStatus;
type TranslateFn = ReturnType<typeof useTranslation>["t"];

const STATUS_FILTERS: TransferFilter[] = ["ALL", "READY", "PROCESSING", "PAID", "FAILED"];

export default function PractitionerTransfersScreen() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US";
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<TransferFilter>("ALL");
  const [items, setItems] = useState<PractitionerSettlementItem[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const query = usePractitionerSettlementItems({
    page,
    limit: PAGE_SIZE,
    ...(statusFilter === "ALL" ? {} : { status: statusFilter }),
  });

  useEffect(() => {
    if (!query.data) return;
    setItems((current) => {
      if (page === 1) return query.data.items;
      const seen = new Set(current.map((item) => item.id));
      return [...current, ...query.data.items.filter((item) => !seen.has(item.id))];
    });
  }, [page, query.data]);

  useEffect(() => {
    setPage(1);
    setItems([]);
    setExpandedId(null);
  }, [statusFilter]);

  const refresh = () => {
    setPage(1);
    setItems([]);
    setExpandedId(null);
    void query.refetch();
  };

  if (query.isLoading && page === 1) {
    return (
      <Screen bg="background">
        <Header title={t("practitioner.finance.product.transfers")} showBack />
        <LoadingState fullScreen message={t("practitioner.finance.common.loading")} />
      </Screen>
    );
  }

  if (query.isError && page === 1) {
    return (
      <Screen bg="background">
        <Header title={t("practitioner.finance.product.transfers")} showBack />
        <ErrorState
          fullScreen
          title={t("practitioner.finance.settlements.errorTitle")}
          message={t("practitioner.finance.settlements.errorBody")}
          onRetry={refresh}
        />
      </Screen>
    );
  }

  return (
    <Screen bg="background">
      <Header
        title={t("practitioner.finance.product.transfers")}
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
          {STATUS_FILTERS.map((status) => (
            <FilterChip
              key={status}
              label={
                status === "ALL"
                  ? t("practitioner.finance.filters.all")
                  : settlementStatusLabel(status, t)
              }
              selected={statusFilter === status}
              onPress={() => setStatusFilter(status)}
            />
          ))}
        </View>

        {items.length ? (
          <View style={[styles.list, { borderTopColor: theme.colors.borderLight }]}>
            {items.map((item) => (
              <TransferRow
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
        ) : (
          <Text color={theme.colors.textSecondary} style={styles.emptyText}>
            {t("practitioner.finance.product.noTransfers")}
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

function TransferRow({
  item,
  locale,
  t,
  expanded,
  onToggle,
}: {
  item: PractitionerSettlementItem;
  locale: string;
  t: TranslateFn;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { theme } = useTheme();
  const date = item.paidAt ?? item.failedAt ?? item.createdAt;
  const amount = formatMoney(
    item.amountNet,
    item.currency,
    locale,
    t("practitioner.finance.common.currencyUnavailable"),
  );
  const status = settlementStatusLabel(item.status, t);

  return (
    <View style={[styles.row, { borderBottomColor: theme.colors.borderLight }]}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`${t("practitioner.finance.product.transfer")}. ${amount}. ${status}. ${formatDateShort(date, locale)}`}
        onPress={onToggle}
        style={styles.rowTop}
      >
        <View style={styles.rowCopy}>
          <Text weight="600" style={styles.rowTitle}>
            {t("practitioner.finance.product.transfer")}
          </Text>
          <Text color={theme.colors.textMuted} style={styles.rowMeta}>
            {formatDateShort(date, locale)}
          </Text>
        </View>
        <View style={styles.rowAmountWrap}>
          <Text weight="600" style={styles.rowAmount} numberOfLines={1}>
            {amount}
          </Text>
          <StatusBadge label={status} status={settlementStatusTone(item.status)} />
        </View>
      </TouchableOpacity>

      {expanded ? (
        <View style={styles.details}>
          <DetailRow
            label={t("practitioner.finance.settlements.labels.grossAmount")}
            value={formatMoney(item.amountGross, item.currency, locale, t("practitioner.finance.common.currencyUnavailable"))}
          />
          <DetailRow
            label={t("practitioner.finance.settlements.labels.adjustments")}
            value={formatMoney(item.amountAdjustments, item.currency, locale, t("practitioner.finance.common.currencyUnavailable"))}
          />
          <DetailRow
            label={t("practitioner.finance.settlements.labels.netAmount")}
            value={amount}
          />
          <DetailRow label={t("practitioner.finance.settlements.labels.batchStatus")} value={status} />
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
  list: {
    borderTopWidth: 1,
  },
  row: {
    borderBottomWidth: 1,
    paddingVertical: 5,
  },
  rowTop: {
    minHeight: 58,
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
  },
  rowAmountWrap: {
    alignItems: "flex-end",
    gap: 3,
    maxWidth: "56%",
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
