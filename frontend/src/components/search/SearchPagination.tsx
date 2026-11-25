"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface SearchPaginationProps {
  currentPage: number;
  totalPages: number;
  totalDocuments: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export const SearchPagination: React.FC<SearchPaginationProps> = ({
  currentPage,
  totalPages,
  totalDocuments,
  pageSize,
  onPageChange,
}) => {
  if (totalPages <= 1) return null;

  const startDoc = (currentPage - 1) * pageSize + 1;
  const endDoc = Math.min(currentPage * pageSize, totalDocuments);

  // Generate page numbers window
  const pages: number[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= currentPage - 1 && i <= currentPage + 1)
    ) {
      pages.push(i);
    }
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6 border-t border-borderNeutral">
      <div className="font-meta text-xs text-textMuted">
        Showing <span className="text-textPrimary font-medium">{startDoc}</span>–
        <span className="text-textPrimary font-medium">{endDoc}</span> of{" "}
        <span className="text-textPrimary font-medium">{totalDocuments}</span> papers
      </div>

      <div className="flex items-center gap-1.5 self-center">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="flex items-center gap-1"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </Button>

        <div className="flex items-center gap-1 mx-1">
          {pages.map((p, idx) => {
            const isPrevEllipsis = idx > 0 && p - pages[idx - 1] > 1;
            return (
              <React.Fragment key={p}>
                {isPrevEllipsis && (
                  <span className="font-meta text-xs text-textMuted px-1">...</span>
                )}
                <button
                  type="button"
                  onClick={() => onPageChange(p)}
                  className={`w-8 h-8 rounded-md font-meta text-xs transition-colors ${
                    p === currentPage
                      ? "bg-accent text-white font-medium"
                      : "text-textSecondary hover:bg-bgSecondary hover:text-textPrimary"
                  }`}
                >
                  {p}
                </button>
              </React.Fragment>
            );
          })}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="flex items-center gap-1"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
