"use client";

import React from "react";
import { Sliders, RotateCcw, Calendar, BookOpen, Layers, User as UserIcon, X } from "lucide-react";
import { SearchFiltersResponse } from "@/lib/api";

export interface ActiveFilterState {
  yearStart?: number;
  yearEnd?: number;
  domain?: string;
  documentType?: string;
  author?: string;
}

interface SearchFiltersProps {
  filters: ActiveFilterState;
  availableFacets: SearchFiltersResponse | null;
  onFilterChange: (newFilters: ActiveFilterState) => void;
  onReset: () => void;
  isLoading?: boolean;
}

export const SearchFilters: React.FC<SearchFiltersProps> = ({
  filters,
  availableFacets,
  onFilterChange,
  onReset,
  isLoading = false,
}) => {
  const currentYear = new Date().getFullYear();
  const minCorpusYear = availableFacets?.min_year ?? 2000;
  const maxCorpusYear = availableFacets?.max_year ?? currentYear;

  const hasActiveFilters = Boolean(
    filters.yearStart ||
    filters.yearEnd ||
    (filters.domain && filters.domain !== "all") ||
    (filters.documentType && filters.documentType !== "all") ||
    filters.author
  );

  const handleYearPreset = (preset: "all" | "5y" | "10y") => {
    if (preset === "all") {
      onFilterChange({ ...filters, yearStart: undefined, yearEnd: undefined });
    } else if (preset === "5y") {
      onFilterChange({ ...filters, yearStart: currentYear - 5, yearEnd: currentYear });
    } else if (preset === "10y") {
      onFilterChange({ ...filters, yearStart: currentYear - 10, yearEnd: currentYear });
    }
  };

  return (
    <div className="bg-white border border-borderNeutral rounded-card p-5 space-y-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-borderNeutral">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-accent" />
          <h3 className="font-heading font-medium text-sm text-textPrimary uppercase tracking-wide">
            Filters
          </h3>
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onReset}
            className="font-meta text-xs text-textSecondary hover:text-accent flex items-center gap-1 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            Reset all
          </button>
        )}
      </div>

      {/* Publication Year Range */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-heading text-xs font-medium text-textPrimary flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-textMuted" />
            Publication Year
          </span>
          {(filters.yearStart || filters.yearEnd) && (
            <span className="font-meta text-[11px] text-accent font-medium">
              {filters.yearStart || minCorpusYear} – {filters.yearEnd || maxCorpusYear}
            </span>
          )}
        </div>

        {/* Year Range Presets */}
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => handleYearPreset("all")}
            className={`py-1 text-[11px] font-meta rounded border transition-colors cursor-pointer ${
              !filters.yearStart && !filters.yearEnd
                ? "bg-accent/10 border-accent/40 text-accent font-medium"
                : "border-borderNeutral text-textSecondary hover:border-textMuted"
            }`}
          >
            All Time
          </button>
          <button
            type="button"
            onClick={() => handleYearPreset("5y")}
            className={`py-1 text-[11px] font-meta rounded border transition-colors cursor-pointer ${
              filters.yearStart === currentYear - 5
                ? "bg-accent/10 border-accent/40 text-accent font-medium"
                : "border-borderNeutral text-textSecondary hover:border-textMuted"
            }`}
          >
            Last 5 Y
          </button>
          <button
            type="button"
            onClick={() => handleYearPreset("10y")}
            className={`py-1 text-[11px] font-meta rounded border transition-colors cursor-pointer ${
              filters.yearStart === currentYear - 10
                ? "bg-accent/10 border-accent/40 text-accent font-medium"
                : "border-borderNeutral text-textSecondary hover:border-textMuted"
            }`}
          >
            Last 10 Y
          </button>
        </div>

        {/* Numeric Year Inputs */}
        <div className="flex items-center gap-2 pt-1">
          <input
            type="number"
            min={1900}
            max={2099}
            placeholder={String(minCorpusYear)}
            value={filters.yearStart ?? ""}
            onChange={(e) => {
              const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
              onFilterChange({ ...filters, yearStart: val });
            }}
            className="w-full px-2.5 py-1.5 text-xs font-meta border border-borderNeutral rounded-md focus:outline-none focus:border-accent bg-bgSecondary/30 text-textPrimary"
          />
          <span className="text-textMuted text-xs font-meta">—</span>
          <input
            type="number"
            min={1900}
            max={2099}
            placeholder={String(maxCorpusYear)}
            value={filters.yearEnd ?? ""}
            onChange={(e) => {
              const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
              onFilterChange({ ...filters, yearEnd: val });
            }}
            className="w-full px-2.5 py-1.5 text-xs font-meta border border-borderNeutral rounded-md focus:outline-none focus:border-accent bg-bgSecondary/30 text-textPrimary"
          />
        </div>
      </div>

      {/* Research Domain Filter */}
      <div className="space-y-2.5 pt-2 border-t border-borderNeutral">
        <span className="font-heading text-xs font-medium text-textPrimary flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5 text-textMuted" />
          Research Domain
        </span>

        <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
          <label className="flex items-center justify-between text-xs font-body text-textSecondary hover:text-textPrimary cursor-pointer py-0.5">
            <div className="flex items-center gap-2">
              <input
                type="radio"
                name="domain_filter"
                checked={!filters.domain || filters.domain === "all"}
                onChange={() => onFilterChange({ ...filters, domain: undefined })}
                className="text-accent focus:ring-accent accent-accent"
              />
              <span>All Domains</span>
            </div>
          </label>

          {availableFacets?.domains.map((dom) => (
            <label
              key={dom.name}
              className="flex items-center justify-between text-xs font-body text-textSecondary hover:text-textPrimary cursor-pointer py-0.5"
            >
              <div className="flex items-center gap-2 truncate">
                <input
                  type="radio"
                  name="domain_filter"
                  checked={filters.domain === dom.name}
                  onChange={() => onFilterChange({ ...filters, domain: dom.name })}
                  className="text-accent focus:ring-accent accent-accent"
                />
                <span className="truncate">{dom.name}</span>
              </div>
              <span className="font-meta text-[11px] text-textMuted shrink-0">
                {dom.count}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Document Type Filter */}
      <div className="space-y-2.5 pt-2 border-t border-borderNeutral">
        <span className="font-heading text-xs font-medium text-textPrimary flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-textMuted" />
          Document Type
        </span>

        <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
          <label className="flex items-center justify-between text-xs font-body text-textSecondary hover:text-textPrimary cursor-pointer py-0.5">
            <div className="flex items-center gap-2">
              <input
                type="radio"
                name="doctype_filter"
                checked={!filters.documentType || filters.documentType === "all"}
                onChange={() => onFilterChange({ ...filters, documentType: undefined })}
                className="text-accent focus:ring-accent accent-accent"
              />
              <span>All Types</span>
            </div>
          </label>

          {availableFacets?.document_types.map((dt) => (
            <label
              key={dt.name}
              className="flex items-center justify-between text-xs font-body text-textSecondary hover:text-textPrimary cursor-pointer py-0.5"
            >
              <div className="flex items-center gap-2 truncate">
                <input
                  type="radio"
                  name="doctype_filter"
                  checked={filters.documentType === dt.name}
                  onChange={() => onFilterChange({ ...filters, documentType: dt.name })}
                  className="text-accent focus:ring-accent accent-accent"
                />
                <span className="truncate">{dt.name}</span>
              </div>
              <span className="font-meta text-[11px] text-textMuted shrink-0">
                {dt.count}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Author Name Filter */}
      <div className="space-y-2.5 pt-2 border-t border-borderNeutral">
        <span className="font-heading text-xs font-medium text-textPrimary flex items-center gap-1.5">
          <UserIcon className="w-3.5 h-3.5 text-textMuted" />
          Author
        </span>

        <div className="relative">
          <input
            type="text"
            placeholder="Search author..."
            value={filters.author ?? ""}
            onChange={(e) => {
              const val = e.target.value.trim() ? e.target.value : undefined;
              onFilterChange({ ...filters, author: val });
            }}
            className="w-full px-2.5 py-1.5 text-xs font-meta border border-borderNeutral rounded-md focus:outline-none focus:border-accent bg-bgSecondary/30 text-textPrimary pr-6"
          />
          {filters.author && (
            <button
              type="button"
              onClick={() => onFilterChange({ ...filters, author: undefined })}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-textMuted hover:text-textPrimary cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Top Author Suggestions */}
        {availableFacets?.authors && availableFacets.authors.length > 0 && !filters.author && (
          <div className="pt-1">
            <span className="font-meta text-[11px] text-textMuted block mb-1">
              Top Authors:
            </span>
            <div className="flex flex-wrap gap-1">
              {availableFacets.authors.slice(0, 5).map((authorName) => (
                <button
                  key={authorName}
                  type="button"
                  onClick={() => onFilterChange({ ...filters, author: authorName })}
                  className="text-[10px] font-meta px-2 py-0.5 rounded bg-bgSecondary text-textSecondary border border-borderNeutral hover:border-accent hover:text-accent transition-colors truncate max-w-[130px] cursor-pointer"
                  title={authorName}
                >
                  {authorName}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
