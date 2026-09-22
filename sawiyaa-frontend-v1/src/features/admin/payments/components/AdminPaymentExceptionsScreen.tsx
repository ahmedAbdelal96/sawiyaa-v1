"use client";

import { useLocale } from "next-intl";
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { AlertCircle, RefreshCcw, Plus } from "lucide-react";
import { useAdminPaymentExceptions, useOpenAdminPaymentException } from "../hooks/use-admin-payments";

export default function AdminPaymentExceptionsScreen() {
  const locale = useLocale();
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [provider, setProvider] = useState("");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [openForm, setOpenForm] = useState(false);
  const [paymentId, setPaymentId] = useState("");
  const [reason, setReason] = useState("");
  const [openType, setOpenType] = useState<"LATE_PROVIDER_SUCCESS" | "WEBHOOK_CONFLICT" | "RECONCILIATION_ISSUE" | "UNKNOWN_PAYMENT_STATE">("UNKNOWN_PAYMENT_STATE");
  const openCase = useOpenAdminPaymentException();
  const exceptions = useAdminPaymentExceptions({ ...(type ? { type } : {}), ...(status ? { status } : {}), ...(provider ? { provider } : {}), ...(createdFrom ? { createdFrom } : {}), ...(createdTo ? { createdTo } : {}) });
  const ar = locale === "ar";

  if (exceptions.isLoading) return <div className="p-6 text-sm text-text-muted">{ar ? "جارٍ تحميل الحالات…" : "Loading cases…"}</div>;
  if (exceptions.isError) return <div className="p-6"><button type="button" onClick={() => exceptions.refetch()} className="inline-flex items-center gap-2 rounded-xl border border-border-light px-4 py-2 text-sm"><RefreshCcw className="h-4 w-4" />{ar ? "إعادة المحاولة" : "Retry"}</button></div>;

  const rows = exceptions.data ?? [];
  return (
    <div className="space-y-6">
      <div className="app-panel rounded-[28px] border border-border-light p-6 dark:border-white/8">
        <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><AlertCircle className="h-6 w-6 text-rose-500" /><div><h1 className="text-2xl font-bold">{ar ? "استثناءات الدفع" : "Payment exceptions"}</h1><p className="mt-1 text-sm text-text-secondary">{ar ? "طابور الحالات التشغيلية التي تحتاج مراجعة مالية." : "Operational cases requiring financial review."}</p></div></div><button type="button" onClick={() => setOpenForm((value) => !value)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white"><Plus className="h-4 w-4" />{ar ? "فتح حالة" : "Open case"}</button></div>
        {openForm ? <form className="mt-4 grid gap-3 rounded-2xl border border-border-light p-4 sm:grid-cols-4" onSubmit={(event) => { event.preventDefault(); if (!paymentId.trim() || !reason.trim()) return; openCase.mutate({ paymentId: paymentId.trim(), type: openType, reason: reason.trim() }, { onSuccess: () => { setOpenForm(false); setPaymentId(""); setReason(""); } }); }}><input className="app-control px-3 py-2 text-sm" value={paymentId} onChange={(event) => setPaymentId(event.target.value)} placeholder={ar ? "معرف الدفع" : "Payment id"} /><select className="app-control px-3 py-2 text-sm" value={openType} onChange={(event) => setOpenType(event.target.value as typeof openType)}><option value="UNKNOWN_PAYMENT_STATE">UNKNOWN_PAYMENT_STATE</option><option value="LATE_PROVIDER_SUCCESS">LATE_PROVIDER_SUCCESS</option><option value="WEBHOOK_CONFLICT">WEBHOOK_CONFLICT</option><option value="RECONCILIATION_ISSUE">RECONCILIATION_ISSUE</option></select><input className="app-control px-3 py-2 text-sm" value={reason} onChange={(event) => setReason(event.target.value)} placeholder={ar ? "سبب الحالة" : "Reason"} /><button type="submit" disabled={openCase.isPending} className="rounded-xl border border-primary px-3 py-2 text-xs font-semibold text-primary">{openCase.isPending ? (ar ? "جارٍ الفتح…" : "Opening…") : (ar ? "حفظ" : "Save")}</button></form> : null}
        <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <select className="app-control px-3 py-2 text-sm" value={type} onChange={(event) => setType(event.target.value)}><option value="">{ar ? "كل الأنواع" : "All types"}</option><option value="LATE_PROVIDER_SUCCESS">LATE_PROVIDER_SUCCESS</option><option value="WEBHOOK_CONFLICT">WEBHOOK_CONFLICT</option><option value="RECONCILIATION_ISSUE">RECONCILIATION_ISSUE</option><option value="UNKNOWN_PAYMENT_STATE">UNKNOWN_PAYMENT_STATE</option></select>
          <select className="app-control px-3 py-2 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">{ar ? "كل الحالات" : "All statuses"}</option><option value="OPEN">OPEN</option><option value="IN_REVIEW">IN_REVIEW</option><option value="RESOLVED">RESOLVED</option><option value="DISMISSED">DISMISSED</option></select>
          <select className="app-control px-3 py-2 text-sm" value={provider} onChange={(event) => setProvider(event.target.value)}><option value="">{ar ? "كل مزودي الدفع" : "All providers"}</option><option value="PAYMOB">PAYMOB</option><option value="STRIPE">STRIPE</option><option value="INTERNAL_WALLET">INTERNAL_WALLET</option></select>
          <input className="app-control px-3 py-2 text-sm" type="date" value={createdFrom} onChange={(event) => setCreatedFrom(event.target.value)} aria-label={ar ? "من تاريخ" : "From date"} />
          <input className="app-control px-3 py-2 text-sm" type="date" value={createdTo} onChange={(event) => setCreatedTo(event.target.value)} aria-label={ar ? "إلى تاريخ" : "To date"} />
        </div>
      </div>
      {!rows.length ? <div className="rounded-2xl border border-dashed border-border-light p-8 text-center text-sm text-text-muted">{ar ? "لا توجد حالات مفتوحة." : "No payment exceptions."}</div> : (
        <div className="overflow-x-auto rounded-2xl border border-border-light dark:border-white/8"><table className="min-w-full text-sm"><thead className="bg-surface-secondary/50 text-start text-xs text-text-muted"><tr><th className="px-4 py-3 text-start">{ar ? "النوع" : "Type"}</th><th className="px-4 py-3 text-start">{ar ? "الحالة" : "Status"}</th><th className="px-4 py-3 text-start">{ar ? "السبب" : "Reason"}</th><th className="px-4 py-3 text-start">{ar ? "الدفع" : "Payment"}</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-t border-border-light dark:border-white/8"><td className="px-4 py-3 font-semibold">{row.type}</td><td className="px-4 py-3">{row.status}</td><td className="px-4 py-3 text-text-secondary">{row.reason}</td><td className="px-4 py-3"><Link className="text-primary hover:underline" href={`/admin/payments/${row.paymentId}`}>{row.paymentId.slice(0, 8)}…</Link></td></tr>)}</tbody></table></div>
      )}
    </div>
  );
}
