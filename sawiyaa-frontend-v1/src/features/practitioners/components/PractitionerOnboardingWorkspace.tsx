"use client";

import { useLocale, useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { usePractitionerApplicationStatus } from "../hooks/use-practitioners";
import { useAuthMe } from "@/features/auth/hooks/use-auth";
import PractitionerApplicationHub from "./application/PractitionerApplicationHub";
import PractitionerApplicationSubmittedView from "./application/PractitionerApplicationSubmittedView";
import PractitionerApplicationRejectedView from "./application/PractitionerApplicationRejectedView";
import PractitionerRequirementsHub from "./requirements/PractitionerRequirementsHub";
import PractitionerAccountSetupHub from "./setup/PractitionerAccountSetupHub";

export default function PractitionerOnboardingWorkspace() {
  const t = useTranslations("practitioner-area.application");
  const { data: authMe, isLoading: authLoading } = useAuthMe();
  const { data: statusData, isLoading: statusLoading } = usePractitionerApplicationStatus();

  const isLoading = authLoading || statusLoading;

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const application = statusData?.application;
  const status = application?.status;
  const isApproved = authMe?.isPractitionerApproved === true || status === "APPROVED";

  // Route to proper surface based on status
  if (isApproved) {
    return <PractitionerAccountSetupHub />;
  }

  if (status === "CHANGES_REQUESTED") {
    return <PractitionerRequirementsHub />;
  }

  if (status === "SUBMITTED" || status === "UNDER_REVIEW") {
    return <PractitionerApplicationSubmittedView />;
  }

  if (status === "REJECTED") {
    return <PractitionerApplicationRejectedView />;
  }

  // Default: Draft / Initial Application
  return <PractitionerApplicationHub />;
}
