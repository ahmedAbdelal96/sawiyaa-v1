import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { setRequestLocale, getMessages } from "next-intl/server";
import { getUserData } from "@/lib/auth/server";
import StoreInitializer from "@/components/shared/StoreInitializer";
import type { AuthTenant } from "@/stores/auth-store";
import { AppIntlProvider } from "@/i18n/IntlProvider";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

function splitName(displayName?: string | null) {
  const value = displayName || "";
  const parts = value.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" "),
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  // Validate that the incoming `locale` parameter is valid
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Enable static rendering
  setRequestLocale(locale);

  // Providing all messages to the client
  const messages = await getMessages();

  // Get user data from SSR cookies to seed the active auth store once on mount.
  const userData = await getUserData();

  // Determine direction based on locale
  const dir = locale === "ar" ? "rtl" : "ltr";

  const { firstName: splitFirst, lastName: splitLast } = splitName((userData as any)?.displayName);
  const resolvedEmail = userData?.email || (userData as any)?.primaryEmail || "";
  const resolvedFirstName = userData?.firstName || splitFirst || "";
  const resolvedLastName = userData?.lastName || splitLast || "";

  return (
    <div dir={dir} className={locale === "ar" ? "font-arabic" : ""}>
      <AppIntlProvider locale={locale} messages={messages}>
        <StoreInitializer
          user={userData ? {
            id: userData.id,
            email: resolvedEmail,
            firstName: resolvedFirstName,
            lastName: resolvedLastName,
            role: userData.role || (userData as any).roles?.[0] || "",
            avatar: userData.avatar,
          } : null}
          tenant={(userData?.tenant || null) as AuthTenant | null}
        />
        {children}
      </AppIntlProvider>
    </div>
  );
}
