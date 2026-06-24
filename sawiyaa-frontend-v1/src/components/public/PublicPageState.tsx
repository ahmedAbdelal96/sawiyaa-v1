import type { ReactNode } from "react";
import { SurfaceActionLink, SurfaceCard } from "@/components/shared/SurfaceShell";

type PublicPageStateAction = {
  href: string;
  label: string;
  primary?: boolean;
};

type Props = {
  eyebrow: string;
  title: string;
  description: string;
  icon?: ReactNode;
  actions?: PublicPageStateAction[];
  compact?: boolean;
};

export default function PublicPageState({
  eyebrow,
  title,
  description,
  icon,
  actions = [],
  compact = false,
}: Props) {
  return (
    <section className={compact ? "px-6 py-12" : "px-6 py-16 lg:py-24"}>
      <div className="mx-auto max-w-4xl">
        <SurfaceCard
          variant="page"
          className={`text-center ${compact ? "" : "min-h-[360px] md:p-10"}`}
        >
          {icon ? <div className="mb-5 flex justify-center text-primary">{icon}</div> : null}
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary/80">
            {eyebrow}
          </p>
          <h1 className="mt-4 text-3xl font-bold tracking-[-0.03em] text-text-primary dark:text-white/92 md:text-4xl">
            {title}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-text-secondary">
            {description}
          </p>

          {actions.length > 0 ? (
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {actions.map((action) => (
                <SurfaceActionLink
                  key={`${action.href}-${action.label}`}
                  href={action.href}
                  variant={action.primary ? "primary" : "secondary"}
                >
                  {action.label}
                </SurfaceActionLink>
              ))}
            </div>
          ) : null}
        </SurfaceCard>
      </div>
    </section>
  );
}
