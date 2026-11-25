"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Clock,
  BookOpen,
  Sliders,
  X,
  CheckCircle2,
  Globe,
  Loader2,
} from "lucide-react";
import { SearchInput } from "@/components/search/SearchInput";
import { SearchModeToggle } from "@/components/search/SearchModeToggle";
import { SearchResultCard } from "@/components/search/SearchResultCard";
import { SearchPagination } from "@/components/search/SearchPagination";
import { SearchEmptyState } from "@/components/search/SearchEmptyState";
import { SearchFilters, ActiveFilterState } from "@/components/search/SearchFilters";
import { ActiveFilterChips } from "@/components/search/ActiveFilterChips";
import { SearchSortDropdown } from "@/components/search/SearchSortDropdown";
import { RerankToggle } from "@/components/search/RerankToggle";
import { SearchScopeTabs } from "@/components/search/SearchScopeTabs";
import { ExternalFiltersBar } from "@/components/search/ExternalFiltersBar";
import { ExternalPaperCard } from "@/components/search/ExternalPaperCard";
import {
  searchApi,
  SearchResponse,
  SearchFiltersResponse,
  externalApi,
  ExternalSearchResponse,
  ExternalPaperResult,
} from "@/lib/api";

function SearchPageContent() {
  const searchParams = useSearchParams();
  const initialDomain = searchParams.get("domain") || undefined;
  const initialAuthor = searchParams.get("author") || undefined;
  const initialDocType = searchParams.get("document_type") || undefined;
  const initialYearStart = searchParams.get("year_start") ? Number(searchParams.get("year_start")) : undefined;
  const initialYearEnd = searchParams.get("year_end") ? Number(searchParams.get("year_end")) : undefined;
  const initialQuery = searchParams.get("q") || (initialDomain ? initialDomain : "");
  const initialScope = searchParams.get("scope") === "global" ? "global" : "library";
  const modeParam = searchParams.get("mode");
  const initialMode: "hybrid" | "semantic" | "keyword" =
    modeParam === "semantic" || modeParam === "keyword" || modeParam === "hybrid"
      ? modeParam
      : "hybrid";

  // Scope: Library vs Global Academic Literature
  const [scope, setScope] = useState<"library" | "global">(initialScope);

  // Library Search State
  const [query, setQuery] = useState<string>(initialQuery);
  const [mode, setMode] = useState<"hybrid" | "semantic" | "keyword">(initialMode);
  const [page, setPage] = useState<number>(1);
  const [enableReranking, setEnableReranking] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<"relevance" | "newest" | "oldest">("relevance");
  const [filters, setFilters] = useState<ActiveFilterState>({
    domain: initialDomain,
    author: initialAuthor,
    documentType: initialDocType,
    yearStart: initialYearStart,
    yearEnd: initialYearEnd,
  });
  const [availableFacets, setAvailableFacets] = useState<SearchFiltersResponse | null>(null);
  const [showMobileFilters, setShowMobileFilters] = useState<boolean>(false);
  const [searchResponse, setSearchResponse] = useState<SearchResponse | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  // Global Literature Search State (arXiv + OpenAlex)
  const [externalSource, setExternalSource] = useState<"all" | "arxiv" | "openalex">("all");
  const [externalSort, setExternalSort] = useState<"relevance" | "citations" | "newest">("relevance");
  const [externalPage, setExternalPage] = useState<number>(1);
  const [externalResponse, setExternalResponse] = useState<ExternalSearchResponse | null>(null);
  const [isExternalSearching, setIsExternalSearching] = useState<boolean>(false);
  const [hasExternalSearched, setHasExternalSearched] = useState<boolean>(false);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);

  // Fetch authentic metadata facets on mount
  useEffect(() => {
    async function loadFacets() {
      try {
        const facets = await searchApi.getFilters();
        setAvailableFacets(facets);
      } catch (err) {
        console.warn("Could not load dynamic corpus facets:", err);
      }
    }
    loadFacets();
  }, []);

  // Internal library search execution
  const performSearch = useCallback(
    async (
      searchQuery: string,
      searchMode: "hybrid" | "semantic" | "keyword",
      targetPage: number = 1,
      currentFilters: ActiveFilterState = filters,
      currentSort: "relevance" | "newest" | "oldest" = sortBy,
      rerank: boolean = enableReranking
    ) => {
      const trimmed = searchQuery.trim();
      if (!trimmed) return;

      setIsSearching(true);
      setError(null);
      setPage(targetPage);

      try {
        const response = await searchApi.query({
          query: trimmed,
          mode: searchMode,
          page: targetPage,
          page_size: 10,
          enable_reranking: rerank,
          year_start: currentFilters.yearStart,
          year_end: currentFilters.yearEnd,
          author: currentFilters.author,
          domain: currentFilters.domain,
          document_type: currentFilters.documentType,
          sort_by: currentSort,
        });
        setSearchResponse(response);
        setHasSearched(true);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to execute search retrieval";
        setError(message);
      } finally {
        setIsSearching(false);
      }
    },
    [filters, sortBy, enableReranking]
  );

  // External Global Academic Literature search execution (arXiv & OpenAlex)
  const performExternalSearch = useCallback(
    async (
      searchQuery: string,
      source: "all" | "arxiv" | "openalex" = externalSource,
      targetPage: number = 1,
      sort: "relevance" | "citations" | "newest" = externalSort
    ) => {
      const trimmed = searchQuery.trim();
      if (!trimmed) return;

      setIsExternalSearching(true);
      setError(null);
      setExternalPage(targetPage);

      try {
        const response = await externalApi.search(trimmed, source, targetPage, 10, sort);
        setExternalResponse(response);
        setHasExternalSearched(true);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to search external academic repositories";
        setError(message);
      } finally {
        setIsExternalSearching(false);
      }
    },
    [externalSource, externalSort]
  );

  // Trigger search on mount if URL query param was provided
  useEffect(() => {
    if (initialQuery) {
      if (scope === "global") {
        performExternalSearch(initialQuery, externalSource, 1, externalSort);
      } else {
        performSearch(initialQuery, mode, 1, filters, sortBy, enableReranking);
      }
    }
  }, [initialQuery, scope, mode, performSearch, performExternalSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearchSubmit = () => {
    if (scope === "global") {
      performExternalSearch(query, externalSource, 1, externalSort);
    } else {
      performSearch(query, mode, 1, filters, sortBy, enableReranking);
    }
  };

  const handleScopeChange = (newScope: "library" | "global") => {
    setScope(newScope);
    setError(null);
    if (query.trim()) {
      if (newScope === "global") {
        performExternalSearch(query, externalSource, 1, externalSort);
      } else {
        performSearch(query, mode, 1, filters, sortBy, enableReranking);
      }
    }
  };

  const handleModeChange = (newMode: "hybrid" | "semantic" | "keyword") => {
    setMode(newMode);
    if (query.trim() && hasSearched) {
      performSearch(query, newMode, 1, filters, sortBy, enableReranking);
    }
  };

  const handleRerankToggle = (newVal: boolean) => {
    setEnableReranking(newVal);
    if (query.trim() && hasSearched) {
      performSearch(query, mode, 1, filters, sortBy, newVal);
    }
  };

  const handleSortChange = (newSort: "relevance" | "newest" | "oldest") => {
    setSortBy(newSort);
    if (query.trim() && hasSearched) {
      performSearch(query, mode, 1, filters, newSort, enableReranking);
    }
  };

  const handleFilterChange = (newFilters: ActiveFilterState) => {
    setFilters(newFilters);
    if (query.trim() && hasSearched) {
      performSearch(query, mode, 1, newFilters, sortBy, enableReranking);
    }
  };

  const handleResetFilters = () => {
    const emptyFilters: ActiveFilterState = {};
    setFilters(emptyFilters);
    setSortBy("relevance");
    setEnableReranking(false);
    if (query.trim() && hasSearched) {
      performSearch(query, mode, 1, emptyFilters, "relevance", false);
    }
  };

  const handlePageChange = (newPage: number) => {
    performSearch(query, mode, newPage, filters, sortBy, enableReranking);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleExternalSourceChange = (newSource: "all" | "arxiv" | "openalex") => {
    setExternalSource(newSource);
    if (query.trim()) {
      performExternalSearch(query, newSource, 1, externalSort);
    }
  };

  const handleExternalSortChange = (newSort: "relevance" | "citations" | "newest") => {
    setExternalSort(newSort);
    if (query.trim()) {
      performExternalSearch(query, externalSource, 1, newSort);
    }
  };

  const handleExternalPageChange = (newPage: number) => {
    performExternalSearch(query, externalSource, newPage, externalSort);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // 1-Click Import External Paper into Vault
  const handleImportPaper = async (paper: ExternalPaperResult) => {
    setImportingId(paper.external_id);
    setImportSuccessMsg(null);
    try {
      const res = await externalApi.importPaper({
        source: paper.source,
        external_id: paper.external_id,
        pdf_url: paper.pdf_url,
        title: paper.title,
        authors: paper.authors,
        publication_year: paper.publication_year,
        abstract: paper.abstract,
        doi: paper.doi,
        journal: paper.journal,
        domain: paper.domain,
        document_type: paper.document_type,
      });

      // Update in-memory paper record to reflect possession
      if (externalResponse) {
        setExternalResponse({
          ...externalResponse,
          results: externalResponse.results.map((p) =>
            p.external_id === paper.external_id
              ? { ...p, already_in_library: true, library_document_id: res.document_id }
              : p
          ),
        });
      }

      setImportSuccessMsg(
        `"${paper.title}" successfully imported! It is now being chunked and embedded into your library.`
      );
      setTimeout(() => setImportSuccessMsg(null), 6000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to import paper";
      setError(`Import failed: ${msg}`);
    } finally {
      setImportingId(null);
    }
  };

  const handleSuggestionClick = (suggested: string) => {
    setQuery(suggested);
    if (scope === "global") {
      performExternalSearch(suggested, externalSource, 1, externalSort);
    } else {
      performSearch(suggested, mode, 1, filters, sortBy, enableReranking);
    }
  };

  return (
    <div className="space-y-6">
      {/* Scope Switcher & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E6E9EF]">
        <div>
          <h1 className="font-heading font-medium text-xl text-[#202733] tracking-tight">
            Search &amp; Discover Literature
          </h1>
          <p className="font-body text-xs text-[#697586] mt-0.5">
            {scope === "library"
              ? "Multi-paradigm semantic & hybrid retrieval across your indexed research papers."
              : "Explore millions of preprints & peer-reviewed articles from arXiv & OpenAlex with 1-click vault import."}
          </p>
        </div>

        <SearchScopeTabs
          scope={scope}
          onScopeChange={handleScopeChange}
          libraryResultsCount={searchResponse?.total_documents}
        />
      </div>

      {/* Primary Search Input */}
      <div className="space-y-3">
        <SearchInput
          value={query}
          onChange={setQuery}
          onSearch={handleSearchSubmit}
          isSearching={scope === "global" ? isExternalSearching : isSearching}
          placeholder={
            scope === "global"
              ? "Search millions of preprints & articles (e.g., 'attention mechanisms in deep learning', 'Kaiming He ResNet')..."
              : "Search your indexed papers with conceptual queries or keywords..."
          }
        />

        {/* Library Mode: Paradigm controls (Hybrid, BM25, Semantic, Reranking) */}
        {scope === "library" && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <SearchModeToggle mode={mode} onModeChange={handleModeChange} />

            <div className="flex items-center gap-3">
              <RerankToggle
                enabled={enableReranking}
                onToggle={handleRerankToggle}
                disabled={isSearching}
              />
              <SearchSortDropdown
                sortBy={sortBy}
                onSortChange={handleSortChange}
                disabled={isSearching}
              />
              <button
                type="button"
                onClick={() => setShowMobileFilters(true)}
                className="md:hidden flex items-center gap-1.5 px-3 py-1.5 bg-[#FFFFFF] border border-[#E6E9EF] rounded-lg text-xs font-medium text-[#202733]"
              >
                <Sliders className="w-3.5 h-3.5 text-[#315EAB]" />
                <span>Filters</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Success Notification Toast */}
      {importSuccessMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-800 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{importSuccessMsg}</div>
          <button
            type="button"
            onClick={() => setImportSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-heading font-medium text-xs text-rose-700">Search Error</h4>
            <p className="font-body text-xs text-rose-800/90 mt-0.5 leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* GLOBAL ACADEMIC LITERATURE VIEW (arXiv + OpenAlex)            */}
      {/* ============================================================ */}
      {scope === "global" && (
        <div className="space-y-4">
          <ExternalFiltersBar
            source={externalSource}
            onSourceChange={handleExternalSourceChange}
            sortBy={externalSort}
            onSortChange={handleExternalSortChange}
            totalResults={externalResponse?.total || 0}
            isLoading={isExternalSearching}
          />

          {/* Loading Skeletons */}
          {isExternalSearching && (
            <div className="space-y-4 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-[#FFFFFF] border border-[#E6E9EF] rounded-xl p-5 space-y-3">
                  <div className="h-4 bg-[#F7F8FA] rounded w-2/3" />
                  <div className="h-3 bg-[#F7F8FA] rounded w-1/3" />
                  <div className="h-14 bg-[#F7F8FA]/60 rounded" />
                </div>
              ))}
            </div>
          )}

          {/* External Results */}
          {!isExternalSearching && hasExternalSearched && externalResponse && (
            <>
              {externalResponse.results.length === 0 ? (
                <div className="bg-[#FFFFFF] border border-[#E6E9EF] rounded-xl p-8 text-center space-y-3">
                  <Globe className="w-8 h-8 text-[#697586] mx-auto opacity-40" />
                  <h3 className="font-heading font-medium text-sm text-[#202733]">
                    No external literature matches found
                  </h3>
                  <p className="font-body text-xs text-[#697586] max-w-md mx-auto">
                    Try broadening your keywords or switching between arXiv Preprints and OpenAlex Works.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {externalResponse.results.map((paper) => (
                    <ExternalPaperCard
                      key={`${paper.source}-${paper.external_id}`}
                      paper={paper}
                      onImport={handleImportPaper}
                      isImporting={importingId === paper.external_id}
                    />
                  ))}

                  {/* External Pagination */}
                  <div className="flex items-center justify-between pt-4 border-t border-[#E6E9EF] text-xs">
                    <button
                      type="button"
                      disabled={externalPage <= 1 || isExternalSearching}
                      onClick={() => handleExternalPageChange(externalPage - 1)}
                      className="px-3.5 py-1.5 rounded-lg border border-[#E6E9EF] bg-[#FFFFFF] font-medium text-[#202733] hover:bg-[#F7F8FA] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      ← Previous Page
                    </button>
                    <span className="font-roboto text-[#697586]">
                      Page {externalPage} of {Math.max(1, Math.ceil(externalResponse.total / 10))}
                    </span>
                    <button
                      type="button"
                      disabled={
                        externalPage * 10 >= externalResponse.total || isExternalSearching
                      }
                      onClick={() => handleExternalPageChange(externalPage + 1)}
                      className="px-3.5 py-1.5 rounded-lg border border-[#E6E9EF] bg-[#FFFFFF] font-medium text-[#202733] hover:bg-[#F7F8FA] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Next Page →
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Initial Idle Exploration Card for Global Search */}
          {!hasExternalSearched && !isExternalSearching && (
            <div className="bg-[#FFFFFF] border border-[#E6E9EF] rounded-xl p-8 text-center space-y-4 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-[#315EAB]/10 text-[#315EAB] flex items-center justify-center mx-auto">
                <Globe className="w-6 h-6" />
              </div>
              <div className="max-w-md mx-auto space-y-1.5">
                <h3 className="font-heading font-medium text-base text-[#202733]">
                  Discover Global Academic Literature
                </h3>
                <p className="font-body text-xs text-[#697586] leading-relaxed">
                  Search across preprints on arXiv and peer-reviewed articles indexed by OpenAlex. Preview abstracts, inspect authoritative citations, and 1-click import open-access papers directly into your personal research library.
                </p>
              </div>
              <div className="pt-2">
                <span className="font-roboto text-xs text-[#697586] block mb-2">
                  Try exploring foundational literature:
                </span>
                <div className="flex flex-wrap justify-center gap-2">
                  {[
                    "attention is all you need vaswani",
                    "deep residual learning for image recognition he",
                    "bert pre-training of deep bidirectional transformers devlin",
                    "reciprocal rank fusion for information retrieval",
                  ].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleSuggestionClick(s)}
                      className="px-3 py-1 bg-[#F7F8FA] hover:bg-[#E6E9EF] text-[#202733] rounded-full text-xs font-roboto transition-colors border border-[#E6E9EF]"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* PERSONAL RESEARCH VAULT VIEW (Hybrid, Semantic, BM25)        */}
      {/* ============================================================ */}
      {scope === "library" && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
          {/* Desktop Sidebar Filters */}
          <aside className="hidden md:block md:col-span-1 sticky top-6">
            <SearchFilters
              filters={filters}
              availableFacets={availableFacets}
              onFilterChange={handleFilterChange}
              onReset={handleResetFilters}
              isLoading={isSearching}
            />
          </aside>

          {/* Mobile Filter Drawer / Modal */}
          {showMobileFilters && (
            <div className="fixed inset-0 z-50 bg-black/40 flex justify-end md:hidden">
              <div className="w-80 max-w-full bg-[#FFFFFF] h-full p-4 overflow-y-auto space-y-4 shadow-xl">
                <div className="flex items-center justify-between pb-2 border-b border-[#E6E9EF]">
                  <h3 className="font-heading text-sm font-medium text-[#202733]">Filters</h3>
                  <button
                    type="button"
                    onClick={() => setShowMobileFilters(false)}
                    className="p-1 text-[#697586] hover:text-[#202733]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <SearchFilters
                  filters={filters}
                  availableFacets={availableFacets}
                  onFilterChange={handleFilterChange}
                  onReset={handleResetFilters}
                  isLoading={isSearching}
                />
              </div>
            </div>
          )}

          {/* Main Results Column */}
          <div className="md:col-span-3 space-y-4 min-w-0">
            {/* Active Filter Chips */}
            <ActiveFilterChips
              filters={filters}
              sortBy={sortBy}
              isReranked={enableReranking}
              onRemoveYear={() =>
                handleFilterChange({ ...filters, yearStart: undefined, yearEnd: undefined })
              }
              onRemoveDomain={() => handleFilterChange({ ...filters, domain: undefined })}
              onRemoveDocumentType={() => handleFilterChange({ ...filters, documentType: undefined })}
              onRemoveAuthor={() => handleFilterChange({ ...filters, author: undefined })}
              onResetSort={() => handleSortChange("relevance")}
              onClearAll={handleResetFilters}
            />

            {/* Loading Skeletons */}
            {isSearching && (
              <div className="space-y-4 animate-pulse">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-[#FFFFFF] border border-[#E6E9EF] rounded-xl p-6 space-y-4"
                  >
                    <div className="h-5 bg-[#F7F8FA] rounded w-3/4" />
                    <div className="h-3 bg-[#F7F8FA] rounded w-1/3" />
                    <div className="h-16 bg-[#F7F8FA]/60 rounded" />
                  </div>
                ))}
              </div>
            )}

            {/* Search Results or Empty State */}
            {!isSearching && hasSearched && searchResponse && (
              <>
                {searchResponse.results.length === 0 ? (
                  <SearchEmptyState query={query} onSuggestionClick={handleSuggestionClick} />
                ) : (
                  <div className="space-y-4">
                    {searchResponse.results.map((result) => (
                      <SearchResultCard key={result.document_id} result={result} mode={mode} />
                    ))}

                    <SearchPagination
                      currentPage={searchResponse.page}
                      totalPages={searchResponse.total_pages}
                      totalDocuments={searchResponse.total_documents}
                      pageSize={searchResponse.page_size}
                      onPageChange={handlePageChange}
                    />
                  </div>
                )}
              </>
            )}

            {/* Initial Idle Exploration Card */}
            {!hasSearched && !isSearching && (
              <div className="bg-[#FFFFFF] border border-[#E6E9EF] rounded-xl p-8 text-center space-y-4 shadow-sm">
                <div className="w-12 h-12 rounded-full bg-[#315EAB]/10 text-[#315EAB] flex items-center justify-center mx-auto">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div className="max-w-md mx-auto space-y-1.5">
                  <h3 className="font-heading font-medium text-base text-[#202733]">
                    Semantic &amp; Hybrid Research Discovery
                  </h3>
                  <p className="font-body text-xs text-[#697586] leading-relaxed">
                    Enter any research question or concept above. Filter by publication year, domain,
                    document type, or author, and optionally activate Cross-Encoder reranking for deeper
                    passage cross-attention.
                  </p>
                </div>
                <div className="pt-2">
                  <span className="font-roboto text-xs text-[#697586] block mb-2">
                    Sample queries to get started:
                  </span>
                  <div className="flex flex-wrap justify-center gap-2">
                    {[
                      "attention is all you need transformer",
                      "deep residual learning skip connections",
                      "BERT bidirectional pre-training",
                      "information retrieval rank fusion",
                    ].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleSuggestionClick(s)}
                        className="px-3 py-1 bg-[#F7F8FA] hover:bg-[#E6E9EF] text-[#202733] rounded-full text-xs font-roboto transition-colors border border-[#E6E9EF]"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-[#697586] font-roboto text-xs flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-[#315EAB]" />
          <span>Loading search workspace...</span>
        </div>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}
