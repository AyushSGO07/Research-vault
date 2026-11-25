"use client";

import React from "react";
import { X } from "lucide-react";
import { ActiveFilterState } from "./SearchFilters";

interface ActiveFilterChipsProps {
  filters: ActiveFilterState;
  sortBy?: "relevance" | "newest" | "oldest";
  isReranked?: boolean;
  onRemoveYear: () => void;
  onRemoveDomain: () => void;
  onRemoveDocumentType: () => void;
  onRemoveAuthor: () => void;
  onResetSort: () => void;
  onClearAll: () => void;
}

export const ActiveFilterChips: React.FC<ActiveFilterChipsProps> = ({
  filters,
  sortBy,
  isReranked,
  onRemoveYear,
  onRemoveDomain,
  onRemoveDocumentType,
  onRemoveAuthor,
  onResetSort,
  onClearAll,
}) => {
  const hasYear = Boolean(filters.yearStart || filters.yearEnd);
  const hasDomain = Boolean(filters.domain && filters.domain !== "all");
  const hasDocumentType = Boolean(filters.documentType && filters.documentType !== "all");
  const hasAuthor = Boolean(filters.author);
  const hasSort = sortBy && sortBy !== "relevance";

  const totalActive =
    (hasYear ? 1 : 0) +
    (hasDomain ? 1 : 0) +
    (hasDocumentType ? 1 : 0) +
    (hasAuthor ? 1 : 0) +
    (hasSort ? 1 : 0);

  if (totalActive === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 py-1">
      <span className="font-meta text-xs text-textMuted">Active filters:</span>

      {/* Year Chip */}
      {hasYear && (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-meta bg-blue-50 text-accent border border-accent/30">
          <span>
            Year: {filters.yearStart ? filters.yearStart : "Any"} – {filters.yearEnd ? filters.yearEnd : "Present"}
          </span>
          <button
            type="button"
            onClick={onRemoveYear}
            className="hover:text-accentHover cursor-pointer"
            title="Remove year filter"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      )}

      {/* Domain Chip */}
      {hasDomain && (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-meta bg-blue-50 text-accent border border-accent/30">
          <span>Domain: {filters.domain}</span>
          <button
            type="button"
            onClick={onRemoveDomain}
            className="hover:text-accentHover cursor-pointer"
            title="Remove domain filter"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      )}

      {/* Document Type Chip */}
      {hasDocumentType && (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-meta bg-blue-50 text-accent border border-accent/30">
          <span>Type: {filters.documentType}</span>
          <button
            type="button"
            onClick={onRemoveDocumentType}
            className="hover:text-accentHover cursor-pointer"
            title="Remove document type filter"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      )}

      {/* Author Chip */}
      {hasAuthor && (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-meta bg-blue-50 text-accent border border-accent/30">
          <span>Author: {filters.author}</span>
          <button
            type="button"
            onClick={onRemoveAuthor}
            className="hover:text-accentHover cursor-pointer"
            title="Remove author filter"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      )}

      {/* Sort Chip */}
      {hasSort && (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-meta bg-amber-50 text-amber-800 border border-amber-300">
          <span>Sort: {sortBy === "newest" ? "Newest First" : "Oldest First"}</span>
          <button
            type="button"
            onClick={onResetSort}
            className="hover:text-amber-900 cursor-pointer"
            title="Reset to relevance sort"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      )}

      {/* Clear All Action */}
      <button
        type="button"
        onClick={onClearAll}
        className="text-xs font-meta text-textMuted hover:text-accent transition-colors ml-1 cursor-pointer underline underline-offset-2"
      >
        Clear all
      </button>
    </div>
  );
};
