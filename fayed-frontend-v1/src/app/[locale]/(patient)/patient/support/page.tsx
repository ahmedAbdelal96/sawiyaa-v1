// Deprecated compatibility route.
// Do not link to this route from application UI.
// Use /messages with lane/id query params instead.
import { redirect } from "next/navigation";

export default async function PatientSupportPage() {
  redirect("/patient/messages?lane=support");
}
