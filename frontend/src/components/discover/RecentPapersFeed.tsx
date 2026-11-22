"use client";

import React from "react";
import Link from "next/link";
import { FileText, UploadCloud, Info } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface PaperItem {
  id: string;
  title: string;
  authors: string[];
  publication_year?: number;
  domain?: string;
  created_at: string;
}

export const RecentPapersFeed: React.FC = () => {
  // Genuine empty state: no papers indexed initially
  const papers: PaperItem[] = [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-borderNeutral">
        <div className="flex items-center space-x-2">
          <h3 className="font-heading font-medium text-base text-textPrimary">
            Recently Added Papers
          </h3>
          <span className="font-meta text-xs px-2 py-0.5 rounded-full bg-bgSecondary text-textSecondary border border-borderNeutral">
            {papers.length}
          </span>
        </div>
        <Link
          href="/upload"
          className="text-xs text-accent hover:text-accentHover font-heading transition-colors"
        >
          + Upload Papers
        </Link>
      </div>

      {papers.length === 0 ? (
        <div className="rounded-card border border-borderNeutral bg-white p-10 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-bgSecondary border border-borderNeutral mx-auto flex items-center justify-center text-textMuted">
            <FileText className="w-6 h-6 text-accent" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h4 className="font-heading font-medium text-sm text-textPrimary">
              No documents indexed yet
            </h4>
            <p className="font-body text-xs text-textSecondary leading-relaxed">
              ResearchVault indexes real academic literature without mock data. Upload your own research papers (PDF, DOCX, TXT) to begin passage retrieval and semantic analysis.
            </p>
          </div>
          <div className="pt-2">
            <Link href="/upload">
              <Button variant="secondary" size="sm" className="space-x-2">
                <UploadCloud className="w-3.5 h-3.5 text-accent" />
                <span>Upload First Paper</span>
              </Button>
            </Link>
          </div>
          <div className="pt-4 border-t border-borderNeutral/60 max-w-sm mx-auto flex items-center justify-center space-x-2 text-[11px] text-textMuted font-meta">
            <Info className="w-3.5 h-3.5" />
            <span>Document indexing and vector extraction ready in Phase 2</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Populated dynamically once documents are uploaded */}
        </div>
      )}
    </div>
  );
};
