"use client";

import AdminSettlementBatchesScreen from "./AdminSettlementBatchesScreen";

/**
 * Backward-compatible export.
 * The settlements area is organized into child routes under `/admin/settlements`.
 */
export default function AdminSettlementsListScreen() {
  return <AdminSettlementBatchesScreen />;
}
