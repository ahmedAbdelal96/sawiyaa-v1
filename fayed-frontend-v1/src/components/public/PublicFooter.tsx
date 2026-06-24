import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function PublicFooter() {
  const t = await getTranslations("home.footer");

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
    <footer className="border-t border-border-light bg-surface dark:border-border-light dark:bg-surface">
      <div className="app-max-shell-public mx-auto px-6 py-12">
        <div className="grid gap-10 md:grid-cols-4">
          {/* Brand column */}
          <div className="md:col-span-1">
            <Link href="/" className="text-xl font-bold tracking-tight text-primary">
              Sawiyaa
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-text-secondary">
              {t("tagline")}
            </p>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <div key={col.title} className="flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
                {col.title}
              </p>
              <ul className="flex flex-col gap-2">
                {col.links.map((link, i) => (
                  <li key={`${col.title}-${i}`}>
                    <Link
                      href={link.href}
                      className="text-sm text-text-secondary transition-colors hover:text-primary"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t border-border-light pt-6">
          <p className="text-sm text-text-muted">
            © {new Date().getFullYear()} {t("copyright")}
          </p>
        </div>
      </div>
    </footer>
  );
}