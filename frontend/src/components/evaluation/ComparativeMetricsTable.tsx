import React from "react";
import { Info, Check, ArrowUpRight } from "lucide-react";
import { ComparativeEvaluationReport, ModeMetrics } from "@/lib/api";

interface ComparativeMetricsTableProps {
  report: ComparativeEvaluationReport;
}

interface MetricRowDef {
  label: string;
  key: keyof ModeMetrics;
  description: string;
  isLatency?: boolean;
}

const METRIC_ROWS: MetricRowDef[] = [
  {
    label: "NDCG@10",
    key: "ndcg_10",
    description: "Normalized Discounted Cumulative Gain at rank 10, evaluating graded document relevance.",
  },
  {
    label: "MRR",
    key: "mrr",
    description: "Mean Reciprocal Rank: average reciprocal position (1/rank) of the first relevant document.",
  },
  {
    label: "Precision@1",
    key: "precision_1",
    description: "Top-1 Precision: percentage of benchmark queries where the #1 retrieved paper was relevant.",
  },
  {
    label: "Precision@5",
    key: "precision_5",
    description: "Precision@5: average fraction of top 5 retrieved documents that are relevant.",
  },
  {
    label: "Precision@10",
    key: "precision_10",
    description: "Precision@10: average fraction of top 10 retrieved documents that are relevant.",
  },
  {
    label: "Recall@5",
    key: "recall_5",
    description: "Recall@5: average proportion of all known relevant papers retrieved in the top 5.",
  },
  {
    label: "Recall@10",
    key: "recall_10",
    description: "Recall@10: average proportion of all known relevant papers retrieved in the top 10.",
  },
  {
    label: "MAP@10",
    key: "map_10",
    description: "Mean Average Precision: considers precision across all ranks where a relevant document appears.",
  },
  {
    label: "Mean Latency",
    key: "mean_latency_ms",
    description: "Average end-to-end query execution latency in milliseconds.",
    isLatency: true,
  },
];

export const ComparativeMetricsTable: React.FC<ComparativeMetricsTableProps> = ({ report }) => {
  const modes: Array<{ id: string; label: string; badge: string }> = [
    { id: "keyword", label: "Keyword (BM25)", badge: "Sparse Okapi" },
    { id: "semantic", label: "Dense Semantic", badge: "all-MiniLM-L6-v2" },
    { id: "hybrid", label: "Hybrid (RRF)", badge: "RRF k=60" },
    { id: "reranked", label: "Hybrid + Reranked", badge: "ms-marco Cross-Encoder" },
  ];

  return (
    <div className="bg-bgPrimary border border-borderNeutral rounded-card shadow-subtle overflow-hidden">
      <div className="p-5 border-b border-borderNeutral flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h3 className="font-heading font-semibold text-base text-textPrimary">
            Multi-Paradigm Comparative Performance Matrix
          </h3>
          <p className="font-body text-xs text-textSecondary mt-0.5">
            Empirical evaluation metrics calculated live across all {report.total_queries} queries in &ldquo;{report.suite_name}&rdquo;.
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs font-meta text-textMuted">
          <span className="w-2.5 h-2.5 rounded-full bg-accent inline-block" />
          <span>Winning Paradigm Highlight</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-bgSecondary/70 border-b border-borderNeutral text-xs font-heading text-textSecondary uppercase tracking-wider">
              <th className="py-3 px-4 font-semibold w-1/4">Evaluation Metric</th>
              {modes.map((m) => (
                <th key={m.id} className="py-3 px-4 font-semibold">
                  <div>{m.label}</div>
                  <div className="text-[10px] text-textMuted normal-case font-meta tracking-normal">
                    {m.badge}
                  </div>
                </th>
              ))}
              <th className="py-3 px-4 font-semibold text-right">Reranked vs BM25</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-borderNeutral text-xs font-body">
            {METRIC_ROWS.map((row) => {
              // Find winning value
              let bestVal: number;
              let bestMode = "";

              if (row.isLatency) {
                // Lower latency is better
                bestVal = Infinity;
                modes.forEach((m) => {
                  const val = report.mode_metrics[m.id]?.[row.key] ?? Infinity;
                  if (val < bestVal) {
                    bestVal = val;
                    bestMode = m.id;
                  }
                });
              } else {
                // Higher accuracy is better
                bestVal = -1;
                modes.forEach((m) => {
                  const val = report.mode_metrics[m.id]?.[row.key] ?? -1;
                  if (val > bestVal) {
                    bestVal = val;
                    bestMode = m.id;
                  }
                });
              }

              const bm25Val = report.mode_metrics["keyword"]?.[row.key] ?? 0;
              const rerankedVal = report.mode_metrics["reranked"]?.[row.key] ?? 0;
              let deltaStr = "-";
              let isPositive = false;

              if (!row.isLatency && bm25Val > 0) {
                const pct = ((rerankedVal - bm25Val) / bm25Val) * 100;
                deltaStr = `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
                isPositive = pct > 0;
              } else if (row.isLatency && bm25Val > 0) {
                deltaStr = `${rerankedVal.toFixed(1)} ms`;
              }

              return (
                <tr key={row.key} className="hover:bg-bgSecondary/40 transition-colors">
                  {/* Metric Name & Description */}
                  <td className="py-3.5 px-4 font-medium text-textPrimary">
                    <div className="flex items-center space-x-1.5 group cursor-help" title={row.description}>
                      <span>{row.label}</span>
                      <Info className="w-3.5 h-3.5 text-textMuted opacity-60 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </td>

                  {/* Mode Columns */}
                  {modes.map((m) => {
                    const rawVal = report.mode_metrics[m.id]?.[row.key];
                    const isWinner = m.id === bestMode;
                    const displayVal =
                      rawVal !== undefined
                        ? row.isLatency
                          ? `${rawVal.toFixed(1)} ms`
                          : rawVal.toFixed(3)
                        : "N/A";

                    return (
                      <td key={m.id} className="py-3.5 px-4 font-mono">
                        {isWinner ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-accent/10 text-accent font-bold border border-accent/20">
                            <span>{displayVal}</span>
                            <Check className="w-3 h-3 text-accent stroke-[2.5]" />
                          </span>
                        ) : (
                          <span className="text-textSecondary">{displayVal}</span>
                        )}
                      </td>
                    );
                  })}

                  {/* Delta */}
                  <td className="py-3.5 px-4 text-right font-mono font-medium">
                    {row.isLatency ? (
                      <span className="text-textMuted text-xs">{deltaStr}</span>
                    ) : isPositive ? (
                      <span className="inline-flex items-center text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-xs border border-emerald-200">
                        <ArrowUpRight className="w-3 h-3 mr-0.5" />
                        {deltaStr}
                      </span>
                    ) : (
                      <span className="text-textSecondary">{deltaStr}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
