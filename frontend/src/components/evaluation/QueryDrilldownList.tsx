import React, { useState, useMemo } from "react";
import { Search, ChevronDown, ChevronUp, FileText, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
import { QueryEvaluationResult } from "@/lib/api";

interface QueryDrilldownListProps {
  queries: QueryEvaluationResult[];
}

export const QueryDrilldownList: React.FC<QueryDrilldownListProps> = ({ queries }) => {
  const [filterText, setFilterText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set(queries.slice(0, 3).map((q) => q.query_id)));

  const categories = useMemo(() => {
    const cats = new Set<string>();
    queries.forEach((q) => cats.add(q.category));
    return ["all", ...Array.from(cats)];
  }, [queries]);

  const filteredQueries = useMemo(() => {
    return queries.filter((q) => {
      const matchesCategory = selectedCategory === "all" || q.category === selectedCategory;
      const matchesText =
        !filterText.trim() ||
        q.query_text.toLowerCase().includes(filterText.toLowerCase()) ||
        q.ground_truth_titles.some((t) => t.toLowerCase().includes(filterText.toLowerCase()));
      return matchesCategory && matchesText;
    });
  }, [queries, filterText, selectedCategory]);

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getRankBadge = (rank: number | null, score: number) => {
    if (rank === 1) {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-xs font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          <span>Rank 1</span>
        </span>
      );
    }
    if (rank !== null && rank <= 5) {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-xs font-mono font-medium bg-blue-50 text-blue-700 border border-blue-200">
          <span>Rank {rank}</span>
        </span>
      );
    }
    if (rank !== null && rank <= 10) {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-xs font-mono font-medium bg-amber-50 text-amber-700 border border-amber-200">
          <span>Rank {rank}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-xs font-mono text-red-600 bg-red-50 border border-red-200">
        <AlertCircle className="w-3 h-3 text-red-500" />
        <span>&gt;10 (Miss)</span>
      </span>
    );
  };

  return (
    <div className="bg-bgPrimary border border-borderNeutral rounded-card shadow-subtle p-5 space-y-5">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-borderNeutral">
        <div>
          <h3 className="font-heading font-semibold text-base text-textPrimary">
            Query-Level Diagnostics & Ground-Truth Drilldown
          </h3>
          <p className="font-body text-xs text-textSecondary mt-0.5">
            Inspect individual query behavior across Keyword, Semantic, Hybrid, and Reranked paradigms.
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category pills */}
          <div className="flex items-center space-x-1 bg-bgSecondary p-1 rounded-button border border-borderNeutral text-xs font-meta">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded capitalize transition-colors ${
                  selectedCategory === cat
                    ? "bg-bgPrimary text-textPrimary font-semibold shadow-sm"
                    : "text-textSecondary hover:text-textPrimary"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-textMuted" />
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Filter test queries..."
              className="pl-8 pr-3 py-1.5 text-xs bg-bgSecondary/60 border border-borderNeutral rounded-input focus:outline-none focus:border-accent text-textPrimary placeholder:text-textMuted font-body w-48"
            />
          </div>
        </div>
      </div>

      {/* Query Accordion Cards */}
      <div className="space-y-3">
        {filteredQueries.length === 0 ? (
          <div className="text-center py-8 text-xs font-body text-textSecondary">
            No benchmark queries match your search filter.
          </div>
        ) : (
          filteredQueries.map((q, idx) => {
            const isExpanded = expandedIds.has(q.query_id);

            return (
              <div
                key={q.query_id}
                className="border border-borderNeutral rounded-lg overflow-hidden transition-colors hover:border-accent/40"
              >
                {/* Accordion Summary */}
                <div
                  onClick={() => toggleExpand(q.query_id)}
                  className="p-4 bg-bgSecondary/30 hover:bg-bgSecondary/60 cursor-pointer flex items-center justify-between gap-4 transition-colors select-none"
                >
                  <div className="flex items-start space-x-3 flex-1 min-w-0">
                    <span className="font-mono text-xs text-textMuted mt-0.5">#{idx + 1}</span>
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-heading font-medium text-sm text-textPrimary truncate">
                          &ldquo;{q.query_text}&rdquo;
                        </span>
                        <span className="inline-flex items-center px-2 py-0.2 rounded-full text-[10px] font-meta uppercase font-semibold bg-bgSecondary text-textSecondary border border-borderNeutral">
                          {q.category}
                        </span>
                      </div>
                      <div className="text-xs font-meta text-textSecondary flex items-center space-x-1.5 truncate">
                        <FileText className="w-3 h-3 text-textMuted" />
                        <span>Target: {q.ground_truth_titles.join(", ") || "No ground truth specified"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 flex-shrink-0">
                    {/* Compact Reranked badge */}
                    <div className="hidden sm:flex items-center space-x-2 text-xs font-meta">
                      <span className="text-textMuted">Reranked:</span>
                      {getRankBadge(
                        q.mode_results["reranked"]?.rank ?? null,
                        q.mode_results["reranked"]?.score ?? 0
                      )}
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-textMuted" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-textMuted" />
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="p-4 bg-bgPrimary border-t border-borderNeutral space-y-4">
                    {/* Multi-mode Rank Comparison Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { id: "keyword", label: "Keyword (BM25)" },
                        { id: "semantic", label: "Dense Semantic" },
                        { id: "hybrid", label: "Hybrid (RRF)" },
                        { id: "reranked", label: "Hybrid + Reranked" },
                      ].map((m) => {
                        const res = q.mode_results[m.id];
                        return (
                          <div
                            key={m.id}
                            className="bg-bgSecondary/50 border border-borderNeutral rounded-lg p-3 space-y-2"
                          >
                            <div className="font-heading font-medium text-xs text-textSecondary truncate">
                              {m.label}
                            </div>
                            <div>{getRankBadge(res?.rank ?? null, res?.score ?? 0)}</div>
                            {res?.score !== undefined && (
                              <div className="text-[11px] font-mono text-textMuted truncate">
                                score: {res.score.toFixed(4)}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Qualitative Insight */}
                    <div className="flex items-start space-x-2 text-xs font-body text-textSecondary bg-accent/5 border border-accent/10 rounded-lg p-3">
                      <Sparkles className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-textPrimary font-heading">Diagnostic Analysis: </span>
                        <span>{q.qualitative_insight}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
