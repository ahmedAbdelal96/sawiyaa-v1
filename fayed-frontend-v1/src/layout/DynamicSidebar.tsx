"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { useSidebar } from "@/stores";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDownIcon } from "../icons";
import { NavigationConfig, NavItem } from "@/config/navigation";
import BrandMark from "@/components/shared/BrandMark";

interface DynamicSidebarProps {
  navigation: NavigationConfig;
  basePathPrefix?: string;
}

const DynamicSidebar: React.FC<DynamicSidebarProps> = ({
  navigation,
  basePathPrefix = "",
}) => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations("navigation");
  const isRTL = locale === "ar";

  const pathWithoutLocale = pathname.replace(`/${locale}`, "") || "/";

  const [openSubmenu, setOpenSubmenu] = useState<{
    type: string;
    index: number;
  } | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const isActive = useCallback(
    (path: string) => {
      const fullPath = basePathPrefix + path;
      if (fullPath === "/") {
        return pathWithoutLocale === fullPath;
      }
      return pathWithoutLocale.startsWith(fullPath);
    },
    [pathWithoutLocale, basePathPrefix]
  );

  const handleSubmenuToggle = (
    index: number,
    menuType: string
  ) => {
    if (openSubmenu?.type === menuType && openSubmenu.index === index) {
      setOpenSubmenu(null);
      return;
    }

    setOpenSubmenu({ type: menuType, index });
  };

  const toggleSection = (sectionKey: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  useEffect(() => {
    navigation.forEach(({ items, key: type }) => {
      items.forEach((nav, index) => {
        if (nav.subItems?.some((sub) => isActive(sub.path))) {
          setOpenSubmenu({ type, index });
        }
      });
    });
  }, [isActive, navigation]);

  useEffect(() => {
    setCollapsedSections((prev) => {
      const next = { ...prev };

      navigation.forEach((section) => {
        const hasActiveItem = section.items.some((nav) => {
          if (nav.path && isActive(nav.path)) {
            return true;
          }

          return nav.subItems?.some((sub) => isActive(sub.path)) ?? false;
        });

        if (hasActiveItem) {
          next[section.key] = false;
        } else if (!(section.key in next)) {
          next[section.key] = section.key !== navigation[0]?.key;
        }
      });

      return next;
    });
  }, [isActive, navigation]);

  const renderMenuItems = (
    navItems: NavItem[],
    menuType: string,
    namespace: string
  ) => (
    <ul className="flex flex-col gap-3">
      {navItems.map((nav, index) => (
        <li key={nav.key}>
          {nav.subItems ? (
            <button
              onClick={() => handleSubmenuToggle(index, menuType)}
              className={`menu-item group ${
                openSubmenu?.type === menuType && openSubmenu?.index === index
                  ? "menu-item-active rounded-2xl ring-1 ring-inset ring-primary/10 shadow-sm"
                  : "menu-item-inactive rounded-2xl"
              } ${!isExpanded && !isHovered ? "lg:justify-center" : "lg:justify-start"}`}
            >
              <span
                className={
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? "menu-item-icon-active"
                    : "menu-item-icon-inactive"
                }
              >
                {nav.icon}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <>
                  <span className="menu-item-text">
                    {t(`${nav.namespace ?? namespace}.${nav.key}`)}
                  </span>
                  <ChevronDownIcon
                    className={`${isRTL ? "mr-auto" : "ml-auto"} h-5 w-5 transition-transform ${
                      openSubmenu?.type === menuType &&
                      openSubmenu?.index === index
                        ? "rotate-180 text-text-brand"
                        : ""
                    }`}
                  />
                </>
              )}
            </button>
          ) : (
            nav.path && (
              <Link
                href={basePathPrefix + nav.path}
                className={`menu-item group ${
                  isActive(nav.path)
                    ? "menu-item-active rounded-2xl ring-1 ring-inset ring-primary/10 shadow-sm"
                    : "menu-item-inactive rounded-2xl"
                }`}
              >
                <span className={isActive(nav.path) ? "menu-item-icon-active" : "menu-item-icon-inactive"}>
                  {nav.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className="menu-item-text">
                    {t(`${nav.namespace ?? namespace}.${nav.key}`)}
                  </span>
                )}
              </Link>
            )
          )}

          {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
            <div
              className="overflow-hidden transition-all duration-300"
              style={{
                maxHeight:
                  openSubmenu?.type === menuType && openSubmenu?.index === index ? "400px" : "0px",
              }}
            >
              <ul
                className={`mt-2 space-y-1 rounded-2xl border border-border-light/70 bg-surface px-2 py-2 shadow-sm ${
                  isRTL ? "mr-9" : "ml-9"
                }`}
              >
                {nav.subItems.map((subItem) => (
                  <li key={subItem.key}>
                    <Link
                      href={basePathPrefix + subItem.path}
                      className={`menu-dropdown-item ${
                        isActive(subItem.path)
                          ? "menu-dropdown-item-active"
                          : "menu-dropdown-item-inactive"
                      }`}
                    >
                        {t(`${subItem.namespace ?? nav.namespace ?? namespace}.${subItem.key}`)}
                      </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </li>
      ))}
    </ul>
  );

  return (
    <aside
      className={`fixed top-0 z-50 mt-16 flex h-screen flex-col border-border-light/80 bg-surface-secondary/96 px-4 text-text-primary shadow-theme-md backdrop-blur-xl transition-all duration-300 ease-in-out dark:border-border-light dark:bg-surface-secondary/96 lg:mt-0 ${
        isRTL ? "right-0 border-l" : "left-0 border-r"
      } ${
        isExpanded || isMobileOpen ? "w-[290px]" : isHovered ? "w-[290px]" : "w-[90px]"
      } ${isMobileOpen ? "translate-x-0" : isRTL ? "translate-x-full" : "-translate-x-full"} ${
        isRTL ? "lg:-translate-x-0" : "lg:translate-x-0"
      }`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`flex items-center border-b border-border-light/60 py-6 ${
          !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
        }`}
      >
        <BrandMark compact={!isExpanded && !isHovered && !isMobileOpen} href={basePathPrefix + "/"} />
      </div>

      <div className="no-scrollbar flex flex-col overflow-y-auto">
        <nav className="mb-6">
          <div className="flex flex-col gap-5">
            {navigation.map((section) => (
              <div key={section.key}>
                {isExpanded || isHovered || isMobileOpen ? (
                  <button
                    type="button"
                    onClick={() => toggleSection(section.key)}
                    className="mb-3 flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-xs uppercase leading-[20px] text-text-muted transition hover:bg-surface hover:text-text-secondary dark:hover:bg-surface-tertiary"
                  >
                    <span className="flex-1 text-start">
                      {t(
                        section.titleKey
                          ? section.titleKey.includes(".")
                            ? section.titleKey
                            : `${section.key}.${section.titleKey}`
                          : `${section.key}.title`
                      )}
                    </span>
                    <ChevronDownIcon
                      className={`h-4 w-4 transition-transform ${
                        collapsedSections[section.key] ? "" : "rotate-180"
                      }`}
                    />
                  </button>
                ) : (
                  <h2 className="mb-3 flex justify-center text-xs uppercase leading-[20px] text-text-muted">
                    <span>...</span>
                  </h2>
                )}

                <div
                  className="overflow-hidden transition-all duration-300"
                  style={{
                    maxHeight:
                      !isExpanded && !isHovered && !isMobileOpen
                        ? "none"
                        : collapsedSections[section.key]
                          ? "0px"
                          : "1200px",
                  }}
                >
                  {renderMenuItems(
                    section.items,
                    section.key,
                    section.namespace ?? section.key,
                  )}
                </div>
              </div>
            ))}
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default DynamicSidebar;
