import type { Metadata } from "next";
import { routing } from "@/i18n/routing";

const FALLBACK_APP_URL = "http://localhost:3000";

function getAppUrl() {
  try {
    return new URL(process.env.NEXT_PUBLIC_APP_URL || FALLBACK_APP_URL);
  } catch {
    return new URL(FALLBACK_APP_URL);
  }
}

function withLocale(pathname: string, locale: string) {
  if (pathname === "/") return `/${locale}`;
  return `/${locale}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}

type BuildPublicMetadataInput = {
  locale: string;
  pathname: string;
  title: string;
  description: string;
  noIndex?: boolean;
};

export function buildPublicMetadata({
  locale,
  pathname,
  title,
  description,
  noIndex = false,
}: BuildPublicMetadataInput): Metadata {
  const metadataBase = getAppUrl();
  const canonicalPath = withLocale(pathname, locale);

  const languages = Object.fromEntries(
    routing.locales.map((supportedLocale) => [
      supportedLocale,
      withLocale(pathname, supportedLocale),
    ]),
  );

  return {
    metadataBase,
    title,
    description,
    alternates: {
      canonical: canonicalPath,
      languages: {
        ...languages,
        "x-default": withLocale(pathname, routing.defaultLocale),
      },
    },
    openGraph: {
      title,
      description,
      url: canonicalPath,
      siteName: "Fayed",
      type: "website",
      locale: locale === "ar" ? "ar_EG" : "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
        }
      : {
          index: true,
          follow: true,
        },
  };
}
