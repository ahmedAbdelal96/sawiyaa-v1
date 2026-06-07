import React, { useCallback, useState } from "react";
import { Image, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import {
  Card,
  EmptyState,
  Header,
  Screen,
  Text,
} from "../../../components/ui";
import { useTheme } from "../../../providers/ThemeProvider";
import { MOBILE_CARD_RADIUS, MOBILE_CARD_PADDING, MOBILE_SECTION_GAP } from "../../../components/mobile-shell";
import { apiClient } from "../../../lib/api";
import { useArticleBySlug } from "../hooks";
import { resolveArticleLocale } from "../types";

// ─── URL resolution ────────────────────────────────────────────────────────────────
function resolveCoverUri(url?: string | null): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const base = apiClient.defaults.baseURL?.replace(/\/+$/, "") ?? "";
  const path = url.startsWith("/api/v1/article-covers/")
    ? url.replace("/api/v1/article-covers/", "/article-covers/")
    : url;
  return path.startsWith("/") ? `${base}${path}` : `${base}/${path}`;
}

// ─── Markdown parser ──────────────────────────────────────────────────────────────
type Block =
  | { kind: "h2"; text: string }
  | { kind: "h3"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "p"; text: string }
  | { kind: "hr" };

function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,3}\s+/, "")
    .replace(/^[*\-]\s+/, "")
    .replace(/^\d+\.\s+/, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function parseContent(markdown: string): Block[] {
  const lines = markdown.split(/\r?\n/);
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) { i++; continue; }

    if (line.startsWith("## ")) {
      blocks.push({ kind: "h2", text: stripMarkdown(line) });
      i++; continue;
    }
    if (line.startsWith("### ")) {
      blocks.push({ kind: "h3", text: stripMarkdown(line) });
      i++; continue;
    }
    if (line.match(/^[-*]\s/)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].trim().match(/^[-*]\s/)) {
        items.push(stripMarkdown(lines[i].trim()));
        i++;
      }
      if (items.length) blocks.push({ kind: "ul", items });
      continue;
    }
    if (line.match(/^\d+\.\s/)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].trim().match(/^\d+\.\s/)) {
        items.push(stripMarkdown(lines[i].trim()));
        i++;
      }
      if (items.length) blocks.push({ kind: "ol", items });
      continue;
    }
    if (line === "---") {
      blocks.push({ kind: "hr" });
      i++; continue;
    }

    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith("#") &&
      !lines[i].trim().match(/^[-*]\s/) &&
      !lines[i].trim().match(/^\d+\.\s/) &&
      lines[i].trim() !== "---"
    ) {
      paraLines.push(stripMarkdown(lines[i].trim()));
      i++;
    }
    if (paraLines.length) {
      blocks.push({ kind: "p", text: paraLines.join(" ") });
    }
  }
  return blocks;
}

// ─── Block renderer ──────────────────────────────────────────────────────────────
function ContentBlock({ block, isRTL }: { block: Block; isRTL: boolean }) {
  const { theme } = useTheme();

  switch (block.kind) {
    case "h2":
      return (
        <Text weight="700" style={[s.h2, { color: theme.colors.textPrimary }]}>
          {block.text}
        </Text>
      );

    case "h3":
      return (
        <Text weight="600" style={[s.h3, { color: theme.colors.textPrimary }]}>
          {block.text}
        </Text>
      );

    case "ul":
      return (
        <View style={s.list}>
          {block.items.map((item, idx) => (
            <View key={idx} style={[s.listItem, isRTL && s.listItemRtl]}>
              <Text style={[s.bullet, { color: theme.colors.primary }]}>•</Text>
              <Text style={[s.listText, { color: theme.colors.textSecondary }]}>
                {item}
              </Text>
            </View>
          ))}
        </View>
      );

    case "ol":
      return (
        <View style={s.list}>
          {block.items.map((item, idx) => (
            <View key={idx} style={[s.listItem, isRTL && s.listItemRtl]}>
              <Text style={[s.number, { color: theme.colors.primary }]}>
                {idx + 1}.
              </Text>
              <Text style={[s.listText, { color: theme.colors.textSecondary }]}>
                {item}
              </Text>
            </View>
          ))}
        </View>
      );

    case "p":
      return (
        <Text style={[s.para, { color: theme.colors.textSecondary }]}>
          {block.text}
        </Text>
      );

    case "hr":
      return (
        <View style={[s.divider, { backgroundColor: theme.colors.borderLight }]} />
      );

    default:
      return null;
  }
}

// ─── Article detail screen ────────────────────────────────────────────────────
export function ArticleDetailScreen({
  slug,
  locale,
}: {
  slug?: string;
  locale?: string;
}) {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const resolvedLocale = resolveArticleLocale(locale ?? i18n.language);
  const isRTL = i18n.language?.startsWith("ar") ?? false;
  const articleSlug =
    typeof slug === "string" && slug.trim() ? slug.trim() : null;

  const articleQuery = useArticleBySlug(articleSlug, resolvedLocale, {
    enabled: Boolean(articleSlug),
  });

  const article = articleQuery.data ?? null;
  const isNotFound =
    !articleSlug || (articleQuery.isSuccess && articleQuery.data === null);
  const isLoading = articleQuery.isLoading;
  const isError = articleQuery.isError;
  const [coverImageError, setCoverImageError] = useState(false);

  const handleCoverImageError = useCallback(() => {
    setCoverImageError(true);
  }, []);

  const coverUri = coverImageError ? null : resolveCoverUri(article?.coverImageUrl);
  const blocks = article?.content ? parseContent(article.content) : [];

  const publishedLabel = article?.publishedAt
    ? formatDate(article.publishedAt, resolvedLocale)
    : null;
  const categoryLabel = article?.category?.title?.trim() || null;
  const authorLabel = article?.trust?.authorDisplayName
    ? isRTL
      ? `بقلم ${article.trust.authorDisplayName}`
      : `By ${article.trust.authorDisplayName}`
    : null;

  const pageTitle = t("articlesMobile.detailTitle", "Article");

  if (isLoading) {
    return (
      <Screen bg="background" style={s.screen}>
        <Header title={pageTitle} showBack />
        <ScrollView
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={s.loadingInner}>
            <View style={[s.loadingChip, { backgroundColor: theme.colors.borderLight }]} />
            <View style={[s.loadingTitle, { backgroundColor: theme.colors.borderLight }]} />
            <View style={[s.loadingLine, { backgroundColor: theme.colors.borderLight }]} />
            <View style={[s.loadingLine, { backgroundColor: theme.colors.borderLight }]} />
            <View style={[s.loadingLineShort, { backgroundColor: theme.colors.borderLight }]} />
          </View>
        </ScrollView>
      </Screen>
    );
  }

  if (isError || isNotFound || !article) {
    return (
      <Screen bg="background" style={s.screen}>
        <Header title={pageTitle} showBack />
        <EmptyState
          title={t("articlesMobile.articleNotFound", "Article not found")}
          description={t(
            "articlesMobile.articleNotFoundDesc",
            "The requested article is no longer available or the link is invalid.",
          )}
          actionLabel={t("articlesMobile.backToArticles", "Back to articles")}
          onAction={() => router.push("/(patient)/articles")}
        />
      </Screen>
    );
  }

  return (
    <Screen bg="background" style={s.screen}>
      <Header title={pageTitle} showBack />

      <ScrollView
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── 1. Cover image (full-width card, optional) ── */}
        {coverUri ? (
          <View style={s.coverWrapper}>
            <Image
              source={{ uri: coverUri }}
              alt={article.title}
              style={s.coverImage}
              resizeMode="cover"
              onError={handleCoverImageError}
            />
          </View>
        ) : null}

        {/* ── 2. Article header card ── */}
        <Card variant="elevated" padding="none" style={s.headerCard}>
          <View style={[s.headerCardInner, { padding: MOBILE_CARD_PADDING }]}>

            {/* Category + Date row */}
            <View style={[s.metaRow, isRTL && s.metaRowRtl]}>
              {categoryLabel ? (
                <View style={[s.chip, { backgroundColor: theme.colors.primaryLight }]}>
                  <Text style={[s.chipText, { color: theme.colors.primary }]}>
                    {categoryLabel}
                  </Text>
                </View>
              ) : null}
              {publishedLabel ? (
                <View style={[s.metaItem, isRTL && s.metaItemRtl]}>
                  <Ionicons
                    name="calendar-outline"
                    size={12}
                    color={theme.colors.textMuted}
                  />
                  <Text style={s.metaText}>{publishedLabel}</Text>
                </View>
              ) : null}
              {authorLabel ? (
                <View style={[s.metaItem, isRTL && s.metaItemRtl]}>
                  <Ionicons
                    name="person-outline"
                    size={12}
                    color={theme.colors.textMuted}
                  />
                  <Text style={s.metaText}>{authorLabel}</Text>
                </View>
              ) : null}
            </View>

            {/* Title */}
            <Text
              weight="700"
              style={[s.title, { color: theme.colors.textPrimary }]}
            >
              {article.title}
            </Text>

            {/* Excerpt/lead */}
            {article.excerpt ? (
              <Text style={[s.excerpt, { color: theme.colors.textSecondary }]}>
                {article.excerpt}
              </Text>
            ) : null}
          </View>
        </Card>

        {/* ── 3. Article content card ── */}
        {blocks.length > 0 ? (
          <Card variant="elevated" padding="none" style={s.contentCard}>
            <View style={[s.contentInner, { padding: MOBILE_CARD_PADDING }]}>
              {blocks.map((block, idx) => (
                <ContentBlock key={`${block.kind}-${idx}`} block={block} isRTL={isRTL} />
              ))}
            </View>
          </Card>
        ) : null}

        {/* Bottom safe spacer */}
        <View style={s.bottomSpacer} />
      </ScrollView>
    </Screen>
  );
}

function formatDate(dateString: string, locale: string): string {
  try {
    return new Date(dateString).toLocaleDateString(
      locale === "ar" ? "ar-SA" : "en-US",
      { year: "numeric", month: "long", day: "numeric" },
    );
  } catch {
    return dateString;
  }
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { paddingBottom: 0, paddingTop: MOBILE_SECTION_GAP },

  // Cover
  coverWrapper: {
    borderRadius: MOBILE_CARD_RADIUS,
    overflow: "hidden",
    marginBottom: 14,
  },
  coverImage: {
    width: "100%",
    height: 200,
    backgroundColor: "#eef2f5",
  },

  // Header card
  headerCard: {
    borderRadius: MOBILE_CARD_RADIUS,
    marginBottom: 14,
    overflow: "hidden",
  },
  headerCardInner: { gap: 0 },

  // Meta row
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  metaRowRtl: { flexDirection: "row-reverse" },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaItemRtl: { flexDirection: "row-reverse" },
  metaText: { fontSize: 12, color: "#7a8891" },

  // Category chip
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    overflow: "hidden",
  },
  chipText: { fontSize: 11, fontWeight: "600" },

  // Title
  title: { fontSize: 22, lineHeight: 30, fontWeight: "700", marginBottom: 8 },

  // Excerpt
  excerpt: { fontSize: 15, lineHeight: 24 },

  // Content card
  contentCard: {
    borderRadius: MOBILE_CARD_RADIUS,
    overflow: "hidden",
  },
  contentInner: { gap: 0 },

  // Reading typography
  h2: { fontSize: 18, lineHeight: 26, fontWeight: "700", marginBottom: 8, marginTop: 4 },
  h3: { fontSize: 16, lineHeight: 24, fontWeight: "600", marginBottom: 6, marginTop: 2 },
  para: { fontSize: 15, lineHeight: 28, marginBottom: 12 },
  list: { marginBottom: 12, gap: 0 },
  listItem: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 6 },
  listItemRtl: { flexDirection: "row-reverse" },
  bullet: { fontSize: 15, lineHeight: 28, minWidth: 14, textAlign: "center" },
  number: { fontSize: 15, lineHeight: 28, minWidth: 18 },
  listText: { flex: 1, fontSize: 15, lineHeight: 28 },
  divider: { height: 1, marginVertical: 16 },

  // Loading skeleton
  loadingInner: { padding: MOBILE_CARD_PADDING, gap: 12 },
  loadingChip: { width: 80, height: 22, borderRadius: 11 },
  loadingTitle: { width: "70%", height: 26, borderRadius: 8 },
  loadingLine: { width: "100%", height: 15, borderRadius: 6 },
  loadingLineShort: { width: "60%", height: 15, borderRadius: 6 },

  // Bottom
  bottomSpacer: { height: 40 },
});
