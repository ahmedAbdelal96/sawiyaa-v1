import { redirect } from "next/navigation";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ sessionId?: string }> };

export default async function AdminSessionRuntimeInspectionPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { sessionId } = await searchParams;
  redirect(`/${locale}/admin/sessions/runtime-inspector${sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : ""}`);
}
