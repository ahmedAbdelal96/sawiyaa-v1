import httpClient from "@/lib/api/http-client";
import { extractData } from "@/lib/api/response";
import type { ApiPayload } from "@/lib/api/contracts";
import type {
  HelpCategoriesResponseData,
  HelpCategory,
  HelpQuestionsResponseData,
  HelpQuestion,
  PublicHelpResponseData,
  ReorderHelpCategoriesInput,
  ReorderHelpQuestionsInput,
  UpsertHelpCategoryInput,
  UpsertHelpQuestionInput,
} from "../types/help.types";

type HelpCategoriesApiResponse = ApiPayload<{ items: HelpCategory[] }>;
type HelpQuestionsApiResponse = ApiPayload<{ items: HelpQuestion[] }>;
type PublicHelpApiResponse = ApiPayload<PublicHelpResponseData>;

export const HELP_ROUTES = {
  adminCategories: "/admin/help/categories",
  adminQuestions: "/admin/help/questions",
  publicHelp: "/public/help",
  publicCategories: "/public/help/categories",
  publicQuestions: "/public/help/questions",
  publicSearch: "/public/help/search",
} as const;

export async function listAdminHelpCategories(): Promise<HelpCategoriesResponseData> {
  const response = await httpClient.get<HelpCategoriesApiResponse>(HELP_ROUTES.adminCategories);
  return extractData(response.data);
}

export async function createAdminHelpCategory(
  input: UpsertHelpCategoryInput,
): Promise<HelpCategoriesResponseData> {
  const response = await httpClient.post<HelpCategoriesApiResponse>(HELP_ROUTES.adminCategories, input);
  return extractData(response.data);
}

export async function updateAdminHelpCategory(
  id: string,
  input: UpsertHelpCategoryInput,
): Promise<HelpCategoriesResponseData> {
  const response = await httpClient.patch<HelpCategoriesApiResponse>(`${HELP_ROUTES.adminCategories}/${id}`, input);
  return extractData(response.data);
}

export async function deleteAdminHelpCategory(id: string): Promise<HelpCategoriesResponseData> {
  const response = await httpClient.delete<HelpCategoriesApiResponse>(`${HELP_ROUTES.adminCategories}/${id}`);
  return extractData(response.data);
}

export async function reorderAdminHelpCategories(
  input: ReorderHelpCategoriesInput,
): Promise<HelpCategoriesResponseData> {
  const response = await httpClient.patch<HelpCategoriesApiResponse>(`${HELP_ROUTES.adminCategories}/reorder`, input);
  return extractData(response.data);
}

export async function listAdminHelpQuestions(): Promise<HelpQuestionsResponseData> {
  const response = await httpClient.get<HelpQuestionsApiResponse>(HELP_ROUTES.adminQuestions);
  return extractData(response.data);
}

export async function createAdminHelpQuestion(
  input: UpsertHelpQuestionInput,
): Promise<HelpQuestionsResponseData> {
  const response = await httpClient.post<HelpQuestionsApiResponse>(HELP_ROUTES.adminQuestions, input);
  return extractData(response.data);
}

export async function updateAdminHelpQuestion(
  id: string,
  input: UpsertHelpQuestionInput,
): Promise<HelpQuestionsResponseData> {
  const response = await httpClient.patch<HelpQuestionsApiResponse>(`${HELP_ROUTES.adminQuestions}/${id}`, input);
  return extractData(response.data);
}

export async function deleteAdminHelpQuestion(id: string): Promise<HelpQuestionsResponseData> {
  const response = await httpClient.delete<HelpQuestionsApiResponse>(`${HELP_ROUTES.adminQuestions}/${id}`);
  return extractData(response.data);
}

export async function reorderAdminHelpQuestions(
  input: ReorderHelpQuestionsInput,
): Promise<HelpQuestionsResponseData> {
  const response = await httpClient.patch<HelpQuestionsApiResponse>(`${HELP_ROUTES.adminQuestions}/reorder`, input);
  return extractData(response.data);
}

export async function fetchPublicHelp(): Promise<PublicHelpResponseData> {
  const response = await httpClient.get<PublicHelpApiResponse>(HELP_ROUTES.publicHelp);
  return extractData(response.data);
}

export async function fetchPublicHelpCategories(): Promise<HelpCategoriesResponseData> {
  const response = await httpClient.get<HelpCategoriesApiResponse>(HELP_ROUTES.publicCategories);
  return extractData(response.data);
}

export async function fetchPublicHelpQuestions(): Promise<HelpQuestionsResponseData> {
  const response = await httpClient.get<HelpQuestionsApiResponse>(HELP_ROUTES.publicQuestions);
  return extractData(response.data);
}

export async function searchPublicHelp(query: string): Promise<PublicHelpResponseData> {
  const response = await httpClient.get<PublicHelpApiResponse>(HELP_ROUTES.publicSearch, {
    params: { q: query },
  });
  return extractData(response.data);
}
