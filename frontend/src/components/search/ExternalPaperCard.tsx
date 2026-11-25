import React, { useState } from "react";
import Link from "next/link";
import {
  ExternalLink,
  Award,
  Download,
  CheckCircle2,
  Loader2,
  ChevronDown,
  ChevronUp,
  FileText,
} from "lucide-react";
import { ExternalPaperResult } from "@/lib/api";

interface ExternalPaperCardProps {
  paper: ExternalPaperResult;
  onImport: (paper: ExternalPaperResult) => Promise<void>;
  isImporting: boolean;
}

export function ExternalPaperCard({
  paper,
  onImport,
  isImporting,
}: ExternalPaperCardProps) {
  const [isAbstractExpanded, setIsAbstractExpanded] = useState<boolean>(false);

  return (
    <div className="bg-[#FFFFFF] border border-[#E6E9EF] rounded-xl p-5 hover:border-[#315EAB]/40 hover:shadow-sm transition-all flex flex-col justify-between">
      <div>
        {/* Top Badges Row */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {paper.source === "arxiv" ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium rounded-full bg-rose-50 text-rose-700 border border-rose-200">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse"></span>
              arXiv Preprint
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
              OpenAlex Catalog
            </span>
          )}

          {paper.cited_by_count > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              <Award className="w-3 h-3 text-blue-600" />
              <span className="font-roboto font-semibold">
                {paper.cited_by_count.toLocaleString()}
              </span>
              <span>citations</span>
            </span>
          )}

          {paper.pdf_url && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded bg-amber-50 text-amber-800 border border-amber-200">
              <FileText className="w-3 h-3" />
              Open Access PDF
            </span>
          )}

          {paper.domain && (
            <span className="px-2 py-0.5 text-[11px] font-medium rounded bg-[#F7F8FA] text-[#697586] border border-[#E6E9EF]">
              {paper.domain}
            </span>
          )}
        </div>

        {/* Paper Title */}
        <h3 className="font-poppins font-medium text-base text-[#202733] leading-snug mb-2 hover:text-[#315EAB] transition-colors">
          {paper.title}
        </h3>

        {/* Authors & Publication Year */}
        <div className="text-xs text-[#697586] font-roboto flex flex-wrap items-center gap-1.5 mb-3">
          <span className="font-medium text-[#202733]">{paper.authors}</span>
          {paper.publication_year && (
            <>
              <span>·</span>
              <span>{paper.publication_year}</span>
            </>
          )}
          {paper.journal && (
            <>
              <span>·</span>
              <span className="italic">{paper.journal}</span>
            </>
          )}
        </div>

        {/* Abstract */}
        {paper.abstract && (
          <div className="mb-4">
            <p
              className={`text-xs text-[#202733]/90 font-verdana leading-relaxed ${
                isAbstractExpanded ? "" : "line-clamp-3"
              }`}
            >
              {paper.abstract}
            </p>
            {paper.abstract.length > 200 && (
              <button
                type="button"
                onClick={() => setIsAbstractExpanded(!isAbstractExpanded)}
                className="mt-1 text-[11px] text-[#315EAB] hover:underline flex items-center gap-1 font-medium"
              >
                {isAbstractExpanded ? (
                  <>
                    <span>Collapse abstract</span>
                    <ChevronUp className="w-3 h-3" />
                  </>
                ) : (
                  <>
                    <span>Read full abstract</span>
                    <ChevronDown className="w-3 h-3" />
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bottom Footer Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#E6E9EF]/80 text-xs">
        <div className="flex items-center gap-2">
          {paper.doi && (
            <a
              href={`https://doi.org/${paper.doi}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#697586] hover:text-[#315EAB] flex items-center gap-1 font-roboto transition-colors"
            >
              <span>DOI: {paper.doi}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        <div>
          {paper.already_in_library && paper.library_document_id ? (
            <Link
              href={`/documents/${paper.library_document_id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#25845B]/10 text-[#25845B] hover:bg-[#25845B]/20 transition-all border border-[#25845B]/30"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-[#25845B]" />
              <span>In Library · View Document →</span>
            </Link>
          ) : isImporting ? (
            <button
              disabled
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#F7F8FA] text-[#697586] border border-[#E6E9EF] cursor-not-allowed"
            >
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#315EAB]" />
              <span>Downloading & Indexing...</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onImport(paper)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-[#FFFFFF] text-[#315EAB] hover:bg-[#315EAB] hover:text-[#FFFFFF] border border-[#315EAB]/40 hover:border-[#315EAB] shadow-sm transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>+ Import to Library</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
