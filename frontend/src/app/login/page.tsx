"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, AlertCircle, BookOpen } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Failed to log in");
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
          <h2 className="font-heading font-medium text-2xl text-textPrimary">Sign In</h2>
          <p className="font-body text-xs text-textSecondary">
            Access your research vault and private literature library.
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
            {isSubmitting ? "Signing In..." : "Sign In"}
          </Button>
        </form>

        <div className="text-center pt-2">
          <Link
            href="/register"
            className="text-xs text-textSecondary hover:text-accent font-heading transition-colors"
          >
            Don&apos;t have an account? Register here
          </Link>
        </div>
      </div>
    </div>
  );
}
