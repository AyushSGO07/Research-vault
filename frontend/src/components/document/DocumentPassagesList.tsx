"use client";

import React, { useState } from "react";
import { Search, FileText, ArrowRight, Hash } from "lucide-react";
import { DocumentChunkResponse } from "@/lib/api";

interface DocumentPassagesListProps {
  chunks: DocumentChunkResponse[];
  selectedChunkId?: number;
  currentPage: number;
  onSelectPassage: (chunk: DocumentChunkResponse) => void;
}

export const DocumentPassagesList: React.FC<DocumentPassagesListProps> = ({
  chunks,
  selectedChunkId,
  currentPage,
  onSelectPassage,
}) => {
  const [filterText, setFilterText] = useState<string>("");

  const filteredChunks = chunks.filter((c) =>
    filterText.trim()
      ? c.text.toLowerCase().includes(filterText.toLowerCase())
      : true
  );

  return (
    <div className="flex flex-col h-[750px] bg-white border border-borderNeutral rounded-card shadow-sm overflow-hidden">
      {/* Sidebar Header */}
      <div className="p-4 bg-bgSecondary border-b border-borderNeutral space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-heading text-xs font-medium text-textPrimary uppercase tracking-wide">
            <FileText className="w-3.5 h-3.5 text-accent" />
            <span>Document Passages</span>
          </div>
          <span className="font-meta text-xs text-textMuted font-mono">
            {chunks.length} chunks
          </span>
        </div>

        {/* Filter Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-textMuted absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search within passages..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs font-body border border-borderNeutral rounded-md bg-white text-textPrimary focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      {/* Chunks List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 divide-y-0">
        {filteredChunks.length === 0 ? (
          <div className="py-12 text-center text-textMuted font-body text-xs">
            No passages match your query.
          </div>
        ) : (
          filteredChunks.map((chunk) => {
            const isTarget = selectedChunkId === chunk.id;
            const isCurrentPage = currentPage === chunk.page_number;

            return (
              <div
                key={chunk.id}
                onClick={() => onSelectPassage(chunk)}
                className={`p-3 rounded-md border transition-all cursor-pointer space-y-2 ${
                  isTarget
                    ? "border-accent bg-blue-50/40 shadow-xs ring-1 ring-accent/30"
                    : isCurrentPage
                    ? "border-accent/40 bg-bgSecondary/60"
                    : "border-borderNeutral bg-white hover:border-textMuted hover:bg-bgSecondary/30"
                }`}
              >
                {/* Chunk Meta Header */}
                <div className="flex items-center justify-between text-[11px] font-meta">
                  <span className="font-medium text-textPrimary flex items-center gap-1">
                    <Hash className="w-3 h-3 text-textMuted" />
                    Chunk {chunk.chunk_index + 1} • Page {chunk.page_number}
                  </span>
                  <span className="text-textMuted font-mono">
                    {chunk.token_count} tokens
                  </span>
                </div>

                {/* Chunk Text Excerpt */}
                <p className="font-body text-xs text-textSecondary leading-relaxed line-clamp-4">
                  {chunk.text}
                </p>

                {/* Jump Action Hint */}
                <div className="pt-1 flex items-center justify-end text-[10px] font-meta text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="inline-flex items-center gap-1">
                    Jump to page {chunk.page_number}
                    <ArrowRight className="w-2.5 h-2.5" />
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
