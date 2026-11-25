"use client";

import React, { useState } from "react";
import { X, Lock, Mail, User as UserIcon, AlertCircle, Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, closeAuthModal, login, loginAsDemo, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleDemoLogin = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await loginAsDemo();
    } catch (err: any) {
      setError(err.message || "Failed to log in as demo user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
    } catch (err: any) {
      setError(err.message || "Failed to authenticate");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-xs">
      <div className="bg-white rounded-card border border-borderNeutral shadow-lg w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-borderNeutral">
          <h3 className="font-heading font-medium text-base text-textPrimary">
            {isLogin ? "Sign In to ResearchVault" : "Create Research Account"}
          </h3>
          <button
            onClick={closeAuthModal}
            className="text-textMuted hover:text-textPrimary p-1 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-statusError/10 border border-statusError/20 rounded-md flex items-start space-x-2 text-statusError text-xs">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Demo Access Card */}
          <div className="p-3.5 bg-accent/5 border border-accent/20 rounded-md space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-heading font-semibold text-xs text-accent flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Demo Researcher Account
              </span>
              <span className="font-meta text-[11px] text-textMuted">Dr. Alan Turing</span>
            </div>
            <p className="font-body text-[11px] text-textSecondary leading-normal">
              Pre-loaded with 3 canonical indexed papers, academic benchmark suites, and past search history.
            </p>
            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={isSubmitting}
              className="w-full py-1.5 px-3 bg-accent text-white font-heading font-medium text-xs rounded hover:bg-accent/90 transition-colors shadow-xs flex items-center justify-center space-x-1.5 disabled:opacity-60"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>1-Click Demo Login</span>
            </button>
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-borderNeutral"></div>
            <span className="flex-shrink mx-3 text-textMuted text-[11px] font-meta uppercase">
              Or {isLogin ? "Sign In" : "Register"} with Email
            </span>
            <div className="flex-grow border-t border-borderNeutral"></div>
          </div>

          {!isLogin && (
            <div>
              <label className="block font-heading text-xs font-medium text-textPrimary mb-1">
                Full Name / Academic Title
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-textMuted">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Dr. Jane Doe"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-borderNeutral rounded-md focus:outline-none focus:border-accent bg-bgSecondary font-body"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block font-heading text-xs font-medium text-textPrimary mb-1">
              Academic or Institutional Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-textMuted">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="researcher@university.edu"
                className="w-full pl-9 pr-3 py-2 text-sm border border-borderNeutral rounded-md focus:outline-none focus:border-accent bg-bgSecondary font-body"
              />
            </div>
          </div>

          <div>
            <label className="block font-heading text-xs font-medium text-textPrimary mb-1">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-textMuted">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 text-sm border border-borderNeutral rounded-md focus:outline-none focus:border-accent bg-bgSecondary font-body"
              />
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Processing..."
                : isLogin
                ? "Sign In"
                : "Create Account"}
            </Button>
          </div>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
              }}
              className="text-xs text-textSecondary hover:text-accent font-heading transition-colors"
            >
              {isLogin
                ? "Need an account? Register here"
                : "Already have an account? Sign in"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
