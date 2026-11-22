"use client";

import React from "react";
import { usePathname } from "next/navigation";

const routeNames: Record<string, string> = {
  "/": "Discover Research",
  "/search": "Search Papers",
  "/library": "My Library",
  "/collections": "Collections",
  "/upload": "Upload Documents",
  "/history": "Search History",
  "/settings": "Settings",
};

export const TopHeader: React.FC = () => {
  const pathname = usePathname();
  const currentTitle = routeNames[pathname] || "ResearchVault";

  return (
    <header className="h-16 border-b border-borderNeutral bg-bgMain px-6 lg:px-8 flex items-center justify-between">
      <div>
        <h1 className="font-heading font-medium text-base text-textPrimary">
          {currentTitle}
        </h1>
      </div>
      <div className="flex items-center space-x-4">
        <span className="font-meta text-xs text-textMuted bg-bgSecondary px-2.5 py-1 rounded border border-borderNeutral">
          v1.0 MVP
        </span>
      </div>
    </header>
  );
};
