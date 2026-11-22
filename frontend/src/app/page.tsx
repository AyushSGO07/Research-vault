import React from "react";
import { HeroSearch } from "@/components/discover/HeroSearch";
import { CategoryPills } from "@/components/discover/CategoryPills";
import { RecentPapersFeed } from "@/components/discover/RecentPapersFeed";

export default function DiscoverPage() {
  return (
    <div className="max-w-5xl mx-auto px-6 lg:px-8 py-10 space-y-12">
      <HeroSearch />
      <CategoryPills />
      <RecentPapersFeed />
    </div>
  );
}
