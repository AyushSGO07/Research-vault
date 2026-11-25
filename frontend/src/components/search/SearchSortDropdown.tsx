"use client";

import React from "react";
import { ArrowDownAZ } from "lucide-react";

interface SearchSortDropdownProps {
  sortBy: "relevance" | "newest" | "oldest";
  onSortChange: (newSort: "relevance" | "newest" | "oldest") => void;
  disabled?: boolean;
}

export const SearchSortDropdown: React.FC<SearchSortDropdownProps> = ({
  sortBy,
  onSortChange,
  disabled = false,
}) => {
  return (
    <div className="flex items-center gap-1.5 font-meta text-xs text-textSecondary">
      <ArrowDownAZ className="w-3.5 h-3.5 text-textMuted shrink-0" />
      <span className="hidden sm:inline text-textMuted">Sort by:</span>
      <select
        value={sortBy}
        disabled={disabled}
        onChange={(e) =>
          onSortChange(e.target.value as "relevance" | "newest" | "oldest")
        }
        className="bg-white border border-borderNeutral rounded-md px-2 py-1 text-xs font-heading text-textPrimary focus:outline-none focus:border-accent hover:border-textMuted transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <option value="relevance">Relevance (Score)</option>
        <option value="newest">Newest First</option>
        <option value="oldest">Oldest First</option>
      </select>
    </div>
  );
};
