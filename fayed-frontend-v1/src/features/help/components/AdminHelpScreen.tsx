"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { BookOpenText, FolderTree, HelpCircle, ListTodo } from "lucide-react";
import AdminOperationalListShell from "@/components/shared/admin/AdminOperationalListShell";
import { useAdminHelpCategories, useAdminHelpQuestions } from "../hooks/use-help";
import { HelpAdminSectionNav } from "./AdminHelpShared";

export default function AdminHelpScreen() {
  const t = useTranslations("admin-help");
  const locale = useLocale();
  const categoriesQuery = useAdminHelpCategories();
  const questionsQuery = useAdminHelpQuestions();

  const categoriesCount = categoriesQuery.isLoading && !categoriesQuery.data ? "—" : categoriesQuery.data?.items.length ?? 0;
  const questionsCount = questionsQuery.isLoading && !questionsQuery.data ? "—" : questionsQuery.data?.items.length ?? 0;
  const activeCount =
    categoriesQuery.isLoading && !categoriesQuery.data && questionsQuery.isLoading && !questionsQuery.data
      ? "—"
      : (categoriesQuery.data?.items.filter((item) => item.isActive).length ?? 0) +
        (questionsQuery.data?.items.filter((item) => item.isActive).length ?? 0);

  return (
    <AdminOperationalListShell
      eyebrow={t("page.eyebrow")}
      title={t("page.title")}
      description={t("page.description")}
      actions={<HelpAdminSectionNav current="home" />}
    >
      <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-border-light bg-surface px-4 py-3 text-sm text-text-secondary">
        <span className="font-medium text-text-primary">{t("summary.categories")}:</span>
        <span>{categoriesCount}</span>
        <span className="h-1 w-1 rounded-full bg-border-light" />
        <span className="font-medium text-text-primary">{t("summary.questions")}:</span>
        <span>{questionsCount}</span>
        <span className="h-1 w-1 rounded-full bg-border-light" />
        <span className="font-medium text-text-primary">{t("summary.active")}:</span>
        <span>{activeCount}</span>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Link
          href={`/${locale}/admin/help/categories`}
          className="rounded-[28px] border border-border-light bg-surface p-5 transition hover:border-primary/40 hover:bg-primary/[0.03]"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <FolderTree className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-text-muted">{t("navigation.categories")}</p>
                <h2 className="mt-1 text-2xl font-semibold text-text-primary">{t("hub.categoriesTitle")}</h2>
              </div>
              <p className="max-w-lg text-sm leading-6 text-text-secondary">{t("hub.categoriesDescription")}</p>
            </div>
            <span className="inline-flex items-center rounded-full border border-border-light bg-white px-4 py-2 text-sm font-medium text-text-primary shadow-sm">
              {t("hub.open")}
            </span>
          </div>
        </Link>

        <Link
          href={`/${locale}/admin/help/questions`}
          className="rounded-[28px] border border-border-light bg-surface p-5 transition hover:border-primary/40 hover:bg-primary/[0.03]"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-success-50 text-success-700">
                <ListTodo className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-text-muted">{t("navigation.questions")}</p>
                <h2 className="mt-1 text-2xl font-semibold text-text-primary">{t("hub.questionsTitle")}</h2>
              </div>
              <p className="max-w-lg text-sm leading-6 text-text-secondary">{t("hub.questionsDescription")}</p>
            </div>
            <span className="inline-flex items-center rounded-full border border-border-light bg-white px-4 py-2 text-sm font-medium text-text-primary shadow-sm">
              {t("hub.open")}
            </span>
          </div>
        </Link>
      </section>

      <section className="rounded-[28px] border border-border-light bg-primary/[0.03] px-5 py-4">
        <div className="flex flex-wrap items-center gap-3 text-sm text-text-secondary">
          <span className="inline-flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-primary" />
            {t("hub.note")}
          </span>
          <span className="hidden h-1 w-1 rounded-full bg-border-light sm:inline-block" />
          <span className="inline-flex items-center gap-2">
            <BookOpenText className="h-4 w-4 text-primary" />
            {t("hub.inlineNote")}
          </span>
        </div>
      </section>
    </AdminOperationalListShell>
  );
}
