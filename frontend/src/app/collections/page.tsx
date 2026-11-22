import React from "react";

export default function CollectionsPage() {
  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="border-b border-borderNeutral pb-4">
        <h2 className="font-heading text-2xl text-textPrimary">Collections</h2>
        <p className="font-body text-sm text-textSecondary mt-1">
          Organize academic literature into topical research projects.
        </p>
      </div>
      <div className="bg-bgSecondary p-6 rounded-card border border-borderNeutral text-center py-12">
        <p className="font-body text-sm text-textSecondary">
          Custom collections management arriving in Phase 5.
        </p>
      </div>
    </div>
  );
}
