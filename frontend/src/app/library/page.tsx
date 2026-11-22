import React from "react";

export default function LibraryPage() {
  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="border-b border-borderNeutral pb-4">
        <h2 className="font-heading text-2xl text-textPrimary">My Library</h2>
        <p className="font-body text-sm text-textSecondary mt-1">
          Access your indexed papers, saved articles, and processing queues.
        </p>
      </div>
      <div className="bg-bgSecondary p-6 rounded-card border border-borderNeutral text-center py-12">
        <p className="font-body text-sm text-textSecondary">
          Document management and personal research library arriving in Phase 5.
        </p>
      </div>
    </div>
  );
}
