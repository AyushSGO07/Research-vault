import React from "react";
import { ComparativeEvaluationReport } from "@/lib/api";

interface VisualPerformanceBarsProps {
  report: ComparativeEvaluationReport;
}

export const VisualPerformanceBars: React.FC<VisualPerformanceBarsProps> = ({ report }) => {
  const modes = [
    { id: "keyword", label: "BM25", color: "bg-amber-500", track: "bg-amber-100" },
    { id: "semantic", label: "Semantic", color: "bg-emerald-500", track: "bg-emerald-100" },
    { id: "hybrid", label: "Hybrid", color: "bg-blue-500", track: "bg-blue-100" },
    { id: "reranked", label: "Reranked", color: "bg-accent", track: "bg-accent/20" },
  ];

  const metrics = [
    {
      title: "NDCG@10 (Ranking Quality)",
      key: "ndcg_10" as const,
      maxVal: 1.0,
      format: (v: number) => v.toFixed(3),
    },
    {
      title: "Mean Reciprocal Rank (MRR)",
      key: "mrr" as const,
      maxVal: 1.0,
      format: (v: number) => v.toFixed(3),
    },
    {
      title: "Precision@5 (Top-5 Density)",
      key: "precision_5" as const,
      maxVal: 1.0,
      format: (v: number) => `${(v * 100).toFixed(0)}%`,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {metrics.map((m) => (
        <div
          key={m.key}
          className="bg-bgPrimary border border-borderNeutral rounded-card p-5 shadow-subtle space-y-4"
        >
          <div>
            <h4 className="font-heading font-semibold text-sm text-textPrimary">{m.title}</h4>
            <p className="font-meta text-[11px] text-textMuted mt-0.5">Scale: 0.0 to 1.0</p>
          </div>

          <div className="space-y-3">
            {modes.map((mode) => {
              const val = report.mode_metrics[mode.id]?.[m.key] ?? 0;
              const pct = Math.min(100, Math.max(0, (val / m.maxVal) * 100));

              return (
                <div key={mode.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-meta">
                    <span className="font-medium text-textSecondary">{mode.label}</span>
                    <span className="font-mono font-bold text-textPrimary">{m.format(val)}</span>
                  </div>
                  <div className="w-full h-2 bg-bgSecondary rounded-full overflow-hidden">
                    <div
                      className={`h-full ${mode.color} transition-all duration-500 rounded-full`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
