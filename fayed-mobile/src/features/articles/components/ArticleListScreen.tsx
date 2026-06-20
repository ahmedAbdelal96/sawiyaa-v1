import React, { useCallback, useMemo, useState } from "react";
import { FlatList, Image, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import {
  Card,
  FilterChip,
  Header,
  Screen,
  Text,
  formatDate,
} from "../../../components/ui";
import { useTheme } from "../../../providers/ThemeProvider";
import { useAppDirection } from "../../../i18n/direction";
import {
  MOBILE_CARD_RADIUS,
  MOBILE_CARD_PADDING,
  MOBILE_SECTION_GAP,
  MOBILE_HORIZONTAL_PADDING,
} from "../../../components/mobile-shell";
import { useArticleCategories, useInfiniteArticles } from "../hooks";
import { apiClient } from "../../../lib/api";
import type { ArticleListItem } from "../types";

type ArticleListScreenProps = {
  locale?: string;
};

function resolveArticleImageUri(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const base = apiClient.defaults.baseURL ?? "";
  const cleanBase = base.replace(/\/+$/, "");
  const path = url.startsWith("/") ? url : `/${url}`;
  return `${cleanBase}${path}`;
}

// ─── Featured card — no cover fallback ──────────────────────────────────────
function FeaturedCardNoCover({
  article,
  locale,
  onPress,
}: {
  article: ArticleListItem;
  locale: string;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const { isRtl, rowDirection, textAlign, chevronForward } = useAppDirection();
  const publishedLabel = article.publishedAt
    ? formatDate(article.publishedAt, locale)
    : null;

  return (
    <Card variant="elevated" padding="none" onPress={onPress} style={styles.featuredCardNoCover}>
      <View style={[styles.featuredNoCoverRow, { flexDirection: rowDirection }]}>
        {/* Compact icon badge */}
        <View style={[styles.featuredNoCoverIcon, { backgroundColor: theme.colors.primaryLight }]}>
          <Ionicons name="book-outline" size={24} color={theme.colors.primary} />
        </View>

        {/* Text content */}
        <View style={[styles.featuredNoCoverBody, { padding: MOBILE_CARD_PADDING }]}>
          {article.category ? (
            <View style={{ flexDirection: rowDirection, gap: 8 }}>
              <View
                style={[
                  styles.categoryChip,
                  { backgroundColor: theme.colors.primaryLight },
                ]}
              >
                <Text style={[styles.categoryChipText, { color: theme.colors.primary }]}>
                  {article.category.title}
                </Text>
              </View>
            </View>
          ) : null}
          
          <Text weight="700" style={[styles.featuredTitle, { textAlign, color: theme.colors.textPrimary }]} numberOfLines={2}>
            {article.title}
          </Text>
          
          {article.excerpt ? (
            <Text
              color={theme.colors.textSecondary}
              style={[styles.featuredExcerpt, { textAlign }]}
              numberOfLines={2}
            >
              {article.excerpt}
            </Text>
          ) : null}
          
          <View style={[styles.featuredFooter, { flexDirection: rowDirection }]}>
            {publishedLabel ? (
              <Text color={theme.colors.textMuted} style={styles.featuredDate}>
                {publishedLabel}
              </Text>
            ) : <View />}
            
            <View style={{ flexDirection: rowDirection, alignItems: "center", gap: 4 }}>
              <Text weight="600" style={[styles.ctaText, { color: theme.colors.primary }]}>
                {isRtl ? "اقرأ المقال" : "Read article"}
              </Text>
              <Ionicons
                name={chevronForward}
                size={14}
                color={theme.colors.primary}
              />
            </View>
          </View>
        </View>
      </View>
    </Card>
  );
}

// ─── Featured card with cover image ──────────────────────────────────────────
function FeaturedCardWithImage({
  article,
  locale,
  onPress,
}: {
  article: ArticleListItem;
  locale: string;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const { isRtl, rowDirection, textAlign, chevronForward } = useAppDirection();
  const [imageError, setImageError] = useState(false);

  const publishedLabel = article.publishedAt
    ? formatDate(article.publishedAt, locale)
    : null;

  const resolvedUri = resolveArticleImageUri(article.coverImageUrl);
  const isAbsoluteUrl = resolvedUri ? /^https?:\/\//i.test(resolvedUri) : false;

  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  if (imageError || !isAbsoluteUrl) {
    return (
      <FeaturedCardNoCover
        article={article}
        locale={locale}
        onPress={onPress}
      />
    );
  }

  return (
    <Card variant="elevated" padding="none" onPress={onPress} style={styles.featuredCard}>
      <Image
        source={{ uri: resolvedUri ?? undefined }}
        alt={article.title}
        style={styles.featuredCoverImage}
        resizeMode="cover"
        onError={handleImageError}
      />
      <View style={[styles.featuredImageBody, { padding: MOBILE_CARD_PADDING }]}>
        {article.category ? (
          <View style={{ flexDirection: rowDirection, gap: 8 }}>
            <View
              style={[
                styles.categoryChip,
                { backgroundColor: theme.colors.primaryLight },
              ]}
            >
              <Text
                style={[styles.categoryChipText, { color: theme.colors.primary }]}
              >
                {article.category.title}
              </Text>
            </View>
          </View>
        ) : null}
        
        <Text weight="700" style={[styles.featuredTitle, { textAlign, color: theme.colors.textPrimary }]} numberOfLines={2}>
          {article.title}
        </Text>
        
        {article.excerpt ? (
          <Text
            color={theme.colors.textSecondary}
            style={[styles.featuredExcerpt, { textAlign }]}
            numberOfLines={2}
          >
            {article.excerpt}
          </Text>
        ) : null}
        
        <View style={[styles.featuredFooter, { flexDirection: rowDirection }]}>
          {publishedLabel ? (
            <Text color={theme.colors.textMuted} style={styles.featuredDate}>
              {publishedLabel}
            </Text>
          ) : <View />}
          
          <View style={{ flexDirection: rowDirection, alignItems: "center", gap: 4 }}>
            <Text weight="600" style={[styles.ctaText, { color: theme.colors.primary }]}>
              {isRtl ? "اقرأ المقال" : "Read article"}
            </Text>
            <Ionicons
              name={chevronForward}
              size={14}
              color={theme.colors.primary}
            />
          </View>
        </View>
      </View>
    </Card>
  );
}

// ─── Article List Row ────────────────────────────────────────────────────────
function ArticleListRow({
  article,
  locale,
  onPress,
}: {
  article: ArticleListItem;
  locale: string;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const { rowDirection, textAlign } = useAppDirection();
  const [thumbError, setThumbError] = useState(false);
  const publishedLabel = article.publishedAt
    ? formatDate(article.publishedAt, locale)
    : null;
  const authorLabel = article.trust?.authorDisplayName || null;

  const resolvedThumbUri = resolveArticleImageUri(article.coverImageUrl);
  const showImage = article.coverImageUrl && resolvedThumbUri && /^https?:\/\//i.test(resolvedThumbUri) && !thumbError;

  const thumbBlock = (
    <View style={styles.listRowThumbArea}>
      {showImage ? (
        <Image
          source={{ uri: resolvedThumbUri }}
          alt={article.title}
          style={styles.listRowThumb}
          resizeMode="cover"
          onError={() => setThumbError(true)}
        />
      ) : (
        <View
          style={[
            styles.listRowThumbPlaceholder,
            { backgroundColor: theme.colors.primaryLight },
          ]}
        >
          <Ionicons
            name="document-text-outline"
            size={20}
            color={theme.colors.primary}
          />
        </View>
      )}
    </View>
  );

  const textBlock = (
    <View style={styles.listRowTextBlock}>
      <View style={{ flexDirection: rowDirection, alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        {article.category ? (
          <View
            style={[
              styles.categoryChip,
              { backgroundColor: theme.colors.primaryLight },
            ]}
          >
            <Text
              style={[styles.categoryChipTextSm, { color: theme.colors.primary }]}
            >
              {article.category.title}
            </Text>
          </View>
        ) : null}
        {publishedLabel ? (
          <Text color={theme.colors.textMuted} style={styles.listRowDate}>
            {publishedLabel}
          </Text>
        ) : null}
        {authorLabel ? (
          <View style={{ flexDirection: rowDirection, alignItems: "center", gap: 4 }}>
            <Text color={theme.colors.textMuted} style={styles.listRowDate}>
              •
            </Text>
            <Text color={theme.colors.textMuted} style={styles.listRowDate}>
              {authorLabel}
            </Text>
          </View>
        ) : null}
      </View>
      
      <Text weight="600" style={[styles.listRowTitle, { textAlign, color: theme.colors.textPrimary }]} numberOfLines={2}>
        {article.title}
      </Text>
      
      {article.excerpt ? (
        <Text
          color={theme.colors.textSecondary}
          style={[styles.listRowExcerpt, { textAlign }]}
          numberOfLines={2}
        >
          {article.excerpt}
        </Text>
      ) : null}
    </View>
  );

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[
        styles.listRowWrapper,
        {
          backgroundColor: theme.colors.surfaceRaised,
          borderColor: theme.colors.border,
          shadowColor: theme.colors.primary,
        },
      ]}
    >
      <View style={[styles.listRowContent, { flexDirection: rowDirection }]}>
        {thumbBlock}
        {textBlock}
      </View>
    </TouchableOpacity>
  );
}

// ─── List Header ─────────────────────────────────────────────────────────────
function ListHeader({
  isRTL,
  categoryChips,
  selectedCategorySlug,
  onCategoryPress,
  categoriesQuery,
  featuredArticle,
  resolvedLocale,
  onFeaturedPress,
}: {
  isRTL: boolean;
  categoryChips: { id: string; title: string; slug: string | null }[];
  selectedCategorySlug: string | null;
  onCategoryPress: (slug: string | null) => void;
  categoriesQuery: { isLoading: boolean };
  featuredArticle: ArticleListItem | null;
  resolvedLocale: string;
  onFeaturedPress: () => void;
}) {
  return (
    <View style={styles.listHeader}>
      {/* Category filter pills - Horizontal Scrollable */}
      {!categoriesQuery.isLoading && categoryChips.length > 0 && (
        <View style={styles.chipScrollWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[
              styles.chipRow,
              { flexDirection: isRTL ? "row-reverse" : "row" },
            ]}
          >
            {categoryChips.map((cat) => (
              <FilterChip
                key={cat.id}
                label={cat.title}
                selected={cat.slug === selectedCategorySlug}
                onPress={() => onCategoryPress(cat.slug)}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Featured article */}
      {featuredArticle ? (
        <View style={styles.featuredSection}>
          {featuredArticle.coverImageUrl ? (
            <FeaturedCardWithImage
              article={featuredArticle}
              locale={resolvedLocale}
              onPress={onFeaturedPress}
            />
          ) : (
            <FeaturedCardNoCover
              article={featuredArticle}
              locale={resolvedLocale}
              onPress={onFeaturedPress}
            />
          )}
        </View>
      ) : null}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export function ArticleListScreen({ locale }: ArticleListScreenProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const { i18n, t } = useTranslation();
  const resolvedLocale = locale ?? i18n.language;
  const isRTL = i18n.language?.startsWith("ar") ?? false;
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string | null>(null);

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
  const categories = categoriesQuery.data?.items ?? [];
  const hasNextPage = articlesQuery.hasNextPage ?? false;

  const allCategoriesLabel = isRTL ? "كل المقالات" : "All articles";

  const categoryChips = [
    { id: "all", title: allCategoriesLabel, slug: null as string | null },
    ...categories.map((cat) => ({
      id: cat.id,
      title: cat.title,
      slug: cat.slug,
    })),
  ];

  // Exclude featured article from the subsequent list items to avoid duplication
  const featuredArticle = items.length > 0 ? items[0] : null;
  const listItems = featuredArticle ? items.slice(1) : items;

  const endOfListLabel = isRTL
    ? "وصلت إلى نهاية المقالات."
    : "You've reached the end of the articles.";

  const loadingMoreLabel = isRTL
    ? "جارٍ تحميل المزيد..."
    : "Loading more...";

  const handleCategoryPress = (slug: string | null) => {
    setSelectedCategorySlug((current) =>
      current === slug ? null : slug,
    );
  };

  const handleFeaturedPress = () => {
    if (!featuredArticle) return;
    router.push({
      pathname: "/(patient)/articles/[slug]",
      params: { slug: featuredArticle.slug, locale: resolvedLocale },
    } as never);
  };

  const renderItem = ({ item }: { item: ArticleListItem }) => (
    <View style={styles.listItemRow}>
      <ArticleListRow
        article={item}
        locale={resolvedLocale}
        onPress={() =>
          router.push({
            pathname: "/(patient)/articles/[slug]",
            params: { slug: item.slug, locale: resolvedLocale },
          } as never)
        }
      />
    </View>
  );

  const renderFooter = () => {
    if (!hasNextPage || listItems.length === 0) return null;
    if (articlesQuery.isFetchingNextPage) {
      return (
        <View style={styles.paginationFooter}>
          <Text color={theme.colors.textMuted} style={styles.loadingMoreText}>
            {loadingMoreLabel}
          </Text>
        </View>
      );
    }
    return null;
  };

  const renderEndOfList = () => {
    if (!hasNextPage && listItems.length > 0) {
      return (
        <View style={styles.endState}>
          <Text color={theme.colors.textMuted} style={styles.endText}>
            {endOfListLabel}
          </Text>
        </View>
      );
    }
    return null;
  };

  const renderEmpty = () => {
    if (articlesQuery.isLoading) return null;
    return (
      <View style={styles.emptyState}>
        <Ionicons
          name="document-text-outline"
          size={44}
          color={theme.colors.textMuted}
        />
        <Text weight="600" style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
          {t("articlesMobile.emptyTitle", "No articles yet")}
        </Text>
        <Text color={theme.colors.textSecondary} style={styles.emptyDesc}>
          {t(
            "articlesMobile.emptyDescription",
            "We'll soon add articles and guidance.",
          )}
        </Text>
      </View>
    );
  };

  return (
    <Screen bg="background" style={styles.screen}>
      <Header title={t("articlesMobile.header", "Articles")} showBack />

      <FlatList
        data={listItems}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={
          <ListHeader
            isRTL={isRTL}
            categoryChips={categoryChips}
            selectedCategorySlug={selectedCategorySlug}
            onCategoryPress={handleCategoryPress}
            categoriesQuery={categoriesQuery}
            featuredArticle={featuredArticle}
            resolvedLocale={resolvedLocale}
            onFeaturedPress={handleFeaturedPress}
          />
        }
        ListFooterComponent={
          <>
            {renderFooter()}
            {renderEndOfList()}
          </>
        }
        ListEmptyComponent={renderEmpty}
        ItemSeparatorComponent={undefined}
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
      />
    </Screen>
  );
}

// ─── Styles — static & clean ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1 },
  list: { flex: 1 },
  listContent: { paddingBottom: 100, paddingHorizontal: MOBILE_HORIZONTAL_PADDING },

  // List header
  listHeader: {
    paddingTop: MOBILE_SECTION_GAP,
    paddingBottom: 4,
  },

  // Category filter pills
  chipScrollWrapper: {
    marginBottom: MOBILE_SECTION_GAP,
  },
  chipRow: {
    gap: 8,
    paddingVertical: 4,
  },

  // Featured section
  featuredSection: {
    marginBottom: MOBILE_SECTION_GAP,
  },

  // Featured card with full-bleed cover image
  featuredCard: {
    overflow: "hidden",
    borderRadius: MOBILE_CARD_RADIUS,
    backgroundColor: "#FFFFFF",
  },
  featuredCoverImage: {
    width: "100%",
    height: 180,
    backgroundColor: "#EEF4EF",
  },
  featuredImageBody: { gap: 10 },

  // Featured card — no cover fallback
  featuredCardNoCover: {
    overflow: "hidden",
    borderRadius: MOBILE_CARD_RADIUS,
    backgroundColor: "#FFFFFF",
  },
  featuredNoCoverRow: {
    alignItems: "stretch",
  },
  featuredNoCoverIcon: {
    width: 60,
    flexShrink: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  featuredNoCoverBody: {
    flex: 1,
    justifyContent: "center",
    gap: 10,
  },

  // Shared featured text
  featuredTitle: { fontSize: 18, lineHeight: 25, fontWeight: "700" },
  featuredExcerpt: { fontSize: 13, lineHeight: 19 },
  featuredFooter: {
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  featuredDate: { fontSize: 12 },
  ctaText: { fontSize: 13 },

  // Category chip badge
  categoryChip: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: "hidden",
  },
  categoryChipText: {
    fontSize: 11,
    fontWeight: "600",
  },
  categoryChipTextSm: {
    fontSize: 10,
    fontWeight: "600",
  },

  // Article list rows
  listItemRow: {
    marginBottom: 12,
  },
  listRowWrapper: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  listRowContent: {
    alignItems: "center",
    gap: 12,
  },
  listRowTextBlock: {
    flex: 1,
    gap: 6,
  },
  listRowDate: { fontSize: 11 },
  listRowTitle: { fontSize: 14, lineHeight: 20, fontWeight: "600" },
  listRowExcerpt: { fontSize: 12, lineHeight: 18 },
  listRowThumbArea: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: "hidden",
    flexShrink: 0,
  },
  listRowThumb: {
    width: 80,
    height: 80,
    backgroundColor: "#EEF4EF",
  },
  listRowThumbPlaceholder: {
    width: 80,
    height: 80,
    justifyContent: "center",
    alignItems: "center",
  },

  // Pagination / empty states
  paginationFooter: { alignItems: "center", paddingVertical: 14 },
  loadingMoreText: { fontSize: 13 },
  endState: { alignItems: "center", paddingVertical: 16 },
  endText: { fontSize: 12, textAlign: "center" },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: { fontSize: 16, textAlign: "center" },
  emptyDesc: { fontSize: 13, textAlign: "center", lineHeight: 19 },
});
