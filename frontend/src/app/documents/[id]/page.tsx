"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Bookmark,
  Download,
  FolderPlus,
  Users,
  Calendar,
  Layers,
  FileText,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { documentsApi, savedApi, collectionsApi, DocumentResponse, DocumentChunkResponse, CollectionResponse } from "@/lib/api";
import { PDFViewer } from "@/components/document/PDFViewer";
import { DocumentPassagesList } from "@/components/document/DocumentPassagesList";
import { Button } from "@/components/ui/Button";

function DocumentDetailPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const docId = Number(params.id);
  const initialPage = Number(searchParams.get("page")) || 1;
  const initialChunk = Number(searchParams.get("chunk")) || undefined;

  const [document, setDocument] = useState<DocumentResponse | null>(null);
  const [chunks, setChunks] = useState<DocumentChunkResponse[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [selectedChunkId, setSelectedChunkId] = useState<number | undefined>(initialChunk);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<"viewer" | "passages">("viewer");

  // Collection modal state
  const [showCollectionModal, setShowCollectionModal] = useState<boolean>(false);
  const [collections, setCollections] = useState<CollectionResponse[]>([]);
  const [collectionStatus, setCollectionStatus] = useState<string | null>(null);

  // Fetch document details, chunks, and bookmark state
  useEffect(() => {
    if (!docId || isNaN(docId)) {
      setError("Invalid document ID.");
      setIsLoading(false);
      return;
    }

    async function loadData() {
      setIsLoading(true);
      setError(null);
      try {
        const [docData, chunksData, savedIds] = await Promise.all([
          documentsApi.getById(docId),
          documentsApi.getChunks(docId),
          savedApi.getIds().catch(() => [] as number[]),
        ]);

        setDocument(docData);
        setChunks(chunksData);
        setIsSaved(savedIds.includes(docId));

        // If initial chunk was given, set page from that chunk
        if (initialChunk && chunksData.length > 0) {
          const matching = chunksData.find((c) => c.id === initialChunk);
          if (matching) {
            setCurrentPage(matching.page_number);
          }
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load document details";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [docId, initialChunk]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handleSelectPassage = (chunk: DocumentChunkResponse) => {
    setSelectedChunkId(chunk.id);
    setCurrentPage(chunk.page_number);
  };

  const handleToggleBookmark = async () => {
    if (!document) return;
    const nextState = !isSaved;
    setIsSaved(nextState); // optimistic update

    try {
      if (nextState) {
        await savedApi.save(document.id);
      } else {
        await savedApi.unsave(document.id);
      }
    } catch (err) {
      setIsSaved(!nextState); // rollback on failure
      console.error("Bookmark toggle failed:", err);
    }
  };

  const handleOpenCollectionModal = async () => {
    try {
      const list = await collectionsApi.list();
      setCollections(list);
      setShowCollectionModal(true);
      setCollectionStatus(null);
    } catch (err) {
      console.error("Failed to load collections:", err);
    }
  };

  const handleAddToCollection = async (collId: number) => {
    if (!document) return;
    try {
      await collectionsApi.addDocument(collId, document.id);
      setCollectionStatus("Paper added to collection successfully!");
      setTimeout(() => setShowCollectionModal(false), 1200);
    } catch (err) {
      setCollectionStatus("Failed to add paper to collection.");
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6 sm:p-8 space-y-6 animate-pulse">
        <div className="h-6 bg-bgSecondary rounded w-32" />
        <div className="h-10 bg-bgSecondary rounded w-3/4" />
        <div className="h-4 bg-bgSecondary rounded w-1/2" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4">
          <div className="lg:col-span-8 h-[650px] bg-bgSecondary rounded-card" />
          <div className="lg:col-span-4 h-[650px] bg-bgSecondary rounded-card" />
        </div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="max-w-4xl mx-auto p-8 space-y-4">
        <Link
          href="/search"
          className="inline-flex items-center gap-1.5 font-heading text-xs text-textSecondary hover:text-accent transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Search
        </Link>
        <div className="bg-red-50 border border-statusError/30 rounded-card p-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-statusError shrink-0 mt-0.5" />
          <div>
            <h3 className="font-heading font-medium text-sm text-statusError">
              Document Load Error
            </h3>
            <p className="font-body text-xs text-textError/90 mt-1 leading-relaxed">
              {error || "The requested document could not be found or you do not have permission to view it."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const fileUrl = documentsApi.getFileUrl(document.id);
  const isPdf = document.filename.toLowerCase().endsWith(".pdf") || document.mime_type.includes("pdf");
  const fileSizeMb = (document.file_size / (1024 * 1024)).toFixed(2);

  return (
    <div className="max-w-7xl mx-auto p-6 sm:p-8 space-y-6">
      {/* Top Breadcrumb & Metadata Header */}
      <div className="space-y-4 border-b border-borderNeutral pb-6">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 font-heading text-xs text-textSecondary hover:text-accent transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleBookmark}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-heading transition-colors cursor-pointer ${
                isSaved
                  ? "bg-amber-50 border-amber-300 text-amber-800 font-medium"
                  : "bg-white border-borderNeutral text-textSecondary hover:border-textMuted hover:text-textPrimary"
              }`}
              title={isSaved ? "Remove from saved library" : "Save paper to library"}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isSaved ? "fill-amber-600 text-amber-600" : ""}`} />
              <span>{isSaved ? "Saved" : "Save Paper"}</span>
            </button>

            <button
              type="button"
              onClick={handleOpenCollectionModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-borderNeutral bg-white text-xs font-heading text-textSecondary hover:text-textPrimary hover:border-textMuted transition-colors cursor-pointer"
              title="Add paper to collection"
            >
              <FolderPlus className="w-3.5 h-3.5 text-accent" />
              <span>Add to Collection</span>
            </button>

            <a
              href={fileUrl}
              download={document.filename}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-accent text-white text-xs font-heading hover:bg-accentHover transition-colors cursor-pointer shadow-xs"
              title="Download original file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </a>
          </div>
        </div>

        {/* Paper Title & Metadata Badges */}
        <div className="space-y-2">
          <h1 className="font-heading font-medium text-2xl text-textPrimary leading-tight">
            {document.title || document.filename}
          </h1>

          <div className="flex items-center gap-3 flex-wrap font-meta text-xs text-textSecondary pt-1">
            {document.authors && (
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-textMuted" />
                <span>{document.authors}</span>
              </span>
            )}
            {document.publication_year && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-textMuted" />
                <span>{document.publication_year}</span>
              </span>
            )}
            {document.doi && (
              <span>• DOI: {document.doi}</span>
            )}
            {document.journal && (
              <span>• Journal: {document.journal}</span>
            )}
            <span>• {document.total_pages} pages</span>
            <span>• {fileSizeMb} MB</span>

            {document.domain && (
              <span className="px-2 py-0.5 rounded text-[10px] font-meta bg-bgSecondary text-textSecondary border border-borderNeutral font-medium">
                {document.domain}
              </span>
            )}
            {document.document_type && (
              <span className="px-2 py-0.5 rounded text-[10px] font-meta bg-bgSecondary text-textSecondary border border-borderNeutral font-medium">
                {document.document_type}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Tab Switcher */}
      <div className="flex lg:hidden bg-bgSecondary p-1 rounded-lg border border-borderNeutral">
        <button
          type="button"
          onClick={() => setMobileTab("viewer")}
          className={`flex-1 py-1.5 text-xs font-heading rounded-md transition-colors ${
            mobileTab === "viewer"
              ? "bg-white text-accent font-medium shadow-sm"
              : "text-textSecondary"
          }`}
        >
          Document Viewer
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("passages")}
          className={`flex-1 py-1.5 text-xs font-heading rounded-md transition-colors ${
            mobileTab === "passages"
              ? "bg-white text-accent font-medium shadow-sm"
              : "text-textSecondary"
          }`}
        >
          Passages ({chunks.length})
        </button>
      </div>

      {/* Split Pane: PDF Viewer (Left 65%) + Passages List (Right 35%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: PDF Viewer */}
        <div className={`lg:col-span-8 ${mobileTab === "passages" ? "hidden lg:block" : "block"}`}>
          <PDFViewer
            fileUrl={fileUrl}
            filename={document.filename}
            title={document.title || document.filename}
            totalPages={document.total_pages || 1}
            currentPage={currentPage}
            onPageChange={handlePageChange}
            isPdf={isPdf}
            textContent={document.abstract || undefined}
          />
        </div>

        {/* Right: Passages List */}
        <div className={`lg:col-span-4 ${mobileTab === "viewer" ? "hidden lg:block" : "block"}`}>
          <DocumentPassagesList
            chunks={chunks}
            selectedChunkId={selectedChunkId}
            currentPage={currentPage}
            onSelectPassage={handleSelectPassage}
          />
        </div>
      </div>

      {/* Add to Collection Modal */}
      {showCollectionModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-card border border-borderNeutral max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-borderNeutral">
              <h3 className="font-heading font-medium text-base text-textPrimary">
                Add to Collection
              </h3>
              <button
                type="button"
                onClick={() => setShowCollectionModal(false)}
                className="text-textMuted hover:text-textPrimary"
              >
                ✕
              </button>
            </div>

            {collectionStatus && (
              <p className="font-meta text-xs text-statusSuccess bg-emerald-50 p-2.5 rounded border border-statusSuccess/30">
                {collectionStatus}
              </p>
            )}

            {collections.length === 0 ? (
              <div className="text-center py-6 space-y-2">
                <p className="font-body text-xs text-textMuted">
                  You have not created any collections yet.
                </p>
                <Link
                  href="/collections"
                  className="font-heading text-xs text-accent hover:underline inline-block"
                >
                  Create a collection in Collections page
                </Link>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {collections.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => handleAddToCollection(c.id)}
                    className="flex items-center justify-between p-3 rounded-md border border-borderNeutral hover:border-accent hover:bg-bgSecondary/40 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: c.color || "#315EAB" }}
                      />
                      <span className="font-heading text-xs font-medium text-textPrimary">
                        {c.name}
                      </span>
                    </div>
                    <span className="font-meta text-[11px] text-textMuted">
                      {c.document_count} papers
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DocumentDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto p-8 space-y-6 animate-pulse">
          <div className="h-8 bg-bgSecondary rounded w-1/4" />
          <div className="h-64 bg-bgSecondary rounded" />
        </div>
      }
    >
      <DocumentDetailPageContent />
    </Suspense>
  );
}
