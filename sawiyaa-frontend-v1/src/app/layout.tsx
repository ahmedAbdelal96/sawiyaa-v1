import type { Metadata } from "next";
import { Cairo, Outfit } from "next/font/google";
import "./globals.css";
import "flatpickr/dist/flatpickr.css";
import NextTopLoader from "nextjs-toploader";
import { QueryProvider } from "@/providers/query-provider";
import { ToastProvider } from "@/providers/toast-provider";
import { ThemeHydration } from "@/components/providers/ThemeHydration";
import { buildPublicMetadata } from "@/lib/seo/public-metadata";

const cairo = Cairo({
  subsets: ["arabic"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-cairo",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-outfit",
  display: "swap",
});

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
    icon: "/images/logo/icon.png",
    shortcut: "/images/logo/icon.png",
    apple: "/images/logo/icon.png",
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

  return (
    <html lang={locale} dir={dir} className={`${outfit.variable} ${cairo.variable}`} suppressHydrationWarning>
      <body
        className="dark:bg-gray-900 antialiased"
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
