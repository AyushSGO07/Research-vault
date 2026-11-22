import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { Shell } from "@/components/layout/Shell";

export const metadata: Metadata = {
  title: "ResearchVault — Semantic Research Paper Discovery",
  description: "AI-assisted semantic search and research discovery platform.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-bgMain text-textPrimary antialiased">
        <AuthProvider>
          <Shell>{children}</Shell>
        </AuthProvider>
      </body>
    </html>
  );
}
