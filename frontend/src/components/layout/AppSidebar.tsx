"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Compass,
  Search,
  BookmarkCheck,
  Folder,
  UploadCloud,
  History,
  BarChart3,
  Settings,
  Menu,
  X,
  BookOpen,
  LogOut,
  User as UserIcon,
  Sparkles,
} from "lucide-react";
import { NavItem } from "@/types/navigation";

const navItems: NavItem[] = [
  { id: "discover", label: "Discover", href: "/", icon: Compass },
  { id: "search", label: "Search Papers", href: "/search", icon: Search },
  { id: "library", label: "My Library", href: "/library", icon: BookmarkCheck },
  { id: "collections", label: "Collections", href: "/collections", icon: Folder },
  { id: "upload", label: "Upload Documents", href: "/upload", icon: UploadCloud },
  { id: "history", label: "Search History", href: "/history", icon: History },
  { id: "evaluation", label: "Evaluation", href: "/evaluation", icon: BarChart3 },
  { id: "settings", label: "Settings", href: "/settings", icon: Settings },
];

interface AppSidebarProps {
  user?: { name: string; email: string } | null;
  onSignOut?: () => void;
  onOpenAuth?: () => void;
  onDemoLogin?: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  user,
  onSignOut,
  onOpenAuth,
  onDemoLogin,
}) => {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarContent = (
    <div className="flex flex-col h-full bg-bgSidebar border-r border-borderNeutral">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-borderNeutral">
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <span className="font-heading font-medium text-base tracking-tight text-textPrimary block">
              ResearchVault
            </span>
            <span className="font-meta text-[11px] text-textMuted tracking-wider uppercase block">
              Academic Engine
            </span>
          </div>
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2">
          <span className="font-meta text-[11px] font-medium uppercase tracking-wider text-textMuted">
            Navigation
          </span>
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center space-x-3 px-3 py-2.5 rounded-md text-sm font-heading transition-colors ${
                isActive
                  ? "bg-accent/10 text-accent font-medium border-l-2 border-accent"
                  : "text-textSecondary hover:text-textPrimary hover:bg-borderNeutral/40"
              }`}
            >
              <Icon
                className={`w-4 h-4 flex-shrink-0 ${
                  isActive ? "text-accent" : "text-textMuted"
                }`}
              />
              <span className="truncate">{item.label}</span>
              {item.badge && (
                <span className="ml-auto text-xs px-1.5 py-0.5 rounded-full bg-bgSecondary text-textSecondary font-meta">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Profile / Auth Section */}
      <div className="p-4 border-t border-borderNeutral bg-bgSidebar">
        {user ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-accent/15 flex items-center justify-center text-accent font-heading font-medium text-xs">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-heading text-xs font-medium text-textPrimary truncate">
                  {user.name}
                </p>
                <p className="font-meta text-[11px] text-textMuted truncate">
                  {user.email}
                </p>
              </div>
            </div>
            {onSignOut && (
              <button
                onClick={onSignOut}
                title="Sign out"
                className="p-1.5 text-textMuted hover:text-statusError hover:bg-bgSecondary rounded transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {onDemoLogin && (
              <button
                onClick={onDemoLogin}
                className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-md text-xs font-heading font-medium text-white bg-accent hover:bg-accent/90 transition-colors shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>1-Click Demo Login</span>
              </button>
            )}
            <button
              onClick={onOpenAuth}
              className="w-full flex items-center justify-center space-x-2 py-1.5 px-3 border border-borderNeutral rounded-md text-xs font-heading text-textSecondary bg-bgSecondary hover:bg-borderNeutral/50 transition-colors"
            >
              <UserIcon className="w-3.5 h-3.5 text-textMuted" />
              <span>Sign In / Register</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Top Bar with Hamburger */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-bgSidebar border-b border-borderNeutral z-40 flex items-center justify-between px-4">
        <Link href="/" className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded bg-accent flex items-center justify-center text-white">
            <BookOpen className="w-4 h-4" />
          </div>
          <span className="font-heading font-medium text-sm text-textPrimary">
            ResearchVault
          </span>
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 text-textSecondary hover:text-textPrimary rounded-md focus:outline-none"
          aria-label="Toggle Navigation"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/20 backdrop-blur-xs z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <div
        className={`lg:hidden fixed top-0 bottom-0 left-0 w-64 z-50 transform transition-transform duration-200 ease-in-out ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </div>

      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:block fixed top-0 bottom-0 left-0 w-64 z-30">
        {sidebarContent}
      </aside>
    </>
  );
};
