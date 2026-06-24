import { redirect } from "next/navigation";

export default async function PatientChatPage() {
  redirect("/patient/messages?lane=all");
}
