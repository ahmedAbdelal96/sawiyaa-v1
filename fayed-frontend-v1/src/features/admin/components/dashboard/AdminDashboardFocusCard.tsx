import { Headset, Users, MessageSquareMore, ShieldAlert, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

type AdminDashboardFocusCardProps = {
  locale: string;
  supportCount: number;
  applicationsCount: number;
  careCount: number;
  moderationCount: number;
};

export function AdminDashboardFocusCard({
  locale,
  supportCount,
  applicationsCount,
  careCount,
  moderationCount,
}: AdminDashboardFocusCardProps) {
  const isArabic = locale === "ar";
  const totalItems = supportCount + applicationsCount + careCount + moderationCount;

  const items = [
    { id: "support", label: isArabic ? "تذاكر الدعم" : "Support Tickets", count: supportCount, icon: <Headset className="h-4 w-4" />, color: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" },
    { id: "apps", label: isArabic ? "طلبات الممارسين" : "Practitioner Apps", count: applicationsCount, icon: <Users className="h-4 w-4" />, color: "bg-teal-500", text: "text-teal-600 dark:text-teal-400" },
    { id: "care", label: isArabic ? "طلبات الرعاية" : "Care Chat Requests", count: careCount, icon: <MessageSquareMore className="h-4 w-4" />, color: "bg-violet-500", text: "text-violet-600 dark:text-violet-400" },
    { id: "mod", label: isArabic ? "تقارير الإشراف" : "Moderation Reports", count: moderationCount, icon: <ShieldAlert className="h-4 w-4" />, color: "bg-slate-500", text: "text-slate-500 dark:text-slate-400" },
  ];

  return (
    <article className="flex flex-col h-full rounded-3xl border border-slate-200/70 bg-white p-5 dark:border-white/5 dark:bg-white/[0.03] shadow-sm sm:p-6 justify-between min-h-[300px]">
      <div>
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-base font-semibold tracking-tight text-text-primary dark:text-white/95">
            {isArabic ? "التركيز العملياتي اليومي" : "Daily Operational Focus"}
          </h2>
          <span className={cn(
            "rounded-full px-2.5 py-0.5 text-xs font-semibold",
            totalItems > 0 
              ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400" 
              : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
          )}>
            {totalItems > 0 
              ? (isArabic ? `${totalItems} معلق` : `${totalItems} pending`)
              : (isArabic ? "مكتمل" : "All caught up")
            }
          </span>
        </div>

        {totalItems === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-3" />
            <p className="text-sm font-medium text-text-primary dark:text-white/90">
              {isArabic ? "رائع! لا توجد مهام معلقة" : "All operations running smoothly"}
            </p>
            <p className="text-xs text-text-muted mt-1 max-w-[24ch]">
              {isArabic ? "تمت معالجة كافة طلبات الممارسين والدعم والتقارير." : "All support tickets, practitioner submissions, and moderation cues are resolved."}
            </p>
          </div>
        ) : (
          <div className="space-y-4 my-2">
            {items.map((item) => {
              if (item.count === 0) return null;
              const percentage = totalItems > 0 ? (item.count / totalItems) * 100 : 0;
              return (
                <div key={item.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-medium text-text-secondary">
                    <span className="flex items-center gap-1.5">
                      <span className={item.text}>{item.icon}</span>
                      <span>{item.label}</span>
                    </span>
                    <span className="font-semibold text-text-primary dark:text-white">{item.count}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden">
                    <div 
                      className={cn("h-full rounded-full transition-all duration-500", item.color)} 
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/5">
        <p className="text-[11px] leading-relaxed text-text-muted">
          {totalItems > 0 
            ? (isArabic 
                ? "يرجى مراجعة تذاكر الدعم المفتوحة وطلبات التسجيل المعلقة بانتظام لضمان رضا الممارسين والعملاء."
                : "Please review open support tickets and pending registrations to ensure a seamless client and practitioner experience.")
            : (isArabic 
                ? "جميع المؤشرات مستقرة. لا يتطلب أي إجراء فوري حالياً."
                : "All systems stable. No immediate operational actions required.")
          }
        </p>
      </div>
    </article>
  );
}
