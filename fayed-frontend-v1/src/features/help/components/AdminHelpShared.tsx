"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import InputField from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";
import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import { DropdownItem } from "@/components/ui/dropdown/DropdownItem";
import { FormModal, Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import { formatHelpDate, getHelpCategoryTitle, getHelpQuestionBody, getHelpQuestionTitle } from "../lib/help";
import type { HelpCategory, HelpQuestion } from "../types/help.types";

export type CategoryDraft = {
  id: string | null;
  slug: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  sortOrder: number;
  isActive: boolean;
};

export type QuestionDraft = {
  id: string | null;
  categoryId: string;
  questionAr: string;
  questionEn: string;
  answerAr: string;
  answerEn: string;
  sortOrder: number;
  isActive: boolean;
};

export type ActionItem = {
  key: string;
  label: string;
  icon?: ReactNode;
  tone?: "default" | "danger" | "success";
  hidden?: boolean;
  onClick: () => void;
};

const EMPTY_CATEGORY: CategoryDraft = {
  id: null,
  slug: "",
  titleAr: "",
  titleEn: "",
  descriptionAr: "",
  descriptionEn: "",
  sortOrder: 1,
  isActive: true,
};

const EMPTY_QUESTION: QuestionDraft = {
  id: null,
  categoryId: "",
  questionAr: "",
  questionEn: "",
  answerAr: "",
  answerEn: "",
  sortOrder: 1,
  isActive: true,
};

export function getEmptyCategoryDraft(): CategoryDraft {
  return { ...EMPTY_CATEGORY };
}

export function getEmptyQuestionDraft(): QuestionDraft {
  return { ...EMPTY_QUESTION };
}

export function getCategoryDraft(category?: HelpCategory | null): CategoryDraft {
  if (!category) {
    return getEmptyCategoryDraft();
  }

  return {
    id: category.id,
    slug: category.slug,
    titleAr: category.titleAr,
    titleEn: category.titleEn,
    descriptionAr: category.descriptionAr ?? "",
    descriptionEn: category.descriptionEn ?? "",
    sortOrder: category.sortOrder,
    isActive: category.isActive,
  };
}

export function getQuestionDraft(question?: HelpQuestion | null): QuestionDraft {
  if (!question) {
    return getEmptyQuestionDraft();
  }

  return {
    id: question.id,
    categoryId: question.categoryId ?? "",
    questionAr: question.questionAr,
    questionEn: question.questionEn,
    answerAr: question.answerAr,
    answerEn: question.answerEn,
    sortOrder: question.sortOrder,
    isActive: question.isActive,
  };
}

export function DropdownActionMenu({
  label,
  actions,
}: {
  label: string;
  actions: ActionItem[];
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-flex">
      <Button
        type="button"
        size="sm"
        variant="outline"
        startIcon={<MoreHorizontal className="h-4 w-4" />}
        onClick={() => setIsOpen((current) => !current)}
      >
        {label}
      </Button>
      <Dropdown isOpen={isOpen} onClose={() => setIsOpen(false)} className="min-w-52 p-1">
        {actions
          .filter((action) => !action.hidden)
          .map((action) => (
            <DropdownItem
              key={action.key}
              baseClassName={cn(
                "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
                action.tone === "danger"
                  ? "text-error-700 hover:bg-error-50 hover:text-error-800 dark:text-error-300 dark:hover:bg-error-500/10"
                  : action.tone === "success"
                    ? "text-success-700 hover:bg-success-50 hover:text-success-800 dark:text-success-300 dark:hover:bg-success-500/10"
                    : "text-text-primary hover:bg-surface-secondary dark:text-text-primary dark:hover:bg-white/5",
              )}
              onClick={() => {
                setIsOpen(false);
                action.onClick();
              }}
              onItemClick={() => setIsOpen(false)}
            >
              {action.icon ? <span className="flex h-4 w-4 items-center justify-center">{action.icon}</span> : null}
              <span>{action.label}</span>
            </DropdownItem>
          ))}
      </Dropdown>
    </div>
  );
}

export function HelpAdminSectionNav({
  current,
}: {
  current: "home" | "categories" | "questions";
}) {
  const locale = useLocale();
  const t = useTranslations("admin-help");
  const items = [
    { key: "home", label: t("navigation.home"), href: `/${locale}/admin/help` },
    { key: "categories", label: t("navigation.categories"), href: `/${locale}/admin/help/categories` },
    { key: "questions", label: t("navigation.questions"), href: `/${locale}/admin/help/questions` },
  ] as const;

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className={cn(
            "inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium transition",
            current === item.key
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-border-light bg-surface text-text-secondary hover:bg-surface-secondary hover:text-text-primary",
          )}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}

export function CategoryFormModal({
  isOpen,
  title,
  draft,
  onChange,
  onClose,
  onSave,
  isSaving,
}: {
  isOpen: boolean;
  title: string;
  draft: CategoryDraft;
  onChange: (next: CategoryDraft) => void;
  onClose: () => void;
  onSave: () => void;
  isSaving: boolean;
}) {
  const t = useTranslations("admin-help");

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title={title}
      description={t("modals.category.description")}
      eyebrow={t("page.eyebrow")}
      loading={isSaving}
      onSubmit={onSave}
      submitLabel={isSaving ? t("actions.saving") : t("actions.save")}
      cancelLabel={t("actions.cancel")}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium text-text-primary">{t("fields.titleAr")}</span>
          <InputField
            value={draft.titleAr}
            onChange={(event) => onChange({ ...draft, titleAr: event.target.value })}
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-text-primary">{t("fields.titleEn")}</span>
          <InputField
            value={draft.titleEn}
            onChange={(event) => onChange({ ...draft, titleEn: event.target.value })}
          />
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-medium text-text-primary">{t("fields.descriptionAr")}</span>
          <TextArea
            rows={3}
            value={draft.descriptionAr}
            onChange={(value) => onChange({ ...draft, descriptionAr: value })}
          />
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-medium text-text-primary">{t("fields.descriptionEn")}</span>
          <TextArea
            rows={3}
            value={draft.descriptionEn}
            onChange={(value) => onChange({ ...draft, descriptionEn: value })}
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-text-primary">{t("fields.sortOrder")}</span>
          <InputField
            type="number"
            min={0}
            value={String(draft.sortOrder)}
            onChange={(event) => onChange({ ...draft, sortOrder: Number(event.target.value || 0) })}
          />
        </label>
        <label className="flex items-center gap-3 rounded-2xl border border-border-light bg-surface px-4 py-3">
          <input
            type="checkbox"
            checked={draft.isActive}
            onChange={(event) => onChange({ ...draft, isActive: event.target.checked })}
            className="h-4 w-4 rounded border-border-light text-primary"
          />
          <span className="text-sm font-medium text-text-primary">{t("fields.isActive")}</span>
        </label>
      </div>
    </FormModal>
  );
}

export function QuestionFormModal({
  isOpen,
  title,
  draft,
  categories,
  locale,
  onChange,
  onClose,
  onSave,
  isSaving,
}: {
  isOpen: boolean;
  title: string;
  draft: QuestionDraft;
  categories: HelpCategory[];
  locale: string;
  onChange: (next: QuestionDraft) => void;
  onClose: () => void;
  onSave: () => void;
  isSaving: boolean;
}) {
  const t = useTranslations("admin-help");

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title={title}
      description={t("modals.question.description")}
      eyebrow={t("page.eyebrow")}
      loading={isSaving}
      onSubmit={onSave}
      submitLabel={isSaving ? t("actions.saving") : t("actions.save")}
      cancelLabel={t("actions.cancel")}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-medium text-text-primary">{t("fields.category")}</span>
          <select
            value={draft.categoryId}
            onChange={(event) => onChange({ ...draft, categoryId: event.target.value })}
            className="app-control w-full px-4 py-3"
          >
            <option value="">{t("filters.uncategorized")}</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {locale.startsWith("ar") ? category.titleAr : category.titleEn || category.titleAr}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-text-primary">{t("fields.questionAr")}</span>
          <InputField
            value={draft.questionAr}
            onChange={(event) => onChange({ ...draft, questionAr: event.target.value })}
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-text-primary">{t("fields.questionEn")}</span>
          <InputField
            value={draft.questionEn}
            onChange={(event) => onChange({ ...draft, questionEn: event.target.value })}
          />
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-medium text-text-primary">{t("fields.answerAr")}</span>
          <TextArea
            rows={4}
            value={draft.answerAr}
            onChange={(value) => onChange({ ...draft, answerAr: value })}
          />
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-medium text-text-primary">{t("fields.answerEn")}</span>
          <TextArea
            rows={4}
            value={draft.answerEn}
            onChange={(value) => onChange({ ...draft, answerEn: value })}
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-text-primary">{t("fields.sortOrder")}</span>
          <InputField
            type="number"
            min={0}
            value={String(draft.sortOrder)}
            onChange={(event) => onChange({ ...draft, sortOrder: Number(event.target.value || 0) })}
          />
        </label>
        <label className="flex items-center gap-3 rounded-2xl border border-border-light bg-surface px-4 py-3">
          <input
            type="checkbox"
            checked={draft.isActive}
            onChange={(event) => onChange({ ...draft, isActive: event.target.checked })}
            className="h-4 w-4 rounded border-border-light text-primary"
          />
          <span className="text-sm font-medium text-text-primary">{t("fields.isActive")}</span>
        </label>
      </div>
    </FormModal>
  );
}

export function QuestionViewModal({
  isOpen,
  question,
  locale,
  categoryLabel,
  onClose,
}: {
  isOpen: boolean;
  question: HelpQuestion | null;
  locale: string;
  categoryLabel: string;
  onClose: () => void;
}) {
  const t = useTranslations("admin-help");

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl">
      <div className="flex max-h-[calc(100vh-2rem)] flex-col">
        <ModalHeader
          eyebrow={t("modals.question.viewEyebrow")}
          title={t("modals.question.viewTitle")}
          description={t("modals.question.viewDescription")}
        />
        <ModalBody className="space-y-5">
          {question ? (
            <>
              <div className="flex flex-wrap gap-2">
                <Badge variant="solid" color={question.isActive ? "success" : "warning"} size="sm">
                  {question.isActive ? t("badges.active") : t("badges.inactive")}
                </Badge>
                <Badge variant="light" color="primary" size="sm">
                  {categoryLabel}
                </Badge>
                <Badge variant="light" color="primary" size="sm">
                  {t("tables.questions.orderValue", { value: question.sortOrder })}
                </Badge>
                <Badge variant="light" color="primary" size="sm">
                  {formatHelpDate(question.updatedAt, locale)}
                </Badge>
              </div>

              <section className="rounded-2xl border border-border-light bg-surface px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                  {t("modals.question.viewQuestionLabel")}
                </p>
                <p className="mt-2 text-base font-semibold leading-7 text-text-primary">{getHelpQuestionTitle(question, locale)}</p>
              </section>

              <div className="grid gap-4 md:grid-cols-2">
                <section className="rounded-2xl border border-border-light bg-surface px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                    {t("fields.questionAr")}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-text-primary">{question.questionAr}</p>
                </section>
                <section className="rounded-2xl border border-border-light bg-surface px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                    {t("fields.questionEn")}
                  </p>
                  <p className="mt-2 text-sm text-text-secondary">{question.questionEn || "-"}</p>
                </section>
                <section className="rounded-2xl border border-border-light bg-white px-4 py-4 md:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                    {t("fields.answerAr")}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-text-primary">{getHelpQuestionBody(question, locale)}</p>
                </section>
                <section className="rounded-2xl border border-border-light bg-white px-4 py-4 md:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                    {t("fields.answerEn")}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-text-secondary">{question.answerEn || "-"}</p>
                </section>
                <section className="rounded-2xl border border-border-light bg-surface px-4 py-4 md:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                    {t("fields.category")}
                  </p>
                  <p className="mt-2 text-sm font-medium text-text-primary">{categoryLabel}</p>
                </section>
              </div>
            </>
          ) : null}
        </ModalBody>
        <ModalFooter>
          <Button type="button" onClick={onClose}>
            {t("actions.cancel")}
          </Button>
        </ModalFooter>
      </div>
    </Modal>
  );
}

export { formatHelpDate, getHelpCategoryTitle, getHelpQuestionBody, getHelpQuestionTitle };
