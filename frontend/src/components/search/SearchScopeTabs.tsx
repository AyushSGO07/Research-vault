import React from "react";
import { BookOpen, Globe } from "lucide-react";

interface SearchScopeTabsProps {
  scope: "library" | "global";
  onScopeChange: (scope: "library" | "global") => void;
  libraryResultsCount?: number;
}

export function SearchScopeTabs({
  scope,
  onScopeChange,
  libraryResultsCount,
}: SearchScopeTabsProps) {
  return (
    <div className="flex items-center gap-1.5 p-1 bg-[#F7F8FA] border border-[#E6E9EF] rounded-xl w-fit">
      <button
        type="button"
        onClick={() => onScopeChange("library")}
        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
          scope === "library"
            ? "bg-[#FFFFFF] text-[#315EAB] shadow-sm font-semibold border border-[#E6E9EF]"
            : "text-[#697586] hover:text-[#202733] hover:bg-[#FFFFFF]/60"
        }`}
      >
        <BookOpen className="w-3.5 h-3.5" />
        <span>My Research Vault</span>
        {libraryResultsCount !== undefined && libraryResultsCount > 0 && (
          <span className="px-1.5 py-0.5 text-[10px] bg-[#EFF6FF] text-[#315EAB] rounded-full font-roboto">
            {libraryResultsCount}
          </span>
        )}
      </button>

      <button
        type="button"
        onClick={() => onScopeChange("global")}
        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
          scope === "global"
            ? "bg-[#FFFFFF] text-[#315EAB] shadow-sm font-semibold border border-[#E6E9EF]"
            : "text-[#697586] hover:text-[#202733] hover:bg-[#FFFFFF]/60"
        }`}
      >
        <Globe className="w-3.5 h-3.5" />
        <span>Global Academic Literature</span>
        <span className="px-1.5 py-0.5 text-[10px] bg-rose-50 text-rose-700 border border-rose-200 rounded font-medium">
          arXiv & OpenAlex
        </span>
      </button>
    </div>
  );
}
