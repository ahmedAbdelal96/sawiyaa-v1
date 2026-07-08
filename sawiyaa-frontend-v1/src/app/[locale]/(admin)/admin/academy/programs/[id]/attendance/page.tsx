import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminAcademyProgramAttendanceScreen from "@/features/academy-programs/components/AdminAcademyProgramAttendanceScreen";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "academy" });

  return {
    title: t("meta.adminProgramAttendanceTitle"),
    description: t("meta.adminProgramAttendanceDescription"),
  };
}

export default async function AdminAcademyProgramAttendancePage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  return <AdminAcademyProgramAttendanceScreen programId={id} />;
}
