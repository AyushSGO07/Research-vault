import React, { useState, useEffect } from "react";
import { X, Plus, Trash2, FileText, Star } from "lucide-react";
import { evaluationApi, documentsApi, DocumentResponse } from "@/lib/api";

interface GroundTruthModalProps {
  isOpen: boolean;
  onClose: () => void;
  suiteId: number;
  onSuccess: () => void;
}

export const GroundTruthModal: React.FC<GroundTruthModalProps> = ({
  isOpen,
  onClose,
  suiteId,
  onSuccess,
}) => {
  const [queryText, setQueryText] = useState("");
  const [category, setCategory] = useState("conceptual");
  const [difficulty, setDifficulty] = useState("medium");
  const [availableDocs, setAvailableDocs] = useState<DocumentResponse[]>([]);
  const [selectedJudgments, setSelectedJudgments] = useState<
    Array<{ document_id: number; relevance_grade: number; rationale: string }>
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      documentsApi
        .list()
        .then((docs) => setAvailableDocs(docs))
        .catch((err) => console.error("Could not fetch library docs:", err));
      setQueryText("");
      setSelectedJudgments([]);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddDocumentJudgment = (docId: number) => {
    if (selectedJudgments.some((j) => j.document_id === docId)) return;
    setSelectedJudgments((prev) => [
      ...prev,
      { document_id: docId, relevance_grade: 2, rationale: "Primary ground-truth paper" },
    ]);
  };

  const handleRemoveJudgment = (docId: number) => {
    setSelectedJudgments((prev) => prev.filter((j) => j.document_id !== docId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryText.trim()) {
      setError("Please enter a query text.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await evaluationApi.addQuery(suiteId, {
        query_text: queryText.trim(),
        category,
        difficulty,
        judgments: selectedJudgments,
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add benchmark query");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-bgPrimary rounded-card border border-borderNeutral shadow-xl max-w-2xl w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-borderNeutral">
          <div>
            <h3 className="font-heading font-semibold text-lg text-textPrimary">
              Add Benchmark Query & Ground Truth
            </h3>
            <p className="font-body text-xs text-textSecondary mt-0.5">
              Add a test inquiry with authentic relevant document pairings to evaluate retrieval accuracy.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-textMuted hover:text-textPrimary rounded-button hover:bg-bgSecondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-card">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Query Text */}
          <div>
            <label className="block text-xs font-heading font-semibold text-textPrimary uppercase tracking-wider mb-1">
              Query Text *
            </label>
            <input
              type="text"
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder="e.g. contrastive representation learning for visual representations"
              className="w-full px-3 py-2 text-sm bg-bgPrimary border border-borderNeutral rounded-input focus:outline-none focus:border-accent text-textPrimary font-body"
              required
            />
          </div>

          {/* Category & Difficulty */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-heading font-semibold text-textPrimary uppercase tracking-wider mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-bgPrimary border border-borderNeutral rounded-input focus:outline-none focus:border-accent text-textPrimary font-body"
              >
                <option value="conceptual">Conceptual</option>
                <option value="keyword">Keyword</option>
                <option value="compound">Compound</option>
                <option value="technical">Technical</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-heading font-semibold text-textPrimary uppercase tracking-wider mb-1">
                Difficulty
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-bgPrimary border border-borderNeutral rounded-input focus:outline-none focus:border-accent text-textPrimary font-body"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          {/* Target Ground Truth Documents */}
          <div className="space-y-2 pt-2 border-t border-borderNeutral">
            <label className="block text-xs font-heading font-semibold text-textPrimary uppercase tracking-wider">
              Relevant Ground-Truth Documents ({selectedJudgments.length})
            </label>

            {/* Selected judgments */}
            {selectedJudgments.length > 0 && (
              <div className="space-y-2">
                {selectedJudgments.map((j) => {
                  const doc = availableDocs.find((d) => d.id === j.document_id);
                  return (
                    <div
                      key={j.document_id}
                      className="flex items-center justify-between p-2.5 bg-bgSecondary/60 rounded-lg border border-borderNeutral text-xs"
                    >
                      <div className="flex items-center space-x-2 flex-1 min-w-0 mr-3">
                        <FileText className="w-4 h-4 text-accent flex-shrink-0" />
                        <span className="font-heading font-medium text-textPrimary truncate">
                          {doc?.title || `Document #${j.document_id}`}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <select
                          value={j.relevance_grade}
                          onChange={(e) => {
                            const grade = Number(e.target.value);
                            setSelectedJudgments((prev) =>
                              prev.map((item) =>
                                item.document_id === j.document_id ? { ...item, relevance_grade: grade } : item
                              )
                            );
                          }}
                          className="px-2 py-1 text-xs border border-borderNeutral rounded bg-bgPrimary font-meta"
                        >
                          <option value={2}>Highly Relevant (2)</option>
                          <option value={1}>Relevant (1)</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => handleRemoveJudgment(j.document_id)}
                          className="p-1 text-textMuted hover:text-red-600 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Document Picker Dropdown */}
            <div className="pt-1">
              <label className="block text-[11px] font-meta text-textSecondary mb-1">
                Add paper from your library:
              </label>
              <select
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (val) handleAddDocumentJudgment(val);
                }}
                value=""
                className="w-full px-3 py-2 text-xs bg-bgPrimary border border-borderNeutral rounded-input focus:outline-none focus:border-accent text-textPrimary font-body"
              >
                <option value="">-- Choose document to mark as relevant --</option>
                {availableDocs
                  .filter((d) => !selectedJudgments.some((j) => j.document_id === d.id))
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title} ({d.domain || "Unknown Domain"})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-borderNeutral">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-heading font-medium text-textSecondary hover:text-textPrimary bg-bgSecondary hover:bg-borderNeutral/50 rounded-button transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-heading font-medium text-white bg-accent hover:bg-accent/90 rounded-button transition-colors shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? "Adding Query..." : "Add to Benchmark"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
