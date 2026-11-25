"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Folder,
  FolderPlus,
  ArrowLeft,
  Search,
  Trash2,
  Edit2,
  FileText,
  Plus,
  Users,
  Calendar,
  ArrowUpRight,
  X,
} from "lucide-react";
import { collectionsApi, CollectionResponse, CollectionDetailResponse, DocumentResponse } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Sparkles } from "lucide-react";

export default function CollectionsPage() {
  const { isAuthenticated, isLoading: isAuthLoading, loginAsDemo, openAuthModal } = useAuth();
  const [collections, setCollections] = useState<CollectionResponse[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<number | null>(null);
  const [collectionDetail, setCollectionDetail] = useState<CollectionDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDetailLoading, setIsDetailLoading] = useState<boolean>(false);
  const [searchInCollection, setSearchInCollection] = useState<string>("");

  // Create / Edit modal state
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [editingCollection, setEditingCollection] = useState<CollectionResponse | null>(null);
  const [colName, setColName] = useState<string>("");
  const [colDescription, setColDescription] = useState<string>("");
  const [colColor, setColColor] = useState<string>("#315EAB");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Load collections list
  const loadCollections = async () => {
    if (!isAuthenticated) {
      setCollections([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const data = await collectionsApi.list();
      setCollections(data);
    } catch (err) {
      console.error("Failed to load collections:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthLoading) return;
    loadCollections();
  }, [isAuthenticated, isAuthLoading]);

  // Load selected collection details
  useEffect(() => {
    if (!selectedCollectionId) {
      setCollectionDetail(null);
      return;
    }

    async function fetchDetail() {
      setIsDetailLoading(true);
      try {
        const detail = await collectionsApi.get(selectedCollectionId!);
        setCollectionDetail(detail);
      } catch (err) {
        console.error("Failed to load collection details:", err);
      } finally {
        setIsDetailLoading(false);
      }
    }

    fetchDetail();
  }, [selectedCollectionId]);

  const handleOpenCreateModal = () => {
    setColName("");
    setColDescription("");
    setColColor("#315EAB");
    setEditingCollection(null);
    setShowCreateModal(true);
  };

  const handleOpenEditModal = (col: CollectionResponse, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCollection(col);
    setColName(col.name);
    setColDescription(col.description || "");
    setColColor(col.color || "#315EAB");
    setShowCreateModal(true);
  };

  const handleSaveCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!colName.trim()) return;

    setIsSubmitting(true);
    try {
      if (editingCollection) {
        const updated = await collectionsApi.update(editingCollection.id, {
          name: colName.trim(),
          description: colDescription.trim() || undefined,
          color: colColor,
        });
        setCollections((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        if (selectedCollectionId === updated.id && collectionDetail) {
          setCollectionDetail({ ...collectionDetail, name: updated.name, description: updated.description, color: updated.color });
        }
      } else {
        const created = await collectionsApi.create({
          name: colName.trim(),
          description: colDescription.trim() || undefined,
          color: colColor,
        });
        setCollections((prev) => [created, ...prev]);
      }
      setShowCreateModal(false);
    } catch (err) {
      alert("Failed to save collection: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCollection = async (colId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this collection? Papers inside will remain in your library.")) return;

    try {
      await collectionsApi.delete(colId);
      setCollections((prev) => prev.filter((c) => c.id !== colId));
      if (selectedCollectionId === colId) {
        setSelectedCollectionId(null);
      }
    } catch (err) {
      alert("Failed to delete collection.");
    }
  };

  const handleRemoveDocumentFromCollection = async (docId: number) => {
    if (!selectedCollectionId) return;
    try {
      await collectionsApi.removeDocument(selectedCollectionId, docId);
      if (collectionDetail) {
        setCollectionDetail({
          ...collectionDetail,
          documents: collectionDetail.documents.filter((d) => d.id !== docId),
        });
      }
      setCollections((prev) =>
        prev.map((c) => (c.id === selectedCollectionId ? { ...c, document_count: Math.max(0, c.document_count - 1) } : c))
      );
    } catch (err) {
      alert("Failed to remove document.");
    }
  };

  // Filter within collection (LIBRARY-05)
  const filteredCollectionDocs = useMemo(() => {
    if (!collectionDetail) return [];
    const q = searchInCollection.trim().toLowerCase();
    if (!q) return collectionDetail.documents;

    return collectionDetail.documents.filter((doc) => {
      const matchTitle = (doc.title || doc.filename).toLowerCase().includes(q);
      const matchAuthors = (doc.authors || "").toLowerCase().includes(q);
      const matchDomain = (doc.domain || "").toLowerCase().includes(q);
      return matchTitle || matchAuthors || matchDomain;
    });
  }, [collectionDetail, searchInCollection]);

  return (
    <div className="max-w-6xl mx-auto p-6 sm:p-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-borderNeutral pb-4">
        <div>
          <h2 className="font-heading font-normal text-2xl text-textPrimary">
            {selectedCollectionId && collectionDetail ? collectionDetail.name : "Collections"}
          </h2>
          <p className="font-body text-sm text-textSecondary mt-1">
            {selectedCollectionId && collectionDetail
              ? collectionDetail.description || "Collection research literature"
              : "Organize academic literature into topical research projects."}
          </p>
        </div>

        {selectedCollectionId ? (
          <button
            type="button"
            onClick={() => setSelectedCollectionId(null)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-borderNeutral bg-white text-xs font-heading text-textSecondary hover:text-textPrimary hover:border-textMuted transition-colors cursor-pointer self-start sm:self-auto"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>All Collections</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-accent text-white text-xs font-heading hover:bg-accentHover transition-colors shadow-xs self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Collection</span>
          </button>
        )}
      </div>

      {/* VIEW 1: COLLECTIONS OVERVIEW GRID (LIBRARY-03) */}
      {!selectedCollectionId && (
        <>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-36 bg-bgSecondary rounded-card border border-borderNeutral" />
              ))}
            </div>
          ) : collections.length === 0 ? (
            <div className="bg-white border border-borderNeutral rounded-card p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-accent/10 text-accent flex items-center justify-center mx-auto">
                <Folder className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-medium text-base text-textPrimary">
                No collections yet
              </h3>
              <p className="font-body text-xs text-textSecondary max-w-sm mx-auto">
                Create collections to organize papers by research topic, thesis chapter, or project.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleOpenCreateModal}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-accent text-white text-xs font-heading hover:bg-accentHover transition-colors shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create First Collection
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {collections.map((col) => (
                <div
                  key={col.id}
                  onClick={() => setSelectedCollectionId(col.id)}
                  className="bg-white border border-borderNeutral rounded-card p-5 space-y-3 shadow-xs hover:border-accent/50 hover:shadow-sm transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3.5 h-3.5 rounded-full shrink-0"
                          style={{ backgroundColor: col.color || "#315EAB" }}
                        />
                        <h4 className="font-heading font-medium text-base text-textPrimary group-hover:text-accent transition-colors truncate max-w-[190px]">
                          {col.name}
                        </h4>
                      </div>

                      <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => handleOpenEditModal(col, e)}
                          className="p-1 rounded hover:bg-bgSecondary text-textMuted hover:text-textPrimary cursor-pointer"
                          title="Edit Collection"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteCollection(col.id, e)}
                          className="p-1 rounded hover:bg-red-50 text-textMuted hover:text-statusError cursor-pointer"
                          title="Delete Collection"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <p className="font-body text-xs text-textSecondary line-clamp-2 leading-relaxed">
                      {col.description || "No description provided."}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-borderNeutral flex items-center justify-between text-xs font-meta text-textMuted">
                    <span>{col.document_count} paper{col.document_count === 1 ? "" : "s"}</span>
                    <span className="text-accent group-hover:underline text-[11px] font-heading flex items-center gap-0.5">
                      Open
                      <ArrowUpRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* VIEW 2: PAPERS IN SELECTED COLLECTION (LIBRARY-04, LIBRARY-05) */}
      {selectedCollectionId && (
        <div className="space-y-4">
          {/* Collection Search Bar */}
          <div className="relative max-w-md">
            <Search className="w-3.5 h-3.5 text-textMuted absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search within this collection..."
              value={searchInCollection}
              onChange={(e) => setSearchInCollection(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs font-body border border-borderNeutral rounded-md bg-white text-textPrimary focus:outline-none focus:border-accent"
            />
          </div>

          {isDetailLoading ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-bgSecondary rounded-card border border-borderNeutral" />
              ))}
            </div>
          ) : !collectionDetail || collectionDetail.documents.length === 0 ? (
            <div className="bg-white border border-borderNeutral rounded-card p-12 text-center space-y-3">
              <FolderPlus className="w-8 h-8 text-textMuted mx-auto" />
              <h4 className="font-heading font-medium text-sm text-textPrimary">
                No papers in this collection
              </h4>
              <p className="font-body text-xs text-textSecondary max-w-sm mx-auto">
                Add papers to this collection from Search Results or My Library using "Add to Collection".
              </p>
              <div className="pt-2">
                <Link
                  href="/search"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-accent text-white text-xs font-heading hover:bg-accentHover transition-colors shadow-xs"
                >
                  Search Papers
                </Link>
              </div>
            </div>
          ) : filteredCollectionDocs.length === 0 ? (
            <div className="bg-white border border-borderNeutral rounded-card p-8 text-center text-xs text-textMuted font-body">
              No papers in this collection match "{searchInCollection}".
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCollectionDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-white border border-borderNeutral rounded-card p-4 space-y-2.5 shadow-xs hover:border-accent/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <Link
                      href={`/documents/${doc.id}`}
                      className="font-heading font-medium text-sm text-textPrimary hover:text-accent transition-colors block truncate"
                      title={doc.title || doc.filename}
                    >
                      {doc.title || doc.filename}
                    </Link>

                    <div className="flex items-center gap-3 font-meta text-xs text-textMuted flex-wrap">
                      {doc.authors && (
                        <span className="flex items-center gap-1 text-textSecondary">
                          <Users className="w-3 h-3 text-textMuted shrink-0" />
                          <span className="truncate max-w-xs">{doc.authors}</span>
                        </span>
                      )}
                      {doc.publication_year && <span>• Year: {doc.publication_year}</span>}
                      <span>• {doc.total_pages} pages</span>
                      {doc.domain && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-bgSecondary text-textSecondary border border-borderNeutral">
                          {doc.domain}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveDocumentFromCollection(doc.id)}
                      className="text-xs font-meta text-textMuted hover:text-statusError px-2 py-1 rounded hover:bg-red-50 transition-colors cursor-pointer"
                      title="Remove paper from this collection"
                    >
                      Remove
                    </button>
                    <Link
                      href={`/documents/${doc.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-accent text-white font-heading text-xs hover:bg-accentHover transition-colors shadow-xs"
                    >
                      <span>Read</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CREATE / EDIT COLLECTION MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-card border border-borderNeutral max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-borderNeutral">
              <h3 className="font-heading font-medium text-base text-textPrimary">
                {editingCollection ? "Edit Collection" : "Create New Collection"}
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-textMuted hover:text-textPrimary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCollection} className="space-y-4">
              <div className="space-y-1">
                <label className="font-heading text-xs font-medium text-textPrimary">
                  Collection Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Transformer Architecture"
                  value={colName}
                  onChange={(e) => setColName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-body border border-borderNeutral rounded-md focus:outline-none focus:border-accent"
                />
              </div>

              <div className="space-y-1">
                <label className="font-heading text-xs font-medium text-textPrimary">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Optional notes or project focus..."
                  value={colDescription}
                  onChange={(e) => setColDescription(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-body border border-borderNeutral rounded-md focus:outline-none focus:border-accent resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-heading text-xs font-medium text-textPrimary block">
                  Color Tag
                </label>
                <div className="flex items-center gap-2">
                  {["#315EAB", "#25845B", "#C58A32", "#7C3AED", "#DC2626", "#0D9488", "#EA580C"].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColColor(c)}
                      className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                        colColor === c ? "scale-110 border-textPrimary shadow-xs" : "border-transparent"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-borderNeutral flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 text-xs font-meta text-textSecondary hover:text-textPrimary cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!colName.trim() || isSubmitting}
                  className="px-4 py-1.5 text-xs font-heading bg-accent text-white rounded-md hover:bg-accentHover disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
                >
                  {isSubmitting ? "Saving..." : editingCollection ? "Save Changes" : "Create Collection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
