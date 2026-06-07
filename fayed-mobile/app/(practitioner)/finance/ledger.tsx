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
import { SearchBar, FilterChip } from "../../../src/components/ui";
import { usePractitionerLedgerEntries } from "../../../src/features/practitioner/finance/hooks";
import {
  buildFinancePeriodRange,
  formatDateShort,
  formatSignedMoney,
  ledgerBucketLabel,
  ledgerEntryTypeLabel,
  ledgerTypeTone,
  monthYearLabel,
  periodPresetLabel,
  safeFinanceText,
} from "../../../src/features/practitioner/finance/utils";
import type {
  PractitionerLedgerEntry,
} from "../../../src/features/practitioner/finance/types";
import { useTheme } from "../../../src/providers/ThemeProvider";
import {
  CompactEmptyState,
  CompactSectionHeader,
  resolvePractitionerTone,
} from "../../../src/features/practitioner/ui/compact";

const PAGE_SIZE = 20;
const PERIOD_PRESETS = ["ALL", "THIS_MONTH", "LAST_3_MONTHS", "LAST_12_MONTHS"] as const;
type PeriodPreset = (typeof PERIOD_PRESETS)[number];
type LedgerFilter = "ALL" | "INCOME" | "DEDUCTION" | "SETTLEMENT";

export default function PractitionerLedgerScreen() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US";
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<LedgerFilter>("ALL");
  const [periodFilter, setPeriodFilter] = useState<PeriodPreset>("ALL");
  const [searchDraft, setSearchDraft] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchDraft.trim()), 250);
    return () => clearTimeout(timer);
  }, [searchDraft]);

  const periodRange = useMemo(
    () => buildFinancePeriodRange(periodFilter, new Date()),
    [periodFilter],
  );

  const query = usePractitionerLedgerEntries({
    page,
    limit: PAGE_SIZE,
    ...(periodRange.from ? { effectiveFrom: periodRange.from, effectiveTo: periodRange.to } : {}),
  });

  const [items, setItems] = useState<PractitionerLedgerEntry[]>([]);

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
  }, [filter, periodFilter, searchQuery]);

  const hasMore = useMemo(() => {
    if (!query.data) return false;
    return page < query.data.pagination.totalPages;
  }, [page, query.data]);

  const filteredItems = useMemo(() => {
    const normalizedSearch = searchQuery.toLowerCase();

    const sortedItems = [...items].sort((a, b) => {
      const bTime = new Date(b.effectiveAt ?? b.createdAt).getTime();
      const aTime = new Date(a.effectiveAt ?? a.createdAt).getTime();
      return bTime - aTime;
    });

    return sortedItems.filter((item) => {
      const kindMatches =
        filter === "ALL"
          ? true
          : filter === "INCOME"
            ? item.direction === "CREDIT"
            : filter === "DEDUCTION"
              ? item.direction === "DEBIT"
              : item.entryType.includes("SETTLEMENT");

      if (!kindMatches) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const description = safeFinanceText(
        item.description,
        ledgerEntryTypeLabel(item.entryType, locale),
      ).toLowerCase();
      const searchable = [
        description,
        ledgerEntryTypeLabel(item.entryType, locale).toLowerCase(),
        ledgerBucketLabel(item.balanceBucket, locale).toLowerCase(),
        item.referenceType ?? "",
      ].join(" ");

      return searchable.includes(normalizedSearch);
    });
  }, [filter, items, locale, searchQuery]);

  const groupedItems = useMemo(() => {
    const groups = new Map<string, PractitionerLedgerEntry[]>();

    for (const item of filteredItems) {
      const date = new Date(item.effectiveAt ?? item.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const current = groups.get(key) ?? [];
      current.push(item);
      groups.set(key, current);
    }

    return Array.from(groups.entries()).map(([key, groupItems]) => {
      const [year, month] = key.split("-").map(Number);
      return {
        key,
        label: monthYearLabel(year, month, locale),
        items: groupItems,
      };
    });
  }, [filteredItems, locale]);

  const refresh = () => {
    setPage(1);
    setExpandedId(null);
    setItems([]);
    query.refetch();
  };

  if (query.isLoading && page === 1) {
    return (
      <Screen bg="background">
        <Header title={t("practitioner.finance.ledger.title")} showBack />
        <LoadingState fullScreen message={t("practitioner.finance.common.loading")} />
      </Screen>
    );
  }

  if (query.isError && page === 1) {
    return (
      <Screen bg="background">
        <Header title={t("practitioner.finance.ledger.title")} showBack />
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
        title={t("practitioner.finance.ledger.title")}
        showBack
        rightElement={
          <TouchableOpacity onPress={refresh} style={styles.headerAction}>
            <Ionicons name="refresh-outline" size={22} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.content}>
        <Card variant="outlined" padding="sm" style={styles.toolbarCard}>
          <SearchBar
            value={searchDraft}
            onChangeText={setSearchDraft}
            onClear={() => setSearchDraft("")}
            placeholder={t("practitioner.finance.ledger.searchPlaceholder")}
          />

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
            {t("practitioner.finance.filters.kind")}
          </Text>
          <View style={styles.chipRow}>
            <FilterChip
              label={t("practitioner.finance.filters.all")}
              selected={filter === "ALL"}
              onPress={() => {
                setItems([]);
                setPage(1);
                setFilter("ALL");
              }}
            />
            <FilterChip
              label={t("practitioner.finance.filters.income")}
              selected={filter === "INCOME"}
              onPress={() => {
                setItems([]);
                setPage(1);
                setFilter("INCOME");
              }}
            />
            <FilterChip
              label={t("practitioner.finance.filters.deduction")}
              selected={filter === "DEDUCTION"}
              onPress={() => {
                setItems([]);
                setPage(1);
                setFilter("DEDUCTION");
              }}
            />
            <FilterChip
              label={t("practitioner.finance.filters.settlement")}
              selected={filter === "SETTLEMENT"}
              onPress={() => {
                setItems([]);
                setPage(1);
                setFilter("SETTLEMENT");
              }}
            />
          </View>
        </Card>

        {groupedItems.length ? (
          <View style={styles.groupList}>
            {groupedItems.map((group) => (
              <View key={group.key} style={styles.groupBlock}>
                <CompactSectionHeader
                  title={group.label}
                  subtitle={t("practitioner.finance.ledger.groupSubtitle", {
                    count: group.items.length,
                  })}
                />
                <View style={styles.rowList}>
                  {group.items.map((item) => (
                    <LedgerRow
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
            ))}
          </View>
        ) : (
          <CompactEmptyState
            title={t("practitioner.finance.ledger.emptyTitle")}
            description={t("practitioner.finance.ledger.emptyBody")}
            icon={<Ionicons name="receipt-outline" size={28} color={theme.colors.textMuted} />}
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

function LedgerRow({
  item,
  locale,
  t,
  expanded,
  onToggle,
}: {
  item: PractitionerLedgerEntry;
  locale: string;
  t: ReturnType<typeof useTranslation>["t"];
  expanded: boolean;
  onToggle: () => void;
}) {
  const { theme } = useTheme();
  const tone =
    item.direction === "DEBIT"
      ? "danger"
      : item.entryType.includes("SETTLEMENT")
        ? "info"
        : "success";
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
            {safeFinanceText(
              item.description,
              ledgerEntryTypeLabel(item.entryType, locale),
            )}
          </Text>
          <Text color={theme.colors.textMuted} style={styles.rowSubtitle} numberOfLines={1}>
            {formatDateShort(item.effectiveAt, locale)} · {ledgerBucketLabel(item.balanceBucket, locale)}
          </Text>
        </View>
        <View style={styles.rowAmountWrap}>
          <Text weight="600" style={[styles.rowAmount, { color: palette.accent }]}>
            {formatSignedMoney(item.amount, item.currency, locale)}
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
          label={ledgerEntryTypeLabel(item.entryType, locale)}
          status={ledgerTypeTone(item.entryType)}
        />
      </View>

      {expanded ? (
        <View style={styles.expandedBody}>
          <InfoRow
            label={t("practitioner.finance.ledger.details.type")}
            value={ledgerEntryTypeLabel(item.entryType, locale)}
          />
          <InfoRow
            label={t("practitioner.finance.ledger.details.bucket")}
            value={ledgerBucketLabel(item.balanceBucket, locale)}
          />
          <InfoRow
            label={t("practitioner.finance.ledger.details.createdAt")}
            value={formatDateShort(item.createdAt, locale)}
          />
          <InfoRow
            label={t("practitioner.finance.ledger.details.effectiveAt")}
            value={formatDateShort(item.effectiveAt, locale)}
          />
          <InfoRow
            label={t("practitioner.finance.ledger.details.source")}
            value={item.referenceType ? humanizeReferenceType(item.referenceType, locale) : t("practitioner.finance.ledger.details.none")}
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

function humanizeReferenceType(value: string, locale: string) {
  const normalized = value.trim().toLowerCase();
  const labelsAr: Record<string, string> = {
    session: "جلسة",
    payment: "عملية دفع",
    settlement: "تسوية",
    coupon: "كود خصم",
    manual: "تعديل مالي",
  };
  const labelsEn: Record<string, string> = {
    session: "Session",
    payment: "Payment",
    settlement: "Settlement",
    coupon: "Promo code",
    manual: "Financial adjustment",
  };

  return locale.startsWith("ar") ? labelsAr[normalized] ?? "مرجع" : labelsEn[normalized] ?? "Reference";
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
  toolbarCard: {
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
  groupList: {
    gap: 8,
  },
  groupBlock: {
    gap: 6,
  },
  rowList: {
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
    gap: 3,
    paddingTop: 2,
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
    flexShrink: 0,
    maxWidth: "55%",
    textAlign: "left",
  },
});
