import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function PublicFooter() {
  const [t, locale] = await Promise.all([
    getTranslations("home.footer"),
    getLocale(),
  ]);

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
    {
      title: t("sectionAccount"),
      links: [
        { label: t("linkLogin"), href: "/signin" },
        { label: t("linkSignup"), href: "/signup" },
        { label: t("linkJoinPractitioner"), href: "/signin?mode=practitioner" },
      ],
    },
  ];

  return (
    <footer className="border-t border-white/5 bg-[#1C2F2B] text-white dark:bg-[#0b1212]">
      <div className="app-max-shell-public mx-auto px-6 py-16 sm:py-20">
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-5">
          {/* Brand column */}
          <div className="sm:col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="h-8 w-8 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 transition-all duration-300 group-hover:scale-105">
                <span className="text-white font-bold text-sm">S</span>
              </span>
              <span className="text-xl font-bold tracking-tight text-white">
                {locale === "ar" ? "سويّة" : "Sawiyaa"}
              </span>
            </Link>
            <p className="mt-4 text-xs leading-relaxed text-emerald-100/70 max-w-[200px]">
              {t("tagline")}
            </p>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <div key={col.title} className="flex flex-col gap-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-100/50">
                {col.title}
              </p>
              <ul className="flex flex-col gap-2.5">
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

        <div className="mt-16 border-t border-white/5 pt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p className="text-xs text-emerald-100/40">
            © {new Date().getFullYear()} {t("copyright")}
          </p>
          <div className="flex items-center gap-4 text-xs text-emerald-100/40">
            <span>{locale === "ar" ? "رعاية للعقل والجسم والتوازن" : "Care for mind, body, and balance"}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}