"use client";

import React from "react";
import { Sparkles } from "lucide-react";

interface RerankToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  disabled?: boolean;
}

export const RerankToggle: React.FC<RerankToggleProps> = ({
  enabled,
  onToggle,
  disabled = false,
}) => {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onToggle(!enabled)}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-heading text-xs transition-all border ${
        enabled
          ? "bg-accent/10 border-accent/40 text-accent font-medium shadow-xs"
          : "bg-bgSecondary border-borderNeutral text-textSecondary hover:text-textPrimary hover:border-textMuted"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      title="Rerank candidate passages using neural cross-attention (ms-marco-MiniLM-L-6-v2)"
    >
      <Sparkles className={`w-3.5 h-3.5 ${enabled ? "text-accent fill-accent/20" : "text-textMuted"}`} />
      <span>Cross-Encoder Rerank</span>
      <span
        className={`text-[10px] font-meta px-1.5 py-0.2 rounded-full ${
          enabled ? "bg-accent text-white" : "bg-borderNeutral text-textMuted"
        }`}
      >
        {enabled ? "ON" : "OFF"}
      </span>
    </button>
  );
};
