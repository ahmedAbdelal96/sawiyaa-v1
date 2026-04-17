import type { PaymentProvider, PaymentStatus } from "@/features/payments/types/payments.types";
import type { AdminPaymentPurpose, AdminRefundStatus } from "@/features/admin/payments/types/admin-payments.types";

export type FinanceOperationType = "PAYMENT" | "REFUND";
export type FinanceOperationSortBy = "OCCURRED_AT" | "CREATED_AT";
export type FinanceOperationSortOrder = "ASC" | "DESC";

export type ListAdminFinanceOperationEventsParams = {
  page?: number;
  limit?: number;
  operationType?: FinanceOperationType;
  provider?: PaymentProvider;
  paymentPurpose?: AdminPaymentPurpose;
  paymentStatus?: PaymentStatus;
  refundStatus?: AdminRefundStatus;
  paymentId?: string;
  refundId?: string;
  occurredFrom?: string;
  occurredTo?: string;
  sortBy?: FinanceOperationSortBy;
  sortOrder?: FinanceOperationSortOrder;
  query?: string;
};

export type FinanceOperationEventPagination = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
};

export type FinanceOperationEventFilters = {
  sortBy: FinanceOperationSortBy;
  sortOrder: FinanceOperationSortOrder;
  operationType: FinanceOperationType | null;
  provider: PaymentProvider | null;
  paymentPurpose: AdminPaymentPurpose | null;
  paymentStatus: PaymentStatus | null;
  refundStatus: AdminRefundStatus | null;
  paymentId: string | null;
  refundId: string | null;
  occurredFrom: string | null;
  occurredTo: string | null;
  query: string | null;
};

export type FinanceOperationEventItem = {
  id: string;
  operationType: FinanceOperationType;
  paymentId: string | null;
  refundId: string | null;
  provider: PaymentProvider | null;
  paymentPurpose: AdminPaymentPurpose | null;
  paymentStatus: PaymentStatus | null;
  refundStatus: AdminRefundStatus | null;
  externalRef: string | null;
  summary: string | null;
  linkedSessionId: string | null;
  linkedPatientId: string | null;
  linkedPractitionerId: string | null;
  patientDisplayName: string | null;
  practitionerDisplayName: string | null;
  occurredAt: string;
  createdAt: string;
};

export type FinanceOperationEventsListData = {
  items: FinanceOperationEventItem[];
  pagination: FinanceOperationEventPagination;
  filters: FinanceOperationEventFilters;
};

export type FinanceOperationEventDetailData = {
  item: FinanceOperationEventItem;
};
