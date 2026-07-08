"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { AdminTableTabs } from "@/components/shared/admin/AdminDashboardKit";

export type AcademyProgramTabValue = "overview" | "learners" | "attendance";

type Props = {
  programId: string;
  value: AcademyProgramTabValue;
};

export default function AcademyProgramTabs({ programId, value }: Props) {
  const router = useRouter();
  const t = useTranslations("academy");

  return (
    <AdminTableTabs
      value={value}
      tabs={[
        { value: "overview", label: t("programs.tabs.overview") },
        { value: "learners", label: t("programs.tabs.learners") },
        { value: "attendance", label: t("programs.tabs.attendance") },
      ]}
      onChange={(nextValue) => {
        const prefix = `/admin/academy/programs/${programId}`;
        if (nextValue === "attendance") {
          router.push(`${prefix}/attendance`);
          return;
        }

        router.push(nextValue === "learners" ? `${prefix}/learners` : prefix);
      }}
    />
  );
}
