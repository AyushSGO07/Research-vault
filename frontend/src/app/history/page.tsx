import React from "react";

export default function HistoryPage() {
  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="border-b border-borderNeutral pb-4">
        <h2 className="font-heading text-2xl text-textPrimary">Search History</h2>
        <p className="font-body text-sm text-textSecondary mt-1">
          Review past research inquiries and search sessions.
        </p>
      </div>
      <div className="bg-bgSecondary p-6 rounded-card border border-borderNeutral text-center py-12">
        <p className="font-body text-sm text-textSecondary">
          Search query history tracking arriving in Phase 5.
        </p>
      </div>
    </div>
  );
}
