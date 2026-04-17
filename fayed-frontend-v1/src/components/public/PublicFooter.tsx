import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function PublicFooter() {
  const t = await getTranslations("home.footer");

  const sections = [
    {
      title: t("sectionPlatform"),
      links: [
        { href: "/", label: t("linkHome") },
        { href: "/specialties", label: t("linkSpecialties") },
        { href: "/practitioners", label: t("linkPractitioners") },
        { href: "/articles", label: t("linkArticles") },
      ],
    },
  ];

  return (
    <footer className="border-t border-border-light bg-background dark:border-border-light dark:bg-background">
      <div className="app-max-shell-public mx-auto px-6 py-14">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-3">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="text-xl font-bold text-primary">
              فايد
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-text-secondary">
              {t("tagline")}
            </p>
          </div>

          {/* Link columns */}
          {sections.map((section) => (
            <div key={section.title}>
              <h4 className="mb-4 text-sm font-semibold text-text-primary dark:text-white/80">
                {section.title}
              </h4>
              <ul className="flex flex-col gap-2.5">
                {section.links.map((link) => (
                  <li key={link.href}>
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
          <p className="text-center text-xs text-text-muted">
            © {new Date().getFullYear()} {t("copyright")}
          </p>
        </div>
      </div>
    </footer>
  );
}
