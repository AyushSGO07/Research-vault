"use client";

import React from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface DuplicateNoticeBannerProps {
  sha256Hash: string;
  documentId: number;
  onReset: () => void;
}

export const DuplicateNoticeBanner: React.FC<DuplicateNoticeBannerProps> = ({
  sha256Hash,
  documentId,
  onReset,
}) => {
  return (
    <div className="bg-amber-50/70 border border-statusWarning/40 rounded-card p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-statusWarning shrink-0 mt-0.5 sm:mt-0" />
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-heading font-medium text-sm text-textPrimary">
              Existing Document Detected
            </h4>
            <span className="font-meta text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-statusWarning border border-statusWarning/30 font-semibold">
              Duplicate Match
            </span>
          </div>
          <p className="font-body text-xs text-textSecondary mt-1 leading-relaxed">
            A document with an identical cryptographic SHA-256 fingerprint is already indexed in your library. Reusing existing indexed passages.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onReset}
        >
          Upload Another Paper
        </Button>
        <Link href="/library">
          <Button variant="primary" size="sm">
            View in Library
          </Button>
        </Link>
      </div>
    </div>
  );
};
