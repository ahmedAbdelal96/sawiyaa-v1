import React from "react";
import { useLocalSearchParams } from "expo-router";
import { ArticleDetailScreen } from "../../../src/features/articles/components/ArticleDetailScreen";

export default function PatientArticleDetailRoute() {
  const params = useLocalSearchParams<{ slug?: string; locale?: string }>();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const locale = Array.isArray(params.locale) ? params.locale[0] : params.locale;

  return <ArticleDetailScreen slug={slug} locale={locale} />;
}
