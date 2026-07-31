import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function AuthFooter() {
  const [t, locale] = await Promise.all([
    getTranslations("home.footer"),
    getLocale(),
  ]);

  const isAr = locale === "ar";

  return (
    <footer className="w-full border-t border-border-light bg-[#1C2F2B] text-white dark:bg-[#0b1212] select-none py-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs text-emerald-100/40">
          <p>
            © {new Date().getFullYear()} {isAr ? "سويّة. جميع الحقوق محفوظة." : "Sawiyaa. All rights reserved."}
          </p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link href="/help" className="hover:text-white transition-colors">{isAr ? "الخصوصية" : "Privacy"}</Link>
            <Link href="/help" className="hover:text-white transition-colors">{isAr ? "الشروط" : "Terms"}</Link>
            <Link href="/help" className="hover:text-white transition-colors">{isAr ? "المساعدة" : "Help"}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
