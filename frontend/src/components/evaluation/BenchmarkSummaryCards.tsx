import React from "react";
import { Trophy, Target, Layers, Zap, ArrowUpRight } from "lucide-react";
import { ComparativeEvaluationReport } from "@/lib/api";

interface BenchmarkSummaryCardsProps {
  report: ComparativeEvaluationReport;
}

export const BenchmarkSummaryCards: React.FC<BenchmarkSummaryCardsProps> = ({ report }) => {
  const winnerMode = report.winner_mode;
  const winnerMetrics = report.mode_metrics[winnerMode];

  const formatModeName = (m: string) => {
    switch (m) {
      case "reranked":
        return "Hybrid + Reranking";
      case "hybrid":
        return "Hybrid (RRF)";
      case "semantic":
        return "Dense Semantic";
      case "keyword":
        return "Keyword (BM25)";
      default:
        return m.toUpperCase();
    }
  };

  const ndcgLead =
    report.percentage_gains_over_bm25 &&
    report.percentage_gains_over_bm25[winnerMode] &&
    report.percentage_gains_over_bm25[winnerMode]["ndcg_10"];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Top Paradigm */}
      <div className="bg-bgPrimary border border-borderNeutral rounded-card p-5 shadow-subtle hover:border-accent/40 transition-colors">
        <div className="flex items-center justify-between">
          <span className="font-meta text-xs text-textSecondary uppercase tracking-wider font-medium">
            Top Paradigm
          </span>
          <div className="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
            <Trophy className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="font-heading font-bold text-lg text-textPrimary truncate">
            {formatModeName(winnerMode)}
          </div>
          <div className="mt-1 flex items-center space-x-1.5 text-xs font-meta text-textSecondary">
            <span className="font-bold text-accent font-mono">
              NDCG: {winnerMetrics?.ndcg_10.toFixed(3) || "N/A"}
            </span>
            {ndcgLead !== undefined && ndcgLead > 0 && (
              <span className="inline-flex items-center text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded text-[11px]">
                <ArrowUpRight className="w-3 h-3 mr-0.5" />
                +{ndcgLead}% vs BM25
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. Mean Reciprocal Rank */}
      <div className="bg-bgPrimary border border-borderNeutral rounded-card p-5 shadow-subtle hover:border-accent/40 transition-colors">
        <div className="flex items-center justify-between">
          <span className="font-meta text-xs text-textSecondary uppercase tracking-wider font-medium">
            Mean MRR
          </span>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Target className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="font-heading font-bold text-2xl text-textPrimary font-mono">
            {winnerMetrics?.mrr.toFixed(3) || "0.000"}
          </div>
          <p className="mt-1 text-xs font-meta text-textSecondary">
            Top-1 precision: {((winnerMetrics?.precision_1 || 0) * 100).toFixed(0)}%
          </p>
        </div>
      </div>

      {/* 3. Evaluation Scope */}
      <div className="bg-bgPrimary border border-borderNeutral rounded-card p-5 shadow-subtle hover:border-accent/40 transition-colors">
        <div className="flex items-center justify-between">
          <span className="font-meta text-xs text-textSecondary uppercase tracking-wider font-medium">
            Benchmark Scope
          </span>
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Layers className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="font-heading font-bold text-2xl text-textPrimary">
            {report.total_queries} <span className="text-sm font-normal text-textSecondary font-body">Queries</span>
          </div>
          <p className="mt-1 text-xs font-meta text-textSecondary truncate">
            {report.total_documents_judged} relevant paper pairs
          </p>
        </div>
      </div>

      {/* 4. Mean Latency */}
      <div className="bg-bgPrimary border border-borderNeutral rounded-card p-5 shadow-subtle hover:border-accent/40 transition-colors">
        <div className="flex items-center justify-between">
          <span className="font-meta text-xs text-textSecondary uppercase tracking-wider font-medium">
            Winner Latency
          </span>
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <Zap className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="font-heading font-bold text-2xl text-textPrimary font-mono">
            {winnerMetrics?.mean_latency_ms.toFixed(1) || 0}{" "}
            <span className="text-sm font-normal text-textSecondary font-meta">ms</span>
          </div>
          <p className="mt-1 text-xs font-meta text-textSecondary">
            Suite duration: {(report.duration_ms / 1000).toFixed(2)}s
          </p>
        </div>
      </div>
    </div>
  );
};
