import React, { useMemo, useState } from "react";
import { FlatList, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import {
  Card,
  FilterChip,
  ListPageScaffold,
  StatusChip,
  SectionHeader,
  Text,
  Button,
  formatDate,
} from "../../../components/ui";
import { useTheme } from "../../../providers/ThemeProvider";
import { useArticleCategories, useInfiniteArticles } from "../hooks";
import type { ArticleListItem } from "../types";

type ArticleListScreenProps = {
  locale?: string;
};

export function ArticleListScreen({ locale }: ArticleListScreenProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const { i18n, t } = useTranslation();
  const resolvedLocale = locale ?? i18n.language;
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<
    string | null
  >(null);
  const articlesQuery = useInfiniteArticles({
    limit: 12,
    locale: resolvedLocale as "ar" | "en",
    categorySlug: selectedCategorySlug ?? undefined,
  });
  const categoriesQuery = useArticleCategories({
    page: 1,
    limit: 20,
    locale: resolvedLocale as "ar" | "en",
  });

  const items = useMemo(
    () => articlesQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [articlesQuery.data?.pages],
  );
  const latestPage = articlesQuery.data?.pages.at(-1);
  const isEmpty =
    !articlesQuery.isLoading && !articlesQuery.isError && items.length === 0;
  const categories = categoriesQuery.data?.items ?? [];
  const hasNextPage = articlesQuery.hasNextPage ?? false;

  const categoryChips = [
    { id: "all", title: "All categories", slug: null as string | null },
    ...categories.map((category) => ({
      id: category.id,
      title: category.title,
      slug: category.slug,
    })),
  ];

  return (
      <ListPageScaffold
      title={t("articlesMobile.header", "Articles")}
      showBack
      loading={articlesQuery.isLoading}
      loadingMessage={t("articlesMobile.loading", "Loading articles...")}
      error={articlesQuery.isError}
      errorMessage={t(
        "articlesMobile.error",
        "We could not load articles right now. Please try again.",
      )}
      onRetry={() => articlesQuery.refetch()}
      retryText={t("retry", "Retry")}
      empty={isEmpty}
      emptyTitle={
        selectedCategorySlug
          ? t(
              "articlesMobile.emptyCategoryTitle",
              "No articles match this category",
            )
          : t("articlesMobile.emptyTitle", "No articles found")
      }
      emptyDescription={
        selectedCategorySlug
          ? t(
              "articlesMobile.emptyCategoryDescription",
              "Clear the filter to see all published articles again.",
            )
          : t(
              "articlesMobile.emptyDescription",
              "There are no published articles available yet.",
            )
      }
      emptyActionLabel={
        selectedCategorySlug
          ? t("articlesMobile.clearFilter", "Clear filter")
          : undefined
      }
      onEmptyAction={selectedCategorySlug ? () => setSelectedCategorySlug(null) : undefined}
      children={
        <View style={styles.contentWrap}>
          <SectionHeader
            title={t("articlesMobile.categoriesHeader", "Categories")}
            subtitle={t(
              "articlesMobile.categoriesSubtitle",
              "Tap one category to filter articles",
            )}
            action={
              selectedCategorySlug ? (
                <FilterChip
                  label={t("articlesMobile.clearFilter", "Clear filter")}
                  selected={false}
                  onPress={() => setSelectedCategorySlug(null)}
                />
              ) : null
            }
          />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {categoryChips.map((category) => (
              <FilterChip
                key={category.id}
                label={category.title}
                selected={category.slug === selectedCategorySlug}
                onPress={() =>
                  setSelectedCategorySlug((current) =>
                    current === category.slug ? null : category.slug,
                  )
                }
              />
            ))}
          </ScrollView>

          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            extraData={selectedCategorySlug}
            renderItem={({ item }) => (
              <ArticleCard
                article={item}
                locale={resolvedLocale}
                onPress={() =>
                  router.push(
                    {
                      pathname: "/(patient)/articles/[slug]",
                      params: { slug: item.slug, locale: resolvedLocale },
                    } as never,
                  )
                }
              />
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            style={styles.list}
            refreshing={articlesQuery.isRefetching}
            onRefresh={() => articlesQuery.refetch()}
            onEndReached={() => {
              if (
                hasNextPage &&
                !articlesQuery.isFetchingNextPage &&
                !articlesQuery.isLoading &&
                !articlesQuery.isError
              ) {
                articlesQuery.fetchNextPage();
              }
            }}
            onEndReachedThreshold={0.45}
            ListHeaderComponent={
              <Text color={theme.colors.textSecondary} style={styles.resultsCount}>
                {latestPage
                  ? t("articlesMobile.resultsCount", {
                      shown: items.length,
                      total: latestPage.pagination.totalItems,
                    })
                  : " "}
              </Text>
            }
            ListFooterComponent={
              articlesQuery.isFetchingNextPage ? (
                <View style={styles.footerState}>
                  <Text color={theme.colors.textSecondary} style={styles.footerText}>
                    {t("articlesMobile.loadingMore", "Loading more articles...")}
                  </Text>
                </View>
              ) : articlesQuery.isFetchNextPageError ? (
                <View style={styles.footerState}>
                  <Text weight="bold" style={styles.footerTitle} color={theme.colors.textPrimary}>
                    {t(
                      "articlesMobile.loadMoreErrorTitle",
                      "Could not load more articles",
                    )}
                  </Text>
                  <Text color={theme.colors.textSecondary} style={styles.footerText}>
                    {t(
                      "articlesMobile.loadMoreErrorSubtitle",
                      "Try again to load the next set of results.",
                    )}
                  </Text>
                  <Button
                    title={t("retry", "Retry")}
                    onPress={() => articlesQuery.fetchNextPage()}
                  />
                </View>
              ) : hasNextPage ? null : items.length > 0 ? (
                <View style={styles.footerState}>
                  <Text color={theme.colors.textSecondary} style={styles.footerText}>
                    {t(
                      "articlesMobile.endOfList",
                      "You have reached the end of the list.",
                    )}
                  </Text>
                </View>
              ) : null
            }
          />
        </View>
      }
    />
  );
}

function ArticleCard({
  article,
  locale,
  onPress,
}: {
  article: ArticleListItem;
  locale: string;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const categoryLabel = article.category?.title?.trim();
  const publishedLabel = article.publishedAt
    ? formatDate(article.publishedAt, locale)
    : null;

  return (
    <Card
      variant="elevated"
      padding="lg"
      onPress={onPress}
      style={[styles.card, { borderColor: theme.colors.borderLight }]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleBlock}>
          <Text weight="bold" style={styles.title} numberOfLines={2}>
            {article.title}
          </Text>
          {categoryLabel ? (
            <View style={styles.categoryRow}>
              <StatusChip label={categoryLabel} tone="info" />
            </View>
          ) : null}
        </View>
        <Ionicons
          name="chevron-forward"
          size={18}
          color={theme.colors.textMuted}
        />
      </View>

      {article.excerpt ? (
        <Text
          color={theme.colors.textSecondary}
          style={styles.excerpt}
          numberOfLines={3}
        >
          {article.excerpt}
        </Text>
      ) : null}

      {publishedLabel ? (
        <Text color={theme.colors.textMuted} style={styles.date}>
          {publishedLabel}
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  contentWrap: {
    flex: 1,
  },
  list: {
    flex: 1,
    marginTop: 16,
  },
  listContent: {
    paddingBottom: 28,
  },
  chipRow: {
    paddingBottom: 4,
    paddingTop: 8,
    paddingHorizontal: 2,
  },
  separator: {
    height: 12,
  },
  card: {
    marginHorizontal: 0,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  cardTitleBlock: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
  },
  categoryRow: {
    marginTop: 10,
  },
  excerpt: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: 12,
  },
  date: {
    fontSize: 12,
    marginTop: 12,
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
  footerText: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginBottom: 14,
  },
});

