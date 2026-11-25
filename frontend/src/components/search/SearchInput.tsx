"use client";

import React, { useRef, useEffect } from "react";
import { Search, X, Loader2 } from "lucide-react";

interface SearchInputProps {
  value: string;
  onChange: (val: string) => void;
  onSearch: () => void;
  isSearching?: boolean;
  placeholder?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  onSearch,
  isSearching = false,
  placeholder = "Search research papers by concept, question, or key terminology...",
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  // Global '/' keyboard shortcut to focus search input
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl?.tagName === "INPUT" ||
        activeEl?.tagName === "TEXTAREA" ||
        (activeEl as HTMLElement)?.isContentEditable;

      if (e.key === "/" && !isInput) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onSearch();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onChange("");
    }
  };

  return (
    <div className="relative w-full shadow-sm">
      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-textMuted">
        <Search className="w-5 h-5" />
      </div>

      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full pl-11 pr-24 py-3 bg-white border border-borderNeutral rounded-lg font-heading text-sm text-textPrimary placeholder:text-textMuted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
        aria-label="Search research papers"
      />

      <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-2">
        {value && !isSearching && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="p-1 text-textMuted hover:text-textPrimary rounded transition-colors"
            aria-label="Clear query"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {isSearching ? (
          <div className="flex items-center text-accent font-meta text-xs">
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
        ) : (
          <button
            type="button"
            onClick={onSearch}
            className="font-meta text-[11px] px-2 py-0.5 rounded bg-bgSecondary text-textMuted border border-borderNeutral hover:text-textPrimary hover:border-borderNeutral/80 transition-colors"
            title="Press Enter to search"
          >
            ↵ Enter
          </button>
        )}
      </div>
    </div>
  );
};
