import React from "react";

export default function SearchPage() {
  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="border-b border-borderNeutral pb-4">
        <h2 className="font-heading text-2xl text-textPrimary">Search Papers</h2>
        <p className="font-body text-sm text-textSecondary mt-1">
          Explore research literature through semantic, keyword (BM25), and hybrid rank retrieval.
        </p>
      </div>
      <div className="bg-bgSecondary p-6 rounded-card border border-borderNeutral text-center py-12">
        <p className="font-body text-sm text-textSecondary">
          Full semantic and hybrid search interface arriving in Phase 3.
        </p>
      </div>
    </div>
  );
}
