"use client";

import React, { useState, useRef, useCallback } from "react";
import { UploadCloud, AlertCircle, X, FileUp } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface UploadDropzoneProps {
  onFileSelected: (file: File) => void;
  isUploading?: boolean;
  disabled?: boolean;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB = 52,428,800 bytes
const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".txt"];

export const UploadDropzone: React.FC<UploadDropzoneProps> = ({
  onFileSelected,
  isUploading = false,
  disabled = false,
}) => {
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndSelectFile = useCallback(
    (file: File) => {
      setValidationError(null);

      const name = file.name || "";
      const dotIndex = name.lastIndexOf(".");
      const ext = dotIndex !== -1 ? name.substring(dotIndex).toLowerCase() : "";

      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        setValidationError(
          "Unsupported file format. Please upload a PDF, DOCX, or TXT document."
        );
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setValidationError(
          "File exceeds the 50MB maximum size limit. Please compress or select a smaller document."
        );
        return;
      }

      onFileSelected(file);
    },
    [onFileSelected]
  );

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isUploading) {
      setIsDragging(true);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isUploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled || isUploading) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      validateAndSelectFile(file);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      validateAndSelectFile(file);
    }
    // Reset file input value so selecting the same file triggers change
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleContainerClick = () => {
    if (!disabled && !isUploading && inputRef.current) {
      inputRef.current.click();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleContainerClick();
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Hidden native input */}
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.txt"
        className="hidden"
        onChange={handleInputChange}
        disabled={disabled || isUploading}
      />

      {/* Main dropzone container */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload document dropzone"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleContainerClick}
        onKeyDown={handleKeyDown}
        className={`rounded-card p-10 text-center transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent/30 ${
          isDragging
            ? "border-2 border-dashed border-accent bg-accent/5 scale-[1.005]"
            : "border-2 border-dashed border-borderNeutral bg-white hover:border-accent/60 hover:bg-bgSecondary/40"
        } ${disabled || isUploading ? "opacity-60 cursor-not-allowed" : ""}`}
      >
        <div className="flex flex-col items-center justify-center">
          {isUploading ? (
            <FileUp className="w-12 h-12 text-accent mx-auto mb-3 animate-bounce" />
          ) : (
            <UploadCloud
              className={`w-12 h-12 text-accent mx-auto mb-3 transition-transform ${
                isDragging ? "scale-110" : ""
              }`}
            />
          )}

          <h3 className="font-heading font-medium text-base text-textPrimary mb-1">
            {isDragging
              ? "Drop your research document to upload"
              : isUploading
              ? "Uploading document stream..."
              : "Drag & drop your research paper here"}
          </h3>

          <p className="font-body text-xs text-textSecondary mb-4">
            {isDragging
              ? "Release mouse to start automatic text extraction"
              : "or browse your computer for PDF, DOCX, or TXT documents (up to 50MB)"}
          </p>

          <Button
            type="button"
            variant="secondary"
            size="md"
            disabled={disabled || isUploading}
            onClick={(e) => {
              e.stopPropagation();
              handleContainerClick();
            }}
          >
            Select Document
          </Button>

          {/* Format pills */}
          <div className="flex items-center justify-center gap-2 mt-6">
            <span className="font-meta text-[11px] px-2.5 py-1 rounded-full bg-bgSecondary text-textPrimary border border-borderNeutral font-medium">
              PDF
            </span>
            <span className="font-meta text-[11px] px-2.5 py-1 rounded-full bg-bgSecondary text-textPrimary border border-borderNeutral font-medium">
              DOCX
            </span>
            <span className="font-meta text-[11px] px-2.5 py-1 rounded-full bg-bgSecondary text-textPrimary border border-borderNeutral font-medium">
              TXT
            </span>
          </div>

          <p className="font-meta text-[11px] text-textMuted mt-3">
            Maximum file size: 50MB. Text layers required.
          </p>
        </div>
      </div>

      {/* Client validation error banner */}
      {validationError && (
        <div className="bg-red-50 border border-statusError/30 rounded-md p-3.5 flex items-start justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-statusError shrink-0 mt-0.5" />
            <div>
              <h4 className="font-heading font-medium text-xs text-statusError">
                Invalid Document
              </h4>
              <p className="font-body text-xs text-statusError/90 leading-relaxed mt-0.5">
                {validationError}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setValidationError(null)}
            className="text-statusError/70 hover:text-statusError p-1 rounded transition-colors"
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
