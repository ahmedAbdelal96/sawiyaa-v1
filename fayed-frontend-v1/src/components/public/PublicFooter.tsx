import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function PublicFooter() {
  const t = await getTranslations("home.footer");

  return (
    <footer className="border-t border-border-light bg-background dark:border-border-light dark:bg-background">
      <div className="app-max-shell-public mx-auto px-6 py-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-md">
            <Link href="/" className="text-xl font-bold tracking-tight text-primary">
              Fayed
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-text-secondary">{t("tagline")}</p>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-text-secondary">
            <Link href="/help" className="transition-colors hover:text-primary">
              {t("linkAccessibility")}
            </Link>
            <Link href="/help" className="transition-colors hover:text-primary">
              {t("linkCookiePolicy")}
            </Link>
            <Link href="/help" className="transition-colors hover:text-primary">
              {t("linkTerms")}
            </Link>
            <Link href="/help" className="transition-colors hover:text-primary">
              {t("linkPrivacy")}
            </Link>
          </div>
        </div>

        <div className="mt-8 border-t border-border-light pt-4">
          <p className="text-sm text-text-muted">
            © {new Date().getFullYear()} {t("copyright")}
          </p>
        </div>
      </div>
    </footer>
  );
}
