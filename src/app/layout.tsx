import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StatementHub — Unified Bank Statement Search & Analytics",
  description:
    "High-speed browser-based unified search for Indian bank statements with automatic deduplication, Gemini AI party assistant, and cash flow analytics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col bg-[#090d16] text-slate-100 antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
