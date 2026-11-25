"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AlertCircle, X, Sparkles, Lock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { UploadDropzone } from "@/components/upload/UploadDropzone";
import { ProcessingStatus } from "@/components/upload/ProcessingStatus";
import { DuplicateNoticeBanner } from "@/components/upload/DuplicateNoticeBanner";
import { DocumentMetadataCard } from "@/components/upload/DocumentMetadataCard";
import { useDocumentStatus } from "@/hooks/useDocumentStatus";
import {
  documentsApi,
  DocumentUploadResponse,
  DocumentResponse,
} from "@/lib/api";

export default function UploadPage() {
  const { isAuthenticated, loginAsDemo, openAuthModal } = useAuth();
  const [currentDocumentId, setCurrentDocumentId] = useState<number | null>(null);
  const [uploadResult, setUploadResult] = useState<DocumentUploadResponse | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fullDocument, setFullDocument] = useState<DocumentResponse | null>(null);

  const {
    data: statusData,
    error: pollingError,
    refetch,
  } = useDocumentStatus(currentDocumentId);

  // When a document is indexed or identified as duplicate, fetch full detail for abstract preview
  useEffect(() => {
    let isCurrent = true;
    const isIndexed = statusData?.status === "indexed";
    const isDuplicate = uploadResult?.is_duplicate;

    if (currentDocumentId && (isIndexed || isDuplicate)) {
      documentsApi
        .getById(currentDocumentId)
        .then((doc) => {
          if (isCurrent) {
            setFullDocument(doc);
          }
        })
        .catch(() => {
          // Non-blocking fallback to statusData
        });
    }

    return () => {
      isCurrent = false;
    };
  }, [currentDocumentId, statusData?.status, uploadResult?.is_duplicate]);

  const handleFileSelected = async (file: File) => {
    if (!isAuthenticated) {
      setUploadError("Please sign in or use the 1-Click Demo Login before uploading documents.");
      openAuthModal();
      return;
    }
    setUploadError(null);
    setIsUploading(true);
    setUploadedFile(file);
    setFullDocument(null);

    try {
      const response = await documentsApi.upload(file);
      setUploadResult(response);
      setCurrentDocumentId(response.id);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to upload document stream";
      setUploadError(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = useCallback(() => {
    setCurrentDocumentId(null);
    setUploadResult(null);
    setUploadError(null);
    setUploadedFile(null);
    setFullDocument(null);
  }, []);

  const effectiveStatus = statusData?.status || uploadResult?.status || "uploaded";
  const effectiveFilename =
    uploadResult?.filename || uploadedFile?.name || statusData?.filename || "Document";

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-6">
      {/* Page Header */}
      <div className="border-b border-borderNeutral pb-4">
        <h2 className="font-heading font-normal text-2xl text-textPrimary">
          Upload Documents
        </h2>
        <p className="font-body text-sm text-textSecondary mt-1 leading-relaxed">
          Ingest research papers (PDF, DOCX, TXT) with automated text extraction and semantic chunking.
        </p>
      </div>

      {/* Unauthenticated Notification Banner */}
      {!isAuthenticated && (
        <div className="bg-accent/5 border border-accent/20 rounded-card p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-heading font-medium text-sm text-textPrimary flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent" />
              Sign in to ingest literature into your vault
            </h3>
            <p className="font-body text-xs text-textSecondary leading-relaxed max-w-xl">
              ResearchVault indexes uploaded documents into your private research library. Sign in or use the 1-click demo account to start ingesting literature.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={loginAsDemo}
              className="px-3.5 py-2 bg-accent text-white font-heading font-medium text-xs rounded hover:bg-accent/90 transition-colors shadow-xs flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>1-Click Demo Login</span>
            </button>
            <button
              onClick={openAuthModal}
              className="px-3 py-2 bg-white text-textPrimary border border-borderNeutral font-heading font-medium text-xs rounded hover:bg-borderNeutral/50 transition-colors"
            >
              Sign In
            </button>
          </div>
        </div>
      )}

      {/* Upload Error Banner */}
      {uploadError && (
        <div className="bg-red-50 border border-statusError/30 rounded-md p-4 flex items-start justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-statusError shrink-0 mt-0.5" />
            <div>
              <h4 className="font-heading font-medium text-xs text-statusError">
                Upload Failed
              </h4>
              <p className="font-body text-xs text-statusError/90 leading-relaxed mt-0.5">
                {uploadError}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className="text-statusError/70 hover:text-statusError p-1 rounded transition-colors"
            aria-label="Dismiss upload error"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main View Switching */}
      {uploadResult?.is_duplicate && currentDocumentId ? (
        <div className="space-y-6">
          <DuplicateNoticeBanner
            sha256Hash={uploadResult.sha256_hash}
            documentId={currentDocumentId}
            onReset={handleReset}
          />
          {fullDocument && (
            <DocumentMetadataCard
              document={fullDocument}
              onUploadAnother={handleReset}
            />
          )}
        </div>
      ) : currentDocumentId !== null ? (
        <div className="space-y-6">
          <ProcessingStatus
            filename={effectiveFilename}
            fileSize={uploadedFile?.size}
            status={effectiveStatus}
            errorMessage={statusData?.error_message || pollingError}
            sha256Hash={uploadResult?.sha256_hash}
            onRetry={refetch}
            onReset={handleReset}
          />

          {effectiveStatus === "indexed" && (
            <DocumentMetadataCard
              document={fullDocument || statusData!}
              onUploadAnother={handleReset}
            />
          )}
        </div>
      ) : (
        <UploadDropzone
          onFileSelected={handleFileSelected}
          isUploading={isUploading}
        />
      )}
    </div>
  );
}
