import React, { useMemo, useState, useEffect } from "react";
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
  Text,
} from "../../../src/components/ui";
import { TherapistCard } from "../../../src/features/patient/discovery/components/TherapistCard";
import { useGetPublicPractitioners } from "../../../src/features/patient/discovery/api";
import { useTheme } from "../../../src/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { ListPublicPractitionersFilters } from "../../../src/features/patient/discovery/types";
import { useTranslation } from "react-i18next";

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

  const flatParams = useMemo(() => {
    const output: Record<string, string> = {};
    Object.entries(params).forEach(([key, value]) => {
      output[key] = Array.isArray(value) ? value[0] : value;
    });
    return output;
  }, [params]);

  const filters = useMemo<ListPublicPractitionersFilters>(
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
      page: parseNumber(flatParams.page) || 1,
      limit: parseNumber(flatParams.limit) || 20,
    }),
    [flatParams],
  );

  const [searchInput, setSearchInput] = useState(flatParams.search || "");

  useEffect(() => {
    setSearchInput(flatParams.search || "");
  }, [flatParams.search]);

  const { data, isLoading, isError, refetch } =
    useGetPublicPractitioners(filters);

  const handleSearchSubmit = () => {
    router.replace({
      pathname: "/(patient)/discovery",
      params: {
        ...flatParams,
        page: "1",
        search: searchInput.trim() || undefined,
      },
    });
  };

  const clearSearch = () => {
    setSearchInput("");
    router.replace({
      pathname: "/(patient)/discovery",
      params: {
        ...flatParams,
        page: "1",
        search: undefined,
      },
    });
  };

  const activeFilterCount = useMemo(() => {
    const keys = [
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

  return (
    <Screen bg="background">
      <Header
        showBack
        onBack={() => router.back()}
        title={t("discovery.list.header")}
      />

      <View style={styles.searchContainer}>
        <View style={styles.introBlock}>
          <Text weight="bold" style={styles.introTitle}>
            {t("discovery.list.header")}
          </Text>
          <Text color={theme.colors.textSecondary} style={styles.introSubtitle}>
            {t(
              "discovery.list.introSubtitle",
              "Find a specialist who fits your goals and preferences.",
            )}
          </Text>
        </View>

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

      {isLoading ? (
        <LoadingState fullScreen message={t("discovery.list.loading")} />
      ) : isError ? (
        <ErrorState fullScreen onRetry={refetch} />
      ) : data?.data.items.length === 0 ? (
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
          actionLabel={t("discovery.list.clearSearch")}
          onAction={clearSearch}
        />
      ) : (
        <FlatList
          data={data?.data.items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <TherapistCard practitioner={item} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text
              color={theme.colors.textSecondary}
              style={styles.resultsCount}
            >
              {t("discovery.list.resultsCount", {
                count: data?.data.pagination.totalItems ?? 0,
              })}
            </Text>
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 14,
  },
  introBlock: {
    marginBottom: 14,
  },
  introTitle: {
    fontSize: 40,
    lineHeight: 44,
    marginBottom: 6,
  },
  introSubtitle: {
    fontSize: 15,
    lineHeight: 22,
  },
  searchPanel: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 10,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  searchBarWrapper: {
    flex: 1,
  },
  searchBarWrapperLtr: {
    marginRight: 12,
  },
  searchBarWrapperRtl: {
    marginLeft: 12,
  },
  filterButton: {
    width: 50,
    height: 50,
    borderRadius: 12,
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
    paddingHorizontal: 20,
    paddingBottom: 128,
  },
  resultsCount: {
    fontSize: 14,
    marginBottom: 14,
    marginTop: 2,
  },
});
