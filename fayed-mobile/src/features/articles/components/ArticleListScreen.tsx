import React, { useCallback, useMemo, useState } from "react";
import { FlatList, Image, StyleSheet, View } from "react-native";
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
import { MOBILE_CARD_RADIUS, MOBILE_CARD_PADDING, MOBILE_SECTION_GAP, MOBILE_HORIZONTAL_PADDING } from "../../../components/mobile-shell";
import { useArticleCategories, useInfiniteArticles } from "../hooks";
import { apiClient } from "../../../lib/api";
import type { ArticleListItem } from "../types";

type ArticleListScreenProps = {
  locale?: string;
};

function resolveArticleImageUri(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  // Prepend backend base URL so images work on web
  const base = apiClient.defaults.baseURL ?? "";
  const cleanBase = base.replace(/\/+$/, "");
  const path = url.startsWith("/") ? url : `/${url}`;
  return `${cleanBase}${path}`;
}

// ─── Featured card — no cover image: compact icon + text row ───────────────────
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
  const publishedLabel = article.publishedAt
    ? formatDate(article.publishedAt, locale)
    : null;
  const isRTL = locale === "ar";

  return (
    <Card variant="elevated" padding="none" onPress={onPress} style={styles.featuredCardNoCover}>
      <View style={[styles.featuredNoCoverRow, isRTL && styles.featuredNoCoverRowRtl]}>
        {/* Compact icon badge */}
        <View style={[styles.featuredNoCoverIcon, { backgroundColor: theme.colors.primaryLight }]}>
          <Ionicons name="book-outline" size={22} color={theme.colors.primary} />
        </View>

        {/* Text content */}
        <View style={[styles.featuredNoCoverBody, { padding: MOBILE_CARD_PADDING }]}>
          {article.category ? (
            <View style={[styles.chipRow, isRTL && styles.chipRowRtl]}>
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
          <Text weight="700" style={styles.featuredTitle} numberOfLines={2}>
            {article.title}
          </Text>
          {article.excerpt ? (
            <Text
              color={theme.colors.textSecondary}
              style={styles.featuredExcerpt}
              numberOfLines={1}
            >
              {article.excerpt}
            </Text>
          ) : null}
          <View style={[styles.featuredFooter, isRTL && styles.featuredFooterRtl]}>
            {publishedLabel ? (
              <Text color={theme.colors.textMuted} style={styles.featuredDate}>
                {publishedLabel}
              </Text>
            ) : null}
            <View style={[styles.ctaRow, isRTL && styles.ctaRowRtl]}>
              <Text weight="600" style={[styles.ctaText, { color: theme.colors.primary }]}>
                {locale === "ar" ? "اقرأ المقال" : "Read article"}
              </Text>
              <Ionicons
                name={locale === "ar" ? "chevron-back" : "chevron-forward"}
                size={13}
                color={theme.colors.primary}
              />
            </View>
          </View>
        </View>
      </View>
    </Card>
  );
}

// ─── Featured card with full-width cover image ────────────────────────────────
// Shows a compact no-cover fallback if the image fails to load or the URL
// is not an absolute URL (relative paths don't work on web without a base).
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
  const [imageError, setImageError] = useState(false);

  const publishedLabel = article.publishedAt
    ? formatDate(article.publishedAt, locale)
    : null;
  const isRTL = locale === "ar";

  // Guard: if image URL is not absolute (web needs full URL), fall back to compact
  const resolvedUri = resolveArticleImageUri(article.coverImageUrl);
  const isAbsoluteUrl = resolvedUri ? /^https?:\/\//i.test(resolvedUri) : false;

  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  // Show compact fallback if image is broken or URL is not absolute
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
          <View style={[styles.chipRow, isRTL && styles.chipRowRtl]}>
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
        <Text weight="700" style={styles.featuredTitle} numberOfLines={2}>
          {article.title}
        </Text>
        {article.excerpt ? (
          <Text
            color={theme.colors.textSecondary}
            style={styles.featuredExcerpt}
            numberOfLines={2}
          >
            {article.excerpt}
          </Text>
        ) : null}
        <View style={[styles.featuredFooter, isRTL && styles.featuredFooterRtl]}>
          {publishedLabel ? (
            <Text color={theme.colors.textMuted} style={styles.featuredDate}>
              {publishedLabel}
            </Text>
          ) : null}
          <View style={[styles.ctaRow, isRTL && styles.ctaRowRtl]}>
            <Text weight="600" style={[styles.ctaText, { color: theme.colors.primary }]}>
              {locale === "ar" ? "اقرأ المقال" : "Read article"}
            </Text>
            <Ionicons
              name={locale === "ar" ? "chevron-back" : "chevron-forward"}
              size={13}
              color={theme.colors.primary}
            />
          </View>
        </View>
      </View>
    </Card>
  );
}

// ─── Article list row card ────────────────────────────────────────────────────
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
  const [thumbError, setThumbError] = useState(false);
  const publishedLabel = article.publishedAt
    ? formatDate(article.publishedAt, locale)
    : null;
  const isRTL = locale === "ar";

  // Guard: only render image if URL is absolute
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
            size={18}
            color={theme.colors.primary}
          />
        </View>
      )}
    </View>
  );

  const textBlock = (
    <View style={[styles.listRowTextBlock, { padding: 14 }]}>
      <View style={[styles.listRowMeta, isRTL && styles.listRowMetaRtl]}>
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
      </View>
      <Text weight="600" style={styles.listRowTitle} numberOfLines={2}>
        {article.title}
      </Text>
      {article.excerpt ? (
        <Text
          color={theme.colors.textSecondary}
          style={styles.listRowExcerpt}
          numberOfLines={2}
        >
          {article.excerpt}
        </Text>
      ) : null}
    </View>
  );

  return (
    <Card variant="elevated" padding="none" onPress={onPress} style={styles.listRowCard}>
      <View style={styles.listRowContent}>
        {isRTL ? (
          <>
            {textBlock}
            {thumbBlock}
          </>
        ) : (
          <>
            {thumbBlock}
            {textBlock}
          </>
        )}
      </View>
    </Card>
  );
}

// ─── List header ─────────────────────────────────────────────────────────────
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
      {/* Category filter pills */}
      {!categoriesQuery.isLoading && categoryChips.length > 0 && (
        <View style={styles.chipScrollWrapper}>
          <View style={[styles.chipRow, isRTL && styles.chipRowRtl]}>
            {categoryChips.map((cat) => (
              <FilterChip
                key={cat.id}
                label={cat.title}
                selected={cat.slug === selectedCategorySlug}
                onPress={() => onCategoryPress(cat.slug)}
              />
            ))}
          </View>
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
  const isEmpty =
    !articlesQuery.isLoading && !articlesQuery.isError && items.length === 0;
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
          size={40}
          color={theme.colors.textMuted}
        />
        <Text weight="600" style={styles.emptyTitle}>
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
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
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

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1 },
  list: { flex: 1 },
  listContent: { paddingBottom: 120, paddingHorizontal: MOBILE_HORIZONTAL_PADDING },

  // ── List header: sits between Header and FlatList scroll ──
  listHeader: {
    paddingTop: MOBILE_SECTION_GAP,  // gap after the page header
    paddingBottom: 4,
  },

  // ── Category filter pills ──
  chipScrollWrapper: {
    marginBottom: MOBILE_SECTION_GAP,
  },
  chipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  chipRowRtl: { flexDirection: "row-reverse" },

  // ── Featured section ──
  featuredSection: {
    marginBottom: MOBILE_SECTION_GAP,
  },

  // Featured card with full-width cover image
  featuredCard: {
    overflow: "hidden",
    borderRadius: MOBILE_CARD_RADIUS,
  },
  featuredCoverImage: {
    width: "100%",
    height: 160,
    backgroundColor: "#eef2f5",
  },
  featuredImageBody: { gap: 6 },

  // Featured card — no cover (compact icon + text row)
  featuredCardNoCover: {
    overflow: "hidden",
    borderRadius: MOBILE_CARD_RADIUS,
  },
  featuredNoCoverRow: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  featuredNoCoverRowRtl: { flexDirection: "row-reverse" },
  featuredNoCoverIcon: {
    width: 64,
    flexShrink: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  featuredNoCoverBody: {
    flex: 1,
    justifyContent: "center",
    gap: 4,
  },

  // Shared featured text
  featuredTextBlock: { flex: 1, justifyContent: "center", gap: 6 },
  featuredTitle: { fontSize: 17, lineHeight: 24, fontWeight: "700" },
  featuredExcerpt: { fontSize: 13, lineHeight: 19 },
  featuredFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  featuredFooterRtl: { flexDirection: "row-reverse" },
  featuredDate: { fontSize: 11 },
  ctaRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  ctaRowRtl: { flexDirection: "row-reverse" },
  ctaText: { fontSize: 13, fontWeight: "600" },

  // ── Category chip ──
  categoryChip: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
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

  // ── Article list rows ──
  listItemRow: {},
  listRowCard: {
    borderRadius: MOBILE_CARD_RADIUS,
    overflow: "hidden",
  },
  listRowContent: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  listRowTextBlock: { flex: 1, justifyContent: "center", gap: 5 },
  listRowMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
    marginBottom: 1,
  },
  listRowMetaRtl: { flexDirection: "row-reverse" },
  listRowDate: { fontSize: 11 },
  listRowTitle: { fontSize: 14, lineHeight: 20, fontWeight: "600" },
  listRowExcerpt: { fontSize: 12, lineHeight: 18 },
  listRowThumbArea: {
    width: 76,
    flexShrink: 0,
    overflow: "hidden",
  },
  listRowThumb: {
    width: 76,
    height: "100%",
    minHeight: 90,
    backgroundColor: "#eef2f5",
  },
  listRowThumbPlaceholder: {
    width: 76,
    height: "100%",
    minHeight: 90,
    justifyContent: "center",
    alignItems: "center",
  },

  // ── Pagination / empty states ──
  paginationFooter: { alignItems: "center", paddingVertical: 14 },
  loadingMoreText: { fontSize: 13 },
  endState: { alignItems: "center", paddingVertical: 12 },
  endText: { fontSize: 12, textAlign: "center" },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: { fontSize: 17, textAlign: "center" },
  emptyDesc: { fontSize: 14, textAlign: "center", lineHeight: 21 },
});
