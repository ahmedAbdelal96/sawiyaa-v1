/**
 * Single specialty card for the public listing page.
 * Focused on fast scanning and clearer hierarchy for patients.
 */
import { Link } from "@/i18n/navigation";
import { ArrowRight, Brain, Sparkles } from "lucide-react";
import type { Specialty } from "@/features/specialties/types/specialties.types";

type Props = {
  specialty: Specialty;
  viewLabel: string;
  learnMoreLabel: string;
  categoryBadge: string | null;
};

export default function SpecialtyCard({
  specialty,
  viewLabel,
  learnMoreLabel,
  categoryBadge,
}: Props) {
  return (
    <Link
      href={`/specialties/${specialty.slug}`}
      className="app-panel app-lift group flex h-full flex-col rounded-[30px] p-6 hover:-translate-y-1"
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light text-primary shadow-[0_14px_28px_-22px_rgba(25,52,57,0.2)] ring-1 ring-inset ring-primary/8 transition-colors duration-300 group-hover:bg-primary group-hover:text-white">
          <Brain size={24} />
        </div>

        {categoryBadge ? (
          <span className="app-chip rounded-full px-3 py-1.5 text-xs font-medium">
            {categoryBadge}
          </span>
        ) : null}
      </div>

      <h3 className="text-xl font-bold leading-8 text-text-primary dark:text-white/92">
        {specialty.name}
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
          <Sparkles size={14} className="text-primary" />
          <span>{learnMoreLabel}</span>
        </div>

        <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
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
