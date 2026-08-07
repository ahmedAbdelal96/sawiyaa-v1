"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { useSidebar, useSidebarStore } from "@/stores";
import { useLocale, useTranslations } from "next-intl";
import { NavigationConfig, NavigationSection } from "@/config/navigation";
import BrandMark from "@/components/shared/BrandMark";
import { ChevronDown, ChevronsLeft, ChevronsRight } from "lucide-react";
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
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const isCompact = density === "compact";
  const isVisible = isExpanded || isHovered || isMobileOpen;

  const className = cn(
    "group relative flex w-full items-center text-start transition-all duration-150 ease-out border rounded-xl",
    isCompact
      ? "gap-2 px-2.5 h-[36px]"
      : "gap-2.5 px-3 py-1.5 min-h-[40px]",
    active
      ? "bg-primary/10 border-primary/20 text-primary font-bold dark:bg-primary/20 dark:text-primary-light shadow-xs"
      : "bg-transparent border-transparent text-text-secondary hover:bg-surface-secondary/70 hover:text-text-primary dark:hover:bg-white/5",
    !isVisible && "lg:justify-center lg:px-0",
  );

  const leftContent = (
    <>
      {/* Active Indicator Bar */}
      {active && isVisible && (
        <span
          className={cn(
            "absolute top-2 bottom-2 w-1 rounded-full bg-primary shadow-xs transition-all duration-200",
            isRTL ? "right-0 rounded-l-full" : "left-0 rounded-r-full"
          )}
        />
      )}

      {icon ? (
        <span
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded-xl transition-all duration-200",
            isCompact
              ? "h-6.5 w-6.5 [&_svg]:h-[15px] [&_svg]:w-[15px]"
              : "h-7.5 w-7.5 [&_svg]:h-[17px] [&_svg]:w-[17px]",
            active
              ? "bg-primary text-white shadow-xs"
              : "text-text-muted group-hover:text-primary group-hover:bg-primary/10",
          )}
        >
          {icon}
        </span>
      ) : null}

      {isVisible && (
        <span className="min-w-0 flex-1">
          <span className={cn(
            "block truncate transition-colors",
            active ? "font-bold" : "font-semibold",
            isCompact ? "text-[14px] leading-4" : "text-[15px] leading-5"
          )}>
            {children}
          </span>
        </span>
      )}
    </>
  );

  const chevronIcon = hasChildren && isVisible ? (
    <ChevronDown className={cn(
      "transition-transform duration-200 text-text-muted group-hover:text-primary shrink-0",
      isCompact ? "h-3.5 w-3.5" : "h-4 w-4",
      toggled ? "rotate-0 text-primary" : isRTL ? "rotate-90" : "-rotate-90"
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
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          {leftContent}
        </div>
        {chevronIcon}
      </button>
    );
  }

  if (href) {
    return (
      <div className={className}>
        <Link
          href={href}
          onClick={onClick}
          aria-current={active ? "page" : undefined}
          className="flex min-w-0 flex-1 items-center gap-2.5"
        >
          {leftContent}
        </Link>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        {leftContent}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SidebarSubItem
// ---------------------------------------------------------------------------
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
        "flex w-full items-center rounded-xl transition-all duration-150 ease-out",
        isCompact
          ? "py-0.5 text-[13px] h-7.5 px-2.5 hover:bg-surface-secondary/70 dark:hover:bg-white/5"
          : "py-1 text-[14px] h-8 px-3 hover:bg-surface-secondary/70 dark:hover:bg-white/5",
        active
          ? "text-primary font-bold bg-primary/10 dark:bg-primary/20 dark:text-primary-light shadow-2xs"
          : "text-text-secondary hover:text-text-primary",
      )}
    >
      <span
        className={cn(
          "shrink-0 rounded-full transition-all duration-200",
          isCompact ? "h-1.5 w-1.5" : "h-2 w-2",
          active ? "bg-primary ring-2 ring-primary/30 shadow-xs scale-110" : "bg-border-strong group-hover:bg-primary/50",
          isRTL ? "ml-2.5" : "mr-2.5",
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
  const { isExpanded, isHovered, isMobileOpen, setIsHovered, closeMobileSidebar } = useSidebar();
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations("navigation");
  const isRTL = locale === "ar";
  const isCompact = density === "compact";

  const isVisible = isExpanded || isHovered || isMobileOpen;

  const pathWithoutLocale = pathname.replace(`/${locale}`, "") || "/";

  const allPaths = useMemo(() => {
    const paths: string[] = [];
    navigation.forEach((section) => {
      section.items.forEach((item) => {
        if (item.path) {
          paths.push(basePathPrefix + item.path);
        }
        item.subItems?.forEach((sub) => {
          if (sub.path) {
            paths.push(basePathPrefix + sub.path);
          }
        });
      });
    });
    return paths;
  }, [navigation, basePathPrefix]);

  const isActive = (path: string) => {
    const fullPath = basePathPrefix + path;
    if (fullPath === "/") {
      return pathWithoutLocale === "/";
    }

    const isMatch = pathWithoutLocale === fullPath || pathWithoutLocale.startsWith(`${fullPath}/`);
    if (!isMatch) return false;

    const hasLongerMatch = allPaths.some((otherPath) => {
      if (otherPath === fullPath || otherPath.length <= fullPath.length) return false;
      return pathWithoutLocale === otherPath || pathWithoutLocale.startsWith(`${otherPath}/`);
    });

    return !hasLongerMatch;
  };

  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("sawiyaa.admin.sidebar.groups");
      setExpandedSections(stored ? JSON.parse(stored) : {});
    } catch (e) {
      console.error("Failed to load sidebar state:", e);
      setExpandedSections({});
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const toggleSection = (sectionKey: string) => {
    setExpandedSections((prev) => {
      const next = { ...prev, [sectionKey]: !prev[sectionKey] };
      try {
        localStorage.setItem("sawiyaa.admin.sidebar.groups", JSON.stringify(next));
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
    const isExpandedSection = (() => {
      if (!isVisible) return true;
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
        "flex w-full items-center justify-between transition-all duration-200 select-none",
        isCompact ? "px-2.5 h-[32px]" : "px-3 py-2",
        isActiveGroup
          ? "text-primary font-bold"
          : "text-text-muted/80 hover:text-text-primary"
      )}>
        <div className="flex items-center gap-2 min-w-0">
          {isCollapsible && isVisible && (
            <ChevronDown className={cn(
              "shrink-0 transition-transform duration-200 text-text-muted/70",
              isCompact ? "h-3.5 w-3.5" : "h-4 w-4",
              isExpandedSection ? "rotate-0" : isRTL ? "rotate-90" : "-rotate-90",
              isActiveGroup && "text-primary"
            )} />
          )}
          {isVisible ? (
            <span className={cn(
              "font-bold uppercase tracking-wider text-[13px]",
              isActiveGroup ? "text-primary" : "text-text-muted/90"
            )}>
              {sectionTitle}
            </span>
          ) : (
            <span className="mx-auto text-text-muted/40 font-bold tracking-normal">-</span>
          )}
        </div>
        {isCollapsible && isVisible && (
          <span className={cn(
            "text-[12px] font-extrabold px-2 py-0.5 rounded-full shrink-0 transition-colors",
            isActiveGroup 
              ? "bg-primary/15 text-primary" 
              : "bg-surface-tertiary text-text-muted"
          )}>
            {section.items.length}
          </span>
        )}
      </div>
    );

    return (
      <div key={section.key} className={cn("pt-2 first:pt-0", isCompact ? "space-y-0.5" : "space-y-1.5")}>
        {isCollapsible && !isActiveGroup && isVisible ? (
          <button
            type="button"
            onClick={() => toggleSection(section.key)}
            className="flex w-full text-start focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 rounded-xl py-0.5 hover:bg-surface-secondary/50 dark:hover:bg-white/5 cursor-pointer"
            aria-expanded={isExpandedSection}
          >
            {headerContent}
          </button>
        ) : (
          <div className="py-0.5">
            {headerContent}
          </div>
        )}

        {isExpandedSection && (
          <div className={isCompact ? "space-y-1" : "space-y-1.5"}>
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
                      "space-y-1 border-s-2 border-primary/20 my-1 py-0.5 transition-all",
                      isRTL ? "mr-6 pr-2" : "ml-6 pl-2"
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
      onMouseEnter={() => {
        if (!isExpanded) {
          setIsHovered(true);
        }
      }}
      onMouseLeave={() => {
        if (!isExpanded) {
          setIsHovered(false);
        }
      }}
      className={cn(
        "fixed inset-y-0 z-50 flex flex-col border-border-light/80 bg-surface text-text-primary shadow-[0_18px_36px_-28px_rgba(31,42,45,0.18)] transition-all duration-300 ease-out",
        isRTL ? "right-0 border-l" : "left-0 border-r",
        isVisible ? "w-[304px]" : "w-[88px]",
        isMobileOpen
          ? "translate-x-0"
          : isRTL
            ? "translate-x-full lg:translate-x-0"
            : "-translate-x-full lg:translate-x-0",
      )}
    >
      <div className={cn(
        "flex shrink-0 items-center border-b border-border-light/70 min-h-[76px] py-4 transition-all",
        isVisible ? "px-5 justify-between" : "justify-center px-3"
      )}>
        <BrandMark compact={!isVisible} href={basePathPrefix + "/"} />
      </div>

      <div className={cn(
        "no-scrollbar flex-1 overflow-y-auto",
        isCompact ? "px-2.5 py-2" : "px-3 py-3"
      )}>
        <nav className={isCompact ? "space-y-1.5" : "space-y-2.5"}>{renderedNavigation}</nav>
      </div>
    </aside>
  );
};

export default DynamicSidebar;
