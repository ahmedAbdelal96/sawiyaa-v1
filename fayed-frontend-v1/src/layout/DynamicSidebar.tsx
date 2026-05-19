"use client";

import React, { useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { useSidebar } from "@/stores";
import { useLocale, useTranslations } from "next-intl";
import { NavigationConfig, NavigationSection } from "@/config/navigation";
import BrandMark from "@/components/shared/BrandMark";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface DynamicSidebarProps {
  navigation: NavigationConfig;
  basePathPrefix?: string;
}

const SIDEBAR_WIDTH = 304;

function resolveNavLabel(
  t: ReturnType<typeof useTranslations>,
  fallbackNamespace: string,
  namespace: string | undefined,
  key: string,
) {
  const resolvedNamespace = namespace ?? fallbackNamespace;
  if (key.includes(".")) {
    return t(key as Parameters<typeof t>[0]);
  }
  return t(`${resolvedNamespace}.${key}` as Parameters<typeof t>[0]);
}

function SidebarSectionLabel({
  children,
  isRTL,
}: {
  children: React.ReactNode;
  isRTL: boolean;
}) {
  return (
    <div className={cn("px-3 pb-2 pt-4", isRTL ? "text-right" : "text-left")}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-text-muted">
        {children}
      </p>
    </div>
  );
}

function SidebarRow({
  active,
  children,
  href,
  onClick,
  icon,
  isRTL,
  toggled,
  hasChildren,
  onToggle,
}: {
  active: boolean;
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  icon?: React.ReactNode;
  isRTL: boolean;
  toggled?: boolean;
  hasChildren?: boolean;
  onToggle?: () => void;
}) {
  const className = cn(
    "group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-start transition-all duration-200 ease-out",
    active
      ? "bg-primary-light text-text-brand shadow-[0_10px_22px_-18px_rgba(68,161,148,0.32)]"
      : "text-text-secondary hover:bg-surface-secondary hover:text-text-primary",
  );

  const leftContent = (
    <>
      {icon ? (
        <span
          className={cn(
            "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition",
            active
              ? "border-primary/15 bg-white text-text-brand shadow-sm"
              : "border-border-light bg-white text-text-muted group-hover:border-border-strong group-hover:text-text-primary",
          )}
        >
          {icon}
        </span>
      ) : null}

      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium leading-5">{children}</span>
      </span>
    </>
  );

  const toggleButton = hasChildren ? (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onToggle?.();
      }}
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-text-muted transition hover:bg-white hover:text-text-primary"
      aria-label={isRTL ? "تبديل القائمة الفرعية" : "Toggle submenu"}
    >
      {toggled ? (
        <ChevronDown className="h-4 w-4" />
      ) : isRTL ? (
        <ChevronLeft className="h-4 w-4" />
      ) : (
        <ChevronRight className="h-4 w-4" />
      )}
    </button>
  ) : null;

  if (href) {
    return (
      <div className={className}>
        <Link
          href={href}
          onClick={onClick}
          aria-current={active ? "page" : undefined}
          className="flex min-w-0 flex-1 items-center gap-3"
        >
          {leftContent}
        </Link>
        {toggleButton}
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex min-w-0 flex-1 items-center gap-3">{leftContent}</div>
      {toggleButton}
    </div>
  );
}

function SidebarSubItem({
  active,
  href,
  children,
  onClick,
  isRTL,
}: {
  active: boolean;
  href: string;
  children: React.ReactNode;
  onClick?: () => void;
  isRTL: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex w-full items-center rounded-xl py-2 text-[14px] transition-all duration-200 ease-out",
        active
          ? "text-text-brand"
          : "text-text-secondary hover:text-text-primary",
        isRTL ? "pr-14 pl-3" : "pl-14 pr-3",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 shrink-0 rounded-full",
          active ? "bg-primary" : "bg-border-strong",
          isRTL ? "ml-3" : "mr-3",
        )}
      />
      <span className="min-w-0 flex-1 truncate">{children}</span>
    </Link>
  );
}

const DynamicSidebar: React.FC<DynamicSidebarProps> = ({
  navigation,
  basePathPrefix = "",
}) => {
  const { isMobileOpen, closeMobileSidebar } = useSidebar();
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations("navigation");
  const isRTL = locale === "ar";

  const pathWithoutLocale = pathname.replace(`/${locale}`, "") || "/";

  const isActive = (path: string) => {
    const fullPath = basePathPrefix + path;
    if (fullPath === "/") {
      return pathWithoutLocale === fullPath;
    }
    return pathWithoutLocale === fullPath || pathWithoutLocale.startsWith(`${fullPath}/`);
  };

  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});

  const toggleSubmenu = (key: string) => {
    setOpenSubmenus((current) => ({ ...current, [key]: !current[key] }));
  };

  const renderedNavigation = navigation.map((section) => {
    const sectionTitle = resolveNavLabel(
      t,
      section.namespace ?? section.key,
      section.namespace,
      section.titleKey ?? "title",
    );

    return (
      <div key={section.key} className="space-y-1.5">
        <SidebarSectionLabel isRTL={isRTL}>{sectionTitle}</SidebarSectionLabel>

        <div className="space-y-1">
          {section.items.map((nav) => {
            const label = resolveNavLabel(
              t,
              nav.namespace ?? section.namespace ?? section.key,
              nav.namespace ?? section.namespace,
              nav.key,
            );
            const hasSubItems = Boolean(nav.subItems?.length);
            const active = Boolean(nav.path && isActive(nav.path)) || nav.subItems?.some((sub) => isActive(sub.path)) || false;
            const itemHref = nav.path ? basePathPrefix + nav.path : undefined;
            const submenuKey = `${section.key}:${nav.key}`;
            const hasActiveSubItem = nav.subItems?.some((subItem) => isActive(subItem.path)) ?? false;
            const isOpen = Boolean(openSubmenus[submenuKey] ?? hasActiveSubItem);

            return (
              <div key={nav.key} className="space-y-1">
                <SidebarRow
                  active={active}
                  href={itemHref}
                  onClick={isMobileOpen ? closeMobileSidebar : undefined}
                  icon={nav.icon}
                  isRTL={isRTL}
                  hasChildren={hasSubItems}
                  toggled={isOpen}
                  onToggle={hasSubItems ? () => toggleSubmenu(submenuKey) : undefined}
                >
                  {label}
                </SidebarRow>

                {hasSubItems && isOpen ? (
                  <div className={cn("space-y-0.5", isRTL ? "pr-2" : "pl-2")}>
                    {nav.subItems?.map((subItem) => {
                      const subLabel = resolveNavLabel(
                        t,
                        subItem.namespace ?? nav.namespace ?? section.namespace ?? section.key,
                        subItem.namespace ?? nav.namespace ?? section.namespace,
                        subItem.key,
                      );
                      return (
                        <SidebarSubItem
                          key={subItem.key}
                          href={basePathPrefix + subItem.path}
                          active={isActive(subItem.path)}
                          onClick={isMobileOpen ? closeMobileSidebar : undefined}
                          isRTL={isRTL}
                        >
                          {subLabel}
                        </SidebarSubItem>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    );
  });

  return (
    <aside
      className={cn(
        "fixed inset-y-0 z-50 flex w-[304px] flex-col border-border-light/80 bg-white text-text-primary shadow-[0_18px_36px_-28px_rgba(31,42,45,0.18)] transition-transform duration-300 ease-out",
        isRTL ? "right-0 border-l" : "left-0 border-r",
        isMobileOpen
          ? "translate-x-0"
          : isRTL
            ? "translate-x-full lg:translate-x-0"
            : "-translate-x-full lg:translate-x-0",
      )}
    >
      <div className="flex shrink-0 items-center gap-3 border-b border-border-light/70 px-5 py-5">
        <BrandMark href={basePathPrefix + "/"} />
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto px-4 py-4">
        <nav className="space-y-4">{renderedNavigation}</nav>
      </div>
    </aside>
  );
};

export default DynamicSidebar;
