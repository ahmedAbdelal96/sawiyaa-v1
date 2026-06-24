// Deprecated compatibility route.
// Do not link to this route from application UI.
// Use /messages with lane/id query params instead.
import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function PractitionerSupportDetailPage({ params }: Props) {
  const { id } = await params;
  redirect(`/practitioner/messages?lane=support&id=${id}`);
}
