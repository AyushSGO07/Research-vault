"use client";

import React from "react";
import {
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Check,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ProcessingStatusProps {
  filename: string;
  fileSize?: number;
  status: "uploaded" | "processing" | "indexed" | "failed";
  errorMessage?: string | null;
  sha256Hash?: string;
  onRetry?: () => void;
  onReset?: () => void;
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export const ProcessingStatus: React.FC<ProcessingStatusProps> = ({
  filename,
  fileSize,
  status,
  errorMessage,
  sha256Hash,
  onRetry,
  onReset,
}) => {
  const shortHash = sha256Hash ? sha256Hash.substring(0, 8) : null;
  const formattedSize = formatBytes(fileSize);

  return (
    <div className="bg-white border border-borderNeutral rounded-card p-6 space-y-5 shadow-sm">
      {/* File Identity Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-borderNeutral/60">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 rounded-md bg-accent/10 text-accent shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h4
              className="font-heading font-medium text-sm text-textPrimary truncate max-w-md"
              title={filename}
            >
              {filename}
            </h4>
            <div className="flex items-center gap-2 mt-1">
              {formattedSize && (
                <span className="font-meta text-xs text-textMuted">
                  {formattedSize}
                </span>
              )}
              {shortHash && (
                <span className="font-meta text-[11px] font-mono px-2 py-0.5 rounded bg-bgSecondary text-textSecondary border border-borderNeutral">
                  SHA-256: {shortHash}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div className="shrink-0">
          {status === "uploaded" && (
            <span className="inline-flex items-center gap-1.5 font-meta text-xs font-medium px-3 py-1 rounded-full bg-blue-50 border border-accent/30 text-accent">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Uploaded
            </span>
          )}
          {status === "processing" && (
            <span className="inline-flex items-center gap-1.5 font-meta text-xs font-medium px-3 py-1 rounded-full bg-blue-50 border border-accent/30 text-accent">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Processing &amp; Chunking...
            </span>
          )}
          {status === "indexed" && (
            <span className="inline-flex items-center gap-1.5 font-meta text-xs font-medium px-3 py-1 rounded-full bg-emerald-50 border border-statusSuccess/30 text-statusSuccess">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Indexed &amp; Ready
            </span>
          )}
          {status === "failed" && (
            <span className="inline-flex items-center gap-1.5 font-meta text-xs font-medium px-3 py-1 rounded-full bg-red-50 border border-statusError/30 text-statusError">
              <AlertCircle className="w-3.5 h-3.5" />
              Ingestion Failed
            </span>
          )}
        </div>
      </div>

      {/* 3-Step Segmented Stepper */}
      <div className="py-2">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Step 1: Upload & Deduplication */}
          <div className="flex items-start gap-3 p-3 rounded-md bg-bgSecondary/60 border border-borderNeutral/70">
            <div className="w-6 h-6 rounded-full bg-accent text-white flex items-center justify-center shrink-0 text-xs">
              <Check className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="font-heading text-xs font-medium text-textPrimary">
                Upload &amp; Deduplication
              </p>
              <p className="font-meta text-[11px] text-textSecondary mt-0.5">
                SHA-256 verified, single copy stored
              </p>
            </div>
          </div>

          {/* Step 2: Text & Metadata Extraction */}
          <div
            className={`flex items-start gap-3 p-3 rounded-md border ${
              status === "failed"
                ? "bg-red-50/50 border-statusError/30"
                : status === "processing"
                ? "bg-accent/5 border-accent/30"
                : status === "indexed"
                ? "bg-bgSecondary/60 border-borderNeutral/70"
                : "bg-bgSecondary/30 border-borderNeutral/40 opacity-75"
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs ${
                status === "failed"
                  ? "bg-statusError text-white"
                  : status === "indexed"
                  ? "bg-accent text-white"
                  : status === "processing"
                  ? "border-2 border-accent text-accent animate-pulse"
                  : "bg-bgSecondary border border-borderNeutral text-textMuted"
              }`}
            >
              {status === "failed" ? (
                <AlertCircle className="w-3.5 h-3.5" />
              ) : status === "indexed" ? (
                <Check className="w-3.5 h-3.5" />
              ) : status === "processing" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                "2"
              )}
            </div>
            <div>
              <p className="font-heading text-xs font-medium text-textPrimary">
                Text &amp; Metadata Extraction
              </p>
              <p className="font-meta text-[11px] text-textSecondary mt-0.5">
                PyMuPDF layout extraction
              </p>
            </div>
          </div>

          {/* Step 3: Semantic Token Chunking */}
          <div
            className={`flex items-start gap-3 p-3 rounded-md border ${
              status === "indexed"
                ? "bg-emerald-50/50 border-statusSuccess/30"
                : status === "processing"
                ? "bg-bgSecondary/60 border-borderNeutral/70"
                : "bg-bgSecondary/30 border-borderNeutral/40 opacity-75"
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs ${
                status === "indexed"
                  ? "bg-statusSuccess text-white"
                  : status === "processing"
                  ? "border-2 border-accent text-accent animate-pulse"
                  : "bg-bgSecondary border border-borderNeutral text-textMuted"
              }`}
            >
              {status === "indexed" ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                "3"
              )}
            </div>
            <div>
              <p className="font-heading text-xs font-medium text-textPrimary">
                Semantic Token Chunking
              </p>
              <p className="font-meta text-[11px] text-textSecondary mt-0.5">
                800 tokens, 120-token overlap
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Error Callout Banner on Failure */}
      {status === "failed" && (
        <div className="bg-red-50/80 border border-statusError/30 rounded-md p-4 space-y-3 mt-4">
          <div className="flex items-center gap-2 text-statusError font-heading text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Ingestion Error</span>
          </div>
          <p className="font-body text-xs text-textPrimary leading-relaxed">
            {errorMessage ||
              "Unable to parse document contents. Please check that the file is not damaged or encrypted."}
          </p>
          <div className="flex items-center gap-2 pt-1">
            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="flex items-center gap-1.5 border-statusError/40 text-statusError hover:bg-statusError/10"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Retry
              </Button>
            )}
            {onReset && (
              <Button
                variant="secondary"
                size="sm"
                onClick={onReset}
              >
                Try Another Document
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
