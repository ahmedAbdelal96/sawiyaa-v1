import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import {
  Button,
  EmptyState,
  ErrorState,
  Header,
  LoadingState,
  Screen,
  SearchBar,
  Text,
} from "../../../../components/ui";
import { useTheme } from "../../../../providers/ThemeProvider";
import { useAppDirection } from "../../../../i18n/direction";
import { useTranslation } from "react-i18next";
import { PractitionerCompactCard } from "./PractitionerCompactCard";
import { useGetPublicPractitionersInfinite } from "../api";
import { listSpecialtyCategories } from "../../../specialties/api";
import { getLocalizedSpecialtyCategoryName } from "../../../specialties/localized";
import { trackAnalyticsEvent } from "../../../../lib/analytics";
import { normalizeSupportedLanguageCodes } from "../../../languages/reference-data";
import type { ListPublicPractitionersFilters } from "../types";
import {
  getActiveDiscoveryFilterCount,
  getVisibleSpecialtyCategories,
  toDiscoveryFilters,
  type DiscoveryRouteParams,
} from "../view-model";

type DiscoveryRoutePrefix = "/(patient)" | "/(public)";

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

function flattenParams(
  params: Record<string, string | string[]>,
): DiscoveryRouteParams {
  return Object.entries(params).reduce<DiscoveryRouteParams>((output, [key, value]) => {
    output[key] = Array.isArray(value) ? value[0] : value;
    return output;
  }, {});
}

export function DiscoveryListScreen({
  routePrefix,
}: {
  routePrefix: DiscoveryRoutePrefix;
}) {
  const router = useRouter();
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const { textAlign, isRtl, chevronForward } = useAppDirection();
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const discoveryOpenedRef = useRef(false);
  const flatParams = useMemo(() => flattenParams(params), [params]);
  const pageSize = Number(flatParams.limit) || 12;
  const [searchInput, setSearchInput] = useState(flatParams.search || "");
  const debouncedSearch = useDebounce(searchInput, 400);
  const initialSearchDone = useRef(false);

  const filters = useMemo<Omit<ListPublicPractitionersFilters, "page">>(
    () => ({
      ...toDiscoveryFilters(flatParams, pageSize),
      search: debouncedSearch.trim() || undefined,
      languageCodes: normalizeSupportedLanguageCodes(
        toDiscoveryFilters(flatParams, pageSize).languageCodes,
      ),
    }),
    [debouncedSearch, flatParams, pageSize],
  );
  const activeFilterCount = getActiveDiscoveryFilterCount(flatParams);
  const hasDiscoveryIntent = Boolean(debouncedSearch.trim() || activeFilterCount > 0);

  const categoriesQuery = useQuery({
    queryKey: ["public-specialty-categories", "discovery", i18n.language],
    queryFn: listSpecialtyCategories,
    staleTime: 5 * 60 * 1000,
  });
  const categories = useMemo(
    () => getVisibleSpecialtyCategories(categoriesQuery.data?.categories ?? []),
    [categoriesQuery.data?.categories],
  );

  useEffect(() => {
    setSearchInput(flatParams.search || "");
  }, [flatParams.search]);

  useEffect(() => {
    if (!initialSearchDone.current) {
      initialSearchDone.current = true;
      return;
    }
    if (debouncedSearch.trim() === (flatParams.search || "")) return;
    router.replace({
      pathname: `${routePrefix}/discovery` as never,
      params: { ...flatParams, page: "1", search: debouncedSearch.trim() || undefined },
    });
  }, [debouncedSearch, flatParams, routePrefix, router]);

  const practitionersQuery = useGetPublicPractitionersInfinite(filters);
  const practitioners = useMemo(
    () => practitionersQuery.data?.pages.flatMap((page) => page.data.items) ?? [],
    [practitionersQuery.data?.pages],
  );
  const pagination = practitionersQuery.data?.pages.at(-1)?.data.pagination;

  const handleSearchSubmit = useCallback(() => {
    const nextSearch = searchInput.trim();
    if (nextSearch === (flatParams.search || "")) return;
    router.replace({
      pathname: `${routePrefix}/discovery` as never,
      params: { ...flatParams, page: "1", search: nextSearch || undefined },
    });
  }, [flatParams, routePrefix, router, searchInput]);

  const clearSearch = useCallback(() => setSearchInput(""), []);

  const resetFilters = useCallback(() => {
    setSearchInput("");
    router.replace({
      pathname: `${routePrefix}/discovery` as never,
      params: { search: flatParams.search, limit: flatParams.limit, page: "1" },
    });
  }, [flatParams.limit, flatParams.search, routePrefix, router]);

  const openFilters = useCallback(() => {
    router.push({
      pathname: `${routePrefix}/discovery/filters` as never,
      params: flatParams,
    });
  }, [flatParams, routePrefix, router]);

  const selectCategory = useCallback(
    (slug: string) => {
      router.replace({
        pathname: `${routePrefix}/discovery` as never,
        params: {
          ...flatParams,
          page: "1",
          specialtyCategorySlug: slug,
          specialtySlug: undefined,
        },
      });
    },
    [flatParams, routePrefix, router],
  );

  useEffect(() => {
    if (discoveryOpenedRef.current) return;
    discoveryOpenedRef.current = true;
    trackAnalyticsEvent("discovery_opened", {
      source: routePrefix === "/(patient)" ? "patient_discovery_list" : "public_discovery_list",
      searchApplied: Boolean(flatParams.search),
      activeFilterCount,
    });
  }, [activeFilterCount, flatParams.search, routePrefix]);

  const renderFooter = () => {
    if (practitionersQuery.isFetchingNextPage) {
      return <View style={styles.footerState}><LoadingState message={t("discovery.list.loadingMore")} /></View>;
    }
    if (practitionersQuery.isFetchNextPageError) {
      return (
        <View style={styles.footerState}>
          <Text weight="bold" style={styles.footerTitle}>{t("discovery.list.loadMoreErrorTitle")}</Text>
          <Text color={theme.colors.textSecondary} style={styles.footerDescription}>{t("discovery.list.loadMoreErrorSubtitle")}</Text>
          <Button title={t("retry", "Retry")} onPress={() => practitionersQuery.fetchNextPage()} />
        </View>
      );
    }
    if (practitioners.length > 0 && !practitionersQuery.hasNextPage) {
      return <Text color={theme.colors.textSecondary} style={styles.endOfListText}>{t("discovery.list.endOfList")}</Text>;
    }
    return null;
  };

  return (
    <Screen bg="background">
      <Header showBack={routePrefix === "/(public)"} hideMessages title={t("discovery.list.header")} />

      <View style={styles.searchContainer}>
        <View style={[styles.searchRow, { flexDirection: isRtl ? "row-reverse" : "row" }]}>
          <View style={styles.searchBarWrapper}>
            <SearchBar
              value={searchInput}
              onChangeText={setSearchInput}
              onSubmitEditing={handleSearchSubmit}
              onClear={clearSearch}
              clearAccessibilityLabel={t("discovery.list.clearSearch")}
              placeholder={t("discovery.list.searchPlaceholder")}
              returnKeyType="search"
              accessibilityLabel={t("discovery.list.searchLabel")}
            />
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t("discovery.filters.open")}
            onPress={openFilters}
            style={[styles.filterButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderLight }]}
          >
            <Ionicons name="options-outline" size={21} color={theme.colors.textPrimary} />
            {activeFilterCount > 0 ? (
              <View style={[styles.filterBadge, { backgroundColor: theme.colors.primary }]}>
                <Text color="#ffffff" weight="600" style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>
      </View>

      {categories.length > 0 ? (
        <View style={styles.specialtyEntry}>
          <View style={[styles.entryHeading, { flexDirection: isRtl ? "row-reverse" : "row" }]}>
            <Text weight="bold" style={[styles.entryTitle, { textAlign }]}>{t("discovery.list.specialties")}</Text>
            <TouchableOpacity accessibilityRole="button" onPress={openFilters}>
              <Text color={theme.colors.primary} weight="600">{t("discovery.list.viewAllSpecialties")}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
            {categories.map((category) => {
              const selected = flatParams.specialtyCategorySlug === category.slug;
              return (
                <TouchableOpacity
                  key={category.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={getLocalizedSpecialtyCategoryName(category, i18n.language || "en")}
                  onPress={() => selectCategory(category.slug)}
                  style={[styles.categoryChip, {
                    backgroundColor: selected ? theme.colors.primaryLight : theme.colors.surface,
                    borderColor: selected ? theme.colors.primary : theme.colors.borderLight,
                  }]}
                >
                  <Text color={selected ? theme.colors.primary : theme.colors.textSecondary} weight={selected ? "600" : "normal"}>
                    {getLocalizedSpecialtyCategoryName(category, i18n.language || "en")}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {routePrefix === "/(patient)" && !hasDiscoveryIntent ? (
        <TouchableOpacity accessibilityRole="button" onPress={() => router.push("/(patient)/matching/intro" as never)} style={[styles.matchingPrompt, { borderColor: theme.colors.borderLight, backgroundColor: theme.colors.surfaceSecondary }]}>
          <View style={styles.matchingCopy}>
            <Text weight="600" style={{ textAlign }}>{t("discovery.profile.matchingPrompt.title")}</Text>
            <Text color={theme.colors.textSecondary} style={{ textAlign }}>{t("discovery.profile.matchingPrompt.subtitle")}</Text>
          </View>
          <Ionicons name={chevronForward} size={18} color={theme.colors.primary} />
        </TouchableOpacity>
      ) : null}

      {practitionersQuery.isLoading ? (
        <DiscoveryResultSkeleton />
      ) : practitionersQuery.isError ? (
        <ErrorState fullScreen title={t("discovery.list.errorTitle")} message={t("discovery.list.errorSubtitle")} onRetry={() => practitionersQuery.refetch()} retryText={t("retry", "Retry")} />
      ) : practitioners.length === 0 ? (
        <EmptyState
          title={hasDiscoveryIntent ? t("discovery.list.noResultsTitle") : t("discovery.list.initialTitle")}
          description={hasDiscoveryIntent ? t("discovery.list.noResultsSubtitle") : t("discovery.list.initialSubtitle")}
          icon={<Ionicons name="search-outline" size={42} color={theme.colors.textMuted} />}
          actionLabel={hasDiscoveryIntent ? t("discovery.list.resetFilters") : t("discovery.list.openFilters")}
          onAction={hasDiscoveryIntent ? resetFilters : openFilters}
        />
      ) : (
        <FlatList
          data={practitioners}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <PractitionerCompactCard practitioner={item} routeBase={`${routePrefix}/discovery`} />}
          contentContainerStyle={styles.listContent}
          style={styles.flatList}
          showsVerticalScrollIndicator={false}
          refreshing={practitionersQuery.isRefetching}
          onRefresh={() => practitionersQuery.refetch()}
          onEndReached={() => {
            if (practitionersQuery.hasNextPage && !practitionersQuery.isFetchingNextPage) void practitionersQuery.fetchNextPage();
          }}
          onEndReachedThreshold={0.45}
          ListHeaderComponent={
            <Text color={theme.colors.textSecondary} style={styles.resultsCount}>
              {t("discovery.list.resultsCount", { count: pagination?.totalItems ?? practitioners.length })}
            </Text>
          }
          ListFooterComponent={renderFooter}
        />
      )}
    </Screen>
  );
}

function DiscoveryResultSkeleton() {
  const { theme } = useTheme();
  return (
    <View style={styles.skeletonList}>
      {[1, 2, 3].map((item) => (
        <View key={item} style={[styles.skeletonCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderLight }]}>
          <View style={[styles.skeletonAvatar, { backgroundColor: theme.colors.surfaceTertiary }]} />
          <View style={styles.skeletonText}>
            <View style={[styles.skeletonLine, styles.skeletonLineLong, { backgroundColor: theme.colors.surfaceTertiary }]} />
            <View style={[styles.skeletonLine, { backgroundColor: theme.colors.surfaceTertiary }]} />
            <View style={[styles.skeletonLine, styles.skeletonLineShort, { backgroundColor: theme.colors.surfaceTertiary }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  searchContainer: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8 },
  searchRow: { alignItems: "center", gap: 10 },
  searchBarWrapper: { flex: 1 },
  filterButton: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, justifyContent: "center", alignItems: "center", position: "relative" },
  filterBadge: { position: "absolute", right: -5, top: -5, minWidth: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
  filterBadgeText: { fontSize: 11 },
  specialtyEntry: { paddingHorizontal: 16, paddingBottom: 8 },
  entryHeading: { alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  entryTitle: { fontSize: 16 },
  categoryRow: { gap: 8, paddingVertical: 2 },
  categoryChip: { minHeight: 38, borderWidth: 1, borderRadius: 12, paddingHorizontal: 13, alignItems: "center", justifyContent: "center" },
  matchingPrompt: { marginHorizontal: 16, marginBottom: 8, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, flexDirection: "row", alignItems: "center", gap: 10 },
  matchingCopy: { flex: 1, gap: 2 },
  listContent: { paddingHorizontal: 16, paddingBottom: 136, flexGrow: 1 },
  flatList: { flex: 1 },
  resultsCount: { fontSize: 14, marginBottom: 10, marginTop: 2 },
  footerState: { paddingTop: 8, paddingBottom: 20 },
  footerTitle: { fontSize: 16, marginBottom: 6, textAlign: "center" },
  footerDescription: { fontSize: 14, lineHeight: 21, textAlign: "center", marginBottom: 14 },
  endOfListText: { fontSize: 14, textAlign: "center", paddingVertical: 14 },
  skeletonList: { paddingHorizontal: 16, gap: 8 },
  skeletonCard: { minHeight: 126, borderRadius: 14, borderWidth: 1, padding: 12, flexDirection: "row", gap: 10 },
  skeletonAvatar: { width: 44, height: 44, borderRadius: 22 },
  skeletonText: { flex: 1, gap: 9, paddingTop: 4 },
  skeletonLine: { height: 11, borderRadius: 6, width: "72%" },
  skeletonLineLong: { width: "86%" },
  skeletonLineShort: { width: "48%" },
});
