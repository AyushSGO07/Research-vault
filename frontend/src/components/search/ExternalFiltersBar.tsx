import React from "react";
import { Filter, ArrowUpDown } from "lucide-react";

interface ExternalFiltersBarProps {
  source: "all" | "arxiv" | "openalex";
  onSourceChange: (source: "all" | "arxiv" | "openalex") => void;
  sortBy: "relevance" | "citations" | "newest";
  onSortChange: (sort: "relevance" | "citations" | "newest") => void;
  totalResults: number;
  isLoading: boolean;
}

export function ExternalFiltersBar({
  source,
  onSourceChange,
  sortBy,
  onSortChange,
  totalResults,
  isLoading,
}: ExternalFiltersBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#FFFFFF] border border-[#E6E9EF] rounded-xl mb-4">
      {/* Source selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-[#697586] flex items-center gap-1">
          <Filter className="w-3 h-3" />
          <span>Repository:</span>
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onSourceChange("all")}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
              source === "all"
                ? "bg-[#315EAB] text-[#FFFFFF]"
                : "bg-[#F7F8FA] text-[#697586] hover:bg-[#E6E9EF]"
            }`}
          >
            All Sources
          </button>
          <button
            type="button"
            onClick={() => onSourceChange("arxiv")}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
              source === "arxiv"
                ? "bg-rose-600 text-[#FFFFFF]"
                : "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
            }`}
          >
            arXiv Preprints
          </button>
          <button
            type="button"
            onClick={() => onSourceChange("openalex")}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
              source === "openalex"
                ? "bg-emerald-600 text-[#FFFFFF]"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
            }`}
          >
            OpenAlex Works
          </button>
        </div>
      </div>

      {/* Right: Results Count & Sort Dropdown */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-[#697586] font-roboto">
          {isLoading ? (
            "Searching global repositories..."
          ) : (
            <>
              Showing <span className="font-semibold text-[#202733]">{totalResults}</span> academic works
            </>
          )}
        </span>

        <div className="flex items-center gap-1 text-xs text-[#697586]">
          <ArrowUpDown className="w-3 h-3" />
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as "relevance" | "citations" | "newest")}
            className="bg-[#F7F8FA] border border-[#E6E9EF] text-[#202733] text-xs rounded-lg px-2 py-1 outline-none focus:border-[#315EAB]"
          >
            <option value="relevance">Sort: Relevance</option>
            <option value="citations">Sort: Highest Citations</option>
            <option value="newest">Sort: Newest First</option>
          </select>
        </div>
      </div>
    </div>
  );
}
