import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  I18nManager,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  Screen,
  Header,
  SearchBar,
  LoadingState,
  ErrorState,
  EmptyState,
  Button,
  Text,
} from "../../../src/components/ui";
import { PractitionerCompactCard } from "../../../src/features/patient/discovery/components/PractitionerCompactCard";
import {
  useGetPublicPractitionersInfinite,
} from "../../../src/features/patient/discovery/api";
import { useTheme } from "../../../src/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { ListPublicPractitionersFilters } from "../../../src/features/patient/discovery/types";
import { useTranslation } from "react-i18next";
import { trackAnalyticsEvent } from "../../../src/lib/analytics";

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

function parseBoolean(value: string | undefined): boolean | undefined {
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return undefined;
}

function parseNumber(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parsePractitionerKind(value: string | undefined) {
  if (value === "doctor" || value === "therapist") {
    return value;
  }
  return undefined;
}

function parseDuration(value: string | undefined) {
  if (value === "30" || value === "60") {
    return Number(value) as 30 | 60;
  }
  return undefined;
}

function parseSort(value: string | undefined) {
  if (value === "recommended" || value === "rating" || value === "experience") {
    return value;
  }
  return undefined;
}

export default function DiscoveryListScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const isRTL = I18nManager.isRTL;
  const discoveryOpenedRef = useRef(false);

  const flatParams = useMemo(() => {
    const output: Record<string, string> = {};
    Object.entries(params).forEach(([key, value]) => {
      output[key] = Array.isArray(value) ? value[0] : value;
    });
    return output;
  }, [params]);

  const pageSize = parseNumber(flatParams.limit) || 12;

  const filters = useMemo<Omit<ListPublicPractitionersFilters, "page">>(
    () => ({
      search: flatParams.search || undefined,
      specialtySlug: flatParams.specialtySlug || undefined,
      language: flatParams.language || undefined,
      country: flatParams.country || undefined,
      practitionerKind: parsePractitionerKind(flatParams.practitionerKind),
      gender: (flatParams.gender as "male" | "female") || undefined,
      duration: parseDuration(flatParams.duration),
      onlineNow: parseBoolean(flatParams.onlineNow),
      availableToday: parseBoolean(flatParams.availableToday),
      availableThisWeek: parseBoolean(flatParams.availableThisWeek),
      acceptsCoupon: parseBoolean(flatParams.acceptsCoupon),
      acceptsPackage: parseBoolean(flatParams.acceptsPackage),
      minRating: parseNumber(flatParams.minRating),
      minSessionFee: parseNumber(flatParams.minSessionFee),
      maxSessionFee: parseNumber(flatParams.maxSessionFee),
      sort: parseSort(flatParams.sort),
      limit: pageSize,
    }),
    [flatParams, pageSize],
  );

  const [searchInput, setSearchInput] = useState(flatParams.search || "");
  const debouncedSearch = useDebounce(searchInput, 400);
  const initialSearchDone = useRef(false);

  useEffect(() => {
    setSearchInput(flatParams.search || "");
  }, [flatParams.search]);

  useEffect(() => {
    if (!initialSearchDone.current) {
      initialSearchDone.current = true;
      return;
    }
    if (debouncedSearch === flatParams.search) return;
    router.replace({
      pathname: "/(patient)/discovery",
      params: { ...flatParams, page: "1", search: debouncedSearch || undefined },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const practitionersQuery = useGetPublicPractitionersInfinite({
    ...filters,
    search: debouncedSearch || undefined,
  });
  const practitioners = useMemo(
    () =>
      practitionersQuery.data?.pages.flatMap((page) => page.data.items) ?? [],
    [practitionersQuery.data?.pages],
  );
  const pagination = practitionersQuery.data?.pages.at(-1)?.data.pagination;

  const handleSearchSubmit = useCallback(() => {
    if (searchInput.trim() === (flatParams.search || "")) return;
    router.replace({
      pathname: "/(patient)/discovery",
      params: {
        ...flatParams,
        page: "1",
        search: searchInput.trim() || undefined,
      },
    });
  }, [flatParams, searchInput, router]);

  const clearSearch = useCallback(() => {
    setSearchInput("");
  }, []);

  const activeFilterCount = useMemo(() => {
    const keys = [
      "search",
      "specialtySlug",
      "language",
      "country",
      "practitionerKind",
      "gender",
      "duration",
      "onlineNow",
      "availableToday",
      "availableThisWeek",
      "acceptsCoupon",
      "acceptsPackage",
      "minRating",
      "minSessionFee",
      "maxSessionFee",
      "sort",
    ];
    return keys.filter((key) => flatParams[key] !== undefined).length;
  }, [flatParams]);

  const hasAnyFilters = activeFilterCount > 0;
  const resetFilters = () => {
    setSearchInput("");
    router.replace({
      pathname: "/(patient)/discovery",
      params: {
        page: "1",
        limit: flatParams.limit,
      },
    });
  };

  const openFilters = () => {
    router.push({
      pathname: "/(patient)/discovery/filters",
      params: flatParams,
    });
  };

  useEffect(() => {
    if (discoveryOpenedRef.current) {
      return;
    }

    discoveryOpenedRef.current = true;
    trackAnalyticsEvent("discovery_opened", {
      source: "patient_discovery_list",
      searchApplied: Boolean(flatParams.search),
      activeFilterCount,
    sort: flatParams.sort || "recommended",
  });
  }, [activeFilterCount, flatParams.search, flatParams.sort]);

  const renderListFooter = () => {
    if (practitionersQuery.isFetchingNextPage) {
      return (
        <View style={styles.footerState}>
          <LoadingState message={t("discovery.list.loadingMore")} />
        </View>
      );
    }

    if (practitionersQuery.isFetchNextPageError) {
      return (
        <View style={styles.footerState}>
          <Text
            weight="bold"
            style={styles.footerTitle}
            color={theme.colors.textPrimary}
          >
            {t("discovery.list.loadMoreErrorTitle")}
          </Text>
          <Text
            color={theme.colors.textSecondary}
            style={styles.footerDescription}
          >
            {t("discovery.list.loadMoreErrorSubtitle")}
          </Text>
          <Button
            title={t("retry", "Retry")}
            onPress={() => practitionersQuery.fetchNextPage()}
          />
        </View>
      );
    }

    if (practitioners.length > 0 && !practitionersQuery.hasNextPage) {
      return (
        <View style={styles.footerState}>
          <Text
            color={theme.colors.textSecondary}
            style={styles.endOfListText}
          >
            {t("discovery.list.endOfList")}
          </Text>
        </View>
      );
    }

    return null;
  };

  return (
    <Screen bg="background">
      <Header
        showBack
        title={t("discovery.list.header")}
      />

      <View style={styles.searchContainer}>
        <View
          style={[
            styles.searchPanel,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.borderLight,
            },
          ]}
        >
          <View style={styles.searchRow}>
            <View
              style={[
                styles.searchBarWrapper,
                isRTL ? styles.searchBarWrapperRtl : styles.searchBarWrapperLtr,
              ]}
            >
              <SearchBar
                value={searchInput}
                onChangeText={setSearchInput}
                onSubmitEditing={handleSearchSubmit}
                onClear={clearSearch}
                placeholder={t("discovery.list.searchPlaceholder")}
                returnKeyType="search"
              />
            </View>
            <TouchableOpacity
              style={[
                styles.filterButton,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.borderLight,
                },
              ]}
              onPress={() =>
                router.push({
                  pathname: "/(patient)/discovery/filters",
                  params: flatParams,
                })
              }
            >
              <Ionicons
                name="options-outline"
                size={24}
                color={theme.colors.textPrimary}
              />
              {activeFilterCount > 0 ? (
                <View
                  style={[
                    styles.filterBadge,
                    { backgroundColor: theme.colors.primary },
                  ]}
                >
                  <Text
                    color="#ffffff"
                    weight="600"
                    style={styles.filterBadgeText}
                  >
                    {activeFilterCount}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {practitionersQuery.isLoading ? (
        <LoadingState fullScreen message={t("discovery.list.loading")} />
      ) : practitionersQuery.isError ? (
        <ErrorState
          fullScreen
          onRetry={() => practitionersQuery.refetch()}
          retryText={t("retry", "Retry")}
        />
      ) : practitioners.length === 0 ? (
        <EmptyState
          title={t("discovery.list.emptyTitle")}
          description={t("discovery.list.emptySubtitle")}
          icon={
            <Ionicons
              name="search-outline"
              size={48}
              color={theme.colors.textMuted}
            />
          }
          actionLabel={
            hasAnyFilters
              ? t("discovery.list.resetFilters")
              : t("discovery.list.openFilters")
          }
          onAction={hasAnyFilters ? resetFilters : openFilters}
        />
      ) : (
        <FlatList
          data={practitioners}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <PractitionerCompactCard practitioner={item} />}
          contentContainerStyle={styles.listContent}
          style={styles.flatList}
          showsVerticalScrollIndicator={false}
          refreshing={practitionersQuery.isRefetching}
          onRefresh={() => practitionersQuery.refetch()}
          onEndReached={() => {
            if (
              practitionersQuery.hasNextPage &&
              !practitionersQuery.isFetchingNextPage &&
              !practitionersQuery.isLoading &&
              !practitionersQuery.isError
            ) {
              practitionersQuery.fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.45}
          ListHeaderComponent={
            pagination != null && pagination.totalItems != null ? (
              <Text color={theme.colors.textSecondary} style={styles.resultsCount}>
                {t("discovery.list.resultsCount", {
                  count: pagination.totalItems,
                })}
              </Text>
            ) : (
              <Text color={theme.colors.textSecondary} style={styles.resultsCount}>
                {t("discovery.list.resultsCountShown", {
                  shown: practitioners.length,
                  total: pagination?.totalItems ?? practitioners.length,
                })}
              </Text>
            )
          }
          ListFooterComponent={renderListFooter}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  searchPanel: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 8,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  searchBarWrapper: {
    flex: 1,
  },
  searchBarWrapperLtr: {
    marginRight: 10,
  },
  searchBarWrapperRtl: {
    marginLeft: 10,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  filterBadge: {
    position: "absolute",
    right: -5,
    top: -5,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  filterBadgeText: {
    fontSize: 11,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 136,
    flexGrow: 1,
  },
  flatList: {
    flex: 1,
  },
  resultsCount: {
    fontSize: 14,
    marginBottom: 14,
    marginTop: 2,
  },
  footerState: {
    paddingTop: 8,
    paddingBottom: 20,
  },
  footerTitle: {
    fontSize: 16,
    marginBottom: 6,
    textAlign: "center",
  },
  footerDescription: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginBottom: 14,
  },
  endOfListText: {
    fontSize: 14,
    textAlign: "center",
  },
});

