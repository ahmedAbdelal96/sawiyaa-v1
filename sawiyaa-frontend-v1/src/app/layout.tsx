import type { Metadata } from "next";
import "./globals.css";
import "flatpickr/dist/flatpickr.css";
import NextTopLoader from "nextjs-toploader";
import { QueryProvider } from "@/providers/query-provider";
import { ToastProvider } from "@/providers/toast-provider";
import { ThemeHydration } from "@/components/providers/ThemeHydration";
import { buildPublicMetadata } from "@/lib/seo/public-metadata";

export const metadata: Metadata = {
  ...buildPublicMetadata({
    locale: "ar",
    pathname: "/",
    title: "Sawiyaa | سويّة",
    description:
      "Guided mental care with clearer entry paths, public practitioner discovery, specialties, and trust-backed content.",
  }),
  title: {
    default: "Sawiyaa | سويّة",
    template: "%s",
  },
  icons: {
    icon: "/images/logo/logo-icon.svg",
    shortcut: "/images/logo/logo-icon.svg",
    apple: "/images/logo/logo-icon.svg",
  },
};

type Props = {
  children: React.ReactNode;
  params?: Promise<{ locale?: string }>;
};

export default async function RootLayout({ children, params }: Props) {
  const resolvedParams = params ? await params : {};
  const locale = resolvedParams.locale || "ar";
  const dir = locale === "ar" ? "rtl" : "ltr";
  const fontFamily =
    locale === "ar"
      ? '"Cairo", "Segoe UI", Tahoma, Arial, sans-serif'
      : '"Inter", "Segoe UI", Arial, sans-serif';

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body
        className="dark:bg-gray-900 antialiased"
        style={{ fontFamily }}
      >
        <QueryProvider>
          <ThemeHydration />
          <NextTopLoader 
            color="#24564F"
            showSpinner={false}
            height={3}
            shadow="0 0 10px #24564F,0 0 5px #24564F"
          />
          {children}
          <ToastProvider />
        </QueryProvider>
      </body>
    </html>
  );
}
