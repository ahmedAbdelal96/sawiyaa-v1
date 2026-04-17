import { SurfaceActionLink, SurfaceCard } from "@/components/shared/SurfaceShell";

type ModulePlaceholderProps = {
  title: string;
  description: string;
  eyebrow?: string;
  cta?: {
    href: string;
    label: string;
  };
};

export default function ModulePlaceholder({
  title,
  description,
  eyebrow,
  cta,
}: ModulePlaceholderProps) {
  return (
    <SurfaceCard as="section" variant="page">
      {eyebrow && (
        <span className="app-chip inline-flex rounded-full px-3 py-1 text-xs font-medium">
          {eyebrow}
        </span>
      )}
      <h1 className="mt-4 text-2xl font-bold text-text-primary dark:text-white">{title}</h1>
      <p className="mt-2 text-sm leading-7 text-text-secondary dark:text-text-secondary">{description}</p>
      {cta && (
        <div className="mt-6">
          <SurfaceActionLink href={cta.href} variant="primary">
            {cta.label}
          </SurfaceActionLink>
        </div>
      )}
    </SurfaceCard>
  );
}
