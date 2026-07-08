import { Link } from "@/i18n/navigation";
import {
  ArrowRight,
  Brain,
  Sparkles,
  Heart,
  Baby,
  Users,
  Scale,
  Compass,
  HeartPulse,
  Zap,
  Apple,
  Activity,
  Sparkle
} from "lucide-react";
import { useLocale } from "next-intl";
import type { Specialty } from "@/features/specialties/types/specialties.types";
import { getLocalizedSpecialtyName } from "@/features/specialties/utils/localized-specialty";

type Props = {
  specialty: Specialty;
  viewLabel: string;
  learnMoreLabel: string;
  categoryBadge: string | null;
  categorySlug?: string;
};

type SpecialtyTheme = {
  iconColor: string;
  iconBg: string;
  hoverBorder: string;
  hoverShadow: string;
  accentBar: string;
  chipBg: string;
  chipText: string;
};

function getSpecialtyTheme(categorySlug?: string): SpecialtyTheme {
  if (!categorySlug) {
    return {
      iconColor: "text-primary",
      iconBg: "bg-primary-light dark:bg-primary/10",
      hoverBorder: "hover:border-primary/30 hover:ring-2 hover:ring-primary/5",
      hoverShadow: "hover:shadow-sawiyaa-card",
      accentBar: "bg-primary",
      chipBg: "bg-surface-tertiary",
      chipText: "text-text-secondary",
    };
  }

  switch (categorySlug) {
    case "mental-health":
      return {
        iconColor: "text-[#24564F]",
        iconBg: "bg-emerald-50 dark:bg-emerald-950/30",
        hoverBorder: "hover:border-[#24564F]/30 hover:ring-2 hover:ring-[#24564F]/5",
        hoverShadow: "hover:shadow-[0_8px_24px_rgba(36,86,79,0.08)]",
        accentBar: "bg-[#24564F]",
        chipBg: "bg-emerald-50 dark:bg-emerald-950/20",
        chipText: "text-[#24564F] dark:text-emerald-300",
      };
    case "nutrition":
      return {
        iconColor: "text-[#B58E58]",
        iconBg: "bg-amber-50 dark:bg-amber-950/30",
        hoverBorder: "hover:border-[#C8A979]/30 hover:ring-2 hover:ring-[#C8A979]/5",
        hoverShadow: "hover:shadow-[0_8px_24px_rgba(200,169,121,0.08)]",
        accentBar: "bg-[#C8A979]",
        chipBg: "bg-amber-50 dark:bg-amber-950/20",
        chipText: "text-[#B58E58] dark:text-amber-300",
      };
    case "sports-therapy":
      return {
        iconColor: "text-[#3F6E58]",
        iconBg: "bg-cyan-50 dark:bg-cyan-950/30",
        hoverBorder: "hover:border-[#3F6E58]/30 hover:ring-2 hover:ring-[#3F6E58]/5",
        hoverShadow: "hover:shadow-[0_8px_24px_rgba(63,110,88,0.08)]",
        accentBar: "bg-[#3F6E58]",
        chipBg: "bg-cyan-50 dark:bg-cyan-950/20",
        chipText: "text-[#3F6E58] dark:text-cyan-300",
      };
    default:
      return {
        iconColor: "text-primary",
        iconBg: "bg-primary-light dark:bg-primary/10",
        hoverBorder: "hover:border-primary/30 hover:ring-2 hover:ring-primary/5",
        hoverShadow: "hover:shadow-sawiyaa-card",
        accentBar: "bg-primary",
        chipBg: "bg-surface-tertiary",
        chipText: "text-text-secondary",
      };
  }
}

function getSpecialtyIcon(slug: string) {
  const normalized = slug.toLowerCase();
  if (
    normalized.includes("depression") ||
    normalized.includes("اكتئاب") ||
    normalized.includes("eating") ||
    normalized.includes("أكل")
  ) {
    return Heart;
  }
  if (
    normalized.includes("anxiety") ||
    normalized.includes("قلق") ||
    normalized.includes("stress")
  ) {
    return Sparkles;
  }
  if (normalized.includes("child") || normalized.includes("طفل")) {
    return Baby;
  }
  if (
    normalized.includes("family") ||
    normalized.includes("أسرة") ||
    normalized.includes("أسرى") ||
    normalized.includes("counseling")
  ) {
    return Users;
  }
  if (
    normalized.includes("weight") ||
    normalized.includes("وزن") ||
    normalized.includes("obesity") ||
    normalized.includes("سمنة")
  ) {
    return Scale;
  }
  if (
    normalized.includes("performance") ||
    normalized.includes("أداء") ||
    normalized.includes("تحسين")
  ) {
    return Zap;
  }
  if (
    normalized.includes("injury") ||
    normalized.includes("إصابات") ||
    normalized.includes("rehab") ||
    normalized.includes("تأهيل")
  ) {
    return HeartPulse;
  }
  if (
    normalized.includes("nutrition") ||
    normalized.includes("تغذية") ||
    normalized.includes("diet")
  ) {
    return Apple;
  }
  return Compass;
}

export default function SpecialtyCard({
  specialty,
  viewLabel,
  learnMoreLabel,
  categoryBadge,
  categorySlug,
}: Props) {
  const locale = useLocale();
  const theme = getSpecialtyTheme(categorySlug);
  const SpecialtyIcon = getSpecialtyIcon(specialty.slug);

  return (
    <Link
      href={`/specialties/${specialty.slug}`}
      className={`app-panel app-lift group relative flex h-full flex-col overflow-hidden rounded-[30px] border border-border-light/60 p-6 transition-all duration-300 ${theme.hoverBorder} ${theme.hoverShadow} hover:-translate-y-1.5`}
    >
      {/* Dynamic top accent line that animates on hover */}
      <span className={`absolute top-0 right-0 left-0 h-[3px] opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${theme.accentBar}`} />

      <div className="mb-5 flex items-start justify-between gap-4">
        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${theme.iconBg} ${theme.iconColor} shadow-[0_14px_28px_-22px_rgba(25,52,57,0.2)] ring-1 ring-inset ring-primary/8 transition-colors duration-300 group-hover:bg-[#24564F] group-hover:text-white`}>
          <SpecialtyIcon size={24} />
        </div>

        {categoryBadge ? (
          <span className={`app-chip rounded-full px-3 py-1.5 text-xs font-medium ${theme.chipBg} ${theme.chipText}`}>
            {categoryBadge}
          </span>
        ) : null}
      </div>

      <h3 className="text-xl font-bold leading-8 text-text-primary transition-colors duration-200 group-hover:text-text-brand dark:text-white/92">
        {getLocalizedSpecialtyName(specialty, locale)}
      </h3>

      {specialty.description ? (
        <p className="mt-3 flex-1 text-sm leading-7 text-text-secondary">
          {specialty.description}
        </p>
      ) : (
        <p className="mt-3 flex-1 text-sm leading-7 text-text-muted">
          {learnMoreLabel}
        </p>
      )}

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-border-light pt-4 dark:border-border-light">
        <div className="inline-flex items-center gap-2 text-sm text-text-muted">
          <Sparkle size={14} className={theme.iconColor} />
          <span>{learnMoreLabel}</span>
        </div>

        <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-colors duration-200 group-hover:text-[#24564F]">
          <span>{viewLabel}</span>
          <ArrowRight
            size={14}
            className="rtl:rotate-180 transition-transform duration-200 group-hover:translate-x-1 rtl:group-hover:-translate-x-1"
          />
        </div>
      </div>
    </Link>
  );
}
