import React from "react";
import { Image, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  Card,
  DetailPageScaffold,
  EmptyState,
  SectionHeader,
  StatusChip,
  SummaryRow,
  Text,
  formatDate,
} from "../../../components/ui";
import { useTheme } from "../../../providers/ThemeProvider";
import { apiClient } from "../../../lib/api";
import { useArticleBySlug } from "../hooks";
import { resolveArticleLocale } from "../types";

type ArticleDetailScreenProps = {
  slug?: string;
  locale?: string;
};

function resolveCoverImageUri(url?: string | null) {
  if (!url) {
    return null;
  }

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  const normalized = url.startsWith("/api/v1/article-covers/")
    ? url.replace("/api/v1/article-covers/", "/article-covers/")
    : url;
  const baseUrl = apiClient.defaults.baseURL?.replace(/\/+$/, "");

  if (!baseUrl) {
    return normalized;
  }

  return normalized.startsWith("/")
    ? `${baseUrl}${normalized}`
    : `${baseUrl}/${normalized}`;
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function splitArticleContent(content: string) {
  const normalized = decodeHtmlEntities(
    content
      .replace(/\r\n/g, "\n")
      .replace(/<\s*br\s*\/?>/gi, "\n")
      .replace(/<li[^>]*>/gi, "\n- ")
      .replace(/<\/(p|div|section|article|header|blockquote|h[1-6]|ul|ol|li)>/gi, "\n")
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, ""),
  );

  return normalized
    .split(/\n{2,}/)
    .map((block) => block.replace(/\n+/g, "\n").trim())
    .filter(Boolean);
}

export function ArticleDetailScreen({ slug, locale }: ArticleDetailScreenProps) {
  const router = useRouter();
  const { i18n } = useTranslation();
  const { theme } = useTheme();
  const resolvedLocale = resolveArticleLocale(locale ?? i18n.language);
  const articleSlug = typeof slug === "string" && slug.trim() ? slug.trim() : null;

  const articleQuery = useArticleBySlug(articleSlug, resolvedLocale, {
    enabled: Boolean(articleSlug),
  });

  const article = articleQuery.data ?? null;
  const isNotFound =
    !articleSlug || (articleQuery.isSuccess && articleQuery.data === null);
  const publishedLabel = article?.publishedAt
    ? formatDate(article.publishedAt, resolvedLocale)
    : null;
  const categoryLabel = article?.category?.title?.trim() || null;
  const coverImageUri = resolveCoverImageUri(article?.coverImageUrl);
  const contentBlocks = article ? splitArticleContent(article.content) : [];

  return (
    <DetailPageScaffold
      title="Article"
      showBack
      onBack={() => router.back()}
      loading={articleQuery.isLoading}
      loadingMessage="Loading article..."
      error={articleQuery.isError}
      errorMessage="We could not load the article right now. Please try again."
      onRetry={() => articleQuery.refetch()}
      retryText="Try again"
      contentContainerStyle={styles.scaffoldContent}
    >
      {isNotFound ? (
        <EmptyState
          title="Article not found"
          description="The requested article is no longer available or the link is invalid."
          actionLabel="Back to articles"
          onAction={() => router.push("/(patient)/articles")}
        />
      ) : article ? (
        <View style={styles.stack}>
          <Card variant="elevated" padding="lg" style={styles.heroCard}>
            <Text weight="bold" style={styles.title}>
              {article.title}
            </Text>
            {article.excerpt ? (
              <Text
                color={theme.colors.textSecondary}
                style={styles.excerpt}
              >
                {article.excerpt}
              </Text>
            ) : null}
          </Card>

          {categoryLabel || publishedLabel ? (
            <Card variant="outlined" padding="sm" style={styles.metaCard}>
              {categoryLabel ? (
                <SummaryRow
                  label="Category"
                  value={<StatusChip label={categoryLabel} tone="info" />}
                />
              ) : null}
              {publishedLabel ? (
                <SummaryRow
                  label="Published"
                  value={publishedLabel}
                  style={categoryLabel ? styles.metaRow : undefined}
                />
              ) : null}
            </Card>
          ) : null}

          {coverImageUri ? (
            <Card variant="outlined" padding="none" style={styles.coverCard}>
              <Image
                source={{ uri: coverImageUri }}
                alt={article.title}
                style={styles.coverImage}
                resizeMode="contain"
              />
            </Card>
          ) : null}

          <Card variant="elevated" padding="lg" style={styles.contentCard}>
            <SectionHeader
              title="Content"
              subtitle="Read comfortably on mobile"
            />
            <View style={styles.contentBody}>
              {contentBlocks.length ? (
                contentBlocks.map((block, index) => (
                  <Text
                    key={`${index}-${block.slice(0, 24)}`}
                    color={theme.colors.textSecondary}
                    style={[
                      styles.paragraph,
                      index === contentBlocks.length - 1 && styles.paragraphLast,
                    ]}
                  >
                    {block}
                  </Text>
                ))
              ) : (
                <Text
                  color={theme.colors.textSecondary}
                  style={styles.emptyContent}
                >
                  No article content is available yet.
                </Text>
              )}
            </View>
          </Card>
        </View>
      ) : null}
    </DetailPageScaffold>
  );
}

const styles = StyleSheet.create({
  scaffoldContent: {
    paddingBottom: 32,
  },
  stack: {
    gap: 14,
  },
  heroCard: {
    marginHorizontal: 0,
  },
  title: {
    fontSize: 24,
    lineHeight: 32,
  },
  excerpt: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 24,
  },
  metaCard: {
    marginHorizontal: 0,
  },
  metaRow: {
    marginTop: 2,
  },
  coverCard: {
    marginHorizontal: 0,
  },
  coverImage: {
    width: "100%",
    height: 220,
    backgroundColor: "#f8fafc",
  },
  contentCard: {
    marginHorizontal: 0,
  },
  contentBody: {
    marginTop: 18,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 27,
    marginBottom: 14,
  },
  paragraphLast: {
    marginBottom: 0,
  },
  emptyContent: {
    fontSize: 15,
    lineHeight: 24,
    marginTop: 4,
  },
});
