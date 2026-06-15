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
    { id: "support", label: isArabic ? "تذاكر الدعم" : "Support Tickets", count: supportCount, icon: <Headset className="h-3.5 w-3.5" />, color: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" },
    { id: "apps", label: isArabic ? "طلبات الممارسين" : "Practitioner Apps", count: applicationsCount, icon: <Users className="h-3.5 w-3.5" />, color: "bg-teal-500", text: "text-teal-600 dark:text-teal-400" },
    { id: "care", label: isArabic ? "طلبات الرعاية" : "Care Chat Requests", count: careCount, icon: <MessageSquareMore className="h-3.5 w-3.5" />, color: "bg-violet-500", text: "text-violet-600 dark:text-violet-400" },
    { id: "mod", label: isArabic ? "تقارير الإشراف" : "Moderation Reports", count: moderationCount, icon: <ShieldAlert className="h-3.5 w-3.5" />, color: "bg-slate-500", text: "text-slate-500 dark:text-slate-400" },
  ];

  return (
    <article className="flex flex-col rounded-3xl border border-slate-200/70 bg-white p-4 dark:border-white/5 dark:bg-white/[0.03] shadow-sm justify-between">
      <div>
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-text-primary dark:text-white/90">
            {isArabic ? "التركيز العملياتي اليومي" : "Daily Operational Focus"}
          </h2>
          <span className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-bold",
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
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <CheckCircle2 className="h-9 w-9 text-emerald-500 mb-2" />
            <p className="text-xs font-semibold text-text-primary dark:text-white/90">
              {isArabic ? "لا توجد مهام معلقة" : "All operations running smoothly"}
            </p>
            <p className="text-[10px] text-text-muted mt-0.5 max-w-[28ch]">
              {isArabic ? "تمت معالجة كافة تذاكر الدعم والطلبات بنجاح." : "All support tickets, practitioner submissions, and moderation cues are resolved."}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5 my-1">
            {items.map((item) => {
              if (item.count === 0) return null;
              const percentage = totalItems > 0 ? (item.count / totalItems) * 100 : 0;
              return (
                <div key={item.id} className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-semibold text-text-secondary">
                    <span className="flex items-center gap-1">
                      <span className={item.text}>{item.icon}</span>
                      <span>{item.label}</span>
                    </span>
                    <span className="text-text-primary dark:text-white">{item.count}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden">
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

      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/5">
        <p className="text-[10px] leading-relaxed text-text-muted">
          {totalItems > 0 
            ? (isArabic 
                ? "راجع تذاكر الدعم والطلبات المعلقة بانتظام لضمان جودة الخدمة."
                : "Review open support tickets and pending registrations to ensure smooth service.")
            : (isArabic 
                ? "جميع المؤشرات مستقرة."
                : "All systems stable.")
          }
        </p>
      </div>
    </article>
  );
}
