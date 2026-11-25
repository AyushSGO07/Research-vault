"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  Binary,
  FlaskConical,
  Atom,
  Dna,
  Cpu,
  Calculator,
  Stethoscope,
  LucideIcon
} from "lucide-react";

interface CategoryItem {
  id: string;
  name: string;
  icon: LucideIcon;
}

const categories: CategoryItem[] = [
  { id: "cs", name: "Computer Science", icon: Binary },
  { id: "chem", name: "Chemistry", icon: FlaskConical },
  { id: "phys", name: "Physics", icon: Atom },
  { id: "bio", name: "Biology", icon: Dna },
  { id: "eng", name: "Engineering", icon: Cpu },
  { id: "math", name: "Mathematics", icon: Calculator },
  { id: "med", name: "Medicine", icon: Stethoscope },
];

export const CategoryPills: React.FC = () => {
  const router = useRouter();

  const handleSelectCategory = (categoryName: string) => {
    router.push(`/search?q=${encodeURIComponent(categoryName)}&domain=${encodeURIComponent(categoryName)}`);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-medium text-xs uppercase tracking-wider text-textMuted">
          Research Categories
        </h3>
        <span className="font-meta text-xs text-textMuted">
          Filter by academic domain
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        {categories.map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              onClick={() => handleSelectCategory(cat.name)}
              className="flex items-center space-x-2.5 p-3 rounded-lg border border-borderNeutral bg-white hover:border-accent hover:bg-bgSecondary/80 hover:text-accent transition-all group text-left cursor-pointer shadow-2xs"
            >
              <div className="w-7 h-7 rounded-md bg-bgSecondary group-hover:bg-accent/10 flex items-center justify-center text-textMuted group-hover:text-accent transition-colors flex-shrink-0">
                <Icon className="w-3.5 h-3.5" />
              </div>
              <span className="font-heading text-xs font-normal text-textPrimary group-hover:text-accent truncate">
                {cat.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
