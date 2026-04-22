import { requireAuthenticatedArea } from "@/lib/auth/access";
import DashboardLayout from "@/layout/DashboardLayout";
import { adminNavigation } from "@/config/navigation";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function AdminLayout({ children, params }: Props) {
  const { locale } = await params;
  await requireAuthenticatedArea(locale, "admin");
  return (
    <DashboardLayout
      navigation={adminNavigation}
      basePathPrefix="/admin"
      layoutVariant="admin"
      messagingRole="admin"
    >
      {children}
    </DashboardLayout>
  );
}
