"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import type { AdminRefundPolicyType } from "../types/admin-refund-policies.types";

type Props = {
  policyType: AdminRefundPolicyType;
};

export default function AdminRefundPolicyVersionScreen({ policyType }: Props) {
  const router = useRouter();

  useEffect(() => {
    void router.replace(`/admin/refund-policies/${policyType.toLowerCase()}` as never);
  }, [policyType, router]);

  return null;
}
