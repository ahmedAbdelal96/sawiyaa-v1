import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ sessionId?: string }>;
};

export default async function AdminSessionRuntimeInspectorPage({
  params,
  searchParams,
}: Props) {
  const { locale } = await params;
  const { sessionId } = await searchParams;

  if (sessionId?.trim()) {
    redirect(`/${locale}/admin/sessions/${encodeURIComponent(sessionId.trim())}/review`);
  }

  redirect(`/${locale}/admin/sessions`);
}
