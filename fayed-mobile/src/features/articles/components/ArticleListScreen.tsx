import React, { useState } from "react";
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
  formatDate,
} from "../../../components/ui";
import { useTheme } from "../../../providers/ThemeProvider";
import { useArticleCategories, useArticles } from "../hooks";
import type { ArticleListItem } from "../types";

type ArticleListScreenProps = {
  locale?: string;
};

export function ArticleListScreen({ locale }: ArticleListScreenProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const { i18n } = useTranslation();
  const resolvedLocale = locale ?? i18n.language;
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string | null>(null);
  const articlesQuery = useArticles({
    page: 1,
    limit: 20,
    locale: resolvedLocale as "ar" | "en",
    categorySlug: selectedCategorySlug ?? undefined,
  });
  const categoriesQuery = useArticleCategories({
    page: 1,
    limit: 20,
    locale: resolvedLocale as "ar" | "en",
  });

  const items = articlesQuery.data?.items ?? [];
  const isEmpty = !articlesQuery.isLoading && !articlesQuery.isError && items.length === 0;
  const categories = categoriesQuery.data?.items ?? [];

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
      title="Articles"
      showBack
      onBack={() => router.back()}
      loading={articlesQuery.isLoading}
      loadingMessage="Loading articles..."
      error={articlesQuery.isError}
      errorMessage="We could not load articles right now. Please try again."
      onRetry={() => articlesQuery.refetch()}
      retryText="Try again"
      empty={isEmpty}
      emptyTitle={selectedCategorySlug ? "No articles match this category" : "No articles found"}
      emptyDescription={
        selectedCategorySlug
          ? "Clear the filter to see all published articles again."
          : "There are no published articles available yet."
      }
      emptyActionLabel={selectedCategorySlug ? "Clear filter" : undefined}
      onEmptyAction={selectedCategorySlug ? () => setSelectedCategorySlug(null) : undefined}
      children={
        <View style={styles.contentWrap}>
          <SectionHeader
            title="Categories"
            subtitle="Tap one category to filter articles"
            action={
              selectedCategorySlug ? (
                <FilterChip
                  label="Clear"
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
});
