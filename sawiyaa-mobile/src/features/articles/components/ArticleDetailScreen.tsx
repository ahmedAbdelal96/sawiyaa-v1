import React, { useCallback, useState } from "react";
import { Image, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import {
  EmptyState,
  Header,
  Screen,
  Text,
} from "../../../components/ui";
import { useTheme } from "../../../providers/ThemeProvider";
import { useAppDirection } from "../../../i18n/direction";
import {
  MOBILE_CARD_RADIUS,
  MOBILE_CARD_PADDING,
  MOBILE_SECTION_GAP,
  MOBILE_HORIZONTAL_PADDING,
} from "../../../components/mobile-shell";
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
function ContentBlock({ block }: { block: Block }) {
  const { theme } = useTheme();
  const { rowDirection, textAlign } = useAppDirection();

  switch (block.kind) {
    case "h2":
      return (
        <View style={[s.h2Container, { flexDirection: rowDirection }]}>
          <View style={[s.h2AccentBar, { backgroundColor: theme.colors.primary }]} />
          <Text weight="700" style={[s.h2Text, { color: theme.colors.textPrimary, textAlign }]}>
            {block.text}
          </Text>
        </View>
      );

    case "h3":
      return (
        <Text weight="600" style={[s.h3, { color: theme.colors.textPrimary, textAlign }]}>
          {block.text}
        </Text>
      );

    case "ul":
      return (
        <View style={s.list}>
          {block.items.map((item, idx) => (
            <View key={idx} style={[s.listItem, { flexDirection: rowDirection }]}>
              <Text style={[s.bullet, { color: theme.colors.primary }]}>•</Text>
              <Text style={[s.listText, { color: theme.colors.textSecondary, textAlign }]}>
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
            <View key={idx} style={[s.listItem, { flexDirection: rowDirection }]}>
              <Text style={[s.number, { color: theme.colors.primary, textAlign: textAlign }]}>
                {idx + 1}.
              </Text>
              <Text style={[s.listText, { color: theme.colors.textSecondary, textAlign }]}>
                {item}
              </Text>
            </View>
          ))}
        </View>
      );

    case "p":
      return (
        <Text style={[s.para, { color: theme.colors.textSecondary, textAlign }]}>
          {block.text}
        </Text>
      );

    case "hr":
      return (
        <View style={[s.divider, { backgroundColor: theme.colors.border }]} />
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
  const { rowDirection, textAlign } = useAppDirection();
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
            <View style={[s.loadingChip, { backgroundColor: theme.colors.divider }]} />
            <View style={[s.loadingTitle, { backgroundColor: theme.colors.divider }]} />
            <View style={[s.loadingLine, { backgroundColor: theme.colors.divider }]} />
            <View style={[s.loadingLine, { backgroundColor: theme.colors.divider }]} />
            <View style={[s.loadingLineShort, { backgroundColor: theme.colors.divider }]} />
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
        {/* ── 1. Cover image (optional) ── */}
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

        {/* ── 2. Unified Editorial Article Layout ── */}
        <View style={s.articleContainer}>
          {/* Category + Date + Author row */}
          <View style={[s.metaRow, { flexDirection: rowDirection }]}>
            {categoryLabel ? (
              <View style={[s.chip, { backgroundColor: theme.colors.primaryLight }]}>
                <Text style={[s.chipText, { color: theme.colors.primary }]}>
                  {categoryLabel}
                </Text>
              </View>
            ) : null}
            {publishedLabel ? (
              <View style={[s.metaItem, { flexDirection: rowDirection }]}>
                <Ionicons
                  name="calendar-outline"
                  size={12}
                  color={theme.colors.textMuted}
                />
                <Text style={s.metaText}>{publishedLabel}</Text>
              </View>
            ) : null}
            {authorLabel ? (
              <View style={[s.metaItem, { flexDirection: rowDirection }]}>
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
            style={[s.title, { color: theme.colors.textPrimary, textAlign }]}
          >
            {article.title}
          </Text>

          {/* Excerpt/lead */}
          {article.excerpt ? (
            <Text style={[s.excerpt, { color: theme.colors.textSecondary, textAlign }]}>
              {article.excerpt}
            </Text>
          ) : null}

          {/* Elegant Divider line separating intro and body */}
          <View style={[s.sectionDivider, { backgroundColor: theme.colors.divider }]} />

          {/* Body Content blocks rendering parsed markdown */}
          {blocks.length > 0 ? (
            <View style={s.bodyContainer}>
              {blocks.map((block, idx) => {
                const showDivider = block.kind === "h2" && idx > 0;
                return (
                  <React.Fragment key={`${block.kind}-${idx}`}>
                    {showDivider && (
                      <View style={[s.sectionHeaderDivider, { backgroundColor: theme.colors.divider }]} />
                    )}
                    <ContentBlock block={block} />
                  </React.Fragment>
                );
              })}
            </View>
          ) : null}
        </View>

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

// ─── Styles — flat and editorial, no boxy card panels ───────────────────────
const s = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { paddingBottom: 0, paddingTop: MOBILE_SECTION_GAP, paddingHorizontal: MOBILE_HORIZONTAL_PADDING },

  // Cover image
  coverWrapper: {
    borderRadius: MOBILE_CARD_RADIUS,
    overflow: "hidden",
    marginBottom: 16,
  },
  coverImage: {
    width: "100%",
    height: 200,
    backgroundColor: "#EEF4EF",
  },

  // Article text container
  articleContainer: {
    width: "100%",
  },

  // Meta row
  metaRow: {
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  metaItem: { alignItems: "center", gap: 4 },
  metaText: { fontSize: 12, color: "#61716C" },

  // Category chip
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: "hidden",
  },
  chipText: { fontSize: 11, fontWeight: "600" },

  // Title
  title: { fontSize: 22, lineHeight: 30, fontWeight: "700", marginBottom: 8 },

  // Excerpt
  excerpt: { fontSize: 15, lineHeight: 24, opacity: 0.9 },

  // Separator
  sectionDivider: {
    height: 1,
    marginVertical: 16,
    opacity: 0.6,
  },

  // Body container
  bodyContainer: {
    width: "100%",
  },

  // Reading typography
  h2Container: {
    gap: 8,
    marginTop: 28,
    marginBottom: 12,
    alignItems: "center",
  },
  h2AccentBar: {
    width: 4,
    height: 18,
    borderRadius: 2,
  },
  h2Text: {
    flex: 1,
    fontSize: 18,
    lineHeight: 26,
    fontWeight: "700",
  },
  sectionHeaderDivider: {
    height: 1,
    marginTop: 24,
    marginBottom: 8,
    opacity: 0.5,
  },
  h3: { fontSize: 16, lineHeight: 24, fontWeight: "600", marginBottom: 8, marginTop: 10 },
  para: { fontSize: 15, lineHeight: 28, marginBottom: 14 },
  list: { marginBottom: 16, gap: 6, paddingStart: 14 },
  listItem: { alignItems: "flex-start", gap: 10 },
  bullet: { fontSize: 16, lineHeight: 26, minWidth: 12, textAlign: "center" },
  number: { fontSize: 14, lineHeight: 26, minWidth: 20 },
  listText: { flex: 1, fontSize: 15, lineHeight: 26 },
  divider: { height: 1, marginVertical: 16, opacity: 0.5 },

  // Loading skeleton
  loadingInner: { padding: MOBILE_CARD_PADDING, gap: 12 },
  loadingChip: { width: 80, height: 22, borderRadius: 11 },
  loadingTitle: { width: "70%", height: 26, borderRadius: 8 },
  loadingLine: { width: "100%", height: 15, borderRadius: 6 },
  loadingLineShort: { width: "60%", height: 15, borderRadius: 6 },

  // Bottom spacer
  bottomSpacer: { height: 60 },
});
