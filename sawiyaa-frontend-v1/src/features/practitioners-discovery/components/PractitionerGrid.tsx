import type { ActiveFeeFilterContext, PublicPractitioner } from "../types/practitioner";
import PractitionerCard from "./PractitionerCard";
import EmptyPractitionersState from "./EmptyPractitionersState";

type Props = {
  practitioners: PublicPractitioner[];
  specialtyLabels: Record<string, string>;
  languageLabels: Record<string, string>;
  activeFeeFilter: ActiveFeeFilterContext;
  basePath?: string;
};

export default function PractitionerGrid({
  practitioners,
  specialtyLabels,
  languageLabels,
  activeFeeFilter,
  basePath,
}: Props) {
  if (practitioners.length === 0) {
    return <EmptyPractitionersState basePath={basePath} />;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {practitioners.map((p) => (
        <PractitionerCard
          key={p.id}
          practitioner={p}
          specialtyLabels={specialtyLabels}
          languageLabels={languageLabels}
          activeFeeFilter={activeFeeFilter}
          basePath={basePath}
        />
      ))}
    </div>
  );
}
