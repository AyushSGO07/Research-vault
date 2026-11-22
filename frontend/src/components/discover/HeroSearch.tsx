"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, X, CornerDownLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";

const sampleQueries = [
  "How does reinforcement learning improve robotic navigation?",
  "Recent developments in solid-state batteries",
  "Applications of machine learning in drug discovery",
];

export const HeroSearch: React.FC = () => {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [greeting, setGreeting] = useState("Good afternoon");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting("Good morning");
    } else if (hour < 18) {
      setGreeting("Good afternoon");
    } else {
      setGreeting("Good evening");
    }
  }, []);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    } else if (e.key === "Escape") {
      setQuery("");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Greeting */}
      <div className="space-y-2">
        <h2 className="font-heading font-medium text-3xl lg:text-4xl text-textPrimary tracking-tight">
          {greeting}.
        </h2>
        <p className="font-body text-base text-textSecondary">
          Find research that moves your work forward.
        </p>
      </div>

      {/* Main Search Bar */}
      <form onSubmit={handleSearch} className="relative">
        <div className="relative flex items-center bg-white border border-borderNeutral rounded-xl shadow-xs hover:border-accent/40 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/15 transition-all">
          <div className="pl-4 pr-2 text-textMuted flex items-center pointer-events-none">
            <Search className="w-5 h-5 text-accent" />
          </div>

          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search a research topic, concept, or question..."
            className="flex-1 py-3.5 px-2 text-sm lg:text-base text-textPrimary placeholder:text-textMuted bg-transparent focus:outline-none font-body"
          />

          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="p-1.5 mr-2 text-textMuted hover:text-textPrimary rounded-full transition-colors"
              title="Clear input (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <div className="pr-3 flex items-center space-x-2">
            <span className="hidden sm:inline-flex items-center text-[11px] font-meta text-textMuted bg-bgSecondary border border-borderNeutral px-2 py-1 rounded">
              <CornerDownLeft className="w-3 h-3 mr-1" /> Enter
            </span>
            <Button type="submit" variant="primary" size="md">
              Search
            </Button>
          </div>
        </div>
      </form>

      {/* Search Suggestions */}
      <div className="space-y-2">
        <div className="flex items-center space-x-1.5 text-xs text-textMuted font-meta">
          <Sparkles className="w-3.5 h-3.5 text-accent" />
          <span>Example research inquiries:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {sampleQueries.map((sample, idx) => (
            <button
              key={idx}
              onClick={() => setQuery(sample)}
              className="text-xs text-textSecondary bg-bgSecondary hover:bg-borderNeutral/50 border border-borderNeutral rounded-md px-3 py-1.5 transition-colors text-left font-body"
            >
              &ldquo;{sample}&rdquo;
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
