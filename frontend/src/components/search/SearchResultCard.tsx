"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Users, ChevronDown, ChevronUp, FileText, ArrowUpRight, Sparkles, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DocumentSearchResult, savedApi } from "@/lib/api";

interface SearchResultCardProps {
  result: DocumentSearchResult;
  mode: "hybrid" | "semantic" | "keyword";
  isSaved?: boolean;
}

export const SearchResultCard: React.FC<SearchResultCardProps> = ({
  result,
  mode,
  isSaved = false,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(isSaved);

  const handleToggleBookmark = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = !saved;
    setSaved(next);
    try {
      if (next) {
        await savedApi.save(result.document_id);
      } else {
        await savedApi.unsave(result.document_id);
      }
    } catch {
      setSaved(!next);
    }
  };

  const docUrl = `/documents/${result.document_id}?page=${result.primary_passage.page_number}&chunk=${result.primary_passage.chunk_id}`;

  const formatScoreBadge = () => {
    if (result.is_reranked) {
      return (
        <span className="font-meta text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-statusSuccess border border-statusSuccess/30 font-medium inline-flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-statusSuccess" />
          Reranked: {result.score.toFixed(4)}
        </span>
      );
    }
    if (mode === "hybrid") {
      return (
        <span className="font-meta text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-accent border border-accent/20 font-medium">
          RRF: {result.score.toFixed(4)}
        </span>
      );
    } else if (mode === "semantic") {
      const pct = Math.min(100, Math.round(result.score * 100));
      return (
        <span className="font-meta text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-statusSuccess border border-statusSuccess/20 font-medium">
          Match: {pct}%
        </span>
      );
    } else {
      return (
        <span className="font-meta text-xs px-2.5 py-0.5 rounded-full bg-amber-50 text-statusWarning border border-statusWarning/20 font-medium">
          BM25: {result.score.toFixed(2)}
        </span>
      );
    }
  };

  return (
    <div className="bg-white border border-borderNeutral rounded-card p-6 space-y-4 shadow-sm hover:border-accent/40 transition-colors">
      {/* Title & Score Row */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <Link
            href={docUrl}
            className="group inline-flex items-center gap-1.5 font-heading font-medium text-lg text-textPrimary hover:text-accent transition-colors leading-snug line-clamp-2"
            title={result.title}
          >
            <span>{result.title}</span>
            <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </Link>

          <div className="flex items-center gap-3 font-meta text-xs text-textMuted flex-wrap">
            {result.authors && (
              <span className="flex items-center gap-1 text-textSecondary">
                <Users className="w-3.5 h-3.5 text-textMuted" />
                <span className="truncate max-w-sm">{result.authors}</span>
              </span>
            )}
            {result.publication_year && (
              <span>• Year: {result.publication_year}</span>
            )}
            {result.doi && (
              <span className="truncate max-w-xs">• DOI: {result.doi}</span>
            )}
            <span>• {result.total_pages} pages</span>
            {result.domain && (
              <span className="px-2 py-0.5 rounded text-[10px] font-meta bg-bgSecondary text-textSecondary border border-borderNeutral">
                {result.domain}
              </span>
            )}
            {result.document_type && (
              <span className="px-2 py-0.5 rounded text-[10px] font-meta bg-bgSecondary text-textSecondary border border-borderNeutral">
                {result.document_type}
              </span>
            )}
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleBookmark}
            className={`p-1.5 rounded-full border transition-colors cursor-pointer ${
              saved
                ? "bg-amber-50 border-amber-300 text-amber-600"
                : "border-borderNeutral text-textMuted hover:text-textPrimary hover:border-textMuted"
            }`}
            title={saved ? "Remove from saved library" : "Save paper to library"}
          >
            <Bookmark className={`w-3.5 h-3.5 ${saved ? "fill-amber-600" : ""}`} />
          </button>
          {formatScoreBadge()}
        </div>
      </div>

      {/* Primary Matching Passage Box (Click jumps to PDF page) */}
      <Link
        href={docUrl}
        className="block group bg-bgSecondary/60 hover:bg-bgSecondary/90 border-l-2 border-accent p-3.5 rounded-r-md space-y-2 transition-colors cursor-pointer"
        title="Click to view and jump to this passage in PDF viewer"
      >
        <p className="font-body text-xs text-textSecondary leading-relaxed whitespace-pre-wrap">
          {result.primary_passage.text}
        </p>

        <div className="font-meta text-[11px] text-textMuted flex items-center justify-between pt-1 border-t border-borderNeutral/50">
          <span className="flex items-center gap-1.5 group-hover:text-accent transition-colors">
            <FileText className="w-3 h-3 text-accent" />
            Page {result.primary_passage.page_number} • Primary Matching Passage (Click to jump to PDF page)
          </span>
          <span className="text-textMuted">{result.primary_passage.token_count} tokens</span>
        </div>
      </Link>

      {/* Additional Matched Passages Accordion */}
      {result.additional_passages && result.additional_passages.length > 0 && (
        <div className="space-y-3 pt-1">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="font-meta text-xs text-accent hover:text-accentHover inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                Hide additional matching passages
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                View {result.additional_passages.length} additional matching passage
                {result.additional_passages.length > 1 ? "s" : ""}
              </>
            )}
          </button>

          {isExpanded && (
            <div className="space-y-2.5 pl-3 border-l border-borderNeutral/80 animate-in fade-in duration-200">
              {result.additional_passages.map((p, idx) => (
                <div
                  key={p.chunk_id || idx}
                  className="bg-bgSecondary/40 p-3 rounded-md border border-borderNeutral/60 space-y-1.5"
                >
                  <p className="font-body text-xs text-textSecondary leading-relaxed whitespace-pre-wrap">
                    {p.text}
                  </p>
                  <div className="font-meta text-[10px] text-textMuted flex items-center justify-between">
                    <span>Page {p.page_number} • Passage {p.chunk_index + 1}</span>
                    <span>{p.token_count} tokens</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Card Footer Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-borderNeutral/60">
        <span className="font-meta text-[11px] text-textMuted">
          Matched from authentic indexed paper
        </span>
        <div className="flex items-center gap-2">
          <Link href="/library">
            <Button variant="outline" size="sm">
              View in Library
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
