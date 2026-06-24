"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import type { CountryListItem } from "../api/admin-patients.api";

interface CountrySelectorProps {
  countries: CountryListItem[];
  value: string | null;
  onChange: (country: CountryListItem) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  overflowMessage?: (count: number) => string;
  disabled?: boolean;
  error?: boolean;
}

const MAX_VISIBLE = 8;

export function CountrySelector({
  countries,
  value,
  onChange,
  placeholder = "Select a country",
  searchPlaceholder = "Search countries...",
  emptyMessage = "No countries found",
  overflowMessage = (count) => `+${count} more results — try refining your search`,
  disabled = false,
  error = false,
}: CountrySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedCountry = countries.find((c) => c.isoCode === value) ?? null;

  const filtered = search.trim()
    ? countries.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.isoCode.toLowerCase().includes(search.toLowerCase()) ||
          (c.nativeName && c.nativeName.toLowerCase().includes(search.toLowerCase())),
      )
    : countries;

  const visible = filtered.slice(0, MAX_VISIBLE);
  const overflow = filtered.length - MAX_VISIBLE;

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (country: CountryListItem) => {
    onChange(country);
    setIsOpen(false);
    setSearch("");
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen((o) => !o)}
        disabled={disabled}
        className={`
          app-control flex h-11 w-full items-center justify-between px-4 py-2.5
          ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}
          ${error ? "border-error-500" : ""}
        `}
      >
        <span className={selectedCountry ? "text-text-primary" : "text-text-muted"}>
          {selectedCountry
            ? `${selectedCountry.name} (${selectedCountry.isoCode})`
            : placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-text-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-2xl border border-border-light bg-white shadow-[0_18px_40px_-24px_rgba(25,52,57,0.18)] dark:border-border-light dark:bg-surface-secondary dark:shadow-[0_18px_40px_-24px_rgba(0,0,0,0.45)]">
          <div className="border-b border-border-light/60 p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="app-control h-9 w-full ps-9 pe-3 text-sm"
              />
            </div>
          </div>

          <ul className="max-h-60 overflow-y-auto py-1">
            {visible.length === 0 ? (
              <li className="px-4 py-3 text-sm text-text-muted">{emptyMessage}</li>
            ) : (
              visible.map((country) => (
                <li key={country.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(country)}
                    className="flex w-full items-center justify-between px-4 py-2.5 text-start text-sm hover:bg-surface-secondary/60 dark:hover:bg-white/5"
                  >
                    <span className="text-text-primary">{country.name}</span>
                    <span className="ms-2 text-xs text-text-muted">{country.isoCode}</span>
                  </button>
                </li>
              ))
            )}
            {overflow > 0 && (
              <li className="px-4 py-2 text-xs text-text-muted">
                {overflowMessage(overflow)}
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
