import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import {
  Button,
  Card,
  ErrorState,
  Header,
  LoadingState,
  Screen,
  StatusBadge,
  Text,
} from "../../../src/components/ui";
import { usePractitionerSettlementItems } from "../../../src/features/practitioner/finance/hooks";
import {
  buildFinancePeriodRange,
  formatDateShort,
  formatMoney,
  monthYearLabel,
  periodPresetLabel,
  settlementStatusLabel,
  settlementStatusTone,
} from "../../../src/features/practitioner/finance/utils";
import type {
  PractitionerSettlementItem,
  PractitionerSettlementStatus,
} from "../../../src/features/practitioner/finance/types";
import { useTheme } from "../../../src/providers/ThemeProvider";
import {
  CompactEmptyState,
  resolvePractitionerTone,
} from "../../../src/features/practitioner/ui/compact";
import { FilterChip } from "../../../src/components/ui/FilterChip";

const PAGE_SIZE = 20;
const PERIOD_PRESETS = ["ALL", "THIS_MONTH", "LAST_3_MONTHS", "LAST_12_MONTHS"] as const;
type PeriodPreset = (typeof PERIOD_PRESETS)[number];
const STATUS_FILTERS: Array<"ALL" | PractitionerSettlementStatus> = [
  "ALL",
  "PAID",
  "READY",
  "PROCESSING",
  "FAILED",
  "CANCELLED",
];

export default function PractitionerSettlementsScreen() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();

  const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US";
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<"ALL" | PractitionerSettlementStatus>("ALL");
  const [periodFilter, setPeriodFilter] = useState<PeriodPreset>("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const periodRange = useMemo(
    () => buildFinancePeriodRange(periodFilter, new Date()),
    [periodFilter],
  );

  const query = usePractitionerSettlementItems({
    page,
    limit: PAGE_SIZE,
    ...(statusFilter === "ALL" ? {} : { status: statusFilter }),
    ...(periodRange.from ? { createdFrom: periodRange.from, createdTo: periodRange.to } : {}),
  });

  const [items, setItems] = useState<PractitionerSettlementItem[]>([]);

  useEffect(() => {
    if (!query.data) return;
    setItems((current) => {
      if (page === 1) return query.data.items;
      const seen = new Set(current.map((item) => item.id));
      const next = [...current];
      for (const item of query.data.items) {
        if (!seen.has(item.id)) next.push(item);
      }
      return next;
    });
  }, [page, query.data]);

  useEffect(() => {
    setExpandedId(null);
  }, [statusFilter, periodFilter]);

  const hasMore = useMemo(() => {
    if (!query.data) return false;
    return page < query.data.pagination.totalPages;
  }, [page, query.data]);

  const paidCount = useMemo(() => items.filter((item) => item.status === "PAID").length, [items]);
  const readyCount = useMemo(() => items.filter((item) => item.status === "READY").length, [items]);
  const failedCount = useMemo(() => items.filter((item) => item.status === "FAILED").length, [items]);

  const refresh = () => {
    setPage(1);
    setExpandedId(null);
    setItems([]);
    query.refetch();
  };

  if (query.isLoading && page === 1) {
    return (
      <Screen bg="background">
        <Header title={t("practitioner.finance.settlements.title")} showBack />
        <LoadingState fullScreen message={t("practitioner.finance.common.loading")} />
      </Screen>
    );
  }

  if (query.isError && page === 1) {
    return (
      <Screen bg="background">
        <Header title={t("practitioner.finance.settlements.title")} showBack />
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
        title={t("practitioner.finance.settlements.title")}
        showBack
        rightElement={
          <TouchableOpacity onPress={refresh} style={styles.headerAction}>
            <Ionicons name="refresh-outline" size={22} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.content}>
        <Card variant="outlined" padding="sm" style={styles.summaryCard}>
          <View style={styles.summaryMetric}>
            <Text color={theme.colors.textMuted} style={styles.summaryLabel}>
              {t("practitioner.finance.settlements.summary.total")}
            </Text>
            <Text weight="700" style={styles.summaryValue}>
              {items.length}
            </Text>
          </View>
          <View style={styles.summaryMetric}>
            <Text color={theme.colors.textMuted} style={styles.summaryLabel}>
              {t("practitioner.finance.settlements.summary.paid")}
            </Text>
            <Text weight="700" style={styles.summaryValue}>
              {paidCount}
            </Text>
          </View>
          <View style={styles.summaryMetric}>
            <Text color={theme.colors.textMuted} style={styles.summaryLabel}>
              {t("practitioner.finance.settlements.summary.ready")}
            </Text>
            <Text weight="700" style={styles.summaryValue}>
              {readyCount}
            </Text>
          </View>
          <View style={styles.summaryMetric}>
            <Text color={theme.colors.textMuted} style={styles.summaryLabel}>
              {t("practitioner.finance.settlements.summary.failed")}
            </Text>
            <Text weight="700" style={styles.summaryValue}>
              {failedCount}
            </Text>
          </View>
        </Card>

        <Card variant="outlined" padding="sm" style={styles.filterCard}>
          <Text weight="600" style={styles.filterTitle}>
            {t("practitioner.finance.filters.period")}
          </Text>
          <View style={styles.chipRow}>
            {PERIOD_PRESETS.map((preset) => (
              <FilterChip
                key={preset}
                label={periodPresetLabel(preset, locale)}
                selected={periodFilter === preset}
                onPress={() => {
                  setItems([]);
                  setPage(1);
                  setPeriodFilter(preset);
                }}
              />
            ))}
          </View>
          <Text weight="600" style={styles.filterTitle}>
            {t("practitioner.finance.filters.status")}
          </Text>
          <View style={styles.chipRow}>
            {STATUS_FILTERS.map((status) => (
              <FilterChip
                key={status}
                label={
                  status === "ALL"
                    ? t("practitioner.finance.filters.all")
                    : settlementStatusLabel(status, locale)
                }
                selected={statusFilter === status}
                onPress={() => {
                  setItems([]);
                  setPage(1);
                  setStatusFilter(status);
                }}
              />
            ))}
          </View>
        </Card>

        {items.length ? (
          <View style={styles.listWrap}>
            {items.map((item) => (
              <SettlementRow
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
          <CompactEmptyState
            title={t("practitioner.finance.settlements.emptyTitle")}
            description={t("practitioner.finance.settlements.emptyBody")}
            icon={<Ionicons name="layers-outline" size={28} color={theme.colors.textMuted} />}
          />
        )}

        {hasMore ? (
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

function SettlementRow({
  item,
  locale,
  t,
  expanded,
  onToggle,
}: {
  item: PractitionerSettlementItem;
  locale: string;
  t: ReturnType<typeof useTranslation>["t"];
  expanded: boolean;
  onToggle: () => void;
}) {
  const { theme } = useTheme();
  const tone =
    item.status === "PAID"
      ? "success"
      : item.status === "FAILED" || item.status === "CANCELLED"
        ? "danger"
        : item.status === "READY" || item.status === "PROCESSING"
          ? "warning"
          : "neutral";
  const palette = resolvePractitionerTone(theme, tone);

  return (
    <Card
      variant="flat"
      padding="sm"
      style={[
        styles.rowCard,
        {
          backgroundColor: palette.surface,
          borderColor: palette.border,
        },
      ]}
    >
      <TouchableOpacity onPress={onToggle} activeOpacity={0.85} style={styles.rowTop}>
        <View style={styles.rowText}>
          <Text weight="600" style={styles.rowTitle} numberOfLines={1}>
            {monthYearLabel(item.batchPeriodYear, item.batchPeriodMonth, locale)}
          </Text>
          <Text color={theme.colors.textMuted} style={styles.rowSubtitle} numberOfLines={1}>
            {formatDateShort(item.paidAt ?? item.failedAt ?? item.createdAt, locale)}
          </Text>
        </View>
        <View style={styles.rowAmountWrap}>
          <Text weight="600" style={[styles.rowAmount, { color: palette.accent }]}>
            {formatMoney(
              item.amountNet,
              item.currency ?? null,
              locale,
              t("practitioner.finance.common.currencyUnavailable"),
            )}
          </Text>
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={16}
            color={theme.colors.textMuted}
          />
        </View>
      </TouchableOpacity>

      <View style={styles.badgeRow}>
        <StatusBadge
          label={settlementStatusLabel(item.status, locale)}
          status={settlementStatusTone(item.status)}
        />
      </View>

      {expanded ? (
        <View style={styles.expandedBody}>
          <InfoRow
            label={t("practitioner.finance.settlements.labels.grossAmount")}
            value={formatMoney(
              item.amountGross,
              item.currency ?? null,
              locale,
              t("practitioner.finance.common.currencyUnavailable"),
            )}
          />
          <InfoRow
            label={t("practitioner.finance.settlements.labels.adjustments")}
            value={formatMoney(
              item.amountAdjustments,
              item.currency ?? null,
              locale,
              t("practitioner.finance.common.currencyUnavailable"),
            )}
          />
          <InfoRow
            label={t("practitioner.finance.settlements.labels.batchStatus")}
            value={settlementStatusLabel(item.batchStatus, locale)}
          />
          <InfoRow
            label={t("practitioner.finance.settlements.labels.updated")}
            value={formatDateShort(item.paidAt ?? item.failedAt ?? item.createdAt, locale)}
          />
        </View>
      ) : null}
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const { theme } = useTheme();

  return (
    <View style={[styles.infoRow, { borderColor: theme.colors.borderLight }]}>
      <Text color={theme.colors.textMuted} style={styles.infoLabel}>
        {label}
      </Text>
      <Text weight="600" style={styles.infoValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 24,
    gap: 9,
  },
  headerAction: {
    padding: 8,
  },
  summaryCard: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
  },
  summaryMetric: {
    width: "48%",
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 7,
    backgroundColor: "#f8fafc",
    gap: 2,
  },
  summaryLabel: {
    fontSize: 10,
  },
  summaryValue: {
    fontSize: 16,
    lineHeight: 20,
  },
  filterCard: {
    gap: 6,
  },
  filterTitle: {
    fontSize: 11,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 2,
  },
  listWrap: {
    gap: 7,
  },
  rowCard: {
    gap: 4,
    borderWidth: 1,
  },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  rowText: {
    flex: 1,
    gap: 1,
  },
  rowTitle: {
    fontSize: 11,
  },
  rowSubtitle: {
    fontSize: 8,
    lineHeight: 12,
  },
  rowAmountWrap: {
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 3,
  },
  rowAmount: {
    fontSize: 11,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 3,
  },
  expandedBody: {
    gap: 4,
    paddingTop: 3,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    paddingTop: 4,
  },
  infoLabel: {
    fontSize: 8,
    flex: 1,
  },
  infoValue: {
    fontSize: 9,
    maxWidth: "55%",
    textAlign: "left",
  },
});
