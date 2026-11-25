"use client";

import React from "react";
import { Sparkles, Layers, FileCode } from "lucide-react";

interface SearchModeToggleProps {
  mode: "hybrid" | "semantic" | "keyword";
  onModeChange: (mode: "hybrid" | "semantic" | "keyword") => void;
  disabled?: boolean;
}

export const SearchModeToggle: React.FC<SearchModeToggleProps> = ({
  mode,
  onModeChange,
  disabled = false,
}) => {
  return (
    <div className="inline-flex p-1 bg-bgSecondary rounded-lg border border-borderNeutral">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onModeChange("hybrid")}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-heading text-xs transition-all ${
          mode === "hybrid"
            ? "bg-white text-accent font-medium shadow-sm"
            : "text-textSecondary hover:text-textPrimary"
        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        title="Combines dense vector similarity and sparse BM25 keyword matching via Reciprocal Rank Fusion"
      >
        <Sparkles className="w-3.5 h-3.5 text-accent" />
        Hybrid (RRF)
      </button>

      <button
        type="button"
        disabled={disabled}
        onClick={() => onModeChange("semantic")}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-heading text-xs transition-all ${
          mode === "semantic"
            ? "bg-white text-accent font-medium shadow-sm"
            : "text-textSecondary hover:text-textPrimary"
        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        title="Dense vector search using all-MiniLM-L6-v2 cosine similarity"
      >
        <Layers className="w-3.5 h-3.5" />
        Semantic
      </button>

      <button
        type="button"
        disabled={disabled}
        onClick={() => onModeChange("keyword")}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-heading text-xs transition-all ${
          mode === "keyword"
            ? "bg-white text-accent font-medium shadow-sm"
            : "text-textSecondary hover:text-textPrimary"
        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        title="Sparse lexical search using BM25 token matching"
      >
        <FileCode className="w-3.5 h-3.5" />
        Keyword (BM25)
      </button>
    </div>
  );
};
