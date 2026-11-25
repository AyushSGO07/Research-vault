"use client";

import React, { useState, useEffect } from "react";
import { X, Plus, FolderPlus, Check, Loader2 } from "lucide-react";
import { collectionsApi, CollectionResponse } from "@/lib/api";

interface AddToCollectionModalProps {
  documentId: number;
  documentTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

export const AddToCollectionModal: React.FC<AddToCollectionModalProps> = ({
  documentId,
  documentTitle,
  isOpen,
  onClose,
}) => {
  const [collections, setCollections] = useState<CollectionResponse[]>([]);
  const [assignedCollectionIds, setAssignedCollectionIds] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showCreateInline, setShowCreateInline] = useState<boolean>(false);
  const [newColName, setNewColName] = useState<string>("");
  const [newColColor, setNewColColor] = useState<string>("#315EAB");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;

    async function loadCollections() {
      setIsLoading(true);
      try {
        const list = await collectionsApi.list();
        setCollections(list);

        // Fast fetch of assigned collections via dedicated endpoint, with fallback
        try {
          const assignedIds = await collectionsApi.getCollectionsForDocument(documentId);
          setAssignedCollectionIds(new Set(assignedIds));
        } catch {
          const assigned = new Set<number>();
          await Promise.all(
            list.map(async (c) => {
              try {
                const detail = await collectionsApi.get(c.id);
                if (detail.documents.some((d) => d.id === documentId)) {
                  assigned.add(c.id);
                }
              } catch {
                // ignore
              }
            })
          );
          setAssignedCollectionIds(assigned);
        }
      } catch (err) {
        console.error("Failed to load collections:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadCollections();
  }, [isOpen, documentId]);

  if (!isOpen) return null;

  const handleToggle = async (colId: number) => {
    const isAssigned = assignedCollectionIds.has(colId);
    const next = new Set(assignedCollectionIds);

    if (isAssigned) {
      next.delete(colId);
      setAssignedCollectionIds(next);
      try {
        await collectionsApi.removeDocument(colId, documentId);
      } catch {
        next.add(colId);
        setAssignedCollectionIds(new Set(next));
      }
    } else {
      next.add(colId);
      setAssignedCollectionIds(next);
      try {
        await collectionsApi.addDocument(colId, documentId);
      } catch {
        next.delete(colId);
        setAssignedCollectionIds(new Set(next));
      }
    }
  };

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName.trim()) return;

    setIsSubmitting(true);
    try {
      const created = await collectionsApi.create({
        name: newColName.trim(),
        color: newColColor,
      });
      // Automatically assign paper to the newly created collection
      await collectionsApi.addDocument(created.id, documentId);

      setCollections((prev) => [created, ...prev]);
      setAssignedCollectionIds((prev) => new Set(prev).add(created.id));
      setNewColName("");
      setShowCreateInline(false);
    } catch (err) {
      console.error("Failed to create collection:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-card border border-borderNeutral max-w-md w-full p-6 space-y-4 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-borderNeutral">
          <div className="flex items-center gap-2">
            <FolderPlus className="w-4 h-4 text-accent" />
            <h3 className="font-heading font-medium text-sm text-textPrimary uppercase tracking-wide">
              Add to Collection
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-textMuted hover:text-textPrimary cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Paper title info */}
        <p className="font-body text-xs text-textSecondary line-clamp-2">
          Organize <span className="font-medium text-textPrimary">"{documentTitle}"</span> into your research collections:
        </p>

        {/* Collections List */}
        {isLoading ? (
          <div className="py-8 flex items-center justify-center text-textMuted gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-accent" />
            <span className="font-meta text-xs">Loading collections...</span>
          </div>
        ) : collections.length === 0 && !showCreateInline ? (
          <div className="text-center py-6 space-y-2 bg-bgSecondary/50 rounded-md p-4">
            <p className="font-body text-xs text-textMuted">
              No collections found in your workspace.
            </p>
            <button
              type="button"
              onClick={() => setShowCreateInline(true)}
              className="font-heading text-xs text-accent hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Create your first collection
            </button>
          </div>
        ) : (
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {collections.map((col) => {
              const checked = assignedCollectionIds.has(col.id);
              return (
                <div
                  key={col.id}
                  onClick={() => handleToggle(col.id)}
                  className={`flex items-center justify-between p-3 rounded-md border transition-colors cursor-pointer ${
                    checked
                      ? "border-accent/60 bg-blue-50/40"
                      : "border-borderNeutral hover:border-textMuted hover:bg-bgSecondary/30"
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: col.color || "#315EAB" }}
                    />
                    <span className="font-heading text-xs font-medium text-textPrimary truncate">
                      {col.name}
                    </span>
                  </div>

                  <div
                    className={`w-5 h-5 rounded flex items-center justify-center border transition-colors shrink-0 ${
                      checked
                        ? "bg-accent border-accent text-white"
                        : "border-borderNeutral bg-white"
                    }`}
                  >
                    {checked && <Check className="w-3 h-3" />}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Inline Create Collection */}
        {showCreateInline ? (
          <form onSubmit={handleCreateCollection} className="pt-2 border-t border-borderNeutral space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Collection name..."
                value={newColName}
                onChange={(e) => setNewColName(e.target.value)}
                autoFocus
                className="flex-1 px-3 py-1.5 text-xs font-body border border-borderNeutral rounded-md focus:outline-none focus:border-accent"
              />
              <div className="flex items-center gap-1">
                {["#315EAB", "#25845B", "#C58A32", "#7C3AED", "#DC2626"].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewColColor(c)}
                    className={`w-4 h-4 rounded-full border transition-transform ${
                      newColColor === c ? "scale-125 border-textPrimary" : "border-transparent"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateInline(false)}
                className="px-2.5 py-1 text-xs font-meta text-textSecondary hover:text-textPrimary cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newColName.trim() || isSubmitting}
                className="px-3 py-1 text-xs font-heading bg-accent text-white rounded-md hover:bg-accentHover disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? "Creating..." : "Create & Add"}
              </button>
            </div>
          </form>
        ) : (
          !isLoading &&
          collections.length > 0 && (
            <div className="pt-2 border-t border-borderNeutral flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowCreateInline(true)}
                className="font-heading text-xs text-accent hover:text-accentHover inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                New collection
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1 text-xs font-heading bg-bgSecondary text-textPrimary border border-borderNeutral rounded-md hover:border-textMuted cursor-pointer"
              >
                Done
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
};
