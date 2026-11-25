"use client";

import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, ExternalLink, FileText } from "lucide-react";

interface PDFViewerProps {
  fileUrl: string;
  filename: string;
  title: string;
  totalPages: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  isPdf?: boolean;
  textContent?: string;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({
  fileUrl,
  filename,
  title,
  totalPages,
  currentPage,
  onPageChange,
  isPdf = true,
  textContent,
}) => {
  const [zoom, setZoom] = useState<number>(100);
  const [pageInput, setPageInput] = useState<string>(String(currentPage));

  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  const handlePageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(pageInput, 10);
    if (!isNaN(val) && val >= 1 && val <= (totalPages || 1)) {
      onPageChange(val);
    } else {
      setPageInput(String(currentPage));
    }
  };

  const handlePrev = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(200, prev + 25));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(50, prev - 25));
  };

  const iframeSrc = isPdf
    ? `${fileUrl}#page=${currentPage}&zoom=${zoom}`
    : fileUrl;

  return (
    <div className="flex flex-col h-[750px] bg-white border border-borderNeutral rounded-card shadow-sm overflow-hidden">
      {/* Viewer Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-bgSecondary border-b border-borderNeutral text-xs font-heading">
        {/* Page Navigation */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentPage <= 1}
            className="p-1 rounded hover:bg-white text-textPrimary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <form onSubmit={handlePageSubmit} className="flex items-center gap-1.5 font-meta">
            <span>Page</span>
            <input
              type="text"
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              className="w-10 px-1.5 py-0.5 text-center font-meta text-xs border border-borderNeutral rounded bg-white text-textPrimary focus:outline-none focus:border-accent"
            />
            <span className="text-textMuted">of {totalPages || 1}</span>
          </form>

          <button
            type="button"
            onClick={handleNext}
            disabled={currentPage >= totalPages}
            className="p-1 rounded hover:bg-white text-textPrimary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          {isPdf && (
            <div className="flex items-center gap-1 border-r border-borderNeutral pr-2">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoom <= 50}
                className="p-1 rounded hover:bg-white text-textSecondary hover:text-textPrimary disabled:opacity-40"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="font-meta text-[11px] text-textMuted w-9 text-center">
                {zoom}%
              </span>
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoom >= 200}
                className="p-1 rounded hover:bg-white text-textSecondary hover:text-textPrimary disabled:opacity-40"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Action Links */}
          <div className="flex items-center gap-1">
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 rounded hover:bg-white text-textSecondary hover:text-textPrimary transition-colors"
              title="Open in new browser window"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <a
              href={fileUrl}
              download={filename}
              className="p-1 rounded hover:bg-white text-textSecondary hover:text-textPrimary transition-colors"
              title="Download File"
            >
              <Download className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Embedded Document Frame */}
      <div className="flex-1 w-full bg-slate-100 relative overflow-hidden">
        {isPdf ? (
          <iframe
            src={iframeSrc}
            title={title || filename}
            className="w-full h-full border-none"
          />
        ) : (
          /* Text / DOCX fallback reader */
          <div className="p-8 overflow-y-auto h-full max-w-3xl mx-auto bg-white shadow-sm font-body text-sm leading-relaxed text-textPrimary whitespace-pre-wrap">
            {textContent || (
              <div className="text-center py-16 text-textMuted font-body text-xs space-y-2">
                <FileText className="w-8 h-8 mx-auto text-textMuted/60" />
                <p>Non-PDF text document view.</p>
                <p className="text-[11px]">Use the passages sidebar to inspect individual chunks.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
