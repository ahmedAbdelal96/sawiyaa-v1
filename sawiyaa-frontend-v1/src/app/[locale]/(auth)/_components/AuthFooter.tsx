import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import BrandMark from "@/components/shared/BrandMark";

export default async function AuthFooter() {
  const [t, locale] = await Promise.all([
    getTranslations("home.footer"),
    getLocale(),
  ]);

  const isAr = locale === "ar";

  const columns = [
    {
      title: t("sectionPlatform"),
      links: [
        { label: t("linkHome"), href: "/" },
        { label: t("linkAbout"), href: "/help" },
        { label: t("linkAcademy"), href: "/academy" },
      ],
    },
    {
      title: t("sectionCare"),
      links: [
        { label: t("linkSpecialties"), href: "/specialties" },
        { label: t("linkPractitioners"), href: "/practitioners" },
        { label: t("linkArticles"), href: "/articles" },
      ],
    },
    {
      title: t("sectionSupport"),
      links: [
        { label: t("linkHelp"), href: "/help" },
        { label: t("linkRefund"), href: "/refund-policies" },
        { label: t("linkPrivacy"), href: "/help" },
        { label: t("linkTerms"), href: "/help" },
      ],
    },
  ];

  return (
    <footer className="w-full border-t border-border-light bg-[#1C2F2B] text-white dark:bg-[#0b1212] select-none">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 grid-cols-1 md:grid-cols-12">
          {/* Logo and Tagline Column */}
          <div className="md:col-span-4 flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 transition-all duration-300 group-hover:scale-105">
                <span className="text-white font-bold text-sm">S</span>
              </span>
              <span className="text-lg font-bold tracking-tight text-white">
                {isAr ? "سويّة" : "Sawiyaa"}
              </span>
            </Link>
            <p className="text-xs leading-relaxed text-emerald-100/70 max-w-xs">
              {t("tagline")}
            </p>
            <div className="flex items-center gap-3 mt-2">
              {/* Instagram */}
              <a href="#" className="h-8 w-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
              </a>
              {/* Facebook */}
              <a href="#" className="h-8 w-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Links Columns */}
          <div className="md:col-span-5 grid grid-cols-3 gap-4">
            {columns.map((col) => (
              <div key={col.title} className="flex flex-col gap-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-100/50">
                  {col.title}
                </p>
                <ul className="flex flex-col gap-2">
                  {col.links.map((link, i) => (
                    <li key={`${col.title}-${i}`}>
                      <Link
                        href={link.href}
                        className="text-xs text-emerald-50/80 transition-all duration-200 hover:text-white hover:translate-x-1 rtl:hover:-translate-x-1 inline-block"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Settings & App Downloads Column */}
          <div className="md:col-span-3 flex flex-col gap-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-100/50">
              {isAr ? "الإعدادات والتطبيقات" : "Settings & Apps"}
            </p>
            {/* Currency settings - EGP/USD only under rules */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] text-emerald-100/60">{isAr ? "العملة المفضلة" : "Preferred Currency"}</span>
              <div className="text-xs font-semibold bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 w-full">
                {isAr ? "EGP - الجنيه المصري" : "EGP - Egyptian Pound"}
              </div>
            </div>
            {/* App downloads visual */}
            <div className="flex flex-col gap-2 mt-2">
              <span className="text-[10px] text-emerald-100/60">{isAr ? "حمّل التطبيق" : "Download App"}</span>
              <div className="flex gap-2">
                <div className="flex-1 bg-white/5 border border-white/10 rounded-lg p-2 flex items-center gap-1.5 hover:bg-white/10 transition-colors cursor-pointer">
                  <svg className="h-4 w-4 text-emerald-100" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.523 15.3l-1.92-1.11a.48.48 0 00-.48 0L9.083 17.76a.48.48 0 00.24.83l3.82.26a.48.48 0 00.41-.18l3.97-3.32a.48.48 0 000-.55zM3.253 2.11a.48.48 0 00-.24.41v18.96a.48.48 0 00.73.41L18.473 12.3a.48.48 0 000-.82L3.743 2.18a.48.48 0 00-.49-.07z" />
                  </svg>
                  <div className="flex flex-col leading-none">
                    <span className="text-[7px] text-emerald-100/60 uppercase">Get it on</span>
                    <span className="text-[9px] font-bold">Google Play</span>
                  </div>
                </div>
                <div className="flex-1 bg-white/5 border border-white/10 rounded-lg p-2 flex items-center gap-1.5 hover:bg-white/10 transition-colors cursor-pointer">
                  <svg className="h-4 w-4 text-emerald-100" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.82M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.21.67-2.93 1.49-.62.69-1.16 1.84-1.01 2.96 1.12.09 2.27-.58 2.95-1.39" />
                  </svg>
                  <div className="flex flex-col leading-none">
                    <span className="text-[7px] text-emerald-100/60 uppercase">Download on</span>
                    <span className="text-[9px] font-bold">App Store</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom row */}
        <div className="mt-12 border-t border-white/5 pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs text-emerald-100/40">
          <p>
            © {new Date().getFullYear()} {isAr ? "سويّة. جميع الحقوق محفوظة." : "Sawiyaa. All rights reserved."}
          </p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link href="/help" className="hover:text-white transition-colors">{t("linkPrivacy")}</Link>
            <Link href="/refund-policies" className="hover:text-white transition-colors">{t("linkRefund")}</Link>
            <Link href="/help" className="hover:text-white transition-colors">{t("linkTerms")}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
