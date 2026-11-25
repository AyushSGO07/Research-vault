"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  BookOpen,
  Bookmark,
  LayoutGrid,
  List,
  Search,
  Trash2,
  FolderPlus,
  Users,
  Calendar,
  FileText,
  Upload,
  ArrowUpRight,
} from "lucide-react";
import { documentsApi, savedApi, DocumentResponse } from "@/lib/api";
import { AddToCollectionModal } from "@/components/collections/AddToCollectionModal";
import { useAuth } from "@/context/AuthContext";
import { Sparkles } from "lucide-react";

export default function LibraryPage() {
  const { isAuthenticated, isLoading: isAuthLoading, loginAsDemo, openAuthModal } = useAuth();
  const [activeTab, setActiveTab] = useState<"all" | "saved">("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [allDocs, setAllDocs] = useState<DocumentResponse[]>([]);
  const [savedDocs, setSavedDocs] = useState<DocumentResponse[]>([]);
  const [savedDocIds, setSavedDocIds] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modal state
  const [selectedDocForCollection, setSelectedDocForCollection] = useState<{ id: number; title: string } | null>(null);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!isAuthenticated) {
      setAllDocs([]);
      setSavedDocs([]);
      setSavedDocIds(new Set());
      setIsLoading(false);
      return;
    }

    async function fetchLibraryData() {
      setIsLoading(true);
      try {
        const [docs, saved, ids] = await Promise.all([
          documentsApi.list(),
          savedApi.list().catch(() => [] as DocumentResponse[]),
          savedApi.getIds().catch(() => [] as number[]),
        ]);
        setAllDocs(docs);
        setSavedDocs(saved);
        setSavedDocIds(new Set(ids));
      } catch (err) {
        console.error("Failed to load library documents:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchLibraryData();
  }, [isAuthenticated, isAuthLoading]);

  const handleToggleBookmark = async (docId: number) => {
    const isCurrentlySaved = savedDocIds.has(docId);
    const nextSavedIds = new Set(savedDocIds);

    if (isCurrentlySaved) {
      nextSavedIds.delete(docId);
      setSavedDocIds(nextSavedIds);
      setSavedDocs((prev) => prev.filter((d) => d.id !== docId));
      try {
        await savedApi.unsave(docId);
      } catch {
        nextSavedIds.add(docId);
        setSavedDocIds(new Set(nextSavedIds));
      }
    } else {
      nextSavedIds.add(docId);
      setSavedDocIds(nextSavedIds);
      const targetDoc = allDocs.find((d) => d.id === docId);
      if (targetDoc) {
        setSavedDocs((prev) => [targetDoc, ...prev]);
      }
      try {
        await savedApi.save(docId);
      } catch {
        nextSavedIds.delete(docId);
        setSavedDocIds(new Set(nextSavedIds));
      }
    }
  };

  const handleDeleteDocument = async (docId: number) => {
    if (!window.confirm("Are you sure you want to delete this document from your library?")) return;

    try {
      await documentsApi.delete(docId);
      setAllDocs((prev) => prev.filter((d) => d.id !== docId));
      setSavedDocs((prev) => prev.filter((d) => d.id !== docId));
      setSavedDocIds((prev) => {
        const next = new Set(prev);
        next.delete(docId);
        return next;
      });
    } catch (err) {
      alert("Failed to delete document: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const currentDataset = activeTab === "all" ? allDocs : savedDocs;

  // Filter within library (LIBRARY-05)
  const filteredDocs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return currentDataset;

    return currentDataset.filter((doc) => {
      const matchTitle = (doc.title || doc.filename).toLowerCase().includes(q);
      const matchAuthors = (doc.authors || "").toLowerCase().includes(q);
      const matchDomain = (doc.domain || "").toLowerCase().includes(q);
      return matchTitle || matchAuthors || matchDomain;
    });
  }, [currentDataset, searchQuery]);

  return (
    <div className="max-w-6xl mx-auto p-6 sm:p-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-borderNeutral pb-4">
        <div>
          <h2 className="font-heading font-normal text-2xl text-textPrimary">
            My Library
          </h2>
          <p className="font-body text-sm text-textSecondary mt-1">
            Access your indexed research papers, saved bookmarks, and reading lists.
          </p>
        </div>

        <Link
          href="/upload"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-accent text-white text-xs font-heading hover:bg-accentHover transition-colors shadow-xs self-start sm:self-auto cursor-pointer"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Upload Paper</span>
        </Link>
      </div>

      {/* Unauthenticated Notification Banner */}
      {!isAuthenticated && (
        <div className="bg-accent/5 border border-accent/20 rounded-card p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-heading font-medium text-sm text-textPrimary flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent" />
              Sign in to view your research vault
            </h3>
            <p className="font-body text-xs text-textSecondary leading-relaxed max-w-xl">
              Access your personal literature library, full-text reading lists, and saved papers.
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

      {/* Toolbar: Tabs, Search & Layout Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        {/* Tab Switcher */}
        <div className="inline-flex p-1 bg-bgSecondary rounded-lg border border-borderNeutral">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md font-heading text-xs transition-colors cursor-pointer ${
              activeTab === "all"
                ? "bg-white text-accent font-medium shadow-xs"
                : "text-textSecondary hover:text-textPrimary"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>All Documents ({allDocs.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("saved")}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md font-heading text-xs transition-colors cursor-pointer ${
              activeTab === "saved"
                ? "bg-white text-accent font-medium shadow-xs"
                : "text-textSecondary hover:text-textPrimary"
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Saved Papers ({savedDocs.length})</span>
          </button>
        </div>

        {/* Search within Library & View Mode Toggle */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-textMuted absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={`Search in ${activeTab === "all" ? "library" : "saved"}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs font-body border border-borderNeutral rounded-md bg-white text-textPrimary focus:outline-none focus:border-accent"
            />
          </div>

          <div className="inline-flex p-1 bg-bgSecondary rounded-md border border-borderNeutral shrink-0">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded transition-colors cursor-pointer ${
                viewMode === "grid" ? "bg-white text-accent shadow-xs" : "text-textMuted hover:text-textPrimary"
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded transition-colors cursor-pointer ${
                viewMode === "table" ? "bg-white text-accent shadow-xs" : "text-textMuted hover:text-textPrimary"
              }`}
              title="Table View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-44 bg-bgSecondary rounded-card border border-borderNeutral" />
          ))}
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="bg-white border border-borderNeutral rounded-card p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-accent/10 text-accent flex items-center justify-center mx-auto">
            {activeTab === "all" ? <BookOpen className="w-6 h-6" /> : <Bookmark className="w-6 h-6" />}
          </div>
          <h3 className="font-heading font-medium text-base text-textPrimary">
            {searchQuery
              ? "No matching documents found"
              : activeTab === "all"
              ? "No research documents uploaded yet"
              : "No saved papers bookmarked yet"}
          </h3>
          <p className="font-body text-xs text-textSecondary max-w-sm mx-auto">
            {searchQuery
              ? "Try adjusting your search terms or clearing the library filter."
              : activeTab === "all"
              ? "Upload PDF, DOCX, or TXT papers to build your personal library."
              : "Bookmark key papers from your search results to keep them easily accessible."}
          </p>
          {!searchQuery && activeTab === "all" && (
            <div className="pt-2">
              <Link
                href="/upload"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-accent text-white text-xs font-heading hover:bg-accentHover transition-colors shadow-xs"
              >
                <Upload className="w-3.5 h-3.5" />
                Upload Papers
              </Link>
            </div>
          )}
        </div>
      ) : viewMode === "grid" ? (
        /* GRID VIEW (LIBRARY-01) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => {
            const isBookmarked = savedDocIds.has(doc.id);
            return (
              <div
                key={doc.id}
                className="bg-white border border-borderNeutral rounded-card p-5 space-y-3 shadow-xs hover:border-accent/40 transition-colors flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-meta text-[10px] px-2 py-0.5 rounded bg-bgSecondary text-textSecondary border border-borderNeutral uppercase font-medium">
                      {doc.document_type || "Preprint"}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleBookmark(doc.id)}
                      className={`p-1 rounded hover:bg-bgSecondary transition-colors cursor-pointer ${
                        isBookmarked ? "text-amber-500 fill-amber-500" : "text-textMuted hover:text-textPrimary"
                      }`}
                      title={isBookmarked ? "Remove from saved papers" : "Save paper"}
                    >
                      <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? "fill-amber-500" : ""}`} />
                    </button>
                  </div>

                  <Link
                    href={`/documents/${doc.id}`}
                    className="font-heading font-medium text-sm text-textPrimary hover:text-accent transition-colors line-clamp-2 block leading-snug"
                    title={doc.title || doc.filename}
                  >
                    {doc.title || doc.filename}
                  </Link>

                  <div className="space-y-1 font-meta text-xs text-textMuted">
                    {doc.authors && (
                      <p className="flex items-center gap-1 truncate text-textSecondary">
                        <Users className="w-3 h-3 text-textMuted shrink-0" />
                        <span className="truncate">{doc.authors}</span>
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-[11px]">
                      {doc.publication_year && <span>Year: {doc.publication_year}</span>}
                      <span>• {doc.total_pages} pages</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-borderNeutral flex items-center justify-between text-xs font-meta">
                  <span className="text-[10px] text-textMuted">
                    {doc.domain || "Computer Science"}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedDocForCollection({ id: doc.id, title: doc.title || doc.filename })}
                      className="p-1.5 rounded hover:bg-bgSecondary text-textMuted hover:text-accent transition-colors cursor-pointer"
                      title="Add to Collection"
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteDocument(doc.id)}
                      className="p-1.5 rounded hover:bg-red-50 text-textMuted hover:text-statusError transition-colors cursor-pointer"
                      title="Delete Document"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <Link
                      href={`/documents/${doc.id}`}
                      className="inline-flex items-center gap-0.5 text-accent font-heading font-medium text-xs hover:text-accentHover pl-1"
                    >
                      Read
                      <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW (LIBRARY-01) */
        <div className="bg-white border border-borderNeutral rounded-card shadow-xs overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-bgSecondary border-b border-borderNeutral font-heading text-textSecondary">
                <th className="py-3 px-4 font-medium">Title &amp; Authors</th>
                <th className="py-3 px-3 font-medium">Domain</th>
                <th className="py-3 px-3 font-medium">Type</th>
                <th className="py-3 px-3 font-medium">Year</th>
                <th className="py-3 px-3 font-medium">Pages</th>
                <th className="py-3 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borderNeutral font-body">
              {filteredDocs.map((doc) => {
                const isBookmarked = savedDocIds.has(doc.id);
                return (
                  <tr key={doc.id} className="hover:bg-bgSecondary/40 transition-colors">
                    <td className="py-3 px-4 max-w-sm">
                      <Link
                        href={`/documents/${doc.id}`}
                        className="font-heading font-medium text-textPrimary hover:text-accent transition-colors truncate block"
                        title={doc.title || doc.filename}
                      >
                        {doc.title || doc.filename}
                      </Link>
                      {doc.authors && (
                        <span className="font-meta text-[11px] text-textMuted truncate block mt-0.5">
                          {doc.authors}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-meta text-textSecondary">
                      {doc.domain || "Computer Science"}
                    </td>
                    <td className="py-3 px-3 font-meta text-textSecondary">
                      {doc.document_type || "Preprint"}
                    </td>
                    <td className="py-3 px-3 font-meta text-textSecondary">
                      {doc.publication_year || "—"}
                    </td>
                    <td className="py-3 px-3 font-meta text-textSecondary">
                      {doc.total_pages}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleBookmark(doc.id)}
                          className={`p-1 rounded hover:bg-bgSecondary transition-colors cursor-pointer ${
                            isBookmarked ? "text-amber-500" : "text-textMuted hover:text-textPrimary"
                          }`}
                          title={isBookmarked ? "Remove from saved papers" : "Save paper"}
                        >
                          <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? "fill-amber-500" : ""}`} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedDocForCollection({ id: doc.id, title: doc.title || doc.filename })}
                          className="p-1 rounded hover:bg-bgSecondary text-textMuted hover:text-accent transition-colors cursor-pointer"
                          title="Add to Collection"
                        >
                          <FolderPlus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="p-1 rounded hover:bg-red-50 text-textMuted hover:text-statusError transition-colors cursor-pointer"
                          title="Delete Document"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <Link
                          href={`/documents/${doc.id}`}
                          className="px-2 py-1 rounded bg-bgSecondary text-accent font-heading font-medium text-[11px] hover:bg-accent hover:text-white transition-colors ml-1"
                        >
                          Read
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add To Collection Modal */}
      {selectedDocForCollection && (
        <AddToCollectionModal
          documentId={selectedDocForCollection.id}
          documentTitle={selectedDocForCollection.title}
          isOpen={true}
          onClose={() => setSelectedDocForCollection(null)}
        />
      )}
    </div>
  );
}
