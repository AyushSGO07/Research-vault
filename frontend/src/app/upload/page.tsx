import React from "react";

export default function UploadPage() {
  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="border-b border-borderNeutral pb-4">
        <h2 className="font-heading text-2xl text-textPrimary">Upload Documents</h2>
        <p className="font-body text-sm text-textSecondary mt-1">
          Ingest research papers (PDF, DOCX, TXT) with automated text extraction and chunking.
        </p>
      </div>
      <div className="bg-bgSecondary p-6 rounded-card border border-borderNeutral text-center py-12">
        <p className="font-body text-sm text-textSecondary">
          Document dropzone and ingestion pipeline arriving in Phase 2.
        </p>
      </div>
    </div>
  );
}
