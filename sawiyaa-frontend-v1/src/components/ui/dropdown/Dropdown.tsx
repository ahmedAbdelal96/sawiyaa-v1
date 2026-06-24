"use client";
import type React from "react";
import { useEffect, useRef } from "react";

interface DropdownProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  closeOnOutsideClick?: boolean;
}

export const Dropdown: React.FC<DropdownProps> = ({
  isOpen,
  onClose,
  children,
  className = "",
  closeOnOutsideClick = true,
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

 useEffect(() => {
  if (!closeOnOutsideClick) return;

  const handleClickOutside = (event: MouseEvent) => {
    if (
      dropdownRef.current &&
      !dropdownRef.current.contains(event.target as Node) &&
      !(event.target as HTMLElement).closest('.dropdown-toggle')
    ) {
      onClose();
    }
  };

  document.addEventListener("mousedown", handleClickOutside);
  return () => {
    document.removeEventListener("mousedown", handleClickOutside);
  };
}, [closeOnOutsideClick, onClose]);


  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className={`absolute z-40 mt-2 rounded-2xl border border-border-light bg-white shadow-[0_18px_40px_-24px_rgba(25,52,57,0.18)] dark:border-border-light dark:bg-surface-secondary dark:shadow-[0_18px_40px_-24px_rgba(0,0,0,0.45)] ${className}`}
    >
      {children}
    </div>
  );
};
