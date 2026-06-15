"use client";

import React, { useState, useEffect } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { useSidebar } from "@/stores";
import { useLocale, useTranslations } from "next-intl";
import { NavigationConfig, NavigationSection } from "@/config/navigation";
import BrandMark from "@/components/shared/BrandMark";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface DynamicSidebarProps {
  navigation: NavigationConfig;
  basePathPrefix?: string;
  density?: "compact" | "comfortable";
}

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
  density = "comfortable",
}: {
  children: React.ReactNode;
  isRTL: boolean;
  density?: "compact" | "comfortable";
}) {
  const isCompact = density === "compact";
  return (
    <div className={cn(
      isCompact ? "px-3 pb-0.5 pt-2" : "px-3 pb-2 pt-4",
      isRTL ? "text-right" : "text-left"
    )}>
      <p className={cn(
        "font-semibold uppercase tracking-[0.2em] text-text-muted",
        isCompact ? "text-[10px]" : "text-[11px]"
      )}>
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
  density = "comfortable",
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
  density?: "compact" | "comfortable";
}) {
  const isCompact = density === "compact";

  const className = cn(
    "group relative flex w-full items-center text-start transition-all duration-200 ease-out border",
    isCompact
      ? "gap-2 rounded-lg px-2.5 h-[38px]"
      : "gap-3 rounded-2xl px-3 py-2.5",
    active
      ? "bg-primary-light border-primary/15 text-text-brand shadow-[0_4px_12px_-6px_rgba(68,161,148,0.16)] font-semibold"
      : "bg-transparent border-transparent text-text-secondary hover:bg-surface-secondary hover:text-text-primary",
  );

  const leftContent = (
    <>
      {icon ? (
        <span
          className={cn(
            "inline-flex shrink-0 items-center justify-center border transition",
            isCompact
              ? "h-[30px] w-[30px] rounded-lg [&_svg]:h-[14px] [&_svg]:w-[14px]"
              : "h-9 w-9 rounded-xl [&_svg]:h-[18px] [&_svg]:w-[18px]",
            active
              ? "border-primary/20 bg-primary-light/60 text-text-brand shadow-sm"
              : "border-border-light bg-surface-secondary text-text-muted group-hover:border-border-strong group-hover:text-text-primary",
          )}
        >
          {icon}
        </span>
      ) : null}

      <span className="min-w-0 flex-1">
        <span className={cn(
          "block truncate font-medium",
          isCompact ? "text-[13.5px] leading-4" : "text-[15px] leading-5"
        )}>
          {children}
        </span>
      </span>
    </>
  );

  const activeIndicator = active && (
    <span
      className={cn(
        "absolute top-1/2 h-3.5 w-[3px] -translate-y-1/2 rounded-full bg-primary",
        isRTL ? "right-0" : "left-0"
      )}
    />
  );

  const chevronIcon = hasChildren ? (
    <ChevronDown className={cn(
      "transition-transform duration-200 text-text-muted group-hover:text-text-primary",
      isCompact ? "h-3.5 w-3.5" : "h-4 w-4",
      toggled ? "rotate-0" : isRTL ? "rotate-90" : "-rotate-90"
    )} />
  ) : null;

  if (hasChildren) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className={className}
        aria-expanded={toggled}
      >
        {activeIndicator}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {leftContent}
        </div>
        {chevronIcon}
      </button>
    );
  }

  if (href) {
    return (
      <div className={className}>
        {activeIndicator}
        <Link
          href={href}
          onClick={onClick}
          aria-current={active ? "page" : undefined}
          className="flex min-w-0 flex-1 items-center gap-2"
        >
          {leftContent}
        </Link>
      </div>
    );
  }

  return (
    <div className={className}>
      {activeIndicator}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {leftContent}
      </div>
    </div>
  );
}

function SidebarSubItem({
  active,
  href,
  children,
  onClick,
  isRTL,
  density = "comfortable",
}: {
  active: boolean;
  href: string;
  children: React.ReactNode;
  onClick?: () => void;
  isRTL: boolean;
  density?: "compact" | "comfortable";
}) {
  const isCompact = density === "compact";
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex w-full items-center rounded-xl transition-all duration-200 ease-out",
        isCompact
          ? "py-1 text-[12.5px] h-8 px-2.5 hover:bg-surface-tertiary"
          : "py-2 text-[13.5px] h-9 px-3 hover:bg-surface-tertiary",
        active
          ? "text-text-brand font-medium bg-primary-light/40"
          : "text-text-secondary hover:text-text-primary",
      )}
    >
      <span
        className={cn(
          "shrink-0 rounded-full",
          isCompact ? "h-1 w-1" : "h-1.5 w-1.5",
          active ? "bg-primary" : "bg-border-strong",
          isRTL ? "ml-2" : "mr-2",
        )}
      />
      <span className="min-w-0 flex-1 truncate">{children}</span>
    </Link>
  );
}

const DynamicSidebar: React.FC<DynamicSidebarProps> = ({
  navigation,
  basePathPrefix = "",
  density = "comfortable",
}) => {
  const { isMobileOpen, closeMobileSidebar } = useSidebar();
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations("navigation");
  const isRTL = locale === "ar";
  const isCompact = density === "compact";

  const pathWithoutLocale = pathname.replace(`/${locale}`, "") || "/";

  const isActive = (path: string) => {
    const fullPath = basePathPrefix + path;
    if (fullPath === "/") {
      return pathWithoutLocale === fullPath;
    }
    return pathWithoutLocale === fullPath || pathWithoutLocale.startsWith(`${fullPath}/`);
  };

  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("fayed.admin.sidebar.groups");
      if (stored) {
        setExpandedSections(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load sidebar state:", e);
    }
    setIsLoaded(true);
  }, []);

  const toggleSection = (sectionKey: string) => {
    setExpandedSections((prev) => {
      const next = { ...prev, [sectionKey]: !prev[sectionKey] };
      try {
        localStorage.setItem("fayed.admin.sidebar.groups", JSON.stringify(next));
      } catch (e) {
        console.error("Failed to save sidebar state:", e);
      }
      return next;
    });
  };

  const toggleSubmenu = (key: string) => {
    setOpenSubmenus((current) => ({ ...current, [key]: !current[key] }));
  };

  const sectionContainsActiveItem = (section: NavigationSection) => {
    return section.items.some((nav) => {
      return Boolean(nav.path && isActive(nav.path)) || 
             Boolean(nav.subItems?.some((sub) => isActive(sub.path))) || 
             false;
    });
  };

  const renderedNavigation = navigation.map((section) => {
    const sectionTitle = resolveNavLabel(
      t,
      section.key,
      undefined,
      section.titleKey ?? "title",
    );

    const isCollapsible = Boolean(section.collapsible);
    const isActiveGroup = sectionContainsActiveItem(section);
    // Active group is forced open and cannot be collapsed.
    // Default: Core/uncollapsible is expanded. Operations is expanded by default. Others are collapsed by default.
    const isExpanded = (() => {
      if (!isCollapsible) return true;
      if (isActiveGroup) return true;
      if (isLoaded) {
        if (expandedSections[section.key] !== undefined) {
          return !!expandedSections[section.key];
        }
      }
      if (section.key === "operations") {
        return true;
      }
      return false;
    })();

    const headerContent = (
      <div className={cn(
        "flex w-full items-center justify-between transition-all duration-200 select-none border rounded-lg shadow-sm/5",
        isCompact ? "px-2.5 h-[34px]" : "px-3 py-2.5",
        isActiveGroup
          ? "bg-primary-light/70 border-primary/25 text-text-brand font-semibold"
          : "bg-surface-secondary/80 border-border-light text-text-secondary hover:bg-surface-tertiary hover:border-primary/20 hover:text-text-primary"
      )}>
        <div className="flex items-center gap-1.5 min-w-0">
          {isCollapsible && (
            <ChevronDown className={cn(
              "shrink-0 transition-transform duration-200 text-text-muted/70",
              isCompact ? "h-3.5 w-3.5" : "h-4 w-4",
              isExpanded ? "rotate-0" : isRTL ? "rotate-90" : "-rotate-90",
              isActiveGroup && "text-text-brand"
            )} />
          )}
          <span className={cn(
            "font-semibold uppercase tracking-[0.2em] truncate",
            isCompact ? "text-[10px]" : "text-[11px]",
            isActiveGroup && "text-text-brand"
          )}>
            {sectionTitle}
          </span>
        </div>
        {isCollapsible && (
          <span className={cn(
            "text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0",
            isActiveGroup 
              ? "bg-primary-light text-text-brand" 
              : "bg-surface-tertiary text-text-muted"
          )}>
            {section.items.length}
          </span>
        )}
      </div>
    );

    return (
      <div key={section.key} className={isCompact ? "space-y-0.5" : "space-y-1.5"}>
        {isCollapsible && !isActiveGroup ? (
          <button
            type="button"
            onClick={() => toggleSection(section.key)}
            className="flex w-full text-start focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 rounded-lg py-0.5"
            aria-expanded={isExpanded}
          >
            {headerContent}
          </button>
        ) : (
          <div className="py-0.5">
            {headerContent}
          </div>
        )}

        {isExpanded && (
          <div className={isCompact ? "space-y-0.5" : "space-y-1"}>
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
                <div key={nav.key} className={isCompact ? "space-y-0.5" : "space-y-1"}>
                  <SidebarRow
                    active={active}
                    href={itemHref}
                    onClick={isMobileOpen ? closeMobileSidebar : undefined}
                    icon={nav.icon}
                    isRTL={isRTL}
                    hasChildren={hasSubItems}
                    toggled={isOpen}
                    onToggle={hasSubItems ? () => toggleSubmenu(submenuKey) : undefined}
                    density={density}
                  >
                    {label}
                  </SidebarRow>

                  {hasSubItems && isOpen ? (
                    <div className={cn(
                      "space-y-0.5 border-s border-slate-100 my-0.5",
                      isRTL ? "mr-[25px] pr-1.5" : "ml-[25px] pl-1.5"
                    )}>
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
                            density={density}
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
        )}
      </div>
    );
  });

  return (
    <aside
      className={cn(
        "fixed inset-y-0 z-50 flex w-[304px] flex-col border-border-light/80 bg-surface text-text-primary shadow-[0_18px_36px_-28px_rgba(31,42,45,0.18)] transition-transform duration-300 ease-out",
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

      <div className={cn(
        "no-scrollbar flex-1 overflow-y-auto",
        isCompact ? "px-3 py-3" : "px-4 py-4"
      )}>
        <nav className={isCompact ? "space-y-2.5" : "space-y-4"}>{renderedNavigation}</nav>
      </div>
    </aside>
  );
};

export default DynamicSidebar;
