"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  History,
  Search,
  Trash2,
  Clock,
  ArrowUpRight,
  Filter,
  Sparkles,
  Layers,
  FileSearch,
  AlertTriangle,
  X,
} from "lucide-react";
import { historyApi, SearchHistoryResponse } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function HistoryPage() {
  const { isAuthenticated, isLoading: isAuthLoading, loginAsDemo, openAuthModal } = useAuth();
  const [historyItems, setHistoryItems] = useState<SearchHistoryResponse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filterQuery, setFilterQuery] = useState<string>("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isClearing, setIsClearing] = useState<boolean>(false);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch search history on component mount or auth state change
  useEffect(() => {
    if (isAuthLoading) return;
    if (!isAuthenticated) {
      setHistoryItems([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    async function fetchHistory() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await historyApi.list();
        setHistoryItems(data);
      } catch (err: unknown) {
        console.error("Failed to load search history:", err);
        setError(err instanceof Error ? err.message : "Failed to load search history");
      } finally {
        setIsLoading(false);
      }
    }
    fetchHistory();
  }, [isAuthenticated, isAuthLoading]);

  // Filter history items by keyword query or mode
  const filteredItems = useMemo(() => {
    if (!filterQuery.trim()) return historyItems;
    const term = filterQuery.toLowerCase().trim();
    return historyItems.filter(
      (item) =>
        item.query.toLowerCase().includes(term) ||
        item.mode.toLowerCase().includes(term)
    );
  }, [historyItems, filterQuery]);

  // Delete individual history entry
  const handleDeleteItem = async (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDeletingId(id);
    try {
      await historyApi.delete(id);
      setHistoryItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err: unknown) {
      alert("Failed to delete history item: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setDeletingId(null);
    }
  };

  // Clear entire history
  const handleClearAll = async () => {
    setIsClearing(true);
    try {
      await historyApi.clear();
      setHistoryItems([]);
      setShowClearConfirm(false);
    } catch (err: unknown) {
      alert("Failed to clear history: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsClearing(false);
    }
  };

  // Render retrieval mode badge
  const renderModeBadge = (mode: string) => {
    switch (mode) {
      case "hybrid":
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent/10 text-accent border border-accent/20">
            <Sparkles className="w-3 h-3 mr-1" />
            <span>Hybrid (RRF)</span>
          </span>
        );
      case "semantic":
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Layers className="w-3 h-3 mr-1" />
            <span>Semantic</span>
          </span>
        );
      case "keyword":
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <Search className="w-3 h-3 mr-1" />
            <span>Keyword</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-bgSecondary text-textSecondary border border-borderNeutral">
            <span>{mode}</span>
          </span>
        );
    }
  };

  // Format date safely
  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  // Parse filters json helper
  const parseFilters = (jsonStr?: string | null) => {
    if (!jsonStr) return null;
    try {
      const parsed = JSON.parse(jsonStr);
      const chips: string[] = [];
      if (parsed.year_start || parsed.year_end) {
        chips.push(`Years: ${parsed.year_start || "Any"} - ${parsed.year_end || "Present"}`);
      }
      if (parsed.domain) {
        chips.push(`Domain: ${parsed.domain}`);
      }
      if (parsed.document_type) {
        chips.push(`Type: ${parsed.document_type}`);
      }
      if (parsed.author) {
        chips.push(`Author: ${parsed.author}`);
      }
      if (parsed.collection_id) {
        chips.push(`Collection #${parsed.collection_id}`);
      }
      return chips.length > 0 ? chips : null;
    } catch {
      return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-borderNeutral">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-heading text-2xl font-bold text-textPrimary">Search History</h1>
              <p className="font-body text-sm text-textSecondary mt-0.5">
                Review past research queries, re-execute past inquiries, and manage search history.
              </p>
            </div>
          </div>
        </div>

        {/* Clear All Action */}
        {historyItems.length > 0 && (
          <div>
            <button
              onClick={() => setShowClearConfirm(true)}
              disabled={isClearing}
              className="inline-flex items-center space-x-2 px-3.5 py-2 text-sm font-heading font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-button border border-red-200 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear All History</span>
            </button>
          </div>
        )}
      </div>

      {/* Confirmation Dialog Modal for Clear All */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-bgPrimary rounded-card border border-borderNeutral shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3 text-red-600">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-semibold text-lg text-textPrimary">Clear Search History</h3>
            </div>
            <p className="font-body text-sm text-textSecondary leading-relaxed">
              Are you sure you want to delete all {historyItems.length} search inquiry records? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                disabled={isClearing}
                className="px-4 py-2 text-sm font-heading font-medium text-textSecondary hover:text-textPrimary bg-bgSecondary hover:bg-borderNeutral/50 rounded-button transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                disabled={isClearing}
                className="px-4 py-2 text-sm font-heading font-medium text-white bg-red-600 hover:bg-red-700 rounded-button transition-colors disabled:opacity-50"
              >
                {isClearing ? "Clearing..." : "Yes, Clear All"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Body */}
      {!isAuthenticated ? (
        <div className="bg-bgSecondary/60 rounded-card border border-borderNeutral p-12 text-center max-w-lg mx-auto space-y-4">
          <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mx-auto text-accent">
            <Clock className="w-7 h-7" />
          </div>
          <div>
            <h3 className="font-heading font-semibold text-lg text-textPrimary">Sign In to View Search History</h3>
            <p className="font-body text-sm text-textSecondary mt-1 leading-relaxed">
              Track your past conceptual queries, active filters, and retrieved literature results across sessions.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={loginAsDemo}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-button bg-accent text-white font-heading text-xs font-semibold hover:bg-accent/90 transition-colors shadow-sm"
            >
              <Sparkles className="w-4 h-4" />
              <span>1-Click Demo Login</span>
            </button>
            <button
              onClick={openAuthModal}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-button bg-white text-textPrimary border border-borderNeutral font-heading text-xs font-semibold hover:bg-borderNeutral/40 transition-colors"
            >
              <span>Sign In / Register</span>
            </button>
          </div>
        </div>
      ) : isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="font-body text-sm text-textSecondary">Loading search inquiries...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-card p-6 text-center space-y-2">
          <p className="font-heading font-medium text-red-700">Unable to load search history</p>
          <p className="font-body text-sm text-red-600">{error}</p>
        </div>
      ) : historyItems.length === 0 ? (
        /* Empty State */
        <div className="bg-bgSecondary/60 rounded-card border border-borderNeutral p-12 text-center max-w-lg mx-auto space-y-4">
          <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mx-auto text-accent">
            <FileSearch className="w-7 h-7" />
          </div>
          <div>
            <h3 className="font-heading font-semibold text-lg text-textPrimary">No search inquiries recorded yet</h3>
            <p className="font-body text-sm text-textSecondary mt-1 leading-relaxed">
              When you explore papers using semantic or hybrid search, your queries and filters will be recorded here so you can re-execute them with one click.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/search"
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-button bg-accent text-white font-heading text-sm font-medium hover:bg-accent/90 transition-colors shadow-sm"
            >
              <Search className="w-4 h-4" />
              <span>Explore Research Papers</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Filter search queries by keyword or mode..."
                className="w-full pl-9 pr-9 py-2 text-sm bg-bgPrimary border border-borderNeutral rounded-input focus:outline-none focus:border-accent text-textPrimary placeholder:text-textMuted font-body"
              />
              {filterQuery && (
                <button
                  onClick={() => setFilterQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-textMuted hover:text-textPrimary"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="text-xs font-meta text-textMuted flex items-center space-x-1">
              <span>Showing {filteredItems.length} of {historyItems.length} recorded inquiries</span>
            </div>
          </div>

          {/* Timeline Feed */}
          {filteredItems.length === 0 ? (
            <div className="bg-bgSecondary/40 rounded-card border border-borderNeutral p-8 text-center space-y-2">
              <p className="font-heading font-medium text-textPrimary text-sm">No inquiries match &ldquo;{filterQuery}&rdquo;</p>
              <p className="font-body text-xs text-textSecondary">Try clearing your search query filter.</p>
              <button
                onClick={() => setFilterQuery("")}
                className="text-xs text-accent font-medium hover:underline pt-2 inline-block"
              >
                Clear filter
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredItems.map((item) => {
                const appliedChips = parseFilters(item.filters_json);
                const searchAgainUrl = `/search?q=${encodeURIComponent(item.query)}&mode=${item.mode}`;

                return (
                  <div
                    key={item.id}
                    className="group bg-bgPrimary border border-borderNeutral hover:border-accent/40 rounded-card p-4 transition-all duration-150 hover:shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    {/* Left: Query Info */}
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {renderModeBadge(item.mode)}
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-meta font-medium bg-bgSecondary text-textSecondary border border-borderNeutral">
                          {item.result_count} {item.result_count === 1 ? "result" : "results"}
                        </span>
                        <span className="text-xs font-meta text-textMuted flex items-center space-x-1">
                          <Clock className="w-3 h-3 mr-1 inline" />
                          <span>{formatDate(item.created_at)}</span>
                        </span>
                      </div>

                      <div className="pt-0.5">
                        <Link
                          href={searchAgainUrl}
                          className="font-heading font-medium text-base text-textPrimary hover:text-accent transition-colors block truncate"
                          title={item.query}
                        >
                          &ldquo;{item.query}&rdquo;
                        </Link>
                      </div>

                      {/* Active filter chips if query had filters attached */}
                      {appliedChips && appliedChips.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {appliedChips.map((chip, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-meta bg-bgSecondary text-textSecondary border border-borderNeutral"
                            >
                              <Filter className="w-2.5 h-2.5 mr-1 text-textMuted" />
                              {chip}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center space-x-2 pt-2 md:pt-0 border-t md:border-t-0 border-borderNeutral/60 justify-end flex-shrink-0">
                      <Link
                        href={searchAgainUrl}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-heading font-medium text-accent hover:text-white bg-accent/10 hover:bg-accent rounded-button transition-colors"
                      >
                        <Search className="w-3.5 h-3.5" />
                        <span>Search Again</span>
                        <ArrowUpRight className="w-3 h-3 opacity-70" />
                      </Link>

                      <button
                        onClick={(e) => handleDeleteItem(item.id, e)}
                        disabled={deletingId === item.id}
                        title="Delete from history"
                        aria-label="Delete entry"
                        className="p-1.5 text-textMuted hover:text-red-600 hover:bg-red-50 rounded-button transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
