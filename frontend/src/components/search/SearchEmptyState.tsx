"use client";

import React from "react";
import { SearchX, Lightbulb } from "lucide-react";

interface SearchEmptyStateProps {
  query?: string;
  onSuggestionClick?: (query: string) => void;
}

export const SearchEmptyState: React.FC<SearchEmptyStateProps> = ({
  query,
  onSuggestionClick,
}) => {
  const suggestions = [
    "Transformer attention mechanisms",
    "Empirical scaling laws",
    "Neural network loss optimization",
    "Self-supervised representation learning",
  ];

  return (
    <div className="bg-white border border-borderNeutral rounded-card p-12 text-center space-y-4 shadow-sm animate-in fade-in duration-200">
      <div className="w-12 h-12 rounded-full bg-bgSecondary flex items-center justify-center text-textMuted mx-auto">
        <SearchX className="w-6 h-6" />
      </div>

      <div className="space-y-1.5 max-w-md mx-auto">
        <h4 className="font-heading font-medium text-base text-textPrimary">
          No matching research papers found
        </h4>
        <p className="font-body text-xs text-textSecondary leading-relaxed">
          {query
            ? `We couldn't find any indexed passages matching "${query}". Try adjusting your query, toggling between Hybrid and Keyword modes, or uploading new papers.`
            : "Try adjusting your query, toggling between Hybrid and Keyword modes, or uploading new papers."}
        </p>
      </div>

      {onSuggestionClick && (
        <div className="pt-2 max-w-lg mx-auto">
          <div className="flex items-center justify-center gap-1.5 font-meta text-[11px] text-textMuted mb-2">
            <Lightbulb className="w-3.5 h-3.5 text-accent" />
            <span>Try searching for:</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onSuggestionClick(s)}
                className="font-meta text-xs px-2.5 py-1 rounded-full bg-bgSecondary text-textSecondary border border-borderNeutral hover:border-accent/40 hover:text-accent transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
