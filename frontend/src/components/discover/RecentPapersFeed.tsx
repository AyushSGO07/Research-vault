"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { FileText, UploadCloud, Users, ArrowUpRight, BookOpen, Layers } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { documentsApi, DocumentResponse } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export const RecentPapersFeed: React.FC = () => {
  const { isAuthenticated, openAuthModal } = useAuth();
  const [papers, setPapers] = useState<DocumentResponse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isCurrent = true;

    async function loadRecentPapers() {
      setIsLoading(true);
      try {
        const list = await documentsApi.list();
        if (isCurrent) {
          setPapers(list.slice(0, 6));
        }
      } catch (err) {
        // Unauthenticated or network error: gracefully keep empty list
        if (isCurrent) {
          setPapers([]);
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    loadRecentPapers();

    return () => {
      isCurrent = false;
    };
  }, [isAuthenticated]);

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

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
          <div className="h-32 bg-bgSecondary rounded-card border border-borderNeutral" />
          <div className="h-32 bg-bgSecondary rounded-card border border-borderNeutral" />
        </div>
      ) : papers.length === 0 ? (
        <div className="rounded-card border border-borderNeutral bg-white p-10 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-bgSecondary border border-borderNeutral mx-auto flex items-center justify-center text-textMuted">
            <FileText className="w-6 h-6 text-accent" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h4 className="font-heading font-medium text-sm text-textPrimary">
              No documents in your library yet
            </h4>
            <p className="font-body text-xs text-textSecondary leading-relaxed">
              ResearchVault indexes real academic literature with full text extraction, semantic chunking, and neural search. Upload your research papers (PDF, DOCX, TXT) to begin discovery.
            </p>
          </div>
          <div className="pt-2 flex items-center justify-center gap-3">
            <Link href="/upload">
              <Button variant="secondary" size="sm" className="space-x-2">
                <UploadCloud className="w-3.5 h-3.5 text-accent" />
                <span>Upload First Paper</span>
              </Button>
            </Link>
            {!isAuthenticated && (
              <Button variant="outline" size="sm" onClick={openAuthModal}>
                Sign In
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {papers.map((paper) => (
            <Link
              key={paper.id}
              href={`/documents/${paper.id}`}
              className="bg-white border border-borderNeutral rounded-card p-5 space-y-3 shadow-xs hover:border-accent/50 hover:shadow-sm transition-all group flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-heading font-medium text-sm text-textPrimary group-hover:text-accent transition-colors line-clamp-2 leading-snug">
                    {paper.title || paper.filename}
                  </h4>
                  <ArrowUpRight className="w-4 h-4 text-textMuted group-hover:text-accent shrink-0 transition-colors" />
                </div>

                {paper.authors && (
                  <div className="flex items-center gap-1.5 text-xs text-textSecondary font-meta">
                    <Users className="w-3.5 h-3.5 text-textMuted shrink-0" />
                    <span className="truncate">{paper.authors}</span>
                  </div>
                )}

                {paper.abstract && (
                  <p className="font-body text-xs text-textSecondary line-clamp-2 leading-relaxed">
                    {paper.abstract}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-borderNeutral flex items-center justify-between text-xs font-meta text-textMuted">
                <div className="flex items-center gap-2">
                  {paper.domain && (
                    <span className="px-2 py-0.5 rounded bg-bgSecondary text-textSecondary border border-borderNeutral text-[11px]">
                      {paper.domain}
                    </span>
                  )}
                  {paper.publication_year && (
                    <span>{paper.publication_year}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px]">
                  <span>{paper.total_pages}p</span>
                  <span>•</span>
                  <span>{paper.total_chunks} chunks</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
