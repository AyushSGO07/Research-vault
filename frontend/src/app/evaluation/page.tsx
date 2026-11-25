"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart3,
  Play,
  RotateCcw,
  Download,
  Plus,
  Layers,
  History,
  FileCheck,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import {
  evaluationApi,
  BenchmarkSuiteResponse,
  ComparativeEvaluationReport,
  BenchmarkRunSummary,
} from "@/lib/api";
import { BenchmarkSummaryCards } from "@/components/evaluation/BenchmarkSummaryCards";
import { ComparativeMetricsTable } from "@/components/evaluation/ComparativeMetricsTable";
import { VisualPerformanceBars } from "@/components/evaluation/VisualPerformanceBars";
import { QueryDrilldownList } from "@/components/evaluation/QueryDrilldownList";
import { GroundTruthModal } from "@/components/evaluation/GroundTruthModal";
import { useAuth } from "@/context/AuthContext";

export default function EvaluationPage() {
  const { isAuthenticated, isLoading: isAuthLoading, loginAsDemo, openAuthModal } = useAuth();
  const [suites, setSuites] = useState<BenchmarkSuiteResponse[]>([]);
  const [selectedSuiteId, setSelectedSuiteId] = useState<number | null>(null);
  const [activeReport, setActiveReport] = useState<ComparativeEvaluationReport | null>(null);
  const [pastRuns, setPastRuns] = useState<BenchmarkRunSummary[]>([]);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showGroundTruthModal, setShowGroundTruthModal] = useState<boolean>(false);
  const [showRunsDropdown, setShowRunsDropdown] = useState<boolean>(false);

  // Load available benchmark suites and past runs on mount or auth change
  useEffect(() => {
    if (isAuthLoading) return;
    if (!isAuthenticated) {
      setIsLoading(false);
      setSuites([]);
      setPastRuns([]);
      setActiveReport(null);
      return;
    }

    async function initData() {
      setIsLoading(true);
      setError(null);
      try {
        const [suitesData, runsData] = await Promise.all([
          evaluationApi.getSuites(),
          evaluationApi.getRuns().catch(() => [] as BenchmarkRunSummary[]),
        ]);
        setSuites(suitesData);
        setPastRuns(runsData);

        if (suitesData.length > 0) {
          const defaultSuite = suitesData.find((s) => s.is_default) || suitesData[0];
          setSelectedSuiteId(defaultSuite.id);
        }

        // If previous runs exist, automatically load the most recent run
        if (runsData.length > 0) {
          const latestRun = await evaluationApi.getRun(runsData[0].id);
          setActiveReport(latestRun);
        }
      } catch (err: unknown) {
        console.error("Failed to initialize evaluation data:", err);
        setError(err instanceof Error ? err.message : "Failed to load benchmark suites");
      } finally {
        setIsLoading(false);
      }
    }
    initData();
  }, [isAuthenticated, isAuthLoading]);

  // Run benchmark evaluation
  const handleRunBenchmark = async () => {
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }
    setIsRunning(true);
    setError(null);
    try {
      const report = await evaluationApi.runBenchmark({
        suite_id: selectedSuiteId || undefined,
      });
      setActiveReport(report);

      // Refresh past runs list
      const updatedRuns = await evaluationApi.getRuns();
      setPastRuns(updatedRuns);
    } catch (err: unknown) {
      console.error("Benchmark execution failed:", err);
      setError(err instanceof Error ? err.message : "Benchmark execution failed");
    } finally {
      setIsRunning(false);
    }
  };

  // Load a specific historical run
  const handleLoadRun = async (runId: number) => {
    setIsRunning(true);
    setShowRunsDropdown(false);
    try {
      const report = await evaluationApi.getRun(runId);
      setActiveReport(report);
      setSelectedSuiteId(report.suite_id);
    } catch (err: unknown) {
      alert("Failed to load run: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsRunning(false);
    }
  };

  // Export report
  const handleExport = async (format: "markdown" | "json") => {
    if (!activeReport) return;
    try {
      if (format === "json") {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(activeReport, null, 2));
        const downloadAnchor = document.createElement("a");
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `researchvault_benchmark_run_${activeReport.run_id}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
      } else {
        const mdText = await evaluationApi.exportReport(activeReport.run_id, "markdown");
        const blob = new Blob([mdText], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `researchvault_benchmark_run_${activeReport.run_id}.md`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (err) {
      alert("Export failed: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-borderNeutral">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-heading text-2xl font-bold text-textPrimary">
                Search Evaluation & Benchmark Suite
              </h1>
              <p className="font-body text-sm text-textSecondary mt-0.5">
                Empirically measure retrieval precision, recall, MRR, and NDCG@10 across all 4 search paradigms.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Suite Selector */}
          <div className="flex items-center space-x-2">
            <label className="text-xs font-meta text-textSecondary">Suite:</label>
            <select
              value={selectedSuiteId || ""}
              onChange={(e) => setSelectedSuiteId(Number(e.target.value))}
              disabled={isRunning || suites.length === 0}
              className="px-3 py-2 text-xs bg-bgPrimary border border-borderNeutral rounded-input focus:outline-none focus:border-accent text-textPrimary font-body"
            >
              {suites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.query_count} queries)
                </option>
              ))}
            </select>
          </div>

          {/* Add Query Button */}
          {selectedSuiteId && (
            <button
              onClick={() => setShowGroundTruthModal(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-heading font-medium text-textSecondary hover:text-textPrimary bg-bgSecondary hover:bg-borderNeutral/50 border border-borderNeutral rounded-button transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Query</span>
            </button>
          )}

          {/* Past Runs History Dropdown */}
          {pastRuns.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowRunsDropdown(!showRunsDropdown)}
                className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-heading font-medium text-textSecondary hover:text-textPrimary bg-bgSecondary hover:bg-borderNeutral/50 border border-borderNeutral rounded-button transition-colors"
              >
                <History className="w-3.5 h-3.5 text-textMuted" />
                <span>Runs ({pastRuns.length})</span>
              </button>

              {showRunsDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-bgPrimary rounded-card border border-borderNeutral shadow-xl py-2 z-30 animate-in fade-in zoom-in-95 duration-100 max-h-60 overflow-y-auto">
                  <div className="px-3 py-1 border-b border-borderNeutral text-[10px] font-heading font-semibold text-textMuted uppercase tracking-wider">
                    Recent Benchmark Runs
                  </div>
                  {pastRuns.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => handleLoadRun(r.id)}
                      className="w-full text-left px-3 py-2 hover:bg-bgSecondary flex flex-col text-xs transition-colors"
                    >
                      <div className="flex items-center justify-between font-heading font-medium text-textPrimary">
                        <span>Run #{r.id}</span>
                        <span className="text-[11px] font-mono text-accent uppercase font-bold">{r.winner_mode}</span>
                      </div>
                      <span className="text-[10px] font-meta text-textMuted">
                        {new Date(r.created_at).toLocaleDateString()} · {r.duration_ms.toFixed(0)}ms
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Export Dropdown */}
          {activeReport && (
            <div className="flex items-center space-x-1">
              <button
                onClick={() => handleExport("markdown")}
                title="Export report as Markdown"
                className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-heading font-medium text-textSecondary hover:text-textPrimary bg-bgSecondary hover:bg-borderNeutral/50 border border-borderNeutral rounded-button transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-textMuted" />
                <span>MD</span>
              </button>
              <button
                onClick={() => handleExport("json")}
                title="Export report as JSON"
                className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-heading font-medium text-textSecondary hover:text-textPrimary bg-bgSecondary hover:bg-borderNeutral/50 border border-borderNeutral rounded-button transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-textMuted" />
                <span>JSON</span>
              </button>
            </div>
          )}

          {/* Run Benchmark CTA */}
          <button
            onClick={handleRunBenchmark}
            disabled={isRunning}
            className="inline-flex items-center space-x-2 px-4 py-2 text-xs font-heading font-semibold text-white bg-accent hover:bg-accent/90 rounded-button shadow-sm transition-colors disabled:opacity-60"
          >
            {isRunning ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Evaluating Inquiries...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run Benchmark</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Ground Truth Modal */}
      {selectedSuiteId && (
        <GroundTruthModal
          isOpen={showGroundTruthModal}
          onClose={() => setShowGroundTruthModal(false)}
          suiteId={selectedSuiteId}
          onSuccess={async () => {
            const updatedSuites = await evaluationApi.getSuites();
            setSuites(updatedSuites);
          }}
        />
      )}

      {/* Body Content */}
      {!isAuthenticated ? (
        /* Unauthenticated Barrier State */
        <div className="bg-bgSecondary/60 rounded-card border border-borderNeutral p-12 text-center max-w-2xl mx-auto space-y-6">
          <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mx-auto text-accent">
            <BarChart3 className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h3 className="font-heading font-semibold text-lg text-textPrimary">
              Authentication Required for Search Evaluation
            </h3>
            <p className="font-body text-xs text-textSecondary leading-relaxed">
              ResearchVault evaluates retrieval accuracy (NDCG@10, MRR, Precision, Recall) across all 4 search paradigms using authentic Cranfield-style benchmark queries and your indexed documents. Sign in or use the 1-click demo researcher account to run benchmarks.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={loginAsDemo}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-button bg-accent text-white font-heading text-xs font-semibold hover:bg-accent/90 transition-colors shadow-sm"
            >
              <Sparkles className="w-4 h-4" />
              <span>1-Click Demo Login (Dr. Alan Turing)</span>
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
          <p className="font-body text-sm text-textSecondary">Loading benchmark suite...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-red-50 border border-red-200 rounded-card text-center space-y-2">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto" />
          <p className="font-heading font-medium text-red-700">Evaluation Error</p>
          <p className="font-body text-xs text-red-600">{error}</p>
        </div>
      ) : !activeReport ? (
        /* Empty State / Initial Run Prompt */
        <div className="bg-bgSecondary/60 rounded-card border border-borderNeutral p-12 text-center max-w-2xl mx-auto space-y-5">
          <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mx-auto text-accent">
            <Sparkles className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h3 className="font-heading font-semibold text-lg text-textPrimary">
              Authentic Multi-Paradigm Search Benchmarking
            </h3>
            <p className="font-body text-xs text-textSecondary leading-relaxed">
              ResearchVault evaluates retrieval accuracy according to the Cranfield paradigm. When you run a benchmark,
              each test query is executed live through <strong>BM25 Keyword</strong>, <strong>Dense Semantic</strong>,{" "}
              <strong>Hybrid (RRF)</strong>, and <strong>Cross-Encoder Reranking</strong> against your authentic indexed documents.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={handleRunBenchmark}
              disabled={isRunning}
              className="inline-flex items-center space-x-2 px-6 py-3 rounded-button bg-accent text-white font-heading text-sm font-semibold hover:bg-accent/90 transition-colors shadow-sm disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{isRunning ? "Running Benchmark..." : "Execute Standard Benchmark Suite"}</span>
            </button>
          </div>
        </div>
      ) : (
        /* Active Benchmark Report Content */
        <div className="space-y-8">
          {/* Summary Scorecards */}
          <BenchmarkSummaryCards report={activeReport} />

          {/* Visual Performance Bars */}
          <VisualPerformanceBars report={activeReport} />

          {/* Full Metrics Comparison Table */}
          <ComparativeMetricsTable report={activeReport} />

          {/* Query Drilldown Diagnostics */}
          <QueryDrilldownList queries={activeReport.query_breakdowns} />
        </div>
      )}
    </div>
  );
}
