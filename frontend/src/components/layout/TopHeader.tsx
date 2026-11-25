"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Sparkles, User as UserIcon } from "lucide-react";

const routeNames: Record<string, string> = {
  "/": "Discover Research",
  "/search": "Search Papers",
  "/library": "My Library",
  "/collections": "Collections",
  "/upload": "Upload Documents",
  "/history": "Search History",
  "/evaluation": "Search Evaluation & Benchmarks",
  "/settings": "Settings",
};

export const TopHeader: React.FC = () => {
  const pathname = usePathname();
  const { user, isAuthenticated, loginAsDemo, openAuthModal } = useAuth();
  const currentTitle = routeNames[pathname] || "ResearchVault";

  return (
    <header className="h-16 border-b border-borderNeutral bg-bgMain px-6 lg:px-8 flex items-center justify-between">
      <div>
        <h1 className="font-heading font-medium text-base text-textPrimary">
          {currentTitle}
        </h1>
      </div>
      <div className="flex items-center space-x-3">
        {!isAuthenticated ? (
          <button
            onClick={loginAsDemo}
            className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-heading font-medium text-accent bg-accent/10 hover:bg-accent/15 border border-accent/20 transition-colors shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Demo Mode (Dr. Turing)</span>
          </button>
        ) : (
          <div className="hidden sm:flex items-center space-x-2 text-xs font-heading text-textSecondary bg-bgSecondary px-3 py-1 rounded-full border border-borderNeutral">
            <span className="w-2 h-2 rounded-full bg-statusSuccess"></span>
            <span>{user?.name}</span>
          </div>
        )}
        <span className="font-meta text-xs text-textMuted bg-bgSecondary px-2.5 py-1 rounded border border-borderNeutral">
          v1.0 MVP
        </span>
      </div>
    </header>
  );
};
