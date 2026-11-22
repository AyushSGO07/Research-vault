"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, User as UserIcon, AlertCircle, BookOpen } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await register(name, email, password);
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Failed to register");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white border border-borderNeutral rounded-card p-8 shadow-xs space-y-6">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 rounded-lg bg-accent text-white flex items-center justify-center mx-auto shadow-xs">
            <BookOpen className="w-5 h-5" />
          </div>
          <h2 className="font-heading font-medium text-2xl text-textPrimary">Create Account</h2>
          <p className="font-body text-xs text-textSecondary">
            Set up your academic profile to discover and organize research.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-statusError/10 border border-statusError/20 rounded-md flex items-start space-x-2 text-statusError text-xs">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
                placeholder="Dr. Ada Lovelace"
                className="w-full pl-9 pr-3 py-2 text-sm border border-borderNeutral rounded-md focus:outline-none focus:border-accent bg-bgSecondary font-body"
              />
            </div>
          </div>

          <div>
            <label className="block font-heading text-xs font-medium text-textPrimary mb-1">
              Email Address
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
                placeholder="lovelace@analytical.org"
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

          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating Account..." : "Create Account"}
          </Button>
        </form>

        <div className="text-center pt-2">
          <Link
            href="/login"
            className="text-xs text-textSecondary hover:text-accent font-heading transition-colors"
          >
            Already have an account? Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
