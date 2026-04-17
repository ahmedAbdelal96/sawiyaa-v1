import { getTranslations } from "next-intl/server";
import type { PublicArticleTrustMetadata } from "../types/articles-public.types";

type Props = {
  trust: PublicArticleTrustMetadata;
};

export default async function PublicArticleTrustBadges({ trust }: Props) {
  const t = await getTranslations("public-articles.trust");

  const visibleReasonCodes = trust.reasonCodes.filter(
    (code) => code !== "AUTHOR_UNATTRIBUTED",
  );

  return (
    <div className="flex flex-wrap gap-2">
      <span className="rounded-full bg-primary/8 px-3 py-1 text-xs font-semibold text-primary dark:bg-primary/15">
        {t(`freshness.${trust.freshnessBand}`)}
      </span>

      {visibleReasonCodes.map((code) => (
        <span
          key={code}
          className="rounded-full bg-surface-tertiary px-3 py-1 text-xs font-medium text-text-secondary dark:bg-white/6 dark:text-white/70"
        >
          {t(`reasons.${code}`)}
        </span>
      ))}
    </div>
  );
}
