import { serverGet } from "@/lib/api/server-http-client";
import type {
  ListPublicTrainingsParams,
  PublicTrainingDetails,
  PublicTrainingItemResponse,
  PublicTrainingsListData,
} from "../types/training.types";

export const TRAINING_PUBLIC_ROUTES = {
  list: "/trainings",
  bySlug: (slug: string) => `/trainings/${slug}`,
} as const;

export async function fetchPublicTrainings(
  locale: string,
  params: ListPublicTrainingsParams = {},
): Promise<PublicTrainingsListData> {
  return serverGet<PublicTrainingsListData>(TRAINING_PUBLIC_ROUTES.list, {
    locale,
    params,
  });
}

export async function fetchPublicTrainingBySlug(
  slug: string,
  locale: string,
): Promise<PublicTrainingDetails | null> {
  try {
    const data = await serverGet<PublicTrainingItemResponse>(
      TRAINING_PUBLIC_ROUTES.bySlug(slug),
      { locale },
    );
    return data.item;
  } catch (err) {
    if ((err as { status?: number }).status === 404) return null;
    throw err;
  }
}
