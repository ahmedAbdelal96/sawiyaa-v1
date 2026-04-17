import type { PublicPractitioner } from "../types/practitioner";
import PractitionerCard from "./PractitionerCard";
import EmptyPractitionersState from "./EmptyPractitionersState";

type Props = {
  practitioners: PublicPractitioner[];
  specialtyLabels: Record<string, string>;
  languageLabels: Record<string, string>;
  basePath?: string;
};

export default function PractitionerGrid({
  practitioners,
  specialtyLabels,
  languageLabels,
  basePath,
}: Props) {
  if (practitioners.length === 0) {
    return <EmptyPractitionersState basePath={basePath} />;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {practitioners.map((p) => (
        <PractitionerCard
          key={p.id}
          practitioner={p}
          specialtyLabels={specialtyLabels}
          languageLabels={languageLabels}
          basePath={basePath}
        />
      ))}
    </div>
  );
}
