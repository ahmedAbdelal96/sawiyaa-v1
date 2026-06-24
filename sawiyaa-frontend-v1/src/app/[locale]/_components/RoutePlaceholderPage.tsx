import ModulePlaceholder from "@/components/shared/ModulePlaceholder";
import { Metadata } from "next";

export type PlaceholderDefinition = {
  title: string;
  description: string;
  eyebrow?: string;
};

export function buildPlaceholderMetadata(
  definition: PlaceholderDefinition
): Metadata {
  return {
    title: definition.title,
    description: definition.description,
  };
}

export default function RoutePlaceholderPage({
  title,
  description,
  eyebrow,
}: PlaceholderDefinition) {
  return (
    <ModulePlaceholder
      title={title}
      description={description}
      eyebrow={eyebrow}
    />
  );
}
