"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Users, Copy, Check, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DocumentResponse, DocumentStatusResponse } from "@/lib/api";

interface DocumentMetadataCardProps {
  document: DocumentResponse | DocumentStatusResponse;
  onUploadAnother: () => void;
}

export const DocumentMetadataCard: React.FC<DocumentMetadataCardProps> = ({
  document,
  onUploadAnother,
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  // Determine abstract (present on DocumentResponse or fallback)
  const abstractText = "abstract" in document ? document.abstract : null;

  const handleCopyAbstract = async () => {
    if (!abstractText) return;
    try {
      await navigator.clipboard.writeText(abstractText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const titleText = document.title || document.filename;

  return (
    <div className="bg-white border border-borderNeutral rounded-card p-6 space-y-5 shadow-sm animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="font-meta text-[11px] font-medium px-2 py-0.5 rounded bg-bgSecondary text-accent border border-borderNeutral">
            Indexed Paper
          </span>
        </div>

        <h3
          className="font-heading font-medium text-lg text-textPrimary leading-snug line-clamp-2"
          title={titleText}
        >
          {titleText}
        </h3>

        <div className="font-body text-xs text-textSecondary flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-textMuted shrink-0" />
          <span className="truncate">
            {document.authors || "Authors not specified in document header"}
          </span>
        </div>
      </div>

      {/* Statistics & Metadata Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 pb-2 border-y border-borderNeutral/60">
        <div>
          <span className="font-meta text-[10px] text-textMuted uppercase tracking-wider block">
            Year
          </span>
          <span className="font-meta text-xs font-medium text-textPrimary">
            {document.publication_year ? String(document.publication_year) : "—"}
          </span>
        </div>

        <div>
          <span className="font-meta text-[10px] text-textMuted uppercase tracking-wider block">
            DOI
          </span>
          <span
            className="font-meta text-xs font-medium text-accent truncate block"
            title={document.doi || undefined}
          >
            {document.doi || "—"}
          </span>
        </div>

        <div>
          <span className="font-meta text-[10px] text-textMuted uppercase tracking-wider block">
            Pages
          </span>
          <span className="font-meta text-xs font-medium text-textPrimary">
            {document.total_pages} pages
          </span>
        </div>

        <div>
          <span className="font-meta text-[10px] text-textMuted uppercase tracking-wider block">
            Passages
          </span>
          <span className="font-meta text-xs font-medium text-statusSuccess">
            {document.total_chunks} chunks (800 tok)
          </span>
        </div>
      </div>

      {/* Abstract Preview Box */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-heading font-medium text-xs text-textPrimary uppercase tracking-wider">
            Abstract Preview
          </span>
          {abstractText && (
            <button
              type="button"
              onClick={handleCopyAbstract}
              className="font-meta text-xs text-accent hover:text-accentHover flex items-center gap-1 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-statusSuccess" />
                  <span className="text-statusSuccess">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Abstract</span>
                </>
              )}
            </button>
          )}
        </div>

        <div className="bg-bgSecondary/70 border border-borderNeutral rounded-md p-4 max-h-48 overflow-y-auto">
          <p className="font-body text-xs text-textSecondary leading-relaxed whitespace-pre-wrap">
            {abstractText ||
              "No abstract section detected in header pages. Passage search across full document text is active."}
          </p>
        </div>
      </div>

      {/* Footer Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-borderNeutral">
        <div className="font-meta text-xs text-textMuted flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-statusSuccess shrink-0" />
          <span>Indexed in PostgreSQL &amp; ready for Phase 3 semantic retrieval</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onUploadAnother}
          >
            Upload Another Document
          </Button>
          <Link href="/library">
            <Button variant="primary" size="sm">
              View in Library
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
