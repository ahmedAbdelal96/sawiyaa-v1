"use client";

import { useMemo, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { DEFAULT_PAGE_LIMIT } from "@/constants/pagination";
import type { SupportTicketStatus, SupportTicketsListParams } from "../types/support.types";
import { useCreatePatientSupportTicket, usePatientSupportTickets } from "../hooks/use-support";
import SupportInboxView from "./shared/SupportInboxView";

export default function PatientSupportHomeScreen() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<SupportTicketStatus | "ALL">("ALL");

  const params: SupportTicketsListParams = useMemo(
    () => ({
      page: 1,
      limit: DEFAULT_PAGE_LIMIT,
      status: statusFilter === "ALL" ? undefined : statusFilter,
    }),
    [statusFilter],
  );

  const tickets = usePatientSupportTickets(params);
  const create = useCreatePatientSupportTicket();

  const handleCreateFromMessage = async (message: string) => {
    const clean = message.trim();
    const subject = clean.slice(0, 80);
    const created = await create.mutateAsync({
      category: "GENERAL",
      subject,
      description: clean,
    });
    return created.item.id;
  };

  return (
    <SupportInboxView
      scope="patient"
      items={tickets.data?.items ?? []}
      totalItems={tickets.data?.pagination.totalItems}
      isLoading={tickets.isLoading}
      isError={tickets.isError}
      statusFilter={statusFilter}
      onStatusFilterChange={setStatusFilter}
      onCreateFromMessage={handleCreateFromMessage}
      onOpenConversation={(id) => router.push(`/patient/support/${id}` as never)}
    />
  );
}
