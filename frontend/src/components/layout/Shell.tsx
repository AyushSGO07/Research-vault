"use client";

import React from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { TopHeader } from "@/components/layout/TopHeader";
import { AuthModal } from "@/components/auth/AuthModal";
import { useAuth } from "@/context/AuthContext";

export const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout, openAuthModal } = useAuth();

  return (
    <div className="min-h-screen bg-bgMain flex flex-col lg:flex-row">
      {/* Sidebar (Desktop fixed + Mobile drawer) */}
      <AppSidebar
        user={user ? { name: user.name, email: user.email } : null}
        onSignOut={logout}
        onOpenAuth={openAuthModal}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen pt-14 lg:pt-0">
        <TopHeader />
        <main className="flex-1 bg-bgMain">{children}</main>
      </div>

      {/* Global Auth Modal */}
      <AuthModal />
    </div>
  );
};
