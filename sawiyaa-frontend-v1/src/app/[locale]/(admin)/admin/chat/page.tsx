import { redirect } from "next/navigation";

export default async function AdminChatPage() {
  redirect("/admin/messages?lane=all");
}
